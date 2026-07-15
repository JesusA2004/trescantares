import { test, expect, type Page } from '@playwright/test';

/**
 * Verificación WYSIWYG real en navegador: lo que se coloca en
 * /admin/menu-editor para un viewport concreto debe aparecer en la MISMA
 * posición/tamaño en /menu tras guardar y recargar (tolerancia ≤1px).
 *
 * Requiere una base de datos aislada ya migrada + sembrada y el servidor
 * sirviendo esa base en E2E_BASE_URL (por defecto http://127.0.0.1:8010) —
 * Playwright no arranca el servidor, debe estar corriendo de antemano.
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const MAX_DIFF_PX = 1;

const BREAKPOINTS = [
    { name: 'base', width: 390 },
    { name: 'md', width: 768 },
    { name: 'lg', width: 1024 },
    { name: 'xl', width: 1280 },
    { name: '2xl', width: 1536 },
];

async function login(page: Page) {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('[data-test="login-button"]');
    await page.waitForURL(/dashboard/);
}

async function openEditorAtWidth(page: Page, width: number) {
    await page.goto('/admin/menu-editor');
    await expect(page.locator('.tc-editor-toolbar')).toBeVisible();

    const widthInput = page.locator('input[list="tc-editor-width-presets"]');
    await widthInput.fill(String(width));
    await widthInput.press('Tab');

    const frame = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    await frame.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    // Deja que el iframe reporte "ready" + altura real antes de interactuar.
    await page.waitForTimeout(600);

    return frame;
}

async function selectCategoryElement(page: Page, categoryName: string, elementLabel: string) {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryName, exact: true }).click();
    await sidebar.getByRole('button', { name: elementLabel, exact: true }).first().click();
    await page.waitForTimeout(150);
}

/** Abre la sección y expande el platillo — se llama UNA sola vez por
 * platillo: el botón de expandir es un toggle, así que volver a pulsarlo
 * colapsaría la lista y escondería sus elementos. */
async function expandItem(page: Page, categoryName: string, itemName: string) {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryName, exact: true }).click();

    const itemToggle = sidebar.getByRole('button').filter({ hasText: itemName }).first();
    await itemToggle.click();
}

async function selectElement(page: Page, elementLabel: string) {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    const elementButton = sidebar.getByRole('button', { name: elementLabel, exact: true }).first();
    await elementButton.click();
    await page.waitForTimeout(150);
}

async function setInspectorXY(page: Page, x: number, y: number) {
    const inspector = page.locator('aside.tc-editor-inspector');
    const xField = inspector.locator('.tc-field').filter({ hasText: 'X (px)' }).locator('input');
    const yField = inspector.locator('.tc-field').filter({ hasText: 'Y (px)' }).locator('input');

    await xField.fill(String(x));
    await xField.press('Tab');
    await yField.fill(String(y));
    await yField.press('Tab');

    // El inspector agrupa ediciones en un lote corto (150ms) antes de
    // enviarlas al iframe y persistirlas — se espera holgado para no
    // depender de temporización exacta en CI.
    await page.waitForTimeout(500);
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** getBoundingClientRect() DENTRO del documento correspondiente, medido
 * RELATIVO a la esquina superior izquierda de su sección `#cat-N` — nunca
 * coordenadas absolutas del viewport. El editor deja la sección scrolleada
 * al tope (bridge.scrollToCategory) mientras que /menu se navega sin
 * scrollear a esa sección: comparar coordenadas absolutas de viewport
 * mezclaría esa diferencia de scroll con la posición real del elemento. Al
 * restar la posición de la sección, el resultado es independiente del
 * scroll en ambos lados — la comparación real "manzanas con manzanas".
 */
function measureRelativeToSection(el: Element) {
    const r = el.getBoundingClientRect();
    const section = el.closest('[id^="cat-"]');
    const sr = section ? section.getBoundingClientRect() : { x: 0, y: 0 };

    return { x: r.x - sr.x, y: r.y - sr.y, width: r.width, height: r.height };
}

async function editorRectsFor(
    frame: ReturnType<Page['frameLocator']>,
    keys: string[],
): Promise<Record<string, Rect>> {
    const out: Record<string, Rect> = {};

    for (const key of keys) {
        out[key] = await waitForStableRect(() =>
            frame.locator(`[data-element-key="${key}"]`).evaluate(measureRelativeToSection),
        );
    }

    return out;
}

/** Sondea getBoundingClientRect() hasta que dos lecturas seguidas coinciden
 * (o se agota el tiempo) — evita medir un frame intermedio de la hidratación
 * de Vue (el SSR siempre entrega el breakpoint 'lg' antes de montar; el
 * cliente lo corrige en onMounted, lo que puede repintar el nodo una vez). */
async function waitForStableRect(read: () => Promise<Rect>): Promise<Rect> {
    let prev = await read();

    for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const cur = await read();
        const stable =
            Math.abs(cur.x - prev.x) < 0.5 &&
            Math.abs(cur.y - prev.y) < 0.5 &&
            Math.abs(cur.width - prev.width) < 0.5 &&
            Math.abs(cur.height - prev.height) < 0.5;

        if (stable) {
            return cur;
        }

        prev = cur;
    }

    return prev;
}

/** Navega UNA vez a /menu al ancho dado y mide todas las claves pedidas. */
async function publicRectsFor(
    page: Page,
    width: number,
    keys: string[],
    { reload = false }: { reload?: boolean } = {},
): Promise<Record<string, Rect>> {
    await page.setViewportSize({ width, height: 1400 });

    if (reload) {
        await page.reload();
    } else {
        await page.goto('/menu');
    }

    await page.waitForTimeout(200);

    const out: Record<string, Rect> = {};

    for (const key of keys) {
        out[key] = await waitForStableRect(() =>
            page.locator(`[data-element-key="${key}"]`).first().evaluate(measureRelativeToSection),
        );
    }

    return out;
}

function expectSameRect(a: Rect, b: Rect, label: string) {
    expect(Math.abs(a.x - b.x), `${label}: x`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.y - b.y), `${label}: y`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.width - b.width), `${label}: width`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.height - b.height), `${label}: height`).toBeLessThanOrEqual(MAX_DIFF_PX);
}

for (const bp of BREAKPOINTS) {
    test(`editor y /menu coinciden en la misma posición a ${bp.width}px (${bp.name})`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: Math.max(bp.width, 1024), height: 1400 });
        await login(page);

        const frame = await openEditorAtWidth(page, bp.width);

        // Mueve imagen, precio y nombre del primer platillo de Pozole a
        // posiciones que se solapan visualmente, más el título de la
        // sección — cuatro tipos de elemento distintos (imagen, texto de
        // precio, texto de nombre, título de categoría), tal como exige el
        // caso de prueba obligatorio.
        await expandItem(page, 'Pozole', 'Pozole Blanco');

        await selectElement(page, 'Imagen');
        await setInspectorXY(page, 20, -40);

        await selectElement(page, 'Precio');
        await setInspectorXY(page, -15, 25);

        await selectElement(page, 'Nombre');
        await setInspectorXY(page, 8, -8);

        await selectCategoryElement(page, 'Pozole', 'Título');
        await setInspectorXY(page, 12, -6);

        // Recupera los element-key reales leyendo los atributos data- del
        // iframe (evita adivinar IDs de base de datos en el test).
        const keys = await frame
            .locator('[data-element-key]')
            .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
        const imageEl = keys.find((k) => k?.endsWith(':image')) as string;
        const priceEl = keys.find((k) => k?.endsWith(':price')) as string;
        const nameEl = keys.find((k) => k?.endsWith(':name')) as string;
        const titleEl = keys.find(
            (k) => k?.startsWith('category-') && k.endsWith(':title'),
        ) as string;

        expect(imageEl, 'clave de imagen encontrada en el iframe').toBeTruthy();
        expect(priceEl, 'clave de precio encontrada en el iframe').toBeTruthy();
        expect(nameEl, 'clave de nombre encontrada en el iframe').toBeTruthy();
        expect(titleEl, 'clave de título de categoría encontrada en el iframe').toBeTruthy();

        const allKeys = [imageEl, priceEl, nameEl, titleEl];
        const editorRects = await editorRectsFor(frame, allKeys);
        const menuRectsFirstLoad = await publicRectsFor(page, bp.width, allKeys);

        for (const key of allKeys) {
            expectSameRect(editorRects[key], menuRectsFirstLoad[key], `${bp.name} — ${key} (editor vs /menu)`);
        }

        // F5 real sobre /menu — confirma que la posición persiste tras
        // recargar, no solo en el primer render tras guardar.
        const afterReload = await publicRectsFor(page, bp.width, allKeys, { reload: true });

        for (const key of allKeys) {
            expectSameRect(editorRects[key], afterReload[key], `${bp.name} — ${key} (editor vs /menu tras F5)`);
        }
    });
}

test('una configuración guardada solo en un breakpoint no afecta a los demás', async ({ page }) => {
    await login(page);

    const frame = await openEditorAtWidth(page, 1280);
    const keys = await frame
        .locator('[data-element-key]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
    const imageEl = keys.find((k) => k?.endsWith(':image')) as string;
    expect(imageEl, 'clave de imagen encontrada en el iframe').toBeTruthy();

    // Línea base a 390px, ANTES de aplicar ningún cambio en xl.
    const baselineMobile = await publicRectsFor(page, 390, [imageEl]);

    // Aplica un desplazamiento grande solo en el breakpoint xl (1280px).
    await openEditorAtWidth(page, 1280);
    await expandItem(page, 'Pozole', 'Pozole Blanco');
    await selectElement(page, 'Imagen');
    await setInspectorXY(page, 220, 160);

    const xlRect = await publicRectsFor(page, 1280, [imageEl]);
    const mobileAfterXlEdit = await publicRectsFor(page, 390, [imageEl]);

    // El breakpoint móvil no debe haberse movido por el cambio hecho en xl.
    expectSameRect(baselineMobile[imageEl], mobileAfterXlEdit[imageEl], 'base tras editar solo xl');

    // Y el propio xl sí debe reflejar el desplazamiento aplicado (no es 0,0).
    expect(
        Math.abs(xlRect[imageEl].x - baselineMobile[imageEl].x),
        'xl debe reflejar el desplazamiento aplicado',
    ).toBeGreaterThan(50);
});
