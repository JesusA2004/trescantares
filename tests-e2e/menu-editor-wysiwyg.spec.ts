import { test, expect, type Page } from '@playwright/test';

/**
 * Verificación WYSIWYG real en navegador: lo que se coloca en
 * /admin/menu-editor para una de las tres vistas configurables (Móvil,
 * Tablet, Escritorio) debe aparecer en la MISMA posición/tamaño en /menu
 * tras guardar y recargar (tolerancia ≤1px). También verifica que los
 * anchos INTERMEDIOS (no configurables directamente) se interpolen de
 * forma correcta entre las dos vistas más cercanas, y que el layout público
 * no tenga overflow horizontal ni franjas blancas en escritorio.
 *
 * Requiere una base de datos aislada ya migrada + sembrada y el servidor
 * sirviendo esa base en E2E_BASE_URL (por defecto http://127.0.0.1:8010) —
 * Playwright no arranca el servidor, debe estar corriendo de antemano.
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const MAX_DIFF_PX = 1;

const DEVICES = [
    { name: 'mobile', label: 'Móvil', width: 390 },
    { name: 'tablet', label: 'Tablet', width: 768 },
    { name: 'desktop', label: 'Escritorio', width: 1440 },
];

/** Anchos intermedios reales de navegador que el administrador NUNCA
 * configura manualmente — deben quedar interpolados automáticamente entre
 * las dos vistas configurables más cercanas. */
const INTERMEDIATE_WIDTHS = [600, 1024, 1200, 1366, 1920];

async function login(page: Page) {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('[data-test="login-button"]');
    await page.waitForURL(/dashboard/);
}

async function openEditorAtDevice(page: Page, deviceLabel: string) {
    await page.goto('/admin/menu-editor');
    await expect(page.locator('.tc-editor-toolbar')).toBeVisible();

    await page
        .locator('.tc-device-btn')
        .filter({ hasText: deviceLabel })
        .click();

    const frame = page.frameLocator(
        'iframe[title="Vista previa editable del menú"]',
    );
    await frame.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    // Deja que el iframe reporte "ready" antes de interactuar.
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

/** Los campos X/Y numéricos viven dentro del acordeón "Ajustes avanzados"
 * (colapsado por defecto) — hay que abrirlo antes de tocarlos. Se revisa la
 * visibilidad REAL del campo (no el atributo `open`) porque cambiar de
 * elemento seleccionado puede re-render los bloques hermanos del acordeón. */
async function openAdvancedSettings(page: Page) {
    const inspector = page.locator('aside.tc-editor-inspector');
    const xField = inspector.locator('.tc-field').filter({ hasText: 'X (px)' }).locator('input');

    if (await xField.isVisible()) {
        return;
    }

    await inspector.locator('.tc-advanced-summary').click();
    await xField.waitFor({ state: 'visible' });
}

async function setInspectorXY(page: Page, x: number, y: number) {
    await openAdvancedSettings(page);

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
 * de Vue (el SSR entrega el ancho de escritorio antes de montar; el cliente
 * lo corrige en onMounted, lo que puede repintar el nodo una vez). */
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

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'no debe haber overflow horizontal').toBeLessThanOrEqual(1);
}

async function expectNoDarkMode(page: Page) {
    const hasDarkClass = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
    );
    expect(hasDarkClass, 'la clase dark nunca debe aplicarse').toBe(false);

    const colorScheme = await page.evaluate(
        () => getComputedStyle(document.documentElement).colorScheme,
    );
    expect(colorScheme, 'color-scheme debe forzarse a light').toContain('light');
}

for (const device of DEVICES) {
    test(`editor y /menu coinciden en la misma posición en la vista ${device.label} (${device.width}px)`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: Math.max(device.width, 1024), height: 1400 });
        await login(page);

        const frame = await openEditorAtDevice(page, device.label);

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
        const menuRectsFirstLoad = await publicRectsFor(page, device.width, allKeys);

        for (const key of allKeys) {
            expectSameRect(editorRects[key], menuRectsFirstLoad[key], `${device.name} — ${key} (editor vs /menu)`);
        }

        // F5 real sobre /menu — confirma que la posición persiste tras
        // recargar, no solo en el primer render tras guardar.
        const afterReload = await publicRectsFor(page, device.width, allKeys, { reload: true });

        for (const key of allKeys) {
            expectSameRect(editorRects[key], afterReload[key], `${device.name} — ${key} (editor vs /menu tras F5)`);
        }

        await expectNoHorizontalOverflow(page);
        await expectNoDarkMode(page);
    });
}

test('una configuración guardada solo en una vista no afecta a las demás', async ({ page }) => {
    await login(page);

    const frame = await openEditorAtDevice(page, 'Escritorio');
    const keys = await frame
        .locator('[data-element-key]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
    const imageEl = keys.find((k) => k?.endsWith(':image')) as string;
    expect(imageEl, 'clave de imagen encontrada en el iframe').toBeTruthy();

    // Línea base a 390px (móvil), ANTES de aplicar ningún cambio en escritorio.
    const baselineMobile = await publicRectsFor(page, 390, [imageEl]);

    // Aplica un desplazamiento grande solo en la vista Escritorio (1440px).
    await openEditorAtDevice(page, 'Escritorio');
    await expandItem(page, 'Pozole', 'Pozole Blanco');
    await selectElement(page, 'Imagen');
    await setInspectorXY(page, 220, 160);

    const desktopRect = await publicRectsFor(page, 1440, [imageEl]);
    const mobileAfterDesktopEdit = await publicRectsFor(page, 390, [imageEl]);

    // La vista móvil no debe haberse movido por el cambio hecho en escritorio.
    expectSameRect(baselineMobile[imageEl], mobileAfterDesktopEdit[imageEl], 'móvil tras editar solo escritorio');

    // Y la propia vista escritorio sí debe reflejar el desplazamiento aplicado (no es 0,0).
    expect(
        Math.abs(desktopRect[imageEl].x - baselineMobile[imageEl].x),
        'escritorio debe reflejar el desplazamiento aplicado',
    ).toBeGreaterThan(50);
});

/** Lee el translate(x,y) aplicado por MenuEditableElement directamente del
 * atributo `style` inline — a diferencia de getBoundingClientRect(), esto
 * aísla EXACTAMENTE el offset que produce la interpolación (x,y del
 * ElementConfig) sin mezclarlo con la posición de flujo del elemento, que
 * cambia de forma no lineal entre vistas por el propio CSS responsive de
 * cada plantilla (grids/clamp() distintos en móvil vs tablet). */
async function readTranslateOffset(locator: ReturnType<Page['locator']>) {
    const style = await locator.getAttribute('style');
    const match = style?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);

    return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 0, y: 0 };
}

test('un ancho intermedio no configurado interpola linealmente el x/y guardado entre las dos vistas más cercanas', async ({ page }) => {
    await login(page);

    // Configura la imagen del primer platillo de Pozole con valores muy
    // distintos en Móvil y Tablet para que la interpolación sea evidente.
    await openEditorAtDevice(page, 'Móvil');
    await expandItem(page, 'Pozole', 'Pozole Blanco');
    await selectElement(page, 'Imagen');
    await setInspectorXY(page, 10, 20);

    await openEditorAtDevice(page, 'Tablet');
    await expandItem(page, 'Pozole', 'Pozole Blanco');
    await selectElement(page, 'Imagen');
    await setInspectorXY(page, 100, 60);

    const frame = await openEditorAtDevice(page, 'Móvil');
    const keys = await frame
        .locator('[data-element-key]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
    const imageEl = keys.find((k) => k?.endsWith(':image')) as string;
    expect(imageEl, 'clave de imagen encontrada en el iframe').toBeTruthy();

    // Ancho a medio camino exacto entre 390 y 768 → t=0.5 → x=55, y=40.
    const midWidth = (390 + 768) / 2;
    await page.setViewportSize({ width: midWidth, height: 1200 });
    await page.goto('/menu');
    await page.waitForTimeout(300);

    const offset = await readTranslateOffset(page.locator(`[data-element-key="${imageEl}"]`).first());

    expect(Math.abs(offset.x - 55), 'interpolación X a medio camino (t=0.5 entre 10 y 100)').toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(offset.y - 40), 'interpolación Y a medio camino (t=0.5 entre 20 y 60)').toBeLessThanOrEqual(MAX_DIFF_PX);
});

for (const width of INTERMEDIATE_WIDTHS) {
    test(`/menu a ${width}px no tiene overflow horizontal ni franjas blancas y no usa modo oscuro`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1200 });
        await page.goto('/menu');
        await page.waitForTimeout(300);

        await expectNoHorizontalOverflow(page);
        await expectNoDarkMode(page);

        if (width >= 1024) {
            // En escritorio el fondo/página debe cubrir el 100% del ancho —
            // el contenedor de página no debe dejar franjas blancas laterales.
            const pageWidth = await page
                .locator('.tc-mp-page')
                .first()
                .evaluate((el) => el.getBoundingClientRect().width);
            const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);

            expect(
                viewportWidth - pageWidth,
                `.tc-mp-page debe ocupar todo el ancho a ${width}px`,
            ).toBeLessThanOrEqual(1);
        }
    });
}
