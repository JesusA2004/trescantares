import { test, expect, type Page } from '@playwright/test';

/** Punto en común entre Page y FrameLocator: ambos exponen .locator(). */
type LocatorSource = Pick<Page, 'locator'>;

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
const INTERMEDIATE_WIDTHS = [600, 1024, 1200, 1366, 1536, 1909, 1920];

/** Anchos reales de escritorio (>1440, el ancla) en los que Escritorio debe
 * verse FLUIDO (nunca congelado) — editor e iframe siempre al mismo ancho
 * real de ventana, ver desktopRealWidth en Index.vue. */
const WIDE_DESKTOP_WIDTHS = [1366, 1536, 1909];

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
 * elemento seleccionado puede re-render los bloques hermanos del acordeón.
 * Se localiza por `data-field`, NO por el texto de la etiqueta ("X (px)"
 * cambia a "X (%)" en cuanto el elemento pasa a coordenadas normalizadas,
 * ver ElementConfigV2/Index.vue) — data-field es estable frente a esa
 * relabel (TcInput reenvía $attrs al <input> real). */
async function openAdvancedSettings(page: Page) {
    const inspector = page.locator('aside.tc-editor-inspector');
    const xField = inspector.locator('input[data-field="x"]');

    if (await xField.isVisible()) {
        return;
    }

    await inspector.locator('.tc-advanced-summary').click();
    await xField.waitFor({ state: 'visible' });
}

async function setInspectorXY(page: Page, x: number, y: number) {
    await openAdvancedSettings(page);

    const inspector = page.locator('aside.tc-editor-inspector');
    const xField = inspector.locator('input[data-field="x"]');
    const yField = inspector.locator('input[data-field="y"]');

    await xField.fill(String(x));
    await xField.press('Tab');
    await yField.fill(String(y));
    await yField.press('Tab');

    // El inspector agrupa ediciones en un lote corto (150ms) antes de
    // enviarlas al iframe y persistirlas — se espera holgado para no
    // depender de temporización exacta en CI.
    await page.waitForTimeout(500);
}

/** Abre el editor a un ancho REAL de ventana ≥1440 y selecciona Escritorio.
 * El ancho de "Escritorio" ya no es un valor fijo de 1440px: usa
 * window.innerWidth de la propia ventana del administrador (ver
 * desktopRealWidth en Index.vue) — por eso aquí se fija el viewport ANTES
 * de navegar, para que se lea correctamente al montar. */
async function openEditorAtRealDesktopWidth(page: Page, width: number) {
    await page.setViewportSize({ width, height: 1200 });

    return openEditorAtDevice(page, 'Escritorio');
}

/** Campo "Ancho (px)"/"Ancho (%)" del bloque de tamaño del inspector (fuera
 * del acordeón de ajustes avanzados, siempre visible) — localizado por
 * data-field="width" (estable frente al relabel px->% al normalizar, ver
 * openAdvancedSettings). */
function widthField(page: Page) {
    return page.locator('aside.tc-editor-inspector input[data-field="width"]');
}

function heightField(page: Page) {
    return page.locator('aside.tc-editor-inspector input[data-field="height"]');
}

/** Casilla "Automático" del campo Ancho — el input numérico está
 * deshabilitado mientras el ancho sea automático (null). */
function autoWidthCheckbox(page: Page) {
    return page
        .locator('aside.tc-editor-inspector .tc-field')
        .filter({ has: page.locator('input[data-field="width"]') })
        .locator('input[type="checkbox"]');
}

async function setInspectorWidth(page: Page, width: number) {
    if (await autoWidthCheckbox(page).isChecked()) {
        await autoWidthCheckbox(page).setChecked(false);
        await page.waitForTimeout(300);
    }

    await widthField(page).fill(String(width));
    await widthField(page).press('Tab');
    await page.waitForTimeout(500);
}

/** Casilla "Proporcional" (alto automático) del bloque "Tamaño del bloque". */
function proportionalCheckbox(page: Page) {
    return page
        .locator('aside.tc-editor-inspector .tc-field')
        .filter({ has: page.locator('input[data-field="height"]') })
        .locator('input[type="checkbox"]');
}

async function setProportional(page: Page, on: boolean) {
    const checkbox = proportionalCheckbox(page);
    const checked = await checkbox.isChecked();

    if (checked !== on) {
        await checkbox.setChecked(on);
        await page.waitForTimeout(500);
    }
}

/** Encuentra la clave real de la imagen de título/subtítulo/tagline de UNA
 * categoría concreta por su contenido semántico (alt=nombre de la
 * categoría), NUNCA por "la primera coincidencia en el DOM" — el iframe
 * renderiza TODAS las categorías en una sola página larga, así que buscar
 * solo por sufijo ':title_image' encuentra siempre la de Pozole (la primera
 * categoría con imagen de título), sin importar cuál esté realmente
 * seleccionada. Evita además adivinar IDs de base de datos. */
async function imageElementKeyByAlt(
    locatorSource: LocatorSource,
    altText: string,
): Promise<string> {
    const key = await locatorSource
        .locator(`img[alt="${altText}"]`)
        .first()
        .evaluate((img) => img.closest('[data-element-key]')?.getAttribute('data-element-key') ?? null);

    expect(key, `clave de imagen encontrada para alt="${altText}"`).toBeTruthy();

    return key as string;
}

/** Sección `<section id="cat-N">` que contiene la imagen de título con el
 * alt dado — para localizar OTRAS claves de la MISMA categoría (p. ej. su
 * subtitle_image) cuando esas otras no tienen un alt único propio. */
function categorySectionByTitleAlt(locatorSource: LocatorSource, altText: string) {
    return locatorSource
        .locator('[id^="cat-"]')
        .filter({ has: locatorSource.locator(`img[alt="${altText}"]`) });
}

/** Todas las etiquetas de elemento visibles en la barra lateral para la
 * sección activa — usado para comprobar que no hay controles fantasma. */
async function visibleElementLabelsFor(page: Page, categoryName: string): Promise<string[]> {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryName, exact: true }).click();
    await page.waitForTimeout(150);

    const heading = sidebar.locator('h3', { hasText: 'Elementos de la sección' });
    const list = heading.locator('xpath=following-sibling::ul[1]');

    return list.locator('button.tc-element-btn').allInnerTexts();
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

interface WrapperAndImg {
    wrapper: Rect;
    img: Rect;
}

/** Mide el wrapper [data-element-key] Y su <img> hijo directo, ambos
 * relativos a su sección — para comprobar que redimensionar realmente
 * mueve la IMAGEN (no solo el contenedor invisible, ver MenuEditableElement
 * imageStyle). */
async function wrapperAndImgRect(
    locatorSource: LocatorSource,
    key: string,
): Promise<WrapperAndImg> {
    const wrapper = await waitForStableRect(() =>
        locatorSource.locator(`[data-element-key="${key}"]`).evaluate(measureRelativeToSection),
    );
    const img = await waitForStableRect(() =>
        locatorSource
            .locator(`[data-element-key="${key}"] img`)
            .first()
            .evaluate(measureRelativeToSection),
    );

    return { wrapper, img };
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

        // Pozole SIEMPRE tiene imagen de título en el seeder oficial — la
        // clave real es 'title_image' (kind=image), no 'title' (que sería
        // el <h2> de texto, y ni siquiera existe en el DOM mientras exista
        // title_image_url — ver Corrección 1 / categoryElementKeysFor).
        await selectCategoryElement(page, 'Pozole', 'Imagen de título');
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
            (k) => k?.startsWith('category-') && k.endsWith(':title_image'),
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
    // 2 navegaciones completas del editor + 2 cargas de /menu bajo el
    // servidor de desarrollo de este entorno (sin opcache) pueden superar el
    // timeout por defecto de 30s sin que haya ningún bloqueo real — mismo
    // criterio que las pruebas más pesadas de menu-editor-hide-and-altclick.spec.ts.
    test.setTimeout(60000);
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

/* ========================================================================
 * CORRECCIÓN 1 — modelo real de título/subtítulo/tagline: sin controles
 * fantasma, imagen y texto en claves distintas y reales.
 * ==================================================================== */

test('Pozole no muestra "Título" fantasma junto a "Imagen de título": solo aparece la clave real', async ({ page }) => {
    await login(page);
    await openEditorAtDevice(page, 'Móvil');

    const labels = await visibleElementLabelsFor(page, 'Pozole');

    // Pozole SIEMPRE tiene imagen de título en el seeder oficial — debe
    // aparecer "Imagen de título" y NUNCA "Título" (el <h2> de texto ni
    // siquiera existe en el DOM mientras exista title_image_url).
    expect(labels.some((l) => l.includes('Imagen de título'))).toBe(true);
    expect(labels.some((l) => l === 'Título')).toBe(false);

    // Y el subtítulo gráfico ("Acompáñalo") debe listarse como "Imagen de
    // subtítulo" — nunca como "Subtítulo" (que sería el control fantasma
    // que existía antes de esta corrección).
    expect(labels.some((l) => l.includes('Imagen de subtítulo'))).toBe(true);
    expect(labels.some((l) => l === 'Subtítulo')).toBe(false);
});

test('Destilados no tiene título editable (la plantilla no renderiza ninguno) y no aparece como fantasma', async ({ page }) => {
    await login(page);
    await openEditorAtDevice(page, 'Móvil');

    const labels = await visibleElementLabelsFor(page, 'Destilados');

    expect(labels.some((l) => l === 'Título' || l.includes('Imagen de título'))).toBe(false);
    // Sí debe existir su gráfico de tagline real ("Refrescar el antojo").
    expect(labels.some((l) => l.includes('Imagen de tagline'))).toBe(true);
});

test('al seleccionar "Imagen de título" el inspector muestra controles de imagen, no "Tamaño de fuente"', async ({ page }) => {
    await login(page);
    await openEditorAtDevice(page, 'Móvil');
    await selectCategoryElement(page, 'Pozole', 'Imagen de título');

    const inspector = page.locator('aside.tc-editor-inspector');
    await expect(inspector.getByText('Imagen dentro del bloque')).toBeVisible();
    await expect(inspector.getByText('Tamaño de fuente')).toHaveCount(0);
    await expect(inspector.locator('.tc-field').filter({ hasText: 'Ancho (px)' })).toBeVisible();
});

/* ========================================================================
 * CORRECCIÓN 2 — el contenedor Y la imagen cambian de tamaño juntos.
 * ==================================================================== */

async function testImageResizeFlow(page: Page, categoryName: string, elementLabel: string, categoryAlt: string) {
    await openEditorAtDevice(page, 'Escritorio');
    await selectCategoryElement(page, categoryName, elementLabel);

    const frame0 = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    const imageElementKey = await imageElementKeyByAlt(frame0, categoryAlt);
    const before = await wrapperAndImgRect(frame0, imageElementKey);

    // 1) Cambiar el ancho en el inspector debe mover la imagen, no solo el
    // wrapper — comprobado con getBoundingClientRect() del <img> real. El
    // margen es relativo (10%) en vez de un +20px fijo: algunos gráficos
    // (p. ej. el título de Pancita) ya renderizan muy anchos por defecto,
    // así que un margen absoluto pequeño sería demasiado ajustado frente al
    // ruido normal de medición.
    const newWidth = Math.round(before.wrapper.width * 1.4);
    await setInspectorWidth(page, newWidth);

    const frame = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    const afterResize = await wrapperAndImgRect(frame, imageElementKey);
    const growthMargin = Math.max(20, before.wrapper.width * 0.1);

    expect(afterResize.wrapper.width, 'el wrapper creció al ancho pedido').toBeGreaterThan(before.wrapper.width + growthMargin);
    expect(
        afterResize.img.width,
        'la imagen (no solo el wrapper) debe haber crecido con el ancho',
    ).toBeGreaterThan(before.img.width + growthMargin);
    expect(
        Math.abs(afterResize.img.width - afterResize.wrapper.width),
        'en modo proporcional la imagen debe llenar el ancho del wrapper',
    ).toBeLessThanOrEqual(MAX_DIFF_PX);

    // 2) Proporcional activo (por defecto): el alto es automático — el
    // wrapper no debe dejar un hueco vacío por debajo de la imagen.
    expect(
        Math.abs(afterResize.wrapper.height - afterResize.img.height),
        'en modo proporcional el wrapper debe envolver la imagen sin espacio vacío',
    ).toBeLessThanOrEqual(MAX_DIFF_PX);

    // 3) Desactivar "Proporcional" (alto independiente) y fijar un alto
    // manual — el <img> debe llenar ese alto (object-fit), no quedarse en
    // su alto intrínseco.
    await setProportional(page, false);
    const manualHeight = Math.round(afterResize.wrapper.height * 1.6);
    await heightField(page).fill(String(manualHeight));
    await heightField(page).press('Tab');
    await page.waitForTimeout(500);

    const afterHeight = await wrapperAndImgRect(frame, imageElementKey);
    expect(
        Math.abs(afterHeight.img.height - afterHeight.wrapper.height),
        'con alto independiente la imagen debe llenar el alto del bloque',
    ).toBeLessThanOrEqual(MAX_DIFF_PX);

    // 4) Reactivar proporcional — el alto vuelve a ser automático (nunca se
    // queda "pegado" al valor manual anterior).
    await setProportional(page, true);
    const afterProportionalAgain = await wrapperAndImgRect(frame, imageElementKey);
    expect(
        Math.abs(afterProportionalAgain.wrapper.height - afterProportionalAgain.img.height),
        'al reactivar proporcional el wrapper vuelve a envolver la imagen',
    ).toBeLessThanOrEqual(MAX_DIFF_PX);

    return { rect: afterProportionalAgain, key: imageElementKey };
}

test('Pozole — Imagen de título: redimensionar mueve la imagen real, proporcional funciona, se guarda y persiste tras F5', async ({ page }) => {
    // Ancho EXPLÍCITO e IDÉNTICO tanto al editar como al comparar contra
    // /menu — desktopRealWidth usa window.innerWidth, así que dejar esto al
    // viewport por defecto de Playwright compararía dos anchos reales
    // distintos y produciría falsos negativos por el propio CSS responsive
    // (no por un bug real).
    await page.setViewportSize({ width: 1440, height: 1200 });
    await login(page);

    const frame = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    const { key: titleImageKey } = await testImageResizeFlow(page, 'Pozole', 'Imagen de título', 'Pozole');

    // 5) Moverla.
    await setInspectorXY(page, 15, -12);

    // 6) Guardar ya ocurrió en cada paso (autosave); recarga el EDITOR y
    // confirma que el tamaño/posición persistieron sin salto.
    const editorRectBeforeReload = await wrapperAndImgRect(frame, titleImageKey);
    await page.reload();
    await expect(page.locator('.tc-editor-toolbar')).toBeVisible();
    await page.locator('.tc-device-btn').filter({ hasText: 'Escritorio' }).click();
    const frameAfterReload = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    await frameAfterReload.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(600);
    const editorRectAfterReload = await wrapperAndImgRect(frameAfterReload, titleImageKey);

    expectSameRect(editorRectBeforeReload.img, editorRectAfterReload.img, 'imagen de título tras recargar el editor');

    // 7-10) Abre /menu al mismo ancho y compara wrapper + img.
    await page.goto('/menu');
    await page.waitForTimeout(300);
    const publicMeasured = await wrapperAndImgRect(page, titleImageKey);

    expectSameRect(editorRectAfterReload.wrapper, publicMeasured.wrapper, 'wrapper del título gráfico (editor vs /menu)');
    expectSameRect(editorRectAfterReload.img, publicMeasured.img, 'imagen del título gráfico (editor vs /menu)');
});

test('Pancita — Imagen de título: mismo flujo de redimensión y comparación editor/público', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await login(page);

    const frame = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    const { key: titleImageKey } = await testImageResizeFlow(page, 'Pancita', 'Imagen de título', 'Pancita');

    const editorRect = await wrapperAndImgRect(frame, titleImageKey);
    await page.goto('/menu');
    await page.waitForTimeout(300);
    const publicRect = await wrapperAndImgRect(page, titleImageKey);

    expectSameRect(editorRect.wrapper, publicRect.wrapper, 'Pancita — wrapper del título (editor vs /menu)');
    expectSameRect(editorRect.img, publicRect.img, 'Pancita — imagen del título (editor vs /menu)');
});

test('Pozole — Acompáñalo (imagen de subtítulo): redimensionar también mueve la imagen real', async ({ page }) => {
    await login(page);
    await openEditorAtDevice(page, 'Escritorio');

    const frame = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    // Acompáñalo no tiene alt propio distintivo (category.subtitle es null
    // para Pozole) — se localiza por la SECCIÓN de Pozole (identificada por
    // el alt real de su título) y, dentro de ella, la clave subtitle_image.
    const subtitleImageKey = await categorySectionByTitleAlt(frame, 'Pozole')
        .locator('[data-element-key$=":subtitle_image"]')
        .first()
        .getAttribute('data-element-key');
    expect(subtitleImageKey, 'clave de imagen de subtítulo (Acompáñalo) encontrada').toBeTruthy();

    await selectCategoryElement(page, 'Pozole', 'Imagen de subtítulo');
    const before = await wrapperAndImgRect(frame, subtitleImageKey as string);

    const newWidth = Math.round(before.wrapper.width * 1.3);
    await setInspectorWidth(page, newWidth);

    const after = await wrapperAndImgRect(frame, subtitleImageKey as string);
    expect(after.img.width, 'Acompáñalo: la imagen creció con el wrapper').toBeGreaterThan(before.img.width + 15);
});

/* ========================================================================
 * CORRECCIÓN 3 — Escritorio WYSIWYG real a cualquier ancho de pantalla.
 * ==================================================================== */

for (const width of WIDE_DESKTOP_WIDTHS) {
    test(`Escritorio a ${width}px real (>1440 ancla): editor y /menu coinciden pixel a pixel`, async ({ page }) => {
        await login(page);
        const frame = await openEditorAtRealDesktopWidth(page, width);

        // Confirma que el iframe realmente representa el ancho REAL de la
        // ventana (no un 1440 fijo) — ver "Escritorio — Npx" discreto.
        await expect(page.getByText(`— ${width} px`)).toBeVisible();

        await expandItem(page, 'Pozole', 'Pozole Blanco');
        await selectElement(page, 'Imagen');
        await setInspectorXY(page, 40, -25);

        const keys = await frame
            .locator('[data-element-key]')
            .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
        const imageEl = keys.find((k) => k?.endsWith(':image')) as string;
        const titleImageKey = await imageElementKeyByAlt(frame, 'Pozole');

        const editorRects = await editorRectsFor(frame, [imageEl, titleImageKey]);

        const publicRects = await publicRectsFor(page, width, [imageEl, titleImageKey]);

        for (const key of [imageEl, titleImageKey]) {
            expectSameRect(editorRects[key], publicRects[key], `Escritorio ${width}px — ${key} (editor vs /menu)`);
        }
    });
}

test('el título gráfico de Escritorio NO se congela en 1440px: escala de forma fluida a un ancho real mayor', async ({ page }) => {
    await login(page);
    // Configura una posición EN el ancla de 1440px…
    await openEditorAtRealDesktopWidth(page, 1440);
    const frame440 = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    const titleImageKey = await imageElementKeyByAlt(frame440, 'Pozole');

    await selectCategoryElement(page, 'Pozole', 'Imagen de título');
    await setInspectorXY(page, 100, 50);
    const rectAt1440 = await editorRectsFor(frame440, [titleImageKey]);

    // …y confirma que a un ancho real mucho mayor (1909) la MISMA
    // configuración Escritorio se ve proporcionalmente más grande, no
    // exactamente del mismo tamaño en px (lo que probaría que sigue
    // congelada en la geometría de 1440px).
    const frame1909 = await openEditorAtRealDesktopWidth(page, 1909);
    const rectAt1909 = await editorRectsFor(frame1909, [titleImageKey]);

    const expectedRatio = 1909 / 1440;
    const actualRatio = rectAt1909[titleImageKey].width / rectAt1440[titleImageKey].width;

    expect(
        Math.abs(actualRatio - expectedRatio),
        `el ancho debe escalar ~${expectedRatio.toFixed(3)}x entre 1440 y 1909, no quedarse igual`,
    ).toBeLessThan(0.05);
});

/* ========================================================================
 * CORRECCIÓN — la navegación lateral pública no altera posiciones.
 * ==================================================================== */

test('la barra de navegación lateral (position:fixed) no desplaza ni reduce el contenido público', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/menu');
    await page.waitForTimeout(300);

    const sidenav = page.locator('.tc-mp-sidenav');
    await expect(sidenav).toBeVisible();

    const sidenavBox = await sidenav.evaluate((el) => {
        const cs = getComputedStyle(el);

        return { position: cs.position, left: el.getBoundingClientRect().left };
    });
    expect(sidenavBox.position, 'la barra lateral debe ser position:fixed (fuera del flujo)').toBe('fixed');

    const pageLeft = await page.locator('.tc-mp-page').first().evaluate((el) => el.getBoundingClientRect().left);
    // .tc-mp-page debe seguir arrancando cerca del borde izquierdo real del
    // viewport (su padding normal), no desplazado por un margin-left que
    // reserve espacio para la barra lateral fixed.
    expect(pageLeft, '.tc-mp-page no debe desplazarse por la barra lateral fixed').toBeLessThan(100);
});

/* ========================================================================
 * CORRECCIÓN — redimensionar el "contenedor" de un platillo (foto+precio en
 * fila flex) no debe reacomodar/encoger la foto ni el precio de adentro
 * como efecto secundario del flex — el contenedor solo debe crecer/moverse
 * su propia caja. Antes de la corrección, .tc-mp-hero-row (y las filas
 * equivalentes de otros layouts) eran block-level sin width propio, así que
 * heredaban el ancho explícito que MenuEditableElement le da al wrapper al
 * redimensionarlo — y la foto (ancho en % de esa fila) se encogía/crecía en
 * cascada, aunque el admin solo quería agrandar el bloque contenedor.
 * ==================================================================== */

test('redimensionar el contenedor de "Birria" no cambia el tamaño de su foto ni de su precio, y editor/público coinciden', async ({ page }) => {
    await login(page);
    // Fija el viewport a 1440 ANTES de abrir el editor — "Escritorio" usa el
    // ancho real de la ventana del admin (desktopRealWidth en Index.vue), y
    // más abajo se compara contra /menu explícitamente a 1440px; sin fijarlo
    // aquí, el editor usaría el viewport por defecto de Playwright (~1280px)
    // y las propiedades en vw (p. ej. el gap de .tc-mp-hero-row) darían un
    // resultado ligeramente distinto entre editor y público por un desajuste
    // de ancho real, no por ningún bug de posicionamiento.
    await page.setViewportSize({ width: 1440, height: 1300 });
    const frame = await openEditorAtDevice(page, 'Escritorio');

    // No se usa expandItem()/selectElement() aquí a propósito: la categoría
    // Y su platillo principal se llaman IGUAL ("Birria"), así que un filtro
    // genérico por texto en toda la barra lateral puede pescar el botón de
    // navegación de la sección en vez del renglón del platillo. Se escopea
    // explícitamente a la lista "Platillos".
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Birria', exact: true }).first().click();
    await page.waitForTimeout(300);
    const platillosList = page
        .locator('aside.tc-editor-sidebar h3', { hasText: 'Platillos' })
        .locator('xpath=following-sibling::ul[1]');
    const birriaRow = platillosList.locator('li').filter({
        has: page.getByRole('button', { name: 'Birria', exact: true }),
    }).first();
    await birriaRow.getByRole('button', { name: 'Birria', exact: true }).click();
    await page.waitForTimeout(300);
    await birriaRow.locator('.tc-element-btn', { hasText: 'Contenedor' }).click();
    await page.waitForTimeout(400);

    const containerKey = (await frame
        .locator('.tc-mev--selected')
        .first()
        .getAttribute('data-element-key')) as string;
    expect(containerKey).toMatch(/^item-\d+:container$/);

    const photoKey = containerKey.replace(':container', ':image');
    const priceKey = containerKey.replace(':container', ':price');

    const before = await editorRectsFor(frame, [photoKey, priceKey]);

    await setInspectorWidth(page, 900);
    await setProportional(page, false);
    await heightField(page).fill('700');
    await heightField(page).press('Tab');
    await page.waitForTimeout(600);

    const containerAfter = await editorRectsFor(frame, [containerKey]);
    expect(containerAfter[containerKey].width, 'el contenedor sí creció').toBeGreaterThan(800);
    expect(containerAfter[containerKey].height, 'el contenedor sí creció').toBeGreaterThan(600);

    const after = await editorRectsFor(frame, [photoKey, priceKey]);
    expectSameRect(before[photoKey], after[photoKey], 'foto: mismo tamaño tras agrandar el contenedor');
    expectSameRect(before[priceKey], after[priceKey], 'precio: misma posición/tamaño tras agrandar el contenedor');

    await page.waitForTimeout(2000);

    const publicRects = await publicRectsFor(page, 1440, [containerKey, photoKey, priceKey]);
    expectSameRect(after[photoKey], publicRects[photoKey], 'foto: editor vs /menu tras redimensionar el contenedor');
    expectSameRect(after[priceKey], publicRects[priceKey], 'precio: editor vs /menu tras redimensionar el contenedor');
});
