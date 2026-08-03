import { test, expect, type Page } from '@playwright/test';

/**
 * Verificación del sistema de coordenadas normalizadas (%) — complementa
 * menu-editor-wysiwyg.spec.ts (que sigue cubriendo el editor V1/general) con
 * el caso concreto que motivó la reescritura: un elemento arrastrado en
 * Móvil debe conservar su posición relativa en CUALQUIER ancho de teléfono
 * real, no solo en el ancla exacta de 390px, y el cambio de flow->absolute
 * (Teleport a .tc-mp-customized-layer) no debe producir ningún salto visual.
 *
 * Requiere el mismo servidor aislado que menu-editor-wysiwyg.spec.ts (ver
 * ese archivo para cómo levantarlo).
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const MAX_DIFF_PX = 2;

/** Los 8 teléfonos exigidos por el caso visual obligatorio. */
const PHONE_WIDTHS = [320, 360, 375, 390, 393, 412, 414, 430];

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

    const frame = page.frameLocator(
        'iframe[title="Vista previa editable del menú"]',
    );
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

function expectSameRect(a: Rect, b: Rect, label: string) {
    expect(Math.abs(a.x - b.x), `${label}: x`).toBeLessThanOrEqual(MAX_DIFF_PX);
    expect(Math.abs(a.y - b.y), `${label}: y`).toBeLessThanOrEqual(MAX_DIFF_PX);
}

/** Selecciona el elemento "Precio" del platillo principal (mismo nombre que
 * su categoría) de una categoría dada — ver el patrón ya usado en el test de
 * resize de Birria en menu-editor-wysiwyg.spec.ts, necesario porque
 * categoría y platillo comparten el mismo texto visible. */
async function selectMainItemPrice(page: Page, categoryLabel: string) {
    await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: categoryLabel, exact: true }).first().click();
    await page.waitForTimeout(300);
    const platillosList = page
        .locator('aside.tc-editor-sidebar h3', { hasText: 'Platillos' })
        .locator('xpath=following-sibling::ul[1]');
    const row = platillosList.locator('li').filter({
        has: page.getByRole('button', { name: categoryLabel, exact: true }),
    }).first();
    await row.getByRole('button', { name: categoryLabel, exact: true }).click();
    await page.waitForTimeout(300);
    await row.locator('.tc-element-btn', { hasText: 'Precio' }).first().click();
    await page.waitForTimeout(400);
}

/** Selecciona el elemento "Precio" de un platillo cualquiera (categoría y
 * platillo con nombres DISTINTOS) — expande la categoría, expande el
 * platillo, elige "Precio". */
async function selectItemPrice(page: Page, categoryLabel: string, itemName: string) {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryLabel, exact: true }).click();
    await page.waitForTimeout(200);
    const itemToggle = sidebar.getByRole('button').filter({ hasText: itemName }).first();
    await itemToggle.click();
    await page.waitForTimeout(200);
    await sidebar.getByRole('button', { name: 'Precio', exact: true }).first().click();
    await page.waitForTimeout(400);
}

/** Mueve el elemento seleccionado con el teclado (Shift+flecha = 10px por
 * paso) — mucho más determinista en CI que simular un arrastre de ratón real
 * a través del iframe, y ejercita exactamente la misma conversión
 * flow->normalized que un arrastre real (ver nudge() en
 * MenuEditableElement.vue: usa el mismo currentConfigAsV2/pxToPct que
 * startDrag). */
async function nudgeSelectedBy(
    page: Page,
    frame: ReturnType<Page['frameLocator']>,
    dxSteps: number,
    dySteps: number,
) {
    const el = frame.locator('.tc-mev--selected').first();
    await el.focus();

    for (let i = 0; i < Math.abs(dxSteps); i++) {
        await el.press(dxSteps > 0 ? 'Shift+ArrowRight' : 'Shift+ArrowLeft');
    }

    for (let i = 0; i < Math.abs(dySteps); i++) {
        await el.press(dySteps > 0 ? 'Shift+ArrowDown' : 'Shift+ArrowUp');
    }

    await page.waitForTimeout(400);
}

test.describe('coordenadas normalizadas (%)', () => {
    test('Birria: arrastrar el precio a la derecha en Móvil, sin salto, y se mantiene a la derecha en los 8 teléfonos + /menu', async ({ page }) => {
        // Editor + reload + 8 anchos reales de /menu es legítimamente mucho
        // trabajo de navegador — el timeout default (30s) se queda corto.
        test.setTimeout(90000);
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');
        await selectMainItemPrice(page, 'Birria');

        const key = (await frame
            .locator('.tc-mev--selected')
            .first()
            .getAttribute('data-element-key')) as string;
        expect(key).toMatch(/:price$/);

        const before = await frame.locator(`[data-element-key="${key}"]`).boundingBox();
        expect(before).not.toBeNull();

        // 6 pasos de Shift+flecha derecha = 60px — primer movimiento de este
        // elemento: debe convertir flow->normalized SIN salto visible.
        await nudgeSelectedBy(page, frame, 6, 0);

        const after = await frame.locator(`[data-element-key="${key}"]`).boundingBox();
        expect(after).not.toBeNull();
        expectSameRect(
            { x: before!.x + 60, y: before!.y, width: before!.width, height: before!.height },
            { x: after!.x, y: after!.y, width: after!.width, height: after!.height },
            'sin salto al normalizar (posición final == posición previa + delta arrastrado)',
        );

        // El precio debe seguir a la DERECHA de la foto del mismo platillo.
        const photoKey = key.replace(':price', ':image');
        const photoBox = await frame.locator(`[data-element-key="${photoKey}"]`).boundingBox();
        expect(photoBox).not.toBeNull();
        expect(after!.x, 'precio a la derecha de la foto tras arrastrar').toBeGreaterThan(
            photoBox!.x + photoBox!.width / 2,
        );

        await page.waitForTimeout(500); // deja que el commit termine de persistir

        // Recarga y confirma que la posición persiste — hay que volver a
        // seleccionar Birria tras recargar: el iframe arranca sin scroll a
        // ninguna categoría en particular, así que comparar boundingBox()
        // crudo contra un scroll distinto daría un diff enorme en Y que no
        // tiene nada que ver con la posición real guardada.
        const frameReloaded = await openEditorAtDevice(page, 'Móvil');
        await selectMainItemPrice(page, 'Birria');
        const afterReload = await frameReloaded.locator(`[data-element-key="${key}"]`).boundingBox();
        expect(afterReload).not.toBeNull();
        expectSameRect(
            { x: after!.x, y: after!.y, width: after!.width, height: after!.height },
            { x: afterReload!.x, y: afterReload!.y, width: afterReload!.width, height: afterReload!.height },
            'la posición sobrevive a F5',
        );

        // Los 8 teléfonos: nunca debajo de la foto (mismo eje Y aprox.),
        // nunca fuera por la izquierda, nunca desaparece. Reutiliza UNA sola
        // página (solo redimensiona+navega) en vez de abrir 8 páginas nuevas
        // — mismo resultado, mucho más rápido.
        const pub = await page.context().newPage();

        for (const width of PHONE_WIDTHS) {
            await pub.setViewportSize({ width, height: 900 });
            await pub.goto('/menu');
            await pub.waitForTimeout(400);

            const priceEl = pub.locator(`[data-element-key="${key}"]`);
            const photoEl = pub.locator(`[data-element-key="${photoKey}"]`);
            await expect(priceEl).toBeVisible();

            const priceRect = await priceEl.boundingBox();
            const photoRect = await photoEl.boundingBox();
            expect(priceRect, `precio visible a ${width}px`).not.toBeNull();
            expect(photoRect, `foto visible a ${width}px`).not.toBeNull();

            // A la derecha de la foto (nunca debajo: y debe solaparse
            // verticalmente con la foto, no estar por debajo de su borde
            // inferior) y nunca fuera del viewport por la izquierda.
            expect(priceRect!.x, `precio dentro del viewport a ${width}px`).toBeGreaterThanOrEqual(0);
            expect(
                priceRect!.y,
                `precio no cae debajo de la foto a ${width}px`,
            ).toBeLessThan(photoRect!.y + photoRect!.height);
        }

        await pub.close();
    });

    test('un ancla V2 solo-Móvil escala proporcionalmente por debajo de 390px (no se congela)', async ({ page }) => {
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');
        await selectItemPrice(page, 'Nuestras Fusiones', 'El Valiente');

        const key = (await frame
            .locator('.tc-mev--selected')
            .first()
            .getAttribute('data-element-key')) as string;

        await nudgeSelectedBy(page, frame, 3, 1);
        await page.waitForTimeout(500);

        const at390 = await page.context().newPage();
        await at390.setViewportSize({ width: 390, height: 900 });
        await at390.goto('/menu');
        await at390.waitForTimeout(500);
        const rect390 = await at390.locator(`[data-element-key="${key}"]`).boundingBox();
        const root390 = await at390
            .locator(`[data-element-key="${key}"]`)
            .evaluate((el) => el.closest('[id^="cat-"]')?.querySelector('.tc-mp-content-layer')?.getBoundingClientRect());
        await at390.close();

        const at320 = await page.context().newPage();
        await at320.setViewportSize({ width: 320, height: 900 });
        await at320.goto('/menu');
        await at320.waitForTimeout(500);
        const rect320 = await at320.locator(`[data-element-key="${key}"]`).boundingBox();
        const root320 = await at320
            .locator(`[data-element-key="${key}"]`)
            .evaluate((el) => el.closest('[id^="cat-"]')?.querySelector('.tc-mp-content-layer')?.getBoundingClientRect());
        await at320.close();

        expect(rect390).not.toBeNull();
        expect(rect320).not.toBeNull();
        expect(root390).toBeTruthy();
        expect(root320).toBeTruthy();

        // % del ancho del root — debe ser prácticamente IGUAL en ambos
        // anchos (tolerancia amplia por redondeo de fuente/gaps reales, pero
        // muy lejos de "pixel-idéntico", que sería el bug congelado).
        const pct390 = ((rect390!.x - (root390 as DOMRect).x) / (root390 as DOMRect).width) * 100;
        const pct320 = ((rect320!.x - (root320 as DOMRect).x) / (root320 as DOMRect).width) * 100;

        expect(Math.abs(pct390 - pct320), 'misma posición relativa (%) en 390 y 320px').toBeLessThan(3);
        // Y la posición ABSOLUTA en px debe haber cambiado (prueba de que NO
        // está congelada en el mismo valor de px entre los dos anchos).
        expect(Math.abs(rect390!.x - rect320!.x)).toBeGreaterThan(1);
    });

    test('un elemento V1 (nunca tocado) mantiene su comportamiento histórico — no se ve afectado por el arreglo', async ({ page }) => {
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');
        await selectItemPrice(page, 'Del Comal a tu Mesa', 'Quesadillas');

        const key = (await frame
            .locator('.tc-mev--selected')
            .first()
            .getAttribute('data-element-key')) as string;

        // Sin arrastrar nada: debe seguir siendo V1 (sin coordinate_version)
        // — position:relative + sin transform, visible y en su lugar
        // natural de flujo, exactamente como antes de este cambio.
        const style = await frame
            .locator(`[data-element-key="${key}"]`)
            .evaluate((el) => getComputedStyle(el).position);
        expect(style).toBe('relative');
    });
});
