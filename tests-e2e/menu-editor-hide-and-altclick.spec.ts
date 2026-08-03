import { test, expect, type Page } from '@playwright/test';

/**
 * Regresión de dos gaps de usabilidad reportados después de corregir el bug
 * de adornos que desaparecían (ver menu-decorations-stacking.spec.ts):
 *
 * 1. El checkbox "Ocultar solo en {vista}" solo existía para adornos —
 *    elementos de categoría (tagline, título, subtítulo…) e items no podían
 *    ocultarse en absoluto. Corregido en tres capas: MenuEditableElement.vue
 *    (v-if="!config.hidden"), MenuEditorController::configRules() (aceptaba
 *    el campo) e Index.vue (checkbox movido al bloque genérico "Posición y
 *    capa", ya no atado a `v-if="selectedDecoration"`).
 *
 * 2. La capa de adornos SIEMPRE pinta por encima del contenido (fix
 *    correcto de la jerarquía de capas) — pero eso significa que un adorno
 *    posicionado sobre un título/foto ahora capta el clic primero, dejando
 *    el elemento de abajo inalcanzable desde el lienzo. Corregido con
 *    Alt+clic: un listener en fase de captura en Menu.vue cicla por todo el
 *    stack de `elementsFromPoint()` en ese punto.
 *
 * Mismo entorno E2E aislado que el resto de specs de este directorio.
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';

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

test('el checkbox "Ocultar solo en {vista}" ahora existe para elementos de categoría (tagline) y no solo adornos', async ({ page }) => {
    // Este flujo hace 4 navegaciones completas del editor (Escritorio/Móvil/
    // Escritorio/Móvil) más varias esperas — bajo el servidor de desarrollo
    // de este entorno (sin opcache, SQLite) el tiempo acumulado puede superar
    // el timeout POR DEFECTO de 30s sin que haya ningún bloqueo real (mismo
    // criterio que ya usan otras pruebas más pesadas de esta carpeta, p. ej.
    // menu-multi-resolution-audit.spec.ts).
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);

    // Se establece primero un ancla EXPLÍCITA en Escritorio (mover X un
    // poco) antes de tocar Móvil — mientras un elemento solo tenga UN ancla
    // guardada, resolveElementConfig() (types.ts) usa esa misma config para
    // CUALQUIER viewport (comportamiento documentado y existente, no un bug
    // de esta prueba): ocultar en Móvil como primera personalización
    // "filtraría" hacia Escritorio también, sin ser eso lo que se quiere
    // probar aquí. Con un ancla propia en Escritorio, cada vista queda
    // realmente independiente.
    let frame = await openEditorAtDevice(page, 'Escritorio');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pancita', exact: true }).click();
    await page.waitForTimeout(300);

    const keys = await frame
        .locator('[data-element-key]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key')));
    const taglineKey = keys.find((k) => k && /^category-\d+:tagline$/.test(k)) as string;
    expect(taglineKey, 'Pancita debe tener un tagline de texto editable').toBeTruthy();

    // El tagline vive cerca del final de la sección de Pancita —
    // `scrollIntoViewIfNeeded()` explícito antes del clic: `force:true` omite
    // el auto-scroll normal de `.click()`, así que sin esto el clic puede
    // caer fuera del viewport visible (coordenadas inválidas) y no
    // seleccionar nada — confirmado con un repro aislado que medía
    // `document.elementFromPoint()` en ese punto exacto.
    await frame.locator(`[data-element-key="${taglineKey}"]`).scrollIntoViewIfNeeded();
    await frame.locator(`[data-element-key="${taglineKey}"]`).click({ force: true });
    await page.waitForTimeout(300);

    const inspectorDesktop = page.locator('aside.tc-editor-inspector');
    await inspectorDesktop.locator('.tc-advanced-summary').click();
    await page.waitForTimeout(300);
    const xFieldDesktop = inspectorDesktop.locator('.tc-field').filter({ hasText: 'X (px)' }).locator('input');
    await xFieldDesktop.fill('5');
    await xFieldDesktop.press('Tab');
    await page.waitForTimeout(600);

    // Ahora sí: seleccionar en Móvil y ocultar solo ahí.
    frame = await openEditorAtDevice(page, 'Móvil');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pancita', exact: true }).click();
    await page.waitForTimeout(300);
    await frame.locator(`[data-element-key="${taglineKey}"]`).scrollIntoViewIfNeeded();
    await frame.locator(`[data-element-key="${taglineKey}"]`).click({ force: true });
    await page.waitForTimeout(300);

    const inspector = page.locator('aside.tc-editor-inspector');
    const hideCheckbox = inspector.getByText(/Ocultar solo en/).locator('input[type="checkbox"]');
    await expect(hideCheckbox).toBeVisible();
    await expect(hideCheckbox).not.toBeChecked();

    await hideCheckbox.check();
    await page.waitForTimeout(600);

    // Oculto en Móvil: desaparece del DOM del iframe.
    expect(
        await frame.locator(`[data-element-key="${taglineKey}"]`).count(),
        'oculto en Móvil: ya no debe estar en el DOM del iframe',
    ).toBe(0);

    // Escritorio no debía verse afectado (campo discreto por vista, con su
    // propia ancla ya establecida arriba).
    const frameDesktop = await openEditorAtDevice(page, 'Escritorio');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pancita', exact: true }).click();
    await page.waitForTimeout(300);
    expect(
        await frameDesktop.locator(`[data-element-key="${taglineKey}"]`).count(),
        'Escritorio no debía verse afectado',
    ).toBe(1);

    // Recuperación: la lista lateral sigue listando el elemento oculto —
    // seleccionarlo desde ahí y destildar el checkbox lo restaura.
    const sidebarEntry = page
        .locator('aside.tc-editor-sidebar li')
        .filter({ has: page.locator('.tc-element-btn', { hasText: 'Tagline' }) })
        .first();
    await expect(sidebarEntry).toBeVisible();

    const frameMobile = await openEditorAtDevice(page, 'Móvil');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pancita', exact: true }).click();
    await page.waitForTimeout(300);
    await page
        .locator('aside.tc-editor-sidebar li')
        .filter({ has: page.locator('.tc-element-btn', { hasText: 'Tagline' }) })
        .first()
        .locator('.tc-element-btn')
        .click();
    await page.waitForTimeout(300);

    const hideCheckboxAgain = page
        .locator('aside.tc-editor-inspector')
        .getByText(/Ocultar solo en/)
        .locator('input[type="checkbox"]');
    await expect(hideCheckboxAgain).toBeChecked();
    await hideCheckboxAgain.uncheck();
    await page.waitForTimeout(600);

    expect(
        await frameMobile.locator(`[data-element-key="${taglineKey}"]`).count(),
        'vuelve a aparecer en Móvil tras destildar el checkbox',
    ).toBe(1);
});

test('el admin puede forzar manualmente el alto de una sección, y volver a automático', async ({ page }) => {
    // Ver comentario equivalente en la prueba anterior: varias navegaciones
    // completas del editor más una recarga completa de iframe (ver
    // scheduleIframeReload) exceden el timeout por defecto de 30s bajo este
    // servidor de desarrollo.
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');

    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.waitForTimeout(300);

    const before = await frame.locator('#cat-2').evaluate((el) => el.getBoundingClientRect().height);

    const inspector = page.locator('aside.tc-editor-inspector');
    await expect(inspector.getByText('Alto de la sección')).toBeVisible();

    const autoCheckbox = inspector.locator('label').filter({ hasText: 'Automático' }).locator('input[type="checkbox"]');
    await expect(autoCheckbox).toBeChecked();

    await autoCheckbox.setChecked(false);
    await page.waitForTimeout(300);

    const heightInput = inspector.locator('.tc-field').filter({ hasText: 'Alto (px)' }).locator('input[type="number"]');
    await heightInput.fill('3000');
    await heightInput.dispatchEvent('change');

    // Cambiar el alto forzado dispara scheduleIframeReload() (Index.vue) —
    // 400ms de debounce propio MÁS una recarga COMPLETA del iframe (navegación
    // real, no postMessage) — bajo el servidor de desarrollo de este entorno
    // (sin opcache, SQLite) una recarga completa puede tardar bastante más
    // que el waitForTimeout(1200) fijo que había aquí antes, dando lugar a
    // falsos negativos (se medía la altura ANTES de que la recarga
    // terminara). Sondear hasta que el alto realmente refleje el valor
    // forzado es robusto frente a esa variabilidad sin debilitar la
    // aserción en sí.
    await expect
        .poll(
            async () => frame.locator('#cat-2').evaluate((el) => el.getBoundingClientRect().height),
            { timeout: 10000, message: 'la sección debe crecer al alto forzado' },
        )
        .toBeGreaterThanOrEqual(2990);

    const forcedHeight = await frame.locator('#cat-2').evaluate((el) => el.getBoundingClientRect().height);
    expect(forcedHeight, 'el alto forzado debe ser mayor al natural (contenido no se recorta, solo crece)').toBeGreaterThan(before);

    // Otro dispositivo (Móvil) no debía verse afectado — discreto por vista.
    const frameMobile = await openEditorAtDevice(page, 'Móvil');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.waitForTimeout(300);
    const mobileHeight = await frameMobile.locator('#cat-2').evaluate((el) => el.getBoundingClientRect().height);
    expect(mobileHeight, 'Móvil no debía verse afectado por el alto forzado en Escritorio').toBeLessThan(2990);

    // Público /menu debe coincidir con lo forzado en Escritorio.
    const publicPage = await page.context().newPage();
    await publicPage.setViewportSize({ width: 1440, height: 1300 });
    await publicPage.goto('/menu');
    await publicPage.waitForTimeout(600);
    const publicHeight = await publicPage.locator('#cat-2').evaluate((el) => el.getBoundingClientRect().height);
    expect(publicHeight, 'el alto forzado se refleja en /menu público').toBeGreaterThanOrEqual(2990);
    await publicPage.close();

    // Volver a automático restaura el alto natural.
    const frameDesktop = await openEditorAtDevice(page, 'Escritorio');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.waitForTimeout(300);
    const autoCheckboxAgain = page
        .locator('aside.tc-editor-inspector')
        .locator('label')
        .filter({ hasText: 'Automático' })
        .locator('input[type="checkbox"]');
    await autoCheckboxAgain.setChecked(true);
    await page.waitForTimeout(1200);

    const frameAfterRestore = await openEditorAtDevice(page, 'Escritorio');
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.waitForTimeout(300);
    const restoredHeight = await frameAfterRestore.locator('#cat-2').evaluate((el) => el.getBoundingClientRect().height);
    expect(restoredHeight, 'volver a Automático restaura el alto natural').toBeLessThan(2990);
});

test('Alt+clic selecciona el elemento de abajo cuando un adorno lo tapa; un clic normal sigue eligiendo el de arriba', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1300 });
    await login(page);
    const frame = await openEditorAtDevice(page, 'Escritorio');

    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Pozole', exact: true }).click();
    await page.waitForTimeout(300);

    const titleImgKey = 'category-2:title_image';
    const el = frame.locator(`[data-element-key="${titleImgKey}"]`);
    await el.waitFor({ state: 'attached' });

    // Clic normal cerca de la esquina superior izquierda: los adornos
    // oficiales de Pozole (Blanco, Tacos Dorados) arrancan cerca de x:0,y:0
    // y tapan esa zona — debe seleccionarse el adorno de más arriba, NUNCA
    // el título directamente.
    await el.click({ force: true, position: { x: 20, y: 20 } });
    await page.waitForTimeout(400);
    const normalSelection = await frame
        .locator('.tc-mev--selected')
        .first()
        .getAttribute('data-element-key');
    expect(normalSelection, 'clic normal selecciona el elemento superior (un adorno)').toMatch(/^decoration-/);

    // Alt+clic repetido en el MISMO punto debe ciclar por todo el stack de
    // elementsFromPoint hasta llegar al título tapado.
    const seen = new Set<string | null>();
    let reachedTitle = false;

    for (let i = 0; i < 6 && !reachedTitle; i++) {
        await el.click({ force: true, position: { x: 20, y: 20 }, modifiers: ['Alt'] });
        await page.waitForTimeout(300);
        const key = await frame
            .locator('.tc-mev--selected')
            .first()
            .getAttribute('data-element-key');
        seen.add(key);

        if (key === titleImgKey) {
            reachedTitle = true;
        }
    }

    expect(reachedTitle, `Alt+clic debe eventualmente alcanzar ${titleImgKey} (vistos: ${[...seen].join(', ')})`).toBe(true);

    // Con el título finalmente seleccionado, confirmar que es realmente
    // interactivo (aparece el inspector con sus controles de imagen).
    await expect(page.locator('aside.tc-editor-inspector')).toContainText('Imagen dentro del bloque');
});
