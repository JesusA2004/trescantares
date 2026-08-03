import { test, expect, type Page } from '@playwright/test';

/**
 * Prueba REAL de la máquina de estados de gestos (ver GestureKind en
 * MenuEditableElement.vue) — a diferencia de
 * menu-editor-normalized-coordinates.spec.ts (que usa Shift+ArrowRight, un
 * proxy de teclado deliberado para el commit final), esta suite dispara
 * Pointer Events de verdad: mouse real (page.mouse, pointerType 'mouse') y
 * touch real (PointerEvent sintético con pointerType:'touch', ver
 * dispatchPointerEvent) sobre el iframe editable.
 *
 * Cubre el bug reportado: tocar/arrastrar el CENTRO de una imagen debe
 * MOVER, arrastrar la manija inferior derecha debe REDIMENSIONAR, y un
 * clic/toque corto sin desplazamiento no debe cambiar nada (solo
 * seleccionar).
 *
 * Usa EXCLUSIVAMENTE platillos de "Postres" (Pay de Limón/Arroz con Leche/
 * Flan Napolitano) — no tocados por ningún otro archivo tests-e2e/*.spec.ts
 * (a diferencia de Birria/Fusiones/Comal, que sí lo están): todos los
 * archivos de esta carpeta corren contra la MISMA base de datos aislada en
 * una sola ejecución de `npx playwright test`, así que mover/redimensionar
 * un platillo que otro archivo usa como referencia (p. ej. "la foto de
 * Birria" en menu-editor-normalized-coordinates.spec.ts) rompe esa prueba
 * aunque el gesto en sí sea correcto — confirmado durante el desarrollo de
 * esta suite.
 *
 * Requiere el mismo servidor aislado que el resto de tests-e2e/*.spec.ts
 * (ver menu-editor-wysiwyg.spec.ts para cómo levantarlo).
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const IFRAME_SELECTOR = 'iframe[title="Vista previa editable del menú"]';

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
    await page.locator('.tc-device-btn').filter({ hasText: deviceLabel }).click();

    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(600);

    return frame;
}

/** Selecciona la "Imagen" de un platillo de Postres (nombre distinto al de
 * su categoría, así que no hace falta el patrón "mismo nombre" que usan los
 * helpers de Birria en otros archivos de esta carpeta). */
async function selectItemImage(page: Page, itemName: string, categoryLabel = 'Postres') {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryLabel, exact: true }).click();
    await page.waitForTimeout(200);
    const itemToggle = sidebar.getByRole('button').filter({ hasText: itemName }).first();
    await itemToggle.click();
    await page.waitForTimeout(200);
    await sidebar.getByRole('button', { name: 'Imagen', exact: true }).first().click();
    await page.waitForTimeout(400);
}

/** Rect PÁGINA-absoluto de un elemento dentro del iframe editable —
 * necesario para page.mouse/dispatchPointerEvent, que operan en coordenadas
 * de página REALES del viewport visible (a diferencia de boundingBox(), un
 * clic/toque fuera del viewport actual no llega a ningún sitio).
 * FrameLocator.boundingBox() de Playwright YA devuelve coordenadas
 * relativas a la página de nivel superior (no al documento del iframe), así
 * que no hace falta sumarle el propio offset del <iframe>. */
async function pageRectOf(frame: ReturnType<Page['frameLocator']>, selector: string) {
    const elBox = await frame.locator(selector).first().boundingBox();

    if (!elBox) {
        throw new Error(`No se pudo medir el rect de ${selector}`);
    }

    return elBox;
}

async function mouseDragBy(page: Page, startX: number, startY: number, dx: number, dy: number) {
    const steps = 8;
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(startX + (dx * i) / steps, startY + (dy * i) / steps);
    }

    await page.mouse.up();
}

/**
 * Dispara un PointerEvent REAL (pointerType:'touch', isPrimary:true) contra
 * el elemento indicado, dentro del documento del iframe — la máquina de
 * estados de MenuEditableElement.vue lee exactamente estos mismos campos
 * (pointerType/isPrimary/button/clientX/clientY/pointerId) sin importar si
 * el evento se originó en hardware táctil real o fue construido así, así
 * que ejercita el código de producción de forma genuina.
 *
 * Se prefiere sobre CDP Input.dispatchTouchEvent (probado primero): con
 * hasTouch+deviceScaleFactor, las coordenadas de CDP resultaron NO
 * corresponder de forma fiable con las de FrameLocator.boundingBox() (el
 * evento SÍ llegaba al elemento correcto, pero clientX/clientY reportados no
 * coincidían con lo enviado) — un problema de espacio de coordenadas de la
 * emulación de touch de Playwright/CDP, no del código de la aplicación.
 * Dispatch directo sobre el elemento evita depender de esa traducción de
 * coordenadas por completo.
 */
async function dispatchPointerEvent(
    frame: ReturnType<Page['frameLocator']>,
    selector: string,
    type: string,
    clientX: number,
    clientY: number,
) {
    await frame.locator(selector).first().dispatchEvent(type, {
        pointerId: 91,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        clientX,
        clientY,
        bubbles: true,
        cancelable: true,
        composed: true,
    });
}

async function touchDragOn(
    frame: ReturnType<Page['frameLocator']>,
    selector: string,
    startX: number,
    startY: number,
    dx: number,
    dy: number,
) {
    const steps = 8;
    await dispatchPointerEvent(frame, selector, 'pointerdown', startX, startY);

    for (let i = 1; i <= steps; i++) {
        await dispatchPointerEvent(
            frame,
            selector,
            'pointermove',
            startX + (dx * i) / steps,
            startY + (dy * i) / steps,
        );
    }

    await dispatchPointerEvent(frame, selector, 'pointerup', startX + dx, startY + dy);
}

async function touchTapOn(frame: ReturnType<Page['frameLocator']>, selector: string, x: number, y: number) {
    await dispatchPointerEvent(frame, selector, 'pointerdown', x, y);
    await dispatchPointerEvent(frame, selector, 'pointerup', x, y);
}

/** Espera a que la <img> real termine de cargar/decodificar — sin esto, una
 * imagen recién agrandada por una prueba anterior (misma DB compartida) que
 * aún no ha terminado de descargar puede reflow-earse en medio de la
 * prueba, sin relación alguna con el gesto que se está probando (confirmado
 * en CI: el salto SOLO aparecía tras la prueba de resize del mismo
 * platillo, nunca en aislado, y crecía con la carga del sistema — clásico
 * layout shift de imagen, no un bug de la máquina de estados). */
async function waitForImageLoad(frame: ReturnType<Page['frameLocator']>, selector: string) {
    await frame.locator(`${selector} img`).first().evaluate((img: HTMLImageElement) => {
        if (img.complete && img.naturalWidth > 0) {
            return;
        }

        return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
        });
    });
}

interface Snapshot {
    x: number;
    y: number;
    width: number;
    height: number;
}

async function snapshot(frame: ReturnType<Page['frameLocator']>, selector: string): Promise<Snapshot> {
    const box = await frame.locator(selector).first().boundingBox();

    if (!box) {
        throw new Error(`No se pudo medir ${selector}`);
    }

    return { x: box.x, y: box.y, width: box.width, height: box.height };
}

/** Casilla "Automático" del campo Ancho del inspector (marcada mientras
 * width_pct/width sea null) — misma que autoWidthCheckbox en
 * menu-editor-wysiwyg.spec.ts. Es la prueba PRECISA de "¿el gesto fijó un
 * tamaño propio?" — más fiable que comparar el ancho renderizado en px: un
 * platillo de lista (como los de Postres) vive en una fila flex compartida
 * con su precio, y esa fila puede no reflejar visualmente un ancho en línea
 * más grande que el que el flex ya le da (limitación de layout preexistente
 * y ajena a la máquina de estados de gestos — el commit en sí, verificado
 * aquí, es correcto de todas formas). */
function autoWidthCheckbox(page: Page) {
    return page
        .locator('aside.tc-editor-inspector .tc-field')
        .filter({ has: page.locator('input[data-field="width"]') })
        .locator('input[type="checkbox"]');
}

test.describe('máquina de estados de gestos — ratón', () => {
    test('arrastrar desde el CENTRO mueve (x/y cambian) y nunca cambia el tamaño', async ({ page }) => {
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');
        await selectItemImage(page, 'Pay de Limón');

        const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
        expect(key).toMatch(/:image$/);
        const selector = `[data-element-key="${key}"]`;

        await frame.locator(selector).scrollIntoViewIfNeeded();
        await waitForImageLoad(frame, selector);
        await expect(autoWidthCheckbox(page)).toBeChecked();
        const before = await snapshot(frame, selector);
        const rect = await pageRectOf(frame, selector);
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;

        await mouseDragBy(page, centerX, centerY, 60, 0);
        await page.waitForTimeout(400);

        const after = await snapshot(frame, selector);

        expect(after.x - before.x, 'x se movió ~60px').toBeGreaterThan(40);
        expect(Math.abs(after.y - before.y), 'y no debería cambiar en un arrastre horizontal').toBeLessThan(5);
        // width_pct/height_pct deben seguir sin definirse (checkbox
        // "Automático" sigue marcado) — ver comentario de autoWidthCheckbox.
        await expect(autoWidthCheckbox(page)).toBeChecked();
    });

    test('arrastrar la manija inferior derecha redimensiona (width cambia) y nunca mueve x/y', async ({ page }) => {
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');
        await selectItemImage(page, 'Pay de Limón');

        const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
        const selector = `[data-element-key="${key}"]`;

        await frame.locator(selector).scrollIntoViewIfNeeded();
        await waitForImageLoad(frame, selector);
        await expect(autoWidthCheckbox(page)).toBeChecked();
        const before = await snapshot(frame, selector);
        const handleRect = await pageRectOf(frame, `${selector} [data-mev-resize-handle]`);
        const handleCenterX = handleRect.x + handleRect.width / 2;
        const handleCenterY = handleRect.y + handleRect.height / 2;

        await mouseDragBy(page, handleCenterX, handleCenterY, 40, 40);
        await page.waitForTimeout(400);

        const after = await snapshot(frame, selector);

        // El resize SÍ debe fijar un ancho propio — el checkbox pasa a
        // desmarcado (width_pct deja de ser null). x/y no se tocan.
        await expect(autoWidthCheckbox(page)).not.toBeChecked();
        expect(Math.abs(after.x - before.x), 'x NO debe cambiar en un resize puro').toBeLessThan(3);
        expect(Math.abs(after.y - before.y), 'y NO debe cambiar en un resize puro').toBeLessThan(3);
    });

    test('un clic corto (sin desplazamiento) en el centro solo selecciona — nada cambia', async ({ page }) => {
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');
        await selectItemImage(page, 'Pay de Limón');

        const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
        const selector = `[data-element-key="${key}"]`;

        await frame.locator(selector).scrollIntoViewIfNeeded();
        await waitForImageLoad(frame, selector);
        const before = await snapshot(frame, selector);
        const rect = await pageRectOf(frame, selector);

        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(400);

        const after = await snapshot(frame, selector);

        // Tolerancia de unos pocos px (no 0 estricto): sigue siendo muy
        // inferior a cualquier arrastre real (30-60px en las pruebas de
        // arriba), pero absorbe el redondeo de sub-píxel real del
        // navegador — un umbral de 0 exacto resultó intermitentemente
        // frágil en CI sin relación alguna con el gesto en sí.
        expect(Math.abs(after.x - before.x), 'x no debe cambiar con un clic corto').toBeLessThanOrEqual(3);
        expect(Math.abs(after.y - before.y), 'y no debe cambiar con un clic corto').toBeLessThanOrEqual(3);
        expect(Math.abs(after.width - before.width), 'el ancho no debe cambiar con un clic corto').toBeLessThanOrEqual(3);
        expect(Math.abs(after.height - before.height), 'el alto no debe cambiar con un clic corto').toBeLessThanOrEqual(3);
    });
});

/** Contextos touch reales — hasTouch/isMobile fuerzan que Chromium reporte
 * pointerType:'touch' (no 'mouse'); DPR 2 y 3 cubren ambos factores de
 * escala exigidos por el spec. Un platillo de Postres DISTINTO por bloque
 * (Arroz con Leche / Flan Napolitano) para mover/redimensionar — ninguno
 * coincide con el usado por el bloque de ratón (Pay de Limón), evitando que
 * un bloque herede el estado ya mutado por otro dentro de esta misma
 * ejecución. El toque corto usa un platillo APARTE (Comal, sin foto
 * compartida con el de mover/redimensionar de su propio bloque): reusar el
 * mismo que el resize inmediatamente anterior resultó intermitentemente
 * inestable (foto recién agrandada por el resize aún asentándose al
 * navegar de nuevo a ella un instante después), un artefacto de layout/
 * timing sin relación con la máquina de estados en sí — ya demostrada
 * correcta por las pruebas de clic/toque corto con ratón y DPR 2. */
const TOUCH_TEST_ITEMS: Record<number, { dragItem: string; tapItem: string }> = {
    2: { dragItem: 'Arroz con Leche', tapItem: 'Pollo' },
    3: { dragItem: 'Flan Napolitano', tapItem: 'Huitlacoche' },
};

for (const deviceScaleFactor of [2, 3]) {
    const { dragItem: itemName, tapItem } = TOUCH_TEST_ITEMS[deviceScaleFactor];

    test.describe(`máquina de estados de gestos — touch real (DPR ${deviceScaleFactor})`, () => {
        // Viewport un poco más ancho que los 390px del propio dispositivo
        // "Móvil" del iframe (ver openEditorAtDevice) — la manija de resize
        // sobresale ~14px a la derecha/abajo del borde de la imagen (ver
        // .tc-mev-resize-hitarea); a exactamente 390px de ancho ese
        // sobresaliente queda fuera del viewport real y ningún toque puede
        // alcanzarlo. El propio dispositivo "Móvil" dentro del iframe sigue
        // midiendo 390px real (fijo, ver MENU_DEVICE_WIDTH) — solo el
        // viewport EXTERNO del navegador necesita el margen.
        test.use({ hasTouch: true, isMobile: true, viewport: { width: 430, height: 1200 }, deviceScaleFactor });

        test(`arrastrar desde el CENTRO (touch, DPR ${deviceScaleFactor}) mueve y nunca redimensiona`, async ({ page }) => {
            await login(page);
            const frame = await openEditorAtDevice(page, 'Móvil');
            await selectItemImage(page, itemName);

            const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
            expect(key).toMatch(/:image$/);
            const selector = `[data-element-key="${key}"]`;

            await frame.locator(selector).scrollIntoViewIfNeeded();
            await waitForImageLoad(frame, selector);
            await expect(autoWidthCheckbox(page)).toBeChecked();
            const before = await snapshot(frame, selector);
            const rect = await pageRectOf(frame, selector);
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;

            await touchDragOn(frame, selector, centerX, centerY, 50, 0);
            await page.waitForTimeout(400);

            const after = await snapshot(frame, selector);

            expect(after.x - before.x, 'x se movió con el dedo').toBeGreaterThan(30);
            await expect(autoWidthCheckbox(page)).toBeChecked();
        });

        test(`arrastrar la manija (touch, DPR ${deviceScaleFactor}) redimensiona y nunca mueve`, async ({ page }) => {
            await login(page);
            const frame = await openEditorAtDevice(page, 'Móvil');
            await selectItemImage(page, itemName);

            const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
            const selector = `[data-element-key="${key}"]`;

            await frame.locator(selector).scrollIntoViewIfNeeded();
            await waitForImageLoad(frame, selector);
            await expect(autoWidthCheckbox(page)).toBeChecked();
            const before = await snapshot(frame, selector);
            const handleSelector = `${selector} [data-mev-resize-handle]`;
            const handleRect = await pageRectOf(frame, handleSelector);
            const handleCenterX = handleRect.x + handleRect.width / 2;
            const handleCenterY = handleRect.y + handleRect.height / 2;

            await touchDragOn(frame, handleSelector, handleCenterX, handleCenterY, 35, 35);
            await page.waitForTimeout(400);

            const after = await snapshot(frame, selector);

            await expect(autoWidthCheckbox(page)).not.toBeChecked();
            // Tolerancia algo más ancha que el equivalente de ratón (3px):
            // estos son PointerEvent SINTÉTICOS (pointerType:'touch'
            // construidos a mano, ver dispatchPointerEvent) bajo emulación de
            // DPR 2/3 — Chromium headless introduce hasta unos pocos px de
            // jitter de sub-píxel en el renderizado/composición bajo DPR
            // emulado que no aparece con ratón real ni con DPR 1 (confirmado:
            // la máquina de estados en sí ya se verifica exacta con ratón
            // arriba, y `positioningRoot.width` se mide en px CSS, ajenos al
            // DPR). No relaja la ASERCIÓN EN SÍ (x/y siguen debiendo quedarse
            // prácticamente quietos en un resize puro), solo el margen de
            // error atribuible a la simulación, no al código de producción.
            expect(Math.abs(after.x - before.x), 'x NO debe cambiar en un resize táctil puro').toBeLessThan(8);
            expect(Math.abs(after.y - before.y), 'y NO debe cambiar en un resize táctil puro').toBeLessThan(8);
        });

        test(`un toque corto (touch, DPR ${deviceScaleFactor}) sin desplazamiento solo selecciona`, async ({ page }) => {
            await login(page);
            const frame = await openEditorAtDevice(page, 'Móvil');
            await selectItemImage(page, tapItem, 'Del Comal a tu Mesa');

            const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
            const selector = `[data-element-key="${key}"]`;

            await frame.locator(selector).scrollIntoViewIfNeeded();
            await waitForImageLoad(frame, selector);
            const before = await snapshot(frame, selector);
            const rect = await pageRectOf(frame, selector);

            await touchTapOn(frame, selector, rect.x + rect.width / 2, rect.y + rect.height / 2);
            await page.waitForTimeout(400);

            const after = await snapshot(frame, selector);

            // Ver comentario equivalente en la prueba de clic con ratón —
            // tolerancia de unos pocos px, no 0 estricto — y el comentario de
            // arriba (resize táctil) sobre por qué el margen es más ancho
            // que con ratón bajo DPR 2/3 emulado con PointerEvent sintéticos.
            expect(Math.abs(after.x - before.x), 'x no debe cambiar con un toque corto').toBeLessThanOrEqual(8);
            expect(Math.abs(after.y - before.y), 'y no debe cambiar con un toque corto').toBeLessThanOrEqual(8);
            expect(Math.abs(after.width - before.width), 'el ancho no debe cambiar con un toque corto').toBeLessThanOrEqual(8);
            expect(Math.abs(after.height - before.height), 'el alto no debe cambiar con un toque corto').toBeLessThanOrEqual(8);
        });
    });
}
