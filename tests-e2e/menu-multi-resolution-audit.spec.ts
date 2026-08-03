import { test, expect, type Page, type FrameLocator } from '@playwright/test';

/**
 * Auditoría editor vs /menu para 6 elementos representativos, en los 14
 * anchos de teléfono/tablet/escritorio reales exigidos por el spec:
 * 320, 360, 375, 390, 393, 412, 414, 430, 768, 820, 1024, 1366, 1440, 1920.
 *
 * Para cada elemento confirma en cada ancho: visible, dentro del viewport,
 * sin scroll horizontal, y posición estable tras recargar. Además compara
 * editor vs /menu en el ancho exacto de cada ancla (Móvil 390).
 *
 * Elementos: imagen y precio de Birria, un texto de Fusiones, una fotografía
 * de Comal, un título gráfico (Pozole) y un adorno (Birria, para no chocar
 * con los adornos de Pozole que usa menu-decorations-stacking.spec.ts).
 *
 * Mismo entorno aislado que el resto de tests-e2e/*.spec.ts.
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';
const IFRAME_SELECTOR = 'iframe[title="Vista previa editable del menú"]';

const WIDTHS = [320, 360, 375, 390, 393, 412, 414, 430, 768, 820, 1024, 1366, 1440, 1920];

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

async function nudgeSelected(page: Page, frame: FrameLocator, dxSteps: number, dySteps: number) {
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

async function selectMainItemElement(page: Page, categoryLabel: string, elementLabel: string) {
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
    await row.locator('.tc-element-btn', { hasText: elementLabel }).first().click();
    await page.waitForTimeout(400);
}

async function selectItemElement(page: Page, categoryLabel: string, itemName: string, elementLabel: string) {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryLabel, exact: true }).click();
    await page.waitForTimeout(200);
    const itemToggle = sidebar.getByRole('button').filter({ hasText: itemName }).first();
    await itemToggle.click();
    await page.waitForTimeout(200);
    await sidebar.getByRole('button', { name: elementLabel, exact: true }).first().click();
    await page.waitForTimeout(400);
}

async function selectCategoryElement(page: Page, categoryName: string, elementLabel: string) {
    const sidebar = page.locator('aside.tc-editor-sidebar');
    await sidebar.getByRole('button', { name: categoryName, exact: true }).click();
    await sidebar.getByRole('button', { name: elementLabel, exact: true }).first().click();
    await page.waitForTimeout(150);
}

async function selectDecorationByName(page: Page, frame: FrameLocator, name: string): Promise<string> {
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
    expect(key).toBeTruthy();

    return key as string;
}

interface TargetSpec {
    label: string;
    select: (page: Page, frame: FrameLocator) => Promise<void>;
}

const TARGETS: TargetSpec[] = [
    {
        label: 'Imagen de Birria',
        select: async (page) => selectMainItemElement(page, 'Birria', 'Imagen'),
    },
    {
        label: 'Precio de Birria',
        select: async (page) => selectMainItemElement(page, 'Birria', 'Precio'),
    },
    {
        label: 'Texto de Fusiones (nombre de El Norteño)',
        select: async (page) => selectItemElement(page, 'Nuestras Fusiones', 'El Norteño', 'Nombre'),
    },
    {
        label: 'Fotografía de Comal (Setas)',
        select: async (page) => selectItemElement(page, 'Del Comal a tu Mesa', 'Setas', 'Imagen'),
    },
    {
        label: 'Título gráfico de Pozole',
        select: async (page) => selectCategoryElement(page, 'Pozole', 'Imagen de título'),
    },
    {
        label: 'Adorno de Birria (Y Más)',
        select: async (page, frame) => {
            // El adorno solo aparece en la barra lateral una vez expandida
            // su categoría (mismo requisito que openPozole en
            // menu-decorations-stacking.spec.ts).
            await page.locator('aside.tc-editor-sidebar').getByRole('button', { name: 'Birria', exact: true }).first().click();
            await page.waitForTimeout(300);
            await selectDecorationByName(page, frame, 'Y Más');
        },
    },
];

test.describe.configure({ mode: 'serial' });

test.describe('auditoría multi-resolución: editor vs /menu para 6 elementos', () => {
    const keys: Record<string, string> = {};

    test('normalizar los 6 elementos en el editor (Móvil)', async ({ page }) => {
        test.setTimeout(120000);
        await login(page);

        for (const target of TARGETS) {
            const frame = await openEditorAtDevice(page, 'Móvil');
            await target.select(page, frame);

            const key = (await frame.locator('.tc-mev--selected').first().getAttribute('data-element-key')) as string;
            expect(key, `clave encontrada para ${target.label}`).toBeTruthy();
            keys[target.label] = key;

            // 3 pasos a la derecha + 2 abajo: primer movimiento real,
            // fuerza flow -> normalized sin salto (ver comentario de
            // currentConfigAsV2 en MenuEditableElement.vue).
            await nudgeSelected(page, frame, 3, 2);
        }

        expect(Object.keys(keys)).toHaveLength(TARGETS.length);
    });

    test('editor (Móvil, 390px) y /menu (390px) coinciden para los 6 elementos', async ({ page }) => {
        test.setTimeout(60000);
        await login(page);
        const frame = await openEditorAtDevice(page, 'Móvil');

        // Se compara RELATIVO a la sección propia (closest [id^="cat-"]),
        // no el rect página-absoluto: el iframe del editor vive desplazado
        // dentro del layout del admin (barra lateral + toolbar), mientras
        // que /menu renderiza la MISMA sección como documento de nivel
        // superior sin ese desplazamiento — comparar en absoluto compararía
        // dos orígenes de página distintos a propósito, no la posición real
        // dentro de la composición (mismo criterio que measureRelativeToSection
        // en menu-decorations-stacking.spec.ts).
        const relativeRect = (key: string) =>
            `[data-element-key="${key}"]` as const;

        for (const target of TARGETS) {
            const key = keys[target.label];
            const editorRect = await frame.locator(relativeRect(key)).evaluate((el) => {
                const r = el.getBoundingClientRect();
                const section = el.closest('[id^="cat-"]');
                const sr = section?.getBoundingClientRect() ?? { x: 0, y: 0 };

                return { x: r.x - sr.x, y: r.y - sr.y };
            });

            const pub = await page.context().newPage();
            await pub.setViewportSize({ width: 390, height: 1000 });
            await pub.goto('/menu');
            await pub.waitForTimeout(400);
            const menuLocator = pub.locator(relativeRect(key));
            await expect(menuLocator, `${target.label}: visible en /menu a 390px`).toBeVisible();
            const menuRect = await menuLocator.evaluate((el) => {
                const r = el.getBoundingClientRect();
                const section = el.closest('[id^="cat-"]');
                const sr = section?.getBoundingClientRect() ?? { x: 0, y: 0 };

                return { x: r.x - sr.x, y: r.y - sr.y };
            });

            expect(Math.abs(editorRect.x - menuRect.x), `${target.label}: x editor vs /menu`).toBeLessThanOrEqual(3);
            expect(Math.abs(editorRect.y - menuRect.y), `${target.label}: y editor vs /menu`).toBeLessThanOrEqual(3);
            await pub.close();
        }
    });

    for (const width of WIDTHS) {
        test(`a ${width}px: los 6 elementos están visibles, dentro del viewport y sin scroll horizontal`, async ({ page }) => {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto('/menu');
            await page.waitForTimeout(400);

            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            expect(scrollWidth, `sin scroll horizontal a ${width}px`).toBeLessThanOrEqual(width + 2);

            for (const target of TARGETS) {
                const key = keys[target.label];
                const el = page.locator(`[data-element-key="${key}"]`);
                await expect(el, `${target.label}: visible a ${width}px`).toBeVisible();

                const box = await el.boundingBox();
                expect(box, `${target.label}: rect medible a ${width}px`).not.toBeNull();
                expect(box!.x, `${target.label}: no se sale por la izquierda a ${width}px`).toBeGreaterThanOrEqual(-2);
                expect(box!.x + box!.width, `${target.label}: no se sale por la derecha a ${width}px`).toBeLessThanOrEqual(width + 2);
            }
        });
    }

    test('la posición persiste tras recargar (390px)', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 1000 });
        await page.goto('/menu');
        await page.waitForTimeout(400);

        const before: Record<string, { x: number; y: number }> = {};

        for (const target of TARGETS) {
            const key = keys[target.label];
            const box = await page.locator(`[data-element-key="${key}"]`).boundingBox();
            expect(box).not.toBeNull();
            before[target.label] = { x: box!.x, y: box!.y };
        }

        await page.reload();
        await page.waitForTimeout(400);

        for (const target of TARGETS) {
            const key = keys[target.label];
            const box = await page.locator(`[data-element-key="${key}"]`).boundingBox();
            expect(box, `${target.label}: visible tras recargar`).not.toBeNull();
            expect(Math.abs(box!.x - before[target.label].x), `${target.label}: x estable tras recargar`).toBeLessThanOrEqual(2);
            expect(Math.abs(box!.y - before[target.label].y), `${target.label}: y estable tras recargar`).toBeLessThanOrEqual(2);
        }
    });
});
