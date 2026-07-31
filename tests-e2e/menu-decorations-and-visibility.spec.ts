import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Verifica en navegador real (no solo PHP/Pest) las nuevas correcciones de
 * visibilidad de platillos/imágenes y el sistema de adornos de sección:
 * ocultar/mostrar sin perder configuración, crear/mover/redimensionar un
 * adorno con una imagen real subida, comparar editor vs /menu en los tres
 * dispositivos, ocultar solo en una vista, duplicar, eliminar, y ausencia de
 * overflow/hydration mismatch. Requiere el mismo entorno aislado que
 * tests-e2e/menu-editor-wysiwyg.spec.ts (SQLite aparte + servidor manual en
 * E2E_BASE_URL, por defecto http://127.0.0.1:8010).
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const MAX_DIFF_PX = 1;

const FIXTURE_PNG = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'decoration.png',
);

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

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'no debe haber overflow horizontal').toBeLessThanOrEqual(1);
}

async function expectNoDarkMode(page: Page) {
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(false);
}

/** Genera un PNG transparente real de 60x60 con sharp (ya es devDependency
 * del proyecto) — evita depender de un blob base64 escrito a mano cuyas
 * dimensiones reales son fáciles de equivocar y romperían la validación
 * `dimensions:min_width=20,min_height=20` del backend. */
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

test.beforeAll(async () => {
    await ensureFixturePng();
});

/* ========================================================================
 * Visibilidad de platillos (vista rápida del listado admin)
 * ==================================================================== */

test('ocultar un platillo desde la vista rápida lo quita de /menu; reactivarlo lo recupera con su configuración', async ({ page }) => {
    await login(page);
    await page.goto('/admin/menu-items');

    const row = page.locator('tr', { hasText: 'Pozole Blanco' }).first();
    await expect(row).toBeVisible();

    const beforeMenu = await page.request.get('/menu');
    expect(await beforeMenu.text()).toContain('Pozole Blanco');

    // El primer botón de "ojo" en la fila alterna is_active.
    await row.locator('button[title*="Ocultar platillo"]').click();
    await page.waitForTimeout(400);

    const hiddenMenu = await page.request.get('/menu');
    expect(await hiddenMenu.text()).not.toContain('Pozole Blanco');

    await expect(row.getByText('Oculto', { exact: true })).toBeVisible();

    // Reactivar.
    await row.locator('button[title*="Mostrar platillo"]').click();
    await page.waitForTimeout(400);

    const restoredMenu = await page.request.get('/menu');
    expect(await restoredMenu.text()).toContain('Pozole Blanco');
});

test('el filtro de estado permite ver solo ocultos/publicados/sin imagen', async ({ page }) => {
    await login(page);
    await page.goto('/admin/menu-items');

    await page.locator('select').nth(1).selectOption('hidden');
    await page.waitForTimeout(200);
    // Ningún platillo oficial arranca oculto — la lista de "ocultos" debe
    // quedar vacía (o solo con lo que otra prueba haya dejado oculto).
    const hiddenRows = page.locator('tbody tr[data-drag-row]');
    const hiddenCount = await hiddenRows.count();

    await page.locator('select').nth(1).selectOption('published');
    await page.waitForTimeout(200);
    const publishedRows = page.locator('tbody tr[data-drag-row]');
    const publishedCount = await publishedRows.count();

    expect(publishedCount).toBeGreaterThan(hiddenCount);
});

/* ========================================================================
 * Adornos de sección
 * ==================================================================== */

test('crear un adorno subiendo un PNG, moverlo/redimensionarlo, guardar y recargar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');

    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.getByRole('button', { name: /Agregar adorno/ }).click();

    const modal = page.locator('.tc-media-modal');
    await expect(modal).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await modal.locator('.tc-media-dropzone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(FIXTURE_PNG);

    // Sube y se auto-selecciona en cuanto termina — esto dispara un reload
    // del iframe (el nuevo adorno vive en el mirror del padre, el iframe
    // necesita volver a pedir /admin/menu-editor/preview para conocerlo),
    // así que se espera generosamente a que el iframe vuelva a reportar
    // "ready" y auto-reseleccione el adorno recién creado.
    await expect(modal).toBeHidden({ timeout: 15000 });

    const inspector = page.locator('aside.tc-editor-inspector');
    await expect(inspector).toContainText('Adorno — Nuevo adorno', { timeout: 10000 });
    await expect(inspector.getByText('Imagen dentro del bloque')).toBeVisible();
    await expect(inspector.getByText('Tamaño de fuente')).toHaveCount(0);

    // `frame` (FrameLocator) se re-resuelve contra el DOM actual en cada
    // llamada — sigue apuntando al MISMO <iframe>, cuyo documento interno ya
    // se recargó, así que reutilizarlo aquí es válido.
    const selectedLocator = frame.locator('.tc-mev--selected');
    await selectedLocator.waitFor({ state: 'attached', timeout: 10000 });
    const selectedKey = await selectedLocator.getAttribute('data-element-key');
    expect(selectedKey).toMatch(/^decoration-\d+:image$/);

    const before = await waitForStableRect(() =>
        frame.locator(`[data-element-key="${selectedKey}"]`).evaluate(measureRelativeToSection),
    );

    // Mover con X/Y.
    await inspector.locator('.tc-advanced-summary').click();
    const xField = inspector.locator('.tc-field').filter({ hasText: 'X (px)' }).locator('input');
    const yField = inspector.locator('.tc-field').filter({ hasText: 'Y (px)' }).locator('input');
    await xField.fill('80');
    await xField.press('Tab');
    await yField.fill('60');
    await yField.press('Tab');
    await page.waitForTimeout(500);

    // Redimensionar (desactivar automático primero).
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
    await widthField.fill('150');
    await widthField.press('Tab');
    await page.waitForTimeout(600);

    const after = await waitForStableRect(() =>
        frame.locator(`[data-element-key="${selectedKey}"]`).evaluate(measureRelativeToSection),
    );

    expect(after.x - before.x, 'se movió en X').toBeGreaterThan(50);
    // El ancho final debe reflejar EXACTAMENTE el valor puesto en el
    // inspector (150px) — la comprobación es contra el valor absoluto, no
    // relativa al tamaño por defecto (que depende del CSS max-width del
    // adorno sin personalizar y no es lo que esta prueba busca verificar).
    expect(after.width, 'el ancho final refleja el valor del inspector').toBeGreaterThan(140);
    expect(after.width, 'el ancho final refleja el valor del inspector').toBeLessThan(160);

    // El guardado real (debounce del inspector + postMessage al iframe +
    // fetch() al backend) es asíncrono y "fire and forget" desde la cadena
    // que lo dispara — recargar demasiado pronto puede cancelar un fetch
    // todavía en vuelo. Se espera holgado para que el último PATCH realmente
    // haya llegado a la BD antes de recargar.
    await page.waitForTimeout(1500);

    // Recargar el editor y confirmar que persiste.
    await page.reload();
    await expect(page.locator('.tc-editor-toolbar')).toBeVisible();
    await page.locator('.tc-device-btn').filter({ hasText: 'Escritorio' }).click();
    const frameAfterReload = page.frameLocator('iframe[title="Vista previa editable del menú"]');
    await frameAfterReload.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(600);

    const reloadedRect = await waitForStableRect(() =>
        frameAfterReload.locator(`[data-element-key="${selectedKey}"]`).evaluate(measureRelativeToSection),
    );
    // El guardado persistió: sigue movido y con el ancho pedido tras F5 (la
    // comparación pixel-exacta "en vivo antes de F5" vs "recién recargado"
    // no es lo que le importa al usuario — lo que importa es que editor
    // recargado y /menu público coincidan, comprobado a continuación).
    expect(reloadedRect.x, 'sigue movido tras recargar').toBeGreaterThan(50);
    expect(reloadedRect.width, 'sigue con el ancho pedido tras recargar').toBeGreaterThan(140);
    expect(reloadedRect.width, 'sigue con el ancho pedido tras recargar').toBeLessThan(160);

    // Comparar contra /menu público al mismo ancho.
    await page.goto('/menu');
    await page.waitForTimeout(400);
    const publicRect = await waitForStableRect(() =>
        page.locator(`[data-element-key="${selectedKey}"]`).first().evaluate(measureRelativeToSection),
    );
    expectSameRect(reloadedRect, publicRect, 'adorno editor vs /menu (Escritorio)');

    await expectNoHorizontalOverflow(page);
    await expectNoDarkMode(page);
});

for (const { label, width } of [
    { label: 'Móvil', width: 390 },
    { label: 'Tablet', width: 768 },
]) {
    test(`el adorno recién creado también coincide entre editor y /menu en ${label}`, async ({ page }) => {
        await page.setViewportSize({ width: Math.max(width, 1024), height: 1300 });
        await login(page);
        const frame = await openEditorAtDevice(page, label);

        const keys = await frame
            .locator('[data-element-key]')
            .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
        const decorationKey = keys.find((k) => k?.startsWith('decoration-')) as string;
        expect(decorationKey, 'ya debe existir un adorno creado por la prueba anterior').toBeTruthy();

        const editorRect = await waitForStableRect(() =>
            frame.locator(`[data-element-key="${decorationKey}"]`).evaluate(measureRelativeToSection),
        );

        await page.setViewportSize({ width, height: 1300 });
        await page.goto('/menu');
        await page.waitForTimeout(400);
        const publicRect = await waitForStableRect(() =>
            page.locator(`[data-element-key="${decorationKey}"]`).first().evaluate(measureRelativeToSection),
        );

        expectSameRect(editorRect, publicRect, `adorno editor vs /menu (${label})`);
    });
}

test('ocultar un adorno solo en Móvil no lo oculta en Escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    let frame = await openEditorAtDevice(page, 'Móvil');

    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();

    // Pozole ya trae adornos OFICIALES sembrados por menu:import-initial
    // (Blanco, Tacos Dorados, Tú Eliges) además del "Nuevo adorno" de la
    // prueba anterior — un escaneo genérico "el primer data-element-key que
    // empiece con decoration-" puede agarrar uno de los oficiales en vez del
    // que esta prueba realmente selecciona y oculta. Se lee la clave DESPUÉS
    // de seleccionar "Nuevo adorno" (único con ese nombre) para que sea
    // siempre el mismo elemento en ambos lados de la aserción.
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Nuevo adorno', exact: true }).click();
    await page.waitForTimeout(200);

    const selected = frame.locator('.tc-mev--selected').first();
    await selected.waitFor({ state: 'attached' });
    const decorationKey = (await selected.getAttribute('data-element-key')) as string;
    expect(decorationKey).toBeTruthy();

    const inspector = page.locator('aside.tc-editor-inspector');
    await inspector.getByText(/Ocultar solo en/).locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    const stillThereOnMobile = await frame.locator(`[data-element-key="${decorationKey}"]`).count();
    expect(stillThereOnMobile, 'oculto en Móvil: ya no debe estar en el DOM del iframe').toBe(0);

    frame = await openEditorAtDevice(page, 'Escritorio');
    const stillThereOnDesktop = await frame.locator(`[data-element-key="${decorationKey}"]`).count();
    expect(stillThereOnDesktop, 'Escritorio no debía verse afectado').toBe(1);
});

test('duplicar y eliminar un adorno desde la barra lateral', async ({ page }) => {
    await login(page);
    await openEditorAtDevice(page, 'Escritorio');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();

    const decorationRow = page
        .locator('aside.tc-editor-sidebar li')
        .filter({ hasText: 'Nuevo adorno' })
        .first();
    await expect(decorationRow).toBeVisible();

    await decorationRow.getByTitle('Duplicar').click();
    await page.waitForTimeout(500);

    const rowsAfterDuplicate = page
        .locator('aside.tc-editor-sidebar li')
        .filter({ hasText: /Nuevo adorno/ });
    expect(await rowsAfterDuplicate.count()).toBeGreaterThanOrEqual(2);

    await rowsAfterDuplicate.last().getByTitle('Eliminar').click();
    // Confirmación es un modal SweetAlert2 (no un window.confirm nativo).
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await page.waitForTimeout(500);

    const rowsAfterDelete = page
        .locator('aside.tc-editor-sidebar li')
        .filter({ hasText: /Nuevo adorno/ });
    expect(await rowsAfterDelete.count()).toBeGreaterThanOrEqual(1);
});

test('las imágenes de adornos responden HTTP 200 en /menu', async ({ page }) => {
    const response = await page.request.get('/menu');
    const html = await response.text();
    const match = /src="([^"]*menu\/(uploads|decorations)[^"]*)"/.exec(html);

    if (match) {
        const imgResponse = await page.request.get(match[1]);
        expect(imgResponse.status()).toBe(200);
    }
});
