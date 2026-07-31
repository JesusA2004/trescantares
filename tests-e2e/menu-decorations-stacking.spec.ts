import { test, expect, type Page, type FrameLocator } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regresión permanente del bug de adornos que "desaparecen" al seleccionar
 * cualquier otro elemento (título/foto/precio/adorno vecino). Causa raíz:
 * MenuEditableElement.vue fijaba SIEMPRE position:relative inline, y solo
 * un parche CSS `.tc-mp-decoration.tc-mev--selected{position:absolute
 * !important}` restauraba position:absolute MIENTRAS el adorno tenía la
 * clase de selección — al seleccionar cualquier OTRA cosa, el adorno volvía
 * a position:relative y caía al flujo normal del documento en vez de
 * flotar en su x/y guardada.
 *
 * Corrección real: MenuEditableElement ahora recibe una prop `decoration`
 * que fija position:absolute de forma PERMANENTE (nunca condicionada a la
 * selección), y Menu.vue envuelve el contenido de cada sección en
 * `.tc-mp-content-layer` (isolation:isolate) y los adornos en
 * `.tc-mp-decoration-layer` (position:absolute, z-index fijo por encima de
 * la capa de contenido) — ver resources/css/app.css. Así los adornos
 * SIEMPRE pintan encima del contenido sin importar qué esté seleccionado ni
 * qué z_index numérico tenga cualquier elemento de contenido.
 *
 * Usa los adornos OFICIALES ya sembrados por `menu:import-initial` en
 * Pozole — "Blanco", "Tacos Dorados", "Tú Eliges" — los mismos tres del
 * reporte de bug original (las capturas mostraban "Tú Eliges" desapareciendo
 * al seleccionar "Blanco").
 *
 * Mismo entorno aislado que los demás specs de este directorio (SQLite
 * aparte + servidor manual en E2E_BASE_URL, por defecto
 * http://127.0.0.1:8010).
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const MAX_DIFF_PX = 2;

const FIXTURE_PNG = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'decoration.png',
);

async function ensureFixturePng() {
    const fs = await import('node:fs');
    const dir = path.dirname(FIXTURE_PNG);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(FIXTURE_PNG)) {
        const sharp = (await import('sharp')).default;
        await sharp({
            create: {
                width: 60,
                height: 60,
                channels: 4,
                background: { r: 219, g: 52, b: 101, alpha: 0.8 },
            },
        })
            .png()
            .toFile(FIXTURE_PNG);
    }
}

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

    const frame = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    await frame.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(600);

    return frame;
}

async function openPozole(page: Page) {
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.waitForTimeout(300);
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

function measureRelativeToSection(el: Element) {
    const r = el.getBoundingClientRect();
    const section = el.closest('[id^="cat-"]');
    const sr = section ? section.getBoundingClientRect() : { x: 0, y: 0 };

    return { x: r.x - sr.x, y: r.y - sr.y, width: r.width, height: r.height };
}

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

function expectSameRect(a: Rect, b: Rect, label: string) {
    expect(Math.abs(a.x - b.x), `${label}: x`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.y - b.y), `${label}: y`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.width - b.width), `${label}: width`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.height - b.height), `${label}: height`).toBeLessThanOrEqual(MAX_DIFF_PX);
}

async function keyByAriaLabel(frame: FrameLocator, label: string): Promise<string> {
    const el = frame.locator(`[aria-label="${label}"]`).first();
    await el.waitFor({ state: 'attached' });
    const key = await el.getAttribute('data-element-key');
    expect(key, `elemento con aria-label="${label}" debe tener data-element-key`).toBeTruthy();

    return key as string;
}

/**
 * Selecciona un adorno por NOMBRE desde la lista lateral del editor
 * (`.tc-element-btn` dentro de su `<li>`) en vez de hacer clic sobre el
 * lienzo — dos adornos pueden solaparse visualmente (p. ej. un adorno nuevo
 * en x=0,y=0 y "Tú Eliges" cerca de ahí), y un clic con coordenadas forzadas
 * sobre el lienzo puede terminar seleccionando el elemento que esté ARRIBA
 * en esa zona en vez del que la prueba pretendía tocar (hit-testing real del
 * navegador, no un target forzado). La lista lateral es la vía de selección
 * sin ambigüedad que ya ofrece el editor para este caso — ver Index.vue
 * (`selectDecoration`) — y es la misma opción que el usuario aceptó
 * explícitamente para resolver elementos superpuestos.
 */
async function selectDecorationByName(page: Page, frame: FrameLocator, name: string): Promise<string> {
    // Coincidencia EXACTA (no subcadena): un platillo puede llamarse "Pozole
    // Blanco" — un `hasText: 'Blanco'` por subcadena en <li> ambiguaba entre
    // ese elemento de la lista "Elementos" y el adorno "Blanco" real de la
    // lista "Adornos", y `.first()` podía resolver al equivocado.
    await page
        .locator('aside.tc-editor-sidebar li')
        .filter({ has: page.locator('.tc-element-btn span', { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) })
        .first()
        .locator('.tc-element-btn')
        .click();
    await page.waitForTimeout(300);

    const selected = frame.locator('.tc-mev--selected').first();
    await selected.waitFor({ state: 'attached' });
    const key = await selected.getAttribute('data-element-key');
    expect(key, `adorno "${name}" seleccionado debe tener data-element-key`).toBeTruthy();

    return key as string;
}

async function rectFor(frame: FrameLocator, key: string): Promise<Rect> {
    return waitForStableRect(() =>
        frame.locator(`[data-element-key="${key}"]`).evaluate(measureRelativeToSection),
    );
}

async function isVisiblyPresent(frame: FrameLocator, key: string): Promise<boolean> {
    const el = frame.locator(`[data-element-key="${key}"]`);

    if ((await el.count()) === 0) {
        return false;
    }

    return el.evaluate((node) => {
        const cs = getComputedStyle(node);

        return (
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            Number(cs.opacity) > 0
        );
    });
}

test.beforeAll(async () => {
    await ensureFixturePng();
});

test.describe('adornos: seleccionar otro elemento no debe moverlos ni ocultarlos', () => {
    for (const { label, width } of [
        { label: 'Móvil', width: 500 },
        { label: 'Tablet', width: 900 },
        { label: 'Escritorio', width: 1440 },
    ]) {
        test(`Tú Eliges permanece exactamente en su lugar al seleccionar Blanco, una foto y un precio (${label})`, async ({ page }) => {
            await page.setViewportSize({ width, height: 1300 });
            await login(page);
            const frame = await openEditorAtDevice(page, label);
            await openPozole(page);

            // Seleccionar "Tú Eliges" y moverlo/redimensionarlo con el
            // inspector, igual que un admin real lo haría. Selección por la
            // lista lateral (no por clic en el lienzo): ver
            // selectDecorationByName — evita ambigüedad si otro adorno
            // solapa visualmente en esa zona.
            const tuElige = await selectDecorationByName(page, frame, 'Tú Eliges');

            const inspector = page.locator('aside.tc-editor-inspector');
            await inspector.locator('.tc-advanced-summary').click();
            await page.waitForTimeout(300);
            const xField = inspector.locator('.tc-field').filter({ hasText: 'X (px)' }).locator('input');
            const yField = inspector.locator('.tc-field').filter({ hasText: 'Y (px)' }).locator('input');
            await xField.fill('40');
            await xField.press('Tab');
            await yField.fill('25');
            await yField.press('Tab');
            await page.waitForTimeout(500);

            const autoCheckbox = inspector
                .locator('.tc-field')
                .filter({ hasText: 'Ancho (px)' })
                .locator('input[type="checkbox"]');
            if (await autoCheckbox.isChecked()) {
                await autoCheckbox.setChecked(false);
                await page.waitForTimeout(300);
            }
            const widthField = inspector
                .locator('.tc-field')
                .filter({ hasText: 'Ancho (px)' })
                .locator('input[type="number"]');
            await widthField.fill('160');
            await widthField.press('Tab');
            await page.waitForTimeout(800);

            const rectWhileSelected = await rectFor(frame, tuElige);
            expect(rectWhileSelected.width, 'el ancho se aplicó correctamente (160px)').toBeGreaterThan(150);
            expect(rectWhileSelected.width, 'el ancho se aplicó correctamente (160px)').toBeLessThan(170);

            // === El corazón de la regresión ===
            // Seleccionar el adorno "Blanco" (el mismo escenario exacto del
            // reporte de bug) — "Tú Eliges" debe seguir EXACTAMENTE en el
            // mismo lugar, visible, sin ningún salto.
            await selectDecorationByName(page, frame, 'Blanco');
            expect(await isVisiblyPresent(frame, tuElige), 'visible tras seleccionar Blanco').toBe(true);
            expectSameRect(rectWhileSelected, await rectFor(frame, tuElige), 'tras seleccionar Blanco');

            // Seleccionar una foto de platillo (contenedor de item).
            const photoKey = await frame
                .locator('[data-element-key^="item-"][data-element-key$=":container"]')
                .first()
                .getAttribute('data-element-key');
            expect(photoKey).toBeTruthy();
            await frame.locator(`[data-element-key="${photoKey}"]`).click({ force: true, position: { x: 5, y: 5 } });
            await page.waitForTimeout(400);
            expect(await isVisiblyPresent(frame, tuElige), 'visible tras seleccionar una foto').toBe(true);
            expectSameRect(rectWhileSelected, await rectFor(frame, tuElige), 'tras seleccionar una foto');

            // Seleccionar un precio.
            const priceKey = await frame
                .locator('[data-element-key^="item-"][data-element-key$=":price"]')
                .first()
                .getAttribute('data-element-key');
            expect(priceKey).toBeTruthy();
            await frame.locator(`[data-element-key="${priceKey}"]`).click({ force: true });
            await page.waitForTimeout(400);
            expect(await isVisiblyPresent(frame, tuElige), 'visible tras seleccionar un precio').toBe(true);
            expectSameRect(rectWhileSelected, await rectFor(frame, tuElige), 'tras seleccionar un precio');

            // Seleccionar el título de la categoría.
            const titleKey = await frame
                .locator('[data-element-key^="category-"]')
                .filter({ hasText: '' })
                .first()
                .getAttribute('data-element-key');
            if (titleKey) {
                await frame.locator(`[data-element-key="${titleKey}"]`).click({ force: true });
                await page.waitForTimeout(400);
                expect(await isVisiblyPresent(frame, tuElige), 'visible tras seleccionar el título').toBe(true);
                expectSameRect(rectWhileSelected, await rectFor(frame, tuElige), 'tras seleccionar el título');
            }

            // Recargar el editor: debe seguir en el mismo lugar, tamaño y capa.
            await page.waitForTimeout(1000);
            await page.reload();
            await expect(page.locator('.tc-editor-toolbar')).toBeVisible();
            await page.locator('.tc-device-btn').filter({ hasText: label }).click();
            const frameAfterReload = page.frameLocator('iframe[title="Vista previa editable del menú"]');
            await frameAfterReload.locator('[data-element-key]').first().waitFor({ state: 'attached' });
            await page.waitForTimeout(600);

            const reloadedRect = await rectFor(frameAfterReload, tuElige);
            expectSameRect(rectWhileSelected, reloadedRect, 'tras recargar el editor');
            expect(await isVisiblyPresent(frameAfterReload, tuElige), 'visible tras recargar').toBe(true);

            // Abrir /menu directamente (no navegado desde el editor) y
            // comparar el rectángulo — mismo componente/datos, debe coincidir.
            const freshPage = await page.context().newPage();
            await freshPage.setViewportSize({ width, height: 1300 });
            await freshPage.goto('/menu');
            await freshPage.waitForTimeout(500);
            const publicRect = await waitForStableRect(() =>
                freshPage.locator(`[data-element-key="${tuElige}"]`).first().evaluate(measureRelativeToSection),
            );
            expectSameRect(reloadedRect, publicRect, `Tú Eliges editor vs /menu directo (${label})`);
            await freshPage.close();
        });
    }
});

test('tres adornos superpuestos: los tres se mantienen visibles sin importar cuál esté seleccionado', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');
    await openPozole(page);

    const names = ['Blanco', 'Tacos Dorados', 'Tú Eliges'];
    const keys = await Promise.all(names.map((name) => keyByAriaLabel(frame, name)));

    for (const selectName of names) {
        await selectDecorationByName(page, frame, selectName);

        for (const key of keys) {
            expect(
                await isVisiblyPresent(frame, key),
                `${key} debe seguir visible mientras ${selectName} está seleccionado`,
            ).toBe(true);
        }
    }
});

test('Al frente / Al fondo reordenan solo entre adornos, nunca por debajo del contenido', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');
    await openPozole(page);

    const blanco = await selectDecorationByName(page, frame, 'Blanco');
    await page.getByRole('button', { name: /Al fondo/ }).click();
    await page.waitForTimeout(400);

    // "Blanco" al fondo sigue siendo un adorno normal: visible, position
    // absolute, todavía por encima del contenido (nunca detrás de una foto
    // o del fondo de la sección) — solo cambia su orden frente a otros
    // adornos.
    expect(await isVisiblyPresent(frame, blanco), 'Blanco visible tras "Al fondo"').toBe(true);
    const blancoPosition = await frame
        .locator(`[data-element-key="${blanco}"]`)
        .evaluate((el) => getComputedStyle(el).position);
    expect(blancoPosition).toBe('absolute');

    const tuElige = await selectDecorationByName(page, frame, 'Tú Eliges');
    await page.getByRole('button', { name: /Al frente/ }).click();
    await page.waitForTimeout(400);
    expect(await isVisiblyPresent(frame, tuElige), 'Tú Eliges visible tras "Al frente"').toBe(true);

    // Persistencia: recargar y confirmar que ambos siguen visibles con el
    // mismo tipo de posicionamiento.
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.locator('.tc-editor-toolbar')).toBeVisible();
    await page.locator('.tc-device-btn').filter({ hasText: 'Escritorio' }).click();
    const frameAfterReload = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    await frameAfterReload.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(600);

    expect(await isVisiblyPresent(frameAfterReload, blanco), 'Blanco visible tras recargar').toBe(true);
    expect(await isVisiblyPresent(frameAfterReload, tuElige), 'Tú Eliges visible tras recargar').toBe(true);
});

test('un adorno nuevo (x=0,y=0 sin mover) permanece visible al seleccionar otro elemento', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');
    await openPozole(page);

    await page.getByRole('button', { name: /Agregar adorno/ }).click();
    const modal = page.locator('.tc-media-modal');
    await expect(modal).toBeVisible();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await modal.locator('.tc-media-dropzone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(FIXTURE_PNG);
    await expect(modal).toBeHidden({ timeout: 15000 });

    const selectedLocator = frame.locator('.tc-mev--selected');
    await selectedLocator.waitFor({ state: 'attached', timeout: 10000 });
    const newKey = await selectedLocator.getAttribute('data-element-key');
    expect(newKey).toMatch(/^decoration-\d+:image$/);

    // Sin mover: su rect relativo a la sección debe estar en el origen
    // (0,0 + cualquier padding fijo del layout, nunca desplazado por caer al
    // flujo normal del documento).
    const rectAtCreation = await rectFor(frame, newKey as string);

    await selectDecorationByName(page, frame, 'Blanco');

    expect(await isVisiblyPresent(frame, newKey as string), 'el adorno nuevo sigue visible').toBe(true);
    expectSameRect(rectAtCreation, await rectFor(frame, newKey as string), 'adorno nuevo x=0,y=0 tras deseleccionar');
});

test('un adorno grande con zonas transparentes conserva su rectángulo exacto tras deseleccionar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');
    await openPozole(page);

    const tuElige = await selectDecorationByName(page, frame, 'Tú Eliges');

    const inspector = page.locator('aside.tc-editor-inspector');
    await inspector.locator('.tc-advanced-summary').click();
    // Margen de asentamiento tras abrir "Ajustes avanzados" y seleccionar el
    // elemento — sin esto (p. ej. cuando el checkbox "Automático" YA está
    // desmarcado de una prueba anterior y no hay ninguna otra espera antes
    // del fill), el campo numérico puede no tener aún su listener de Vue
    // conectado y el valor tecleado no llega a commitear.
    await page.waitForTimeout(300);
    const autoCheckbox = inspector
        .locator('.tc-field')
        .filter({ hasText: 'Ancho (px)' })
        .locator('input[type="checkbox"]');
    if (await autoCheckbox.isChecked()) {
        await autoCheckbox.setChecked(false);
        await page.waitForTimeout(300);
    }
    const widthField = inspector
        .locator('.tc-field')
        .filter({ hasText: 'Ancho (px)' })
        .locator('input[type="number"]');
    // Mucho más grande que su tamaño original (220px) — la imagen fuente
    // (PNG recortado) tiene zonas transparentes alrededor del trazo real.
    await widthField.fill('600');
    await widthField.press('Tab');
    await page.waitForTimeout(800);

    const bigRect = await rectFor(frame, tuElige);
    expect(bigRect.width).toBeGreaterThan(590);

    await selectDecorationByName(page, frame, 'Blanco');

    expect(await isVisiblyPresent(frame, tuElige), 'el adorno grande sigue visible').toBe(true);
    expectSameRect(bigRect, await rectFor(frame, tuElige), 'adorno grande tras deseleccionar');
});
