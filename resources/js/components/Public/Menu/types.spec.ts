import { describe, expect, it } from 'vitest';
import {
    MENU_DEVICE_WIDTH,
    byZone,
    defaultElementConfigV2,
    isV2Config,
    measuredRectToNormalized,
    normalizedToPx,
    pctToPx,
    pxToPct,
    resolveElementConfig,
    resolveMenuDevice,
    sectionHeightFor,
    upgradeV1ToV2,
    type ElementConfig,
    type ElementConfigV2,
    type ElementSettings,
    type MenuCategoryData,
    type MenuItemData,
    type RectLike,
} from './types';

describe('px <-> % conversion', () => {
    it('1. measuredRectToNormalized: px -> %', () => {
        const root: RectLike = { left: 100, top: 200, width: 400, height: 900 };
        const el: RectLike = { left: 300, top: 260, width: 80, height: 40 };

        const pct = measuredRectToNormalized(el, root);

        // x/y ambos divididos entre el ANCHO del root, nunca el alto.
        expect(pct.x_pct).toBeCloseTo(((300 - 100) / 400) * 100, 10);
        expect(pct.y_pct).toBeCloseTo(((260 - 200) / 400) * 100, 10);
        expect(pct.width_pct).toBeCloseTo((80 / 400) * 100, 10);
        expect(pct.height_pct).toBeCloseTo((40 / 400) * 100, 10);
    });

    it('1b. y_pct never divides by root height (regression guard)', () => {
        const root: RectLike = { left: 0, top: 0, width: 400, height: 4000 };
        const el: RectLike = { left: 0, top: 40, width: 10, height: 10 };
        const pct = measuredRectToNormalized(el, root);

        // Si se dividiera por alto (4000), sería 1% — debe ser 10% (÷400).
        expect(pct.y_pct).toBeCloseTo(10, 10);
    });

    it('2. normalizedToPx: % -> render px', () => {
        const config: Pick<ElementConfigV2, 'x_pct' | 'y_pct' | 'width_pct' | 'height_pct'> = {
            x_pct: 25,
            y_pct: 10,
            width_pct: 20,
            height_pct: null,
        };

        const px = normalizedToPx(config, 400);

        expect(px.left).toBeCloseTo(100, 10);
        expect(px.top).toBeCloseTo(40, 10);
        expect(px.width).toBeCloseTo(80, 10);
        expect(px.height).toBeNull();
    });

    it('pxToPct/pctToPx guard against a non-finite or zero root width', () => {
        expect(pxToPct(40, 0)).toBe(0);
        expect(pxToPct(40, -10)).toBe(0);
        expect(pxToPct(40, NaN)).toBe(0);
        expect(pctToPx(40, 0)).toBe(0);
    });

    it('3. round-trip: rect -> % -> px returns the original rect (within float epsilon)', () => {
        const root: RectLike = { left: 50, top: 20, width: 333, height: 777 };
        const el: RectLike = { left: 120, top: 95, width: 60, height: 35 };

        const pct = measuredRectToNormalized(el, root);
        const px = normalizedToPx(pct, root.width);

        // px.left/top son relativos al root (ver normalizedToPx) — hay que
        // sumar el offset del root para comparar contra las coords originales.
        expect(root.left + px.left).toBeCloseTo(el.left, 8);
        expect(root.top + px.top).toBeCloseTo(el.top, 8);
        expect(px.width).toBeCloseTo(el.width, 8);
        expect(px.height).toBeCloseTo(el.height, 8);
    });
});

function v2Anchor(x_pct: number, y_pct: number): ElementConfigV2 {
    return { ...defaultElementConfigV2(), x_pct, y_pct };
}

function v2NormalizedAnchor(x_pct: number, y_pct: number): ElementConfigV2 {
    return { ...defaultElementConfigV2(), position_mode: 'normalized', x_pct, y_pct };
}

function v1(x: number, y: number, overrides: Partial<ElementConfig> = {}): ElementConfig {
    return {
        x,
        y,
        width: null,
        height: null,
        scale: 1,
        rotation: 0,
        z_index: 1,
        ...overrides,
    };
}

describe('resolveMenuDevice: rangos fijos (no puntos medios entre anclas)', () => {
    // Rangos exigidos por el negocio: Móvil <640, Tablet 640-1023, Escritorio
    // >=1024 — a propósito NO son los puntos medios entre 390/768/1440
    // ((390+768)/2=579, (768+1440)/2=1104) que usaba la versión anterior: ese
    // fue exactamente el bug reportado, un teléfono de 593px caía en Tablet.
    it('clasifica todos los anchos de teléfono reales como Móvil', () => {
        for (const w of [320, 360, 375, 390, 391, 392, 393, 412, 414, 430, 446, 480, 540, 593, 639]) {
            expect(resolveMenuDevice(w)).toBe('mobile');
        }
    });

    it('clasifica 640-1023 como Tablet, incluyendo el propio 768', () => {
        for (const w of [640, 667, 720, 767, 768, 820, 912, 1023]) {
            expect(resolveMenuDevice(w)).toBe('tablet');
        }
    });

    it('clasifica >=1024 como Escritorio, incluyendo anchos ultra-anchos', () => {
        for (const w of [1024, 1280, 1440, 1920]) {
            expect(resolveMenuDevice(w)).toBe('desktop');
        }
    });

    it('593px sigue siendo Móvil (antes caía en Tablet por el punto medio 579)', () => {
        expect(resolveMenuDevice(593)).toBe('mobile');
    });
});

describe('resolveElementConfig: selección de composición completa, nunca interpolación', () => {
    it('4. 579px (antiguo punto medio Móvil/Tablet) sigue usando la composición Móvil completa, sin mezclar con Tablet', () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(10, 20),
            tablet: v2Anchor(50, 60),
        };

        const resolved = resolveElementConfig(settings, 579) as ElementConfigV2;

        // Nunca lerp(10,50,0.5)=30 — la composición completa de Móvil, tal cual.
        expect(resolved.x_pct).toBeCloseTo(10, 6);
        expect(resolved.y_pct).toBeCloseTo(20, 6);
    });

    it('5. 1104px (antiguo punto medio Tablet/Escritorio) ya es Escritorio puro, sin mezclar con Tablet', () => {
        const settings: ElementSettings = {
            tablet: v2Anchor(0, 0),
            desktop: v2Anchor(100, 40),
        };

        const resolved = resolveElementConfig(settings, 1104) as ElementConfigV2;

        // Nunca lerp(0,100,0.5)=50 — la composición completa de Escritorio.
        expect(resolved.x_pct).toBeCloseTo(100, 6);
        expect(resolved.y_pct).toBeCloseTo(40, 6);
    });

    it('6. below 390px: V1 scales proportionally (the bug fix) instead of freezing', () => {
        const v1Settings: ElementSettings = { mobile: v1(40, -20) };

        const at390 = resolveElementConfig(v1Settings, 390) as ElementConfig;
        const at360 = resolveElementConfig(v1Settings, 360) as ElementConfig;

        expect(at390.x).toBe(40);
        // Ya NO debe quedarse congelado en 40 — debe escalar proporcionalmente.
        expect(at360.x).toBeCloseTo(40 * (360 / 390), 6);
        expect(at360.x).not.toBeCloseTo(40, 3);
    });

    it('6b. above 390px with only a mobile anchor (e.g. 430px phone): also scales, matches the Birria repro', () => {
        const v1Settings: ElementSettings = { mobile: v1(40, -20) };

        const at430 = resolveElementConfig(v1Settings, 430) as ElementConfig;

        expect(at430.x).toBeCloseTo(40 * (430 / 390), 6);
        expect(at430.x).not.toBeCloseTo(40, 3);
    });

    it('6c. below 390px: V2 pct is a correct no-op (already resolution-independent)', () => {
        const v2Settings: ElementSettings = { mobile: v2Anchor(40, -20) };

        const at390 = resolveElementConfig(v2Settings, 390) as ElementConfigV2;
        const at360 = resolveElementConfig(v2Settings, 360) as ElementConfigV2;

        expect(at390.x_pct).toBe(40);
        expect(at360.x_pct).toBe(40);
    });

    it('7. above 1440px: V1 vs V2 side by side', () => {
        const v1Settings: ElementSettings = { desktop: v1(100, 0) };
        const v2Settings: ElementSettings = { desktop: v2Anchor(100, 0) };

        const v1At1920 = resolveElementConfig(v1Settings, 1920) as ElementConfig;
        const v2At1920 = resolveElementConfig(v2Settings, 1920) as ElementConfigV2;

        // V1 escala proporcionalmente al ancho real (comportamiento ya
        // existente para desktop, ahora generalizado a los otros campos).
        expect(v1At1920.x).toBeCloseTo(100 * (1920 / 1440), 6);
        // V2 no necesita ninguna extrapolación: el % ya es válido en
        // cualquier ancho real — pctToPx hace el trabajo en el render.
        expect(v2At1920.x_pct).toBe(100);
    });

    it('un ancla Móvil V1 y una ancla Tablet V2 nunca se mezclan: cada rango usa SOLO la suya propia', () => {
        const settings: ElementSettings = {
            mobile: v1(39, 0), // 39/390*100 = 10% si (incorrectamente) se tratara como absoluto
            tablet: v2Anchor(50, 0),
        };

        // Cualquier ancho móvil usa el V1 de Móvil tal cual (escalado por
        // proporción, nunca convertido a %) — nunca se "acerca" al 50% de Tablet.
        const at500 = resolveElementConfig(settings, 500) as ElementConfig;
        expect(isV2Config(at500)).toBe(false);
        expect(at500.x).toBeCloseTo(39 * (500 / 390), 6);

        // Cualquier ancho Tablet usa el V2 de Tablet tal cual — nunca se
        // "acerca" al 39px (ni a ningún x_pct derivado de él) de Móvil.
        const at700 = resolveElementConfig(settings, 700) as ElementConfigV2;
        expect(isV2Config(at700)).toBe(true);
        expect(at700.x_pct).toBeCloseTo(50, 6);
    });

    it('10. V2 flow + V2 flow: Móvil resuelve a su propio flow, nunca al de Tablet', () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(10, 0),
            tablet: v2Anchor(50, 0),
        };
        const resolved = resolveElementConfig(settings, 500) as ElementConfigV2;

        expect(resolved.position_mode).toBe('flow');
        expect(resolved.x_pct).toBeCloseTo(10, 6);
    });

    it('11. una ancla Móvil V1 nunca se convierte a V2 solo por existir una ancla Tablet V2 en otro dispositivo', () => {
        const settings: ElementSettings = {
            mobile: v1(39, 0),
            tablet: v2Anchor(50, 0),
        };
        const resolved = resolveElementConfig(settings, 500) as ElementConfig;

        // 500px es rango Móvil: la composición de Tablet ni se toca, así que
        // el resultado sigue siendo V1 puro (nunca coordinate_version:2).
        expect(isV2Config(resolved)).toBe(false);
        expect(resolved.x).toBeCloseTo(39 * (500 / 390), 6);
    });

    it('12. V2 normalized en Móvil se mantiene normalized en todo el rango Móvil, sin importar Tablet', () => {
        const settings: ElementSettings = {
            mobile: v2NormalizedAnchor(10, 0),
            tablet: v2Anchor(50, 0),
        };
        const resolved = resolveElementConfig(settings, 500) as ElementConfigV2;

        expect(resolved.position_mode).toBe('normalized');
    });

    it('13. V2 normalized en Móvil + V1 en Tablet: Móvil sigue normalized, Tablet ni se consulta', () => {
        const settings: ElementSettings = {
            mobile: v2NormalizedAnchor(10, 0),
            tablet: v1(195, 0),
        };
        const resolved = resolveElementConfig(settings, 500) as ElementConfigV2;

        expect(resolved.position_mode).toBe('normalized');
    });

    it('14. un elemento redimensionado (nunca movido) en Móvil conserva su propio width_pct, nunca el de Tablet', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), width_pct: 40 },
            tablet: { ...v2Anchor(0, 0), width_pct: 30 },
        };
        const resolved = resolveElementConfig(settings, 500) as ElementConfigV2;

        expect(resolved.position_mode).toBe('flow');
        expect(resolved.width_pct).toBeCloseTo(40, 6);
    });
});

describe('resolveElementConfig: incomplete breakpoints never erase Móvil (bug real de producción)', () => {
    const MOBILE_PHONES = [360, 375, 390, 391, 393, 412, 414, 430, 446, 540, 593];

    it('15. Móvil V2 completo + Tablet ausente + Escritorio parcial (solo z_index): width_pct/height_pct sobreviven en todo el rango móvil', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(10, 20), width_pct: 25, height_pct: 40 },
            desktop: { z_index: 3 } as unknown as ElementConfigV2,
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfigV2;

            expect(resolved.width_pct).toBeCloseTo(25, 6);
            expect(resolved.height_pct).toBeCloseTo(40, 6);
            expect(resolved.x_pct).toBeCloseTo(10, 6);
            expect(resolved.y_pct).toBeCloseTo(20, 6);
        }
    });

    it('16. Móvil completo + Tablet parcial (solo z_index): la vista Móvil no se mezcla con Tablet dentro del rango móvil', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(5, 5), width_pct: 30, height_pct: null },
            tablet: { z_index: 2 } as unknown as ElementConfigV2,
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfigV2;

            expect(resolved.width_pct).toBeCloseTo(30, 6);
            expect(resolved.x_pct).toBeCloseTo(5, 6);
        }
    });

    it('17. Móvil V2 completo + Tablet V1 real: cada rango usa su propia composición, nunca interpolan entre sí', () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(0, 0),
            tablet: v1(384, 0), // 384/768*100 = 50%, pero eso es irrelevante: nunca se convierte
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfigV2;
            expect(resolved.x_pct).toBeCloseTo(0, 6);
        }

        const at700 = resolveElementConfig(settings, 700) as ElementConfig;
        expect(isV2Config(at700)).toBe(false);
        expect(at700.x).toBeCloseTo(384 * (700 / 768), 6);
    });

    it('18. Tablet con width_pct propio ausente (automático a propósito) NO hereda el valor de Móvil', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), width_pct: 60 },
            tablet: (() => {
                const c = v2Anchor(50, 0);
                delete (c as Partial<ElementConfigV2>).width_pct;
                return c;
            })(),
        };

        // Tablet SÍ tiene posición propia (x_pct/y_pct) — no es huérfana, así
        // que su propio width_pct ausente se queda automático (null), nunca
        // "rellenado" con el 60 de Móvil: cada dispositivo configurado de
        // verdad es dueño exclusivo de sus propios campos.
        const resolved = resolveElementConfig(settings, 700) as ElementConfigV2;
        expect(resolved.width_pct).toBeNull();
    });

    it('19. Tablet con height_pct explícitamente null (automático a propósito) NO hereda el valor de Móvil', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), height_pct: 45 },
            tablet: { ...v2Anchor(50, 0), height_pct: null },
        };

        const resolved = resolveElementConfig(settings, 700) as ElementConfigV2;
        expect(resolved.height_pct).toBeNull();
    });

    it('20. repro real: decoración "Tacos Dorados" (mobile.width=112, sin tablet, desktop.width=null) conserva 112 en todo el rango móvil', () => {
        const settings: ElementSettings = {
            mobile: v1(223.5, 788.9, { width: 112 }),
            desktop: v1(116.4, 1506.2),
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfig;

            expect(resolved.width).toBeCloseTo(112 * (width / 390), 6);
        }
    });

    it('21. repro real: decoración "Tú Eliges" (mobile+desktop completos en V1, sin tablet) NO deriva hacia Escritorio en ningún teléfono', () => {
        const settings: ElementSettings = {
            mobile: v1(10, 337, { width: 335, height: 40 }),
            desktop: v1(111, 1128, { width: 1237.5, height: 150 }),
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfig;

            // Proporcional a la ANCLA MÓVIL (335), nunca mezclado hacia 1237.5.
            expect(resolved.width).toBeCloseTo(335 * (width / 390), 6);
        }
    });

    it('22. frontera 390 -> 391: sin salto brusco (solo escala continua ~1/390), position_mode nunca cambia', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(10, 20), width_pct: 25 },
            desktop: { z_index: 3 } as unknown as ElementConfigV2,
        };

        const at390 = resolveElementConfig(settings, 390) as ElementConfigV2;
        const at391 = resolveElementConfig(settings, 391) as ElementConfigV2;
        const at392 = resolveElementConfig(settings, 392) as ElementConfigV2;

        expect(at390.width_pct).toBeCloseTo(25, 6);
        expect(at391.width_pct).toBeCloseTo(25, 6);
        expect(at392.width_pct).toBeCloseTo(25, 6);
        expect(at390.x_pct).toBeCloseTo(at391.x_pct, 6);
        expect(at391.x_pct).toBeCloseTo(at392.x_pct, 6);
        expect(at390.position_mode).toBe(at391.position_mode);
        expect(at391.position_mode).toBe(at392.position_mode);
    });

    it("23. position_mode:'normalized' en Móvil se conserva en todo el rango móvil pese a Escritorio parcial", () => {
        const settings: ElementSettings = {
            mobile: v2NormalizedAnchor(15, 25),
            desktop: { z_index: 5 } as unknown as ElementConfigV2,
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfigV2;

            expect(resolved.position_mode).toBe('normalized');
        }
    });
});

describe('resolveElementConfig: position_mode flow', () => {
    it("24. position_mode:'flow' se conserva cuando Móvil está completo y Tablet/Escritorio están ausentes o parciales", () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(10, 10),
            desktop: { z_index: 1 } as unknown as ElementConfigV2,
        };

        const resolved = resolveElementConfig(settings, 412) as ElementConfigV2;

        expect(resolved.position_mode).toBe('flow');
    });
});

describe('resolveElementConfig: dispositivo ausente por completo (nunca configurado)', () => {
    it('Tablet nunca configurado: cualquier ancho 640-1023 hereda la composición completa de Móvil (la más cercana), escalada', () => {
        const settings: ElementSettings = { mobile: { ...v2Anchor(10, 20), width_pct: 25 } };

        const resolved = resolveElementConfig(settings, 700) as ElementConfigV2;

        expect(resolved.x_pct).toBeCloseTo(10, 6);
        expect(resolved.width_pct).toBeCloseTo(25, 6);
    });

    it('Móvil nunca configurado: cualquier ancho <640 hereda la composición completa de Tablet (la más cercana a 390 que Escritorio), escalada', () => {
        const settings: ElementSettings = {
            tablet: v1(76.8, 0, { width: 100 }), // 10% de 768
            desktop: v1(720, 0, { width: 200 }), // 50% de 1440
        };

        const resolved = resolveElementConfig(settings, 400) as ElementConfig;

        // Hereda Tablet (768 está más cerca de 390 que 1440), escalado a 400.
        expect(resolved.width).toBeCloseTo(100 * (400 / 768), 6);
        expect(resolved.x).toBeCloseTo(76.8 * (400 / 768), 6);
    });

    it('todo el rango de un dispositivo ausente usa SIEMPRE la misma composición prestada (nunca cambia de anchor a mitad de rango)', () => {
        const settings: ElementSettings = { mobile: v2Anchor(10, 20) };

        // 640 y 1000 son ambos Tablet (ver resolveMenuDevice) — ninguno tiene
        // ancla propia, así que ambos deben pedir prestada la MISMA
        // composición (Móvil, la única que existe), nunca una distinta según
        // el punto exacto dentro del rango.
        const at640 = resolveElementConfig(settings, 640) as ElementConfigV2;
        const at1000 = resolveElementConfig(settings, 1000) as ElementConfigV2;

        expect(at640.x_pct).toBeCloseTo(10, 6);
        expect(at1000.x_pct).toBeCloseTo(10, 6);
    });
});

describe('V1 -> V2 conversion', () => {
    it('8. converts from a measured DOM rect', () => {
        const v1Config: ElementConfig = v1(999, 999, { width: 80, z_index: 3 }); // x/y irrelevant — DOM rect wins
        const root: RectLike = { left: 0, top: 0, width: 390, height: 800 };
        const el: RectLike = { left: 195, top: 78, width: 80, height: 40 };

        const v2 = upgradeV1ToV2(v1Config, el, root, 'normalized');

        expect(v2.coordinate_version).toBe(2);
        expect(v2.position_mode).toBe('normalized');
        expect(v2.x_pct).toBeCloseTo(50, 6);
        expect(v2.y_pct).toBeCloseTo(20, 6);
        expect(v2.width_pct).toBeCloseTo((80 / 390) * 100, 6); // width was set on V1
        expect(v2.height_pct).toBeNull(); // height was null (auto) on V1
        expect(v2.z_index).toBe(3);
    });

    it('9. idempotent: converting an already-V2 config is a no-op short-circuit', () => {
        const alreadyV2 = v2Anchor(12, 34);
        const root: RectLike = { left: 0, top: 0, width: 390, height: 800 };
        const el: RectLike = { left: 999, top: 999, width: 999, height: 999 };

        const result = upgradeV1ToV2(alreadyV2, el, root, 'normalized');

        // Debe devolver el MISMO objeto sin remedir/redividir — nunca
        // porcentaje-sobre-porcentaje.
        expect(result).toBe(alreadyV2);
        expect(result.x_pct).toBe(12);
        expect(result.y_pct).toBe(34);
    });

    it('9b. calling resolveElementConfig on a single V2 anchor twice never re-derives it', () => {
        const settings: ElementSettings = { mobile: v2Anchor(12, 34) };
        const first = resolveElementConfig(settings, 390) as ElementConfigV2;
        const second = resolveElementConfig(settings, 390) as ElementConfigV2;

        expect(first.x_pct).toBe(12);
        expect(second.x_pct).toBe(12);
    });
});

describe('sectionHeightFor: escala proporcional + herencia entre dispositivos', () => {
    function categoryWithHeights(
        heights: Partial<Record<'mobile' | 'tablet' | 'desktop', number | null>>,
    ): Pick<MenuCategoryData, 'section_height'> {
        return { section_height: heights };
    }

    it('sin ninguna altura guardada, es automático (null)', () => {
        expect(sectionHeightFor(categoryWithHeights({}), 400)).toBeNull();
        expect(sectionHeightFor({ section_height: null }, 400)).toBeNull();
    });

    it('escala proporcionalmente dentro del rango de su propio dispositivo (ratio = altura / ancho de referencia)', () => {
        const category = categoryWithHeights({ mobile: 780 }); // ratio 2 (780/390)

        expect(sectionHeightFor(category, 390)).toBeCloseTo(780, 6);
        expect(sectionHeightFor(category, 320)).toBeCloseTo(640, 6); // 2 * 320
        expect(sectionHeightFor(category, 593)).toBeCloseTo(1186, 6); // 2 * 593, sigue siendo Móvil
    });

    it('nunca desaparece por faltar Tablet cuando Móvil sí tiene una altura válida (bug real corregido)', () => {
        const category = categoryWithHeights({ mobile: 780 }); // sin tablet

        // 700px es rango Tablet — antes esto devolvía null solo por no
        // existir esa clave; ahora hereda la razón de Móvil (la más
        // cercana) y sigue escalando.
        const heightAt700 = sectionHeightFor(category, 700);

        expect(heightAt700).not.toBeNull();
        expect(heightAt700).toBeCloseTo(2 * 700, 6);
    });

    it('cada dispositivo usa SU PROPIA razón cuando está configurado, nunca la de otro', () => {
        const category = categoryWithHeights({ mobile: 780, tablet: 384 }); // tablet ratio 0.5

        expect(sectionHeightFor(category, 768)).toBeCloseTo(384, 6);
        expect(sectionHeightFor(category, 1000)).toBeCloseTo(0.5 * 1000, 6);
        // Móvil sigue usando su propia razón (2), nunca la de Tablet (0.5).
        expect(sectionHeightFor(category, 500)).toBeCloseTo(2 * 500, 6);
    });

    it('Escritorio sin altura propia hereda de Tablet (más cercano que Móvil)', () => {
        const category = categoryWithHeights({ mobile: 780, tablet: 384 });

        const heightAt1440 = sectionHeightFor(category, 1440);

        // Hereda la razón de Tablet (0.5), no la de Móvil (2).
        expect(heightAt1440).toBeCloseTo(0.5 * 1440, 6);
    });
});

describe('matriz completa de anchos exigida por el reporte de bug (390-1920, sin saltos ni NaN)', () => {
    const ALL_WIDTHS = [
        320, 360, 375, 390, 391, 392, 393, 412, 414, 430, 446, 480, 540, 593,
        639, 640, 667, 720, 767, 768, 820, 912, 1023, 1024, 1280, 1440, 1920,
    ];

    // Configuración realista mixta: Móvil V2 normalizado, Tablet V1 clásico,
    // Escritorio V2 con solo z_index (huérfano) — exactamente el tipo de
    // datos "mezclados" que describe el reporte de bug.
    const settings: ElementSettings = {
        mobile: { ...v2NormalizedAnchor(20, 30), width_pct: 40, height_pct: 15 },
        tablet: v1(200, 100, { width: 300, height: 120 }),
        desktop: { z_index: 4 } as unknown as ElementConfigV2,
    };

    it('nunca produce NaN/Infinity ni dimensiones intrínsecas gigantes en ningún ancho de la lista', () => {
        for (const width of ALL_WIDTHS) {
            const resolved = resolveElementConfig(settings, width) as unknown as Record<
                string,
                unknown
            >;

            for (const key of ['x', 'y', 'x_pct', 'y_pct', 'width', 'height', 'width_pct', 'height_pct']) {
                const value = resolved[key];

                if (typeof value === 'number') {
                    expect(Number.isFinite(value)).toBe(true);
                    expect(Math.abs(value)).toBeLessThan(100000);
                }
            }
        }
    });

    it('390 y 392 usan la misma composición Móvil, proporcionalmente (nunca saltan a Tablet)', () => {
        const at390 = resolveElementConfig(settings, 390) as ElementConfigV2;
        const at392 = resolveElementConfig(settings, 392) as ElementConfigV2;

        expect(isV2Config(at390)).toBe(true);
        expect(isV2Config(at392)).toBe(true);
        expect(at390.position_mode).toBe('normalized');
        expect(at392.position_mode).toBe('normalized');
        expect(at390.x_pct).toBeCloseTo(at392.x_pct, 6);
        expect(at390.width_pct).toBeCloseTo(at392.width_pct as number, 6);
    });

    it('391 no cambia position_mode ni versión respecto a 390', () => {
        const at390 = resolveElementConfig(settings, 390) as ElementConfigV2;
        const at391 = resolveElementConfig(settings, 391) as ElementConfigV2;

        expect(isV2Config(at391)).toBe(isV2Config(at390));
        expect(at391.position_mode).toBe(at390.position_mode);
    });

    it('593 sigue usando Móvil (nunca Tablet, pese a estar numéricamente más cerca de 768 que de 390)', () => {
        const at593 = resolveElementConfig(settings, 593) as ElementConfigV2;

        expect(isV2Config(at593)).toBe(true);
        expect(at593.position_mode).toBe('normalized'); // heredado de Móvil, no de Tablet (V1)
    });

    it('640 ya usa Tablet (V1, escalado exactamente a su propio ancla 768)', () => {
        const at640 = resolveElementConfig(settings, 640) as ElementConfig;

        expect(isV2Config(at640)).toBe(false);
        expect(at640.x).toBeCloseTo(200 * (640 / 768), 6);
    });

    it('1024 ya usa Escritorio (huérfano: hereda la geometría completa de Tablet, la más cercana, con su propio z_index)', () => {
        const at1024 = resolveElementConfig(settings, 1024) as ElementConfig;

        expect(at1024.z_index).toBe(4); // z_index propio de Escritorio, nunca sobrescrito
        expect(at1024.x).toBeCloseTo(200 * (1024 / 768), 6); // geometría heredada de Tablet, escalada a 1024
    });

    it('elementos ocultos siguen ocultos en cualquier ancho (hidden nunca se "activa" a medio camino)', () => {
        const hiddenSettings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), hidden: true },
        };

        for (const width of ALL_WIDTHS) {
            const resolved = resolveElementConfig(hiddenSettings, width) as ElementConfigV2;
            expect(resolved.hidden).toBe(true);
        }
    });

    it('z_index y adornos (color/fit/align) nunca cambian dentro del mismo dispositivo', () => {
        const decoSettings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), z_index: 7, fit: 'cover', align: 'center', color: '#ff0000' },
        };

        for (const width of [320, 360, 390, 480, 593, 639]) {
            const resolved = resolveElementConfig(decoSettings, width) as ElementConfigV2;
            expect(resolved.z_index).toBe(7);
            expect(resolved.fit).toBe('cover');
            expect(resolved.align).toBe('center');
            expect(resolved.color).toBe('#ff0000');
        }
    });
});

describe('paridad editor <-> público', () => {
    it('resolveElementConfig es una función pura determinista: mismos settings + mismo ancho = misma salida siempre (editor y /menu comparten esta única fuente de verdad)', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(12, 34), width_pct: 56 },
            desktop: v1(100, 200, { width: 300 }),
        };

        for (const width of [390, 500, 768, 1024, 1440, 1920]) {
            const first = resolveElementConfig(settings, width);
            const second = resolveElementConfig(settings, width);
            expect(second).toEqual(first);
        }
    });
});

describe('byZone', () => {
    function item(overrides: Partial<MenuItemData>): MenuItemData {
        return {
            id: 1,
            name: 'Item',
            slug: 'item',
            zone: null,
            price: 0,
            sort_order: 0,
            ...overrides,
        };
    }

    // Regresión: `zone` clasifica, NUNCA es una relación 1:1 — un mismo zone
    // puede tener 0, 1 o N platillos activos a la vez. byZone() debe devolver
    // el arreglo COMPLETO (nunca solo el primero); son las plantillas
    // (*Page.vue) las que deciden si iteran todos o toman [0] a propósito —
    // ver PozolePage/BirriaPage/PancitaPage/ComalPage, que ya no toman [0]
    // para sus zonas 'main'/'accompaniment'/'footer'/'sope'.
    it('returns EVERY item in the zone, not just the first match', () => {
        const items = [
            item({ id: 1, zone: 'main', name: 'Pozole Blanco' }),
            item({ id: 2, zone: 'main', name: 'Pozole Verde' }),
            item({ id: 3, zone: 'accompaniment', name: 'Tacos Dorados' }),
        ];

        const main = byZone(items, 'main');

        expect(main).toHaveLength(2);
        expect(main.map((i) => i.id)).toEqual([1, 2]);
    });

    it('never drops an existing item when a new one is added to the SAME zone', () => {
        const existing = [item({ id: 1, zone: 'main', name: 'Ya existía' })];
        const withNewOne = [
            ...existing,
            item({ id: 2, zone: 'main', name: 'Nuevo' }),
        ];

        const before = byZone(existing, 'main');
        const after = byZone(withNewOne, 'main');

        expect(before.map((i) => i.id)).toEqual([1]);
        // El platillo que YA estaba sigue presente, en el mismo orden — el
        // nuevo se agrega, nunca reemplaza.
        expect(after.map((i) => i.id)).toEqual([1, 2]);
    });

    it('returns an empty array (not undefined) for a zone with no items', () => {
        expect(byZone([], 'main')).toEqual([]);
    });
});
