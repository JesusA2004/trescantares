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
    upgradeV1ToV2,
    type ElementConfig,
    type ElementConfigV2,
    type ElementSettings,
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

describe('resolveElementConfig interpolation', () => {
    it('4. interpolates linearly between mobile and tablet anchors', () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(10, 20),
            tablet: v2Anchor(50, 60),
        };

        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.x_pct).toBeCloseTo(30, 6);
        expect(resolved.y_pct).toBeCloseTo(40, 6);
    });

    it('5. interpolates linearly between tablet and desktop anchors', () => {
        const settings: ElementSettings = {
            tablet: v2Anchor(0, 0),
            desktop: v2Anchor(100, 40),
        };

        const midpoint = (MENU_DEVICE_WIDTH.tablet + MENU_DEVICE_WIDTH.desktop) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.x_pct).toBeCloseTo(50, 6);
        expect(resolved.y_pct).toBeCloseTo(20, 6);
    });

    it('6. below 390px: V1 scales proportionally (the bug fix) instead of freezing', () => {
        const v1Settings: ElementSettings = {
            mobile: { x: 40, y: -20, width: null, height: null, scale: 1, rotation: 0, z_index: 1 },
        };

        const at390 = resolveElementConfig(v1Settings, 390) as ElementConfig;
        const at360 = resolveElementConfig(v1Settings, 360) as ElementConfig;

        expect(at390.x).toBe(40);
        // Ya NO debe quedarse congelado en 40 — debe escalar proporcionalmente.
        expect(at360.x).toBeCloseTo(40 * (360 / 390), 6);
        expect(at360.x).not.toBeCloseTo(40, 3);
    });

    it('6b. above 390px with only a mobile anchor (e.g. 430px phone): also scales, matches the Birria repro', () => {
        const v1Settings: ElementSettings = {
            mobile: { x: 40, y: -20, width: null, height: null, scale: 1, rotation: 0, z_index: 1 },
        };

        const at430 = resolveElementConfig(v1Settings, 430) as ElementConfig;

        expect(at430.x).toBeCloseTo(40 * (430 / 390), 6);
        expect(at430.x).not.toBeCloseTo(40, 3);
    });

    it('6b. below 390px: V2 pct is a correct no-op (already resolution-independent)', () => {
        const v2Settings: ElementSettings = { mobile: v2Anchor(40, -20) };

        const at390 = resolveElementConfig(v2Settings, 390) as ElementConfigV2;
        const at360 = resolveElementConfig(v2Settings, 360) as ElementConfigV2;

        expect(at390.x_pct).toBe(40);
        expect(at360.x_pct).toBe(40);
    });

    it('7. above 1440px: V1 vs V2 side by side', () => {
        const v1Settings: ElementSettings = {
            desktop: { x: 100, y: 0, width: null, height: null, scale: 1, rotation: 0, z_index: 1 },
        };
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

    it('mixed V1/V2 anchor pair blends smoothly instead of snapping', () => {
        const settings: ElementSettings = {
            mobile: { x: 39, y: 0, width: null, height: null, scale: 1, rotation: 0, z_index: 1 }, // 39/390*100 = 10%
            tablet: v2Anchor(50, 0),
        };

        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(isV2Config(resolved)).toBe(true);
        expect(resolved.x_pct).toBeCloseTo(30, 4); // lerp(10, 50, 0.5)
    });

    // Regresión: resolveElementConfig forzaba position_mode:'normalized' con
    // solo que UNA de las dos anclas fuera V2, aunque ninguna hubiera salido
    // realmente de flujo (p. ej. un elemento solo redimensionado, nunca
    // movido — ver startResize, que preserva 'flow'). Los 4 casos de abajo
    // cubren exactamente la matriz que pide el arreglo.
    it('10. V2 flow + V2 flow -> flow', () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(10, 0),
            tablet: v2Anchor(50, 0),
        };
        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.position_mode).toBe('flow');
    });

    it('11. V1 + V2 flow -> flow', () => {
        const settings: ElementSettings = {
            mobile: { x: 39, y: 0, width: null, height: null, scale: 1, rotation: 0, z_index: 1 },
            tablet: v2Anchor(50, 0),
        };
        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.position_mode).toBe('flow');
    });

    it('12. V2 normalized + V2 flow -> normalized', () => {
        const settings: ElementSettings = {
            mobile: v2NormalizedAnchor(10, 0),
            tablet: v2Anchor(50, 0),
        };
        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.position_mode).toBe('normalized');
    });

    it('13. V2 normalized + V1 -> normalized', () => {
        const settings: ElementSettings = {
            mobile: v2NormalizedAnchor(10, 0),
            tablet: { x: 195, y: 0, width: null, height: null, scale: 1, rotation: 0, z_index: 1 },
        };
        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.position_mode).toBe('normalized');
    });

    it('14. an element resized but never moved does not jump out of flow at an intermediate width', () => {
        // Simula: el admin redimensionó este elemento en las anclas mobile Y
        // tablet (ambas se quedaron en 'flow', ver startResize, que nunca
        // fuerza 'normalized' en un resize puro) — resolver en un ancho
        // intermedio debe seguir siendo 'flow' (position:relative en
        // MenuEditableElement.vue, nunca salta a position:absolute).
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), width_pct: 40 },
            tablet: { ...v2Anchor(0, 0), width_pct: 30 },
        };
        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.position_mode).toBe('flow');
        expect(resolved.width_pct).toBeCloseTo(35, 6);
    });
});

describe('resolveElementConfig: incomplete breakpoints never erase Móvil (bug real de producción)', () => {
    const MOBILE_PHONES = [360, 375, 390, 391, 393, 412, 414, 430];

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

    it('17. Móvil completo + Tablet legacy (V1) real: sigue interpolando (comportamiento intencional, no un bug)', () => {
        const settings: ElementSettings = {
            mobile: v2Anchor(0, 0),
            tablet: { x: 384, y: 0, width: null, height: null, scale: 1, rotation: 0, z_index: 1 }, // 384/768*100 = 50%
        };

        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.x_pct).toBeCloseTo(25, 4); // lerp(0, 50, 0.5)
    });

    it('18. width_pct definido abajo y AUSENTE (undefined) arriba: no colapsa a null', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), width_pct: 60 },
            tablet: (() => {
                const c = v2Anchor(50, 0);
                delete (c as Partial<ElementConfigV2>).width_pct;
                return c;
            })(),
        };

        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.width_pct).toBe(60);
    });

    it('19. height_pct definido abajo y explícitamente null arriba: no colapsa el valor real', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(0, 0), height_pct: 45 },
            tablet: { ...v2Anchor(50, 0), height_pct: null },
        };

        const midpoint = (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
        const resolved = resolveElementConfig(settings, midpoint) as ElementConfigV2;

        expect(resolved.height_pct).toBe(45);
    });

    it('20. repro real: decoración "Tacos Dorados" (mobile.width=112, sin tablet, desktop.width=null) conserva 112 en todo el rango móvil', () => {
        const settings: ElementSettings = {
            mobile: { x: 223.5, y: 788.9, width: 112, height: null, scale: 1, rotation: 0, z_index: 1 },
            desktop: { x: 116.4, y: 1506.2, width: null, height: null, scale: 1, rotation: 0, z_index: 1 },
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfig;

            expect(resolved.width).toBeCloseTo(112 * (width / 390), 6);
        }
    });

    it('21. repro real: decoración "Tú Eliges" (mobile+desktop completos en V1, sin tablet) NO deriva hacia Escritorio en ningún teléfono', () => {
        const settings: ElementSettings = {
            mobile: { x: 10, y: 337, width: 335, height: 40, scale: 1, rotation: 0, z_index: 1 },
            desktop: { x: 111, y: 1128, width: 1237.5, height: 150, scale: 1, rotation: 0, z_index: 1 },
        };

        for (const width of MOBILE_PHONES) {
            const resolved = resolveElementConfig(settings, width) as ElementConfig;

            // Proporcional a la ANCLA MÓVIL (335), nunca mezclado hacia 1237.5.
            expect(resolved.width).toBeCloseTo(335 * (width / 390), 6);
        }
    });

    it('22. frontera 390 -> 391: sin salto brusco (solo escala continua ~1/390)', () => {
        const settings: ElementSettings = {
            mobile: { ...v2Anchor(10, 20), width_pct: 25 },
            desktop: { z_index: 3 } as unknown as ElementConfigV2,
        };

        const at390 = resolveElementConfig(settings, 390) as ElementConfigV2;
        const at391 = resolveElementConfig(settings, 391) as ElementConfigV2;

        expect(at390.width_pct).toBeCloseTo(25, 6);
        expect(at391.width_pct).toBeCloseTo(25, 6);
        expect(at390.x_pct).toBeCloseTo(at391.x_pct, 1);
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

describe('V1 -> V2 conversion', () => {
    it('8. converts from a measured DOM rect', () => {
        const v1: ElementConfig = {
            x: 999, // irrelevant to the conversion output — DOM rect wins
            y: 999,
            width: 80,
            height: null,
            scale: 1,
            rotation: 0,
            z_index: 3,
        };
        const root: RectLike = { left: 0, top: 0, width: 390, height: 800 };
        const el: RectLike = { left: 195, top: 78, width: 80, height: 40 };

        const v2 = upgradeV1ToV2(v1, el, root, 'normalized');

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
