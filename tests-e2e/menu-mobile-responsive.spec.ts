import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

/**
 * Repro real y regresión del bug de responsive Móvil reportado en
 * producción: `resolveElementConfig()` (types.ts) empezaba a interpolar
 * hacia Tablet/Escritorio en cuanto el viewport superaba 390px, aunque
 * Tablet NUNCA se hubiera configurado — un ancla Escritorio incompleta (o
 * simplemente lejana) hacía que `width_pct`/`width` colapsara a `null`
 * (imagen recupera su tamaño intrínseco, "adorno gigante") o que el
 * elemento derivara gradualmente hacia el diseño de Escritorio en
 * CUALQUIER teléfono más ancho que el Samsung S20 (360-390px).
 *
 * Usa dos adornos reales de la base e2e (decoration-2 "Tacos Dorados" y
 * decoration-3 "Tú Eliges", categoría Pozole) sembrados en beforeAll con
 * EXACTAMENTE el patrón de datos confirmado en producción: Móvil completo,
 * SIN Tablet, Escritorio incompleto o simplemente lejano.
 *
 * Requiere el mismo servidor E2E aislado (SQLite) que el resto de
 * tests-e2e/*.spec.ts, ya corriendo en E2E_BASE_URL (por defecto
 * http://127.0.0.1:8010) — Playwright no lo arranca.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHONE_WIDTHS = [360, 375, 390, 391, 393, 412, 414, 430];

const TACOS_KEY = 'decoration-2:image';
const TACOS_MOBILE_WIDTH = 112;

const ELIGES_KEY = 'decoration-3:image';
const ELIGES_MOBILE_WIDTH = 335;

function seedRealProductionPattern() {
    const script = `
        \$tacos = App\\Models\\MenuDecoration::findOrFail(2);
        \$tacos->kind = 'image';
        \$tacos->is_active = true;
        \$tacos->visual_settings = [
            'mobile' => ['x' => 40.0, 'y' => 260.0, 'width' => ${TACOS_MOBILE_WIDTH}.0, 'height' => null, 'scale' => 1, 'rotation' => 0, 'z_index' => 5],
            'desktop' => ['z_index' => 3],
        ];
        \$tacos->save();

        \$eliges = App\\Models\\MenuDecoration::findOrFail(3);
        \$eliges->kind = 'image';
        \$eliges->is_active = true;
        \$eliges->visual_settings = [
            'mobile' => ['x' => 10.0, 'y' => 560.0, 'width' => ${ELIGES_MOBILE_WIDTH}.0, 'height' => 40.0, 'scale' => 1, 'rotation' => 0, 'z_index' => 6],
            'desktop' => ['x' => 111.0, 'y' => 1400.0, 'width' => 1237.5, 'height' => 150.0, 'scale' => 1, 'rotation' => 0, 'z_index' => 6],
        ];
        \$eliges->save();

        Illuminate\\Support\\Facades\\Cache::flush();
        echo 'seeded-ok';
    `;

    const output = execFileSync('php', ['artisan', 'tinker'], {
        cwd: REPO_ROOT,
        input: script,
        env: {
            ...process.env,
            DB_CONNECTION: 'sqlite',
            DB_DATABASE: path.join(REPO_ROOT, 'database', 'e2e.sqlite'),
        },
        encoding: 'utf-8',
    });

    if (!output.includes('seeded-ok')) {
        throw new Error(`No se pudo sembrar el patrón de repro real: ${output}`);
    }
}

async function loadMenuAt(page: Page, width: number) {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto('/menu');
    await page.waitForTimeout(300);
}

test.describe.configure({ mode: 'serial' });

test.describe('Móvil: Tablet ausente + Escritorio parcial/lejano nunca contamina la composición Móvil', () => {
    test.beforeAll(() => {
        seedRealProductionPattern();
    });

    for (const width of PHONE_WIDTHS) {
        test(`a ${width}px: ambos adornos escalan proporcionalmente a Móvil, nunca colapsan ni derivan hacia Escritorio`, async ({ page }) => {
            await loadMenuAt(page, width);

            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            expect(scrollWidth, `sin scroll horizontal a ${width}px`).toBeLessThanOrEqual(width + 2);

            const tacos = page.locator(`[data-element-key="${TACOS_KEY}"]`);
            await expect(tacos, `Tacos Dorados visible a ${width}px`).toBeVisible();
            const tacosBox = await tacos.boundingBox();
            expect(tacosBox, `Tacos Dorados: rect medible a ${width}px`).not.toBeNull();

            // Antes del fix: width colapsaba a `null` (lerpSize) en cuanto
            // width > 390 porque el ancla Escritorio solo traía `z_index` —
            // la imagen recuperaba su tamaño intrínseco (cientos/miles de
            // px). Con el fix, sigue proporcional al ancla Móvil (112px).
            const expectedTacosWidth = TACOS_MOBILE_WIDTH * (width / 390);
            expect(
                Math.abs(tacosBox!.width - expectedTacosWidth),
                `Tacos Dorados: width proporcional a Móvil a ${width}px (esperado ~${expectedTacosWidth.toFixed(1)}px, real ${tacosBox!.width.toFixed(1)}px)`,
            ).toBeLessThanOrEqual(4);
            // Nunca "gigante" — cota de cordura muy por debajo de lo que
            // producía el bug (>2000px en el repro reportado).
            expect(tacosBox!.width, `Tacos Dorados: nunca gigante a ${width}px`).toBeLessThan(300);

            const eliges = page.locator(`[data-element-key="${ELIGES_KEY}"]`);
            await expect(eliges, `Tú Eliges visible a ${width}px`).toBeVisible();
            const eligesBox = await eliges.boundingBox();
            expect(eligesBox, `Tú Eliges: rect medible a ${width}px`).not.toBeNull();

            // Antes del fix: sin Tablet configurado, Móvil y Escritorio (ambos
            // completos) interpolaban directamente entre sí desde 391px —
            // un teléfono de 430px ya mostraba ~10% del diseño de Escritorio.
            // Con el fix, dentro del rango Móvil se usa SOLO el ancla Móvil.
            const expectedEligesWidth = ELIGES_MOBILE_WIDTH * (width / 390);
            expect(
                Math.abs(eligesBox!.width - expectedEligesWidth),
                `Tú Eliges: width proporcional a Móvil a ${width}px (esperado ~${expectedEligesWidth.toFixed(1)}px, real ${eligesBox!.width.toFixed(1)}px), nunca deriva hacia Escritorio (1237.5px)`,
            ).toBeLessThanOrEqual(4);
        });
    }

    test('frontera 390px -> 391px: sin salto brusco de tamaño ni posición', async ({ page }) => {
        await loadMenuAt(page, 390);
        const tacosAt390 = await page.locator(`[data-element-key="${TACOS_KEY}"]`).boundingBox();
        const eligesAt390 = await page.locator(`[data-element-key="${ELIGES_KEY}"]`).boundingBox();

        await loadMenuAt(page, 391);
        const tacosAt391 = await page.locator(`[data-element-key="${TACOS_KEY}"]`).boundingBox();
        const eligesAt391 = await page.locator(`[data-element-key="${ELIGES_KEY}"]`).boundingBox();

        expect(tacosAt390).not.toBeNull();
        expect(tacosAt391).not.toBeNull();
        expect(eligesAt390).not.toBeNull();
        expect(eligesAt391).not.toBeNull();

        expect(
            Math.abs(tacosAt391!.width - tacosAt390!.width),
            '390->391: Tacos Dorados no cambia de tamaño bruscamente',
        ).toBeLessThanOrEqual(2);
        expect(
            Math.abs(eligesAt391!.width - eligesAt390!.width),
            '390->391: Tú Eliges no cambia de tamaño bruscamente',
        ).toBeLessThanOrEqual(2);
        expect(
            Math.abs(eligesAt391!.x - eligesAt390!.x),
            '390->391: Tú Eliges no cambia de posición X bruscamente',
        ).toBeLessThanOrEqual(2);
    });

    test('ninguna sección de categoría invade a la siguiente en todo el rango móvil', async ({ page }) => {
        for (const width of PHONE_WIDTHS) {
            await loadMenuAt(page, width);

            const sectionTops = await page
                .locator('[id^="cat-"]')
                .evaluateAll((sections) =>
                    sections.map((s) => {
                        const r = s.getBoundingClientRect();

                        return { id: s.id, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
                    }),
                );

            for (let i = 0; i < sectionTops.length - 1; i++) {
                const current = sectionTops[i];
                const next = sectionTops[i + 1];

                expect(
                    next.top,
                    `a ${width}px: ${next.id} no empieza antes de que termine ${current.id}`,
                ).toBeGreaterThanOrEqual(current.bottom - 2);
            }
        }
    });
});
