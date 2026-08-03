import { describe, expect, it } from 'vitest';
import {
    MENU_DEVICE_WIDTH,
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
