// El ancho REAL y continuo del viewport (px), no un bucket discreto — cada
// elemento se posiciona interpolando entre las tres vistas configurables
// (ver MenuDevice) según este número exacto. Sigue llamándose
// "MenuBreakpoint" únicamente para no tener que tocar el prop `breakpoint`
// que todas las plantillas de página (PozolePage, BirriaPage, etc.) ya
// reciben y reenvían tal cual a itemElementFor/categoryElementFor.
export type MenuBreakpoint = number;

/** Las tres vistas configurables que ve el administrador — todo lo demás
 * (los seis breakpoints de Tailwind sm/md/lg/xl/2xl que sigue usando el CSS
 * estructural) es invisible para él. */
export type MenuDevice = 'mobile' | 'tablet' | 'desktop';

export const MENU_DEVICE_ORDER: MenuDevice[] = ['mobile', 'tablet', 'desktop'];

/** Anchos de referencia (px) de cada vista — deben coincidir exactamente con
 * el tamaño real del iframe del editor para que "lo que ves es lo que hay". */
export const MENU_DEVICE_WIDTH: Record<MenuDevice, number> = {
    mobile: 390,
    tablet: 768,
    desktop: 1440,
};

export const MENU_DEVICE_LABELS: Record<MenuDevice, string> = {
    mobile: 'Móvil',
    tablet: 'Tablet',
    desktop: 'Escritorio',
};

/** Vista más cercana a un ancho dado — usada solo para saber en qué vista
 * persistir un arrastre hecho dentro del iframe del editor (que siempre
 * carga a un ancho EXACTO de 390/768/1440, así que esto resuelve siempre al
 * ancla exacta, nunca a una zona intermedia). */
export function resolveMenuDevice(width: number): MenuDevice {
    const midMobileTablet =
        (MENU_DEVICE_WIDTH.mobile + MENU_DEVICE_WIDTH.tablet) / 2;
    const midTabletDesktop =
        (MENU_DEVICE_WIDTH.tablet + MENU_DEVICE_WIDTH.desktop) / 2;

    if (width <= midMobileTablet) {
        return 'mobile';
    }

    if (width <= midTabletDesktop) {
        return 'tablet';
    }

    return 'desktop';
}

/** Configuración de posición/tamaño/tipografía/imagen de UN elemento en UN
 * breakpoint. Todos los campos de texto/imagen son opcionales — solo se
 * usan cuando el elemento los soporta (ver ElementKind). */
export interface ElementConfig {
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    scale: number;
    rotation: number;
    z_index: number;
    locked?: boolean;
    /** Oculto SOLO en la vista resuelta actual (mobile/tablet/desktop) — a
     * diferencia de is_active del modelo (oculta en TODAS las vistas), esto
     * permite p. ej. un adorno visible únicamente en Escritorio. Discreto:
     * nunca se "mezcla" a medias entre dos vistas. */
    hidden?: boolean;
    /** 0-1, interpolable — pensado sobre todo para adornos decorativos. */
    opacity?: number | null;
    // Texto
    font_size?: number | null;
    line_height?: number | null;
    letter_spacing?: number | null;
    align?: 'left' | 'center' | 'right' | null;
    max_width?: number | null;
    color?: string | null;
    // Imagen
    fit?: 'contain' | 'cover' | null;
    object_x?: number | null;
    object_y?: number | null;
    inner_scale?: number | null;
}

export function defaultElementConfig(): ElementConfig {
    // Siempre un objeto nuevo — nunca una referencia compartida: en SSR el
    // proceso de Node vive entre requests, así que una sola instancia mutada
    // por accidente en cualquier parte contaminaría el render de todos los
    // elementos sin personalizar del resto de peticiones.
    return {
        x: 0,
        y: 0,
        width: null,
        height: null,
        scale: 1,
        rotation: 0,
        z_index: 1,
    };
}

/** 'flow' = sigue dependiendo del flujo natural de flex/grid (como TODO
 * elemento hoy, V1 o V2 recién creado); 'normalized' = ya se movió/redimensionó
 * a mano al menos una vez, position:absolute permanente dentro de
 * .tc-mp-customized-layer, fuera del flujo por completo (ver
 * MenuEditableElement.vue). */
export type ElementPositionMode = 'flow' | 'normalized';

/**
 * Formato V2 — coordenadas normalizadas contra el ANCHO real renderizado del
 * "positioning root" de la sección (.tc-mp-content-layer), nunca contra
 * window.innerWidth/el iframe/el propio ancho del elemento. Reemplaza x/y/
 * width/height en px del V1 (ver ElementConfig) — el resto de campos
 * (tipografía, imagen, capa) se conservan sin cambio, nunca necesitaron ser
 * porcentuales para dejar de "congelarse" fuera del rango 390-1440
 * configurado (ver resolveElementConfig: la extrapolación proporcional ya
 * los cubre igual que a x_pct/y_pct).
 */
export interface ElementConfigV2 {
    coordinate_version: 2;
    position_mode: ElementPositionMode;
    /** % del ANCHO del root (0-100 típico, puede salir de rango si el
     * elemento está parcial o totalmente fuera del lienzo). */
    x_pct: number;
    /** También en % del ANCHO del root (NUNCA del alto) — a propósito,
     * conserva la escala uniforme de la composición entre teléfonos. */
    y_pct: number;
    width_pct: number | null;
    height_pct: number | null;
    scale: number;
    rotation: number;
    z_index: number;
    locked?: boolean;
    hidden?: boolean;
    opacity?: number | null;
    // Mismos campos no geométricos que ElementConfig — sin cambio de forma.
    font_size?: number | null;
    line_height?: number | null;
    letter_spacing?: number | null;
    align?: 'left' | 'center' | 'right' | null;
    max_width?: number | null;
    color?: string | null;
    fit?: 'contain' | 'cover' | null;
    object_x?: number | null;
    object_y?: number | null;
    inner_scale?: number | null;
}

export function defaultElementConfigV2(): ElementConfigV2 {
    return {
        coordinate_version: 2,
        position_mode: 'flow',
        x_pct: 0,
        y_pct: 0,
        width_pct: null,
        height_pct: null,
        scale: 1,
        rotation: 0,
        z_index: 1,
    };
}

/** Cualquier configuración guardada — V1 (px, formato histórico, ver
 * ElementConfig) o V2 (%, ver ElementConfigV2). Un config es V1 SIEMPRE que
 * no tenga `coordinate_version === 2` — "clave ausente" es el marcador
 * permanente e inambiguo de V1 tanto aquí como en el backend
 * (MenuEditorController::configRules), nunca se reescribe una fila V1 para
 * "marcarla" como tal. */
export type StoredElementConfig = ElementConfig | ElementConfigV2;

export function isV2Config(
    config: StoredElementConfig | null | undefined,
): config is ElementConfigV2 {
    return !!config && (config as ElementConfigV2).coordinate_version === 2;
}

/** Forma mínima de un DOMRect que necesitan las conversiones de abajo —
 * permite pasar un objeto plano en pruebas unitarias sin depender de un DOM
 * real. */
export interface RectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Guardado contra rootWidthPx <= 0 / no finito (el root aún no tiene layout,
 * p. ej. antes del primer paint) — 0 en vez de NaN/Infinity, nunca debe
 * propagar un valor no numérico al style calculado. */
export function pxToPct(px: number, rootWidthPx: number): number {
    if (!Number.isFinite(rootWidthPx) || rootWidthPx <= 0) {
        return 0;
    }

    return (px / rootWidthPx) * 100;
}

export function pctToPx(pct: number, rootWidthPx: number): number {
    if (!Number.isFinite(rootWidthPx) || rootWidthPx <= 0) {
        return 0;
    }

    return (pct / 100) * rootWidthPx;
}

/**
 * Único punto que traduce una medición REAL del DOM (rect del elemento +
 * rect del positioning-root) a porcentajes — fórmula exacta del spec: ambos
 * ejes (x Y y) se dividen entre el ANCHO del root, nunca su alto.
 */
export function measuredRectToNormalized(
    elementRect: RectLike,
    rootRect: RectLike,
): { x_pct: number; y_pct: number; width_pct: number; height_pct: number } {
    return {
        x_pct: pxToPct(elementRect.left - rootRect.left, rootRect.width),
        y_pct: pxToPct(elementRect.top - rootRect.top, rootRect.width),
        width_pct: pxToPct(elementRect.width, rootRect.width),
        height_pct: pxToPct(elementRect.height, rootRect.width),
    };
}

/** Inversa de measuredRectToNormalized — alimenta el style calculado de
 * MenuEditableElement (left/top/width/height reales) a partir del ancho real
 * medido del root en ESE momento (vía ResizeObserver, nunca el viewport). */
export function normalizedToPx(
    config: Pick<ElementConfigV2, 'x_pct' | 'y_pct' | 'width_pct' | 'height_pct'>,
    rootWidthPx: number,
): { left: number; top: number; width: number | null; height: number | null } {
    return {
        left: pctToPx(config.x_pct, rootWidthPx),
        top: pctToPx(config.y_pct, rootWidthPx),
        width:
            config.width_pct !== null
                ? pctToPx(config.width_pct, rootWidthPx)
                : null,
        height:
            config.height_pct !== null
                ? pctToPx(config.height_pct, rootWidthPx)
                : null,
    };
}

/**
 * Construye un ElementConfigV2 a partir de una medición real del DOM,
 * conservando los campos no geométricos de la config V1 previa (o los
 * valores por defecto si el elemento nunca se había personalizado).
 * Idempotente por construcción: si `baseline` YA es V2, se devuelve tal cual
 * — nunca se vuelve a medir ni se divide porcentaje-sobre-porcentaje (cubierto
 * también por una prueba unitaria explícita, ver types.spec.ts).
 */
export function upgradeV1ToV2(
    baseline: StoredElementConfig | null | undefined,
    elementRect: RectLike,
    rootRect: RectLike,
    positionMode: ElementPositionMode,
): ElementConfigV2 {
    if (isV2Config(baseline)) {
        return baseline;
    }

    const v1 = baseline as ElementConfig | null | undefined;
    const measured = measuredRectToNormalized(elementRect, rootRect);

    return {
        coordinate_version: 2,
        position_mode: positionMode,
        x_pct: measured.x_pct,
        y_pct: measured.y_pct,
        // Solo hereda un tamaño personalizado si el V1 YA tenía uno propio
        // (width/height !== null) — si no, se queda "automático" (null),
        // igual que hoy, en vez de fijar el tamaño intrínseco medido.
        width_pct: v1?.width != null ? measured.width_pct : null,
        height_pct: v1?.height != null ? measured.height_pct : null,
        scale: v1?.scale ?? 1,
        rotation: v1?.rotation ?? 0,
        z_index: v1?.z_index ?? 1,
        opacity: v1?.opacity ?? null,
        locked: v1?.locked,
        hidden: v1?.hidden,
        font_size: v1?.font_size ?? null,
        line_height: v1?.line_height ?? null,
        letter_spacing: v1?.letter_spacing ?? null,
        align: v1?.align ?? null,
        max_width: v1?.max_width ?? null,
        color: v1?.color ?? null,
        fit: v1?.fit ?? null,
        object_x: v1?.object_x ?? null,
        object_y: v1?.object_y ?? null,
        inner_scale: v1?.inner_scale ?? null,
    };
}

/** Un elemento tiene como máximo tres configuraciones guardadas (una por
 * MenuDevice) — todo ancho intermedio se calcula interpolando entre ellas,
 * nunca se guarda un cuarto/quinto/sexto valor. `_legacy_breakpoints` es un
 * respaldo de solo lectura que deja la migración de datos del formato
 * anterior (base/sm/md/lg/xl/2xl) — el código público nunca lo lee. */
export type ElementSettings = Partial<Record<MenuDevice, StoredElementConfig>> & {
    _legacy_breakpoints?: unknown;
};

const INTERPOLATED_FIELDS = [
    'x',
    'y',
    'x_pct',
    'y_pct',
    'scale',
    'rotation',
    'font_size',
    'line_height',
    'letter_spacing',
    'max_width',
    'object_x',
    'object_y',
    'inner_scale',
    'opacity',
] as const satisfies readonly (keyof ElementConfig | keyof ElementConfigV2)[];

/** Campos discretos: no tiene sentido "mezclar" un z-index o una alineación
 * a medio camino — siempre toman el valor del ancla inferior más cercana. */
const DISCRETE_FIELDS = [
    'z_index',
    'locked',
    'hidden',
    'align',
    'fit',
    'color',
] as const satisfies readonly (keyof ElementConfig | keyof ElementConfigV2)[];

function clamp01(t: number): number {
    return Math.min(1, Math.max(0, t));
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Interpola width/height: si CUALQUIERA de las dos anclas es "automático"
 * (null — conserva la proporción original de la imagen), el resultado se
 * queda en automático en vez de forzar un tamaño intermedio arbitrario. */
function lerpSize(
    a: number | null | undefined,
    b: number | null | undefined,
    t: number,
): number | null {
    if (a === null || a === undefined || b === null || b === undefined) {
        return null;
    }

    return lerp(a, b, t);
}

function lerpOptional(
    a: number | null | undefined,
    b: number | null | undefined,
    t: number,
): number | null {
    const an = a ?? null;
    const bn = b ?? null;

    if (an === null && bn === null) {
        return null;
    }

    if (an === null) {
        return bn;
    }

    if (bn === null) {
        return an;
    }

    return lerp(an, bn, t);
}

/**
 * Campos en px reales que deben escalar proporcionalmente al convertir entre
 * el ancho REAL en que se editó/renderiza un elemento y el ancho de
 * referencia (ancla) 1440px que es lo único que se persiste — ver
 * toAnchorCoordinates/fromAnchorCoordinates. object_x/object_y son
 * porcentajes (no px), scale/inner_scale son multiplicadores sin unidad,
 * rotation son grados: ninguno de esos depende del ancho de viewport, así
 * que quedan fuera de esta lista a propósito.
 */
const SCALABLE_PX_FIELDS = [
    'x',
    'y',
    'width',
    'height',
    'font_size',
    'letter_spacing',
    'max_width',
] as const satisfies readonly (keyof ElementConfig)[];

/** Genérico en T para aceptar tanto ElementConfig (V1: x/y/width/height
 * escalan) como ElementConfigV2 (ninguno de sus campos está en
 * SCALABLE_PX_FIELDS salvo los no-geométricos heredados como font_size/
 * letter_spacing/max_width — así que en V2 esto escala SOLO tipografía, un
 * no-op deliberado para x_pct/y_pct/width_pct/height_pct, que ya son
 * resolución-independientes por diseño). */
function scaleConfigByRatio<T extends ElementConfig | ElementConfigV2>(
    config: T,
    ratio: number,
): T {
    if (ratio === 1 || !Number.isFinite(ratio)) {
        return config;
    }

    const out = { ...config } as T;

    for (const field of SCALABLE_PX_FIELDS) {
        const value = (config as unknown as Record<string, unknown>)[field] as
            | number
            | null
            | undefined;

        if (value !== null && value !== undefined) {
            (out as unknown as Record<string, number>)[field] = value * ratio;
        }
    }

    return out;
}

/**
 * Convierte una config medida en un viewport REAL (`editedAtWidth` — p. ej.
 * 1909px, el ancho real de la ventana del administrador al editar la vista
 * Escritorio) al equivalente en el ancla de referencia (`anchorWidth`,
 * 1440px por defecto) que es lo único que se persiste. Inverso exacto de
 * fromAnchorCoordinates: toAnchorCoordinates(fromAnchorCoordinates(c, w), w)
 * === c (salvo error de punto flotante), la propiedad que garantizan las
 * pruebas de ida y vuelta render→editar→guardar→render.
 */
export function toAnchorCoordinates<T extends ElementConfig | ElementConfigV2>(
    config: T,
    editedAtWidth: number,
    anchorWidth: number = MENU_DEVICE_WIDTH.desktop,
): T {
    return scaleConfigByRatio(config, anchorWidth / editedAtWidth);
}

/**
 * Inverso de toAnchorCoordinates: expande la config guardada en el ancla de
 * referencia (1440px) al ancho REAL objetivo — usado tanto por el iframe del
 * editor (Escritorio puede mostrarse a cualquier ancho real de pantalla,
 * p. ej. 1909px) como por /menu público para cualquier visitante con un
 * monitor más ancho que 1440px, para que la geometría personalizada no se
 * quede "congelada" en px absolutos mientras crece el espacio disponible.
 */
export function fromAnchorCoordinates<T extends ElementConfig | ElementConfigV2>(
    config: T,
    targetWidth: number,
    anchorWidth: number = MENU_DEVICE_WIDTH.desktop,
): T {
    return scaleConfigByRatio(config, targetWidth / anchorWidth);
}

interface DeviceAnchor {
    device: MenuDevice;
    width: number;
    config: StoredElementConfig;
}

function anchorsOf(
    settings: ElementSettings | null | undefined,
): DeviceAnchor[] {
    const anchors: DeviceAnchor[] = [];

    for (const device of MENU_DEVICE_ORDER) {
        const config = settings?.[device];

        if (config) {
            anchors.push({ device, width: MENU_DEVICE_WIDTH[device], config });
        }
    }

    return anchors;
}

function defaultConfigFor(config: StoredElementConfig): StoredElementConfig {
    return isV2Config(config) ? defaultElementConfigV2() : defaultElementConfig();
}

/** Convierte SOLO PARA MEZCLAR una config V1 a pct transitorio, usando el
 * ancho de SU PROPIA ancla como referencia (p. ej. x/390*100 para un ancla
 * mobile) — nunca se persiste, es puro azúcar para que la interpolación
 * entre un ancla V1 y una V2 (mientras el admin migra sus anclas una por
 * una tocándolas en el editor) no "salte" bruscamente de un valor a otro en
 * vez de mezclarse. La conversión real y persistida SIEMPRE se hace desde el
 * rect medido del DOM (ver upgradeV1ToV2) — esta es la única excepción
 * documentada al requisito de "nunca x/ancho a secas". */
function toTransientPct(config: ElementConfig, deviceWidth: number) {
    return {
        x_pct: (config.x / deviceWidth) * 100,
        y_pct: (config.y / deviceWidth) * 100,
        width_pct: config.width !== null ? (config.width / deviceWidth) * 100 : null,
        height_pct: config.height !== null ? (config.height / deviceWidth) * 100 : null,
    };
}

/**
 * Calcula la configuración real de un elemento para un ancho de viewport
 * arbitrario, interpolando linealmente entre las dos vistas configuradas más
 * cercanas (spec: t = (viewportWidth - anchoInferior) / (anchoSuperior -
 * anchoInferior), clamp 0..1).
 *
 * Fuera del rango configurado (por debajo del ancla más angosta o por
 * encima de la más ancha), la geometría escala PROPORCIONALMENTE en vez de
 * congelarse, para las TRES vistas (mobile/tablet/desktop) — no solo
 * 'desktop' como antes. Ese era exactamente el bug reportado: un ancla
 * mobile-only se quedaba pixel-idéntica tanto por debajo de 390px como en
 * CUALQUIER otro teléfono más ancho sin ancla propia (p. ej. 430px),
 * confirmado en el repro de Birria — ver comentario junto a
 * `viewportWidth >= last.width` más abajo sobre por qué NO se restringió
 * esto a 'desktop' pese a una sospecha inicial de regresión.
 *
 * Para un ancla V2 esta escala es un no-op sobre x_pct/y_pct/width_pct/
 * height_pct (ya son resolución-independientes por diseño — pctToPx hace el
 * trabajo real en el momento de renderizar contra el ancho REAL medido del
 * root), pero SÍ sigue escalando los campos no geométricos heredados
 * (font_size/letter_spacing/max_width) igual que en V1. Ver
 * fromAnchorCoordinates/toAnchorCoordinates para el sentido inverso.
 */
export function resolveElementConfig(
    settings: ElementSettings | null | undefined,
    viewportWidth: number,
): StoredElementConfig {
    const anchors = anchorsOf(settings);

    if (anchors.length === 0) {
        return defaultElementConfig();
    }

    const first = anchors[0];
    const last = anchors[anchors.length - 1];

    if (viewportWidth <= first.width) {
        const resolved = { ...defaultConfigFor(first.config), ...first.config };

        return viewportWidth !== first.width
            ? fromAnchorCoordinates(resolved, viewportWidth, first.width)
            : resolved;
    }

    if (anchors.length === 1 || viewportWidth >= last.width) {
        const resolved = { ...defaultConfigFor(last.config), ...last.config };

        // Igual que el límite inferior: proporcional para CUALQUIER vista,
        // nunca congelado — un ancla mobile-only vista en OTRO teléfono más
        // ancho (p. ej. 430px) debe escalar, no quedarse pixel-idéntica (el
        // caso exacto del bug reportado, confirmado en el repro de Birria a
        // 360/390/430px). Nota: se investigó restringir esto solo a
        // 'desktop' tras ver fallar tests-e2e/menu-decorations-stacking.spec.ts
        // y menu-editor-hide-and-altclick.spec.ts con este cambio activo —
        // pero se confirmó (comparando contra el código sin tocar, vía `git
        // stash`) que esas mismas pruebas YA fallaban de forma idéntica en
        // el código original, sin relación alguna con esta función: son
        // fallas preexistentes de ese entorno, no una regresión de este
        // arreglo. Ver fromAnchorCoordinates para el sentido inverso.
        return viewportWidth !== last.width
            ? fromAnchorCoordinates(resolved, viewportWidth, last.width)
            : resolved;
    }

    let lower = first;
    let upper = last;

    for (let i = 0; i < anchors.length - 1; i++) {
        if (
            viewportWidth >= anchors[i].width &&
            viewportWidth <= anchors[i + 1].width
        ) {
            lower = anchors[i];
            upper = anchors[i + 1];
            break;
        }
    }

    const t = clamp01(
        (viewportWidth - lower.width) / (upper.width - lower.width),
    );
    const lowerIsV2 = isV2Config(lower.config);
    const upperIsV2 = isV2Config(upper.config);
    const mixedVersions = lowerIsV2 !== upperIsV2;

    let a: Record<string, unknown> = {
        ...defaultConfigFor(lower.config),
        ...lower.config,
    };
    let b: Record<string, unknown> = {
        ...defaultConfigFor(upper.config),
        ...upper.config,
    };

    if (mixedVersions) {
        if (!lowerIsV2) {
            a = { ...a, ...toTransientPct(a as unknown as ElementConfig, lower.width) };
        }
        if (!upperIsV2) {
            b = { ...b, ...toTransientPct(b as unknown as ElementConfig, upper.width) };
        }
    }

    const out: Record<string, unknown> = { ...a };

    for (const field of INTERPOLATED_FIELDS) {
        out[field] = lerpOptional(
            a[field] as number | null | undefined,
            b[field] as number | null | undefined,
            t,
        );
    }

    out.width = lerpSize(a.width as number | null, b.width as number | null, t);
    out.height = lerpSize(a.height as number | null, b.height as number | null, t);
    out.width_pct = lerpSize(
        a.width_pct as number | null,
        b.width_pct as number | null,
        t,
    );
    out.height_pct = lerpSize(
        a.height_pct as number | null,
        b.height_pct as number | null,
        t,
    );

    for (const field of DISCRETE_FIELDS) {
        out[field] = a[field];
    }

    // Cualquier ancla V2 en el par implica que el elemento ya salió del
    // flujo (position:absolute) — el resultado interpolado debe seguir
    // siéndolo en TODO el rango intermedio, nunca "volver" a flow a mitad
    // de camino solo porque la otra ancla del par todavía es V1.
    if (lowerIsV2 || upperIsV2) {
        out.coordinate_version = 2;
        out.position_mode = 'normalized';
    }

    return out as unknown as StoredElementConfig;
}

export function hasOwnElementConfig(
    settings: ElementSettings | null | undefined,
    device: MenuDevice,
): boolean {
    return !!settings?.[device];
}

export type ItemElementKey =
    | 'container'
    | 'image'
    | 'name'
    | 'description'
    | 'price'
    | 'price_label'
    | 'price_secondary'
    | 'price_secondary_label'
    | 'presentation'
    | 'ingredients'
    | 'choice_label'
    | 'badge'
    | 'caption_image';

export type CategoryElementKey =
    | 'title'
    | 'subtitle'
    | 'tagline'
    | 'tagline_sub'
    | 'title_image'
    | 'subtitle_image'
    | 'tagline_image'
    | 'image';

export type ItemLayoutSettings = Partial<
    Record<ItemElementKey, ElementSettings>
>;

export type CategoryVisualSettings = Partial<
    Record<CategoryElementKey, ElementSettings>
>;

export interface MenuItemData {
    id: number;
    name: string;
    slug: string;
    zone: string | null;
    description?: string | null;
    price: number | string;
    price_label?: string | null;
    price_secondary?: number | string | null;
    price_secondary_label?: string | null;
    presentation?: string | null;
    choice_label?: string | null;
    /** Cuando es true, `choice_label` ya llega en null desde el backend (ver
     * MenuItem::toPublicArray) — el texto sigue guardado, solo se deja de
     * renderizar. Mismo mecanismo que `image_hidden` pero para este bloque. */
    choice_label_hidden?: boolean;
    ingredients?: string | null;
    /** Igual que `choice_label_hidden`, pero para el bloque de ingredientes. */
    ingredients_hidden?: boolean;
    badge?: string | null;
    image_url?: string | null;
    alt_text?: string | null;
    caption_image_url?: string | null;
    image_position_x?: number | null;
    image_position_y?: number | null;
    image_scale?: number | string | null;
    image_fit?: string | null;
    image_align?: string | null;
    visual_size?: string | null;
    layout_settings?: ItemLayoutSettings | null;
    is_active?: boolean;
    is_featured?: boolean;
    /** Oculta SOLO la fotografía (conserva nombre/descripción/precio) — ver
     * MenuItem::getImageUrlAttribute(). Cuando es true, image_url ya llega
     * en null desde el backend; el campo se manda para que el admin sepa
     * distinguir "sin foto" de "foto oculta temporalmente". */
    image_hidden?: boolean;
    previous_image?: string | null;
    sort_order: number;
}

/** Adorno de sección (flor, curva, textura…) — no pertenece a ningún
 * platillo. `visual_settings` es el MISMO shape ElementSettings que ya usan
 * categorías/platillos; la clave estable es `decoration-{id}:image`. */
export interface MenuDecorationData {
    id: number;
    menu_category_id: number;
    name: string;
    alt_text?: string | null;
    is_active: boolean;
    sort_order: number;
    visual_settings?: ElementSettings | null;
    image_url?: string | null;
    element_key: string;
}

export interface MenuCategoryData {
    id: number;
    name: string;
    slug: string;
    layout: string;
    description?: string | null;
    subtitle?: string | null;
    tagline?: string | null;
    tagline_sub?: string | null;
    image_url?: string | null;
    image_mobile_url?: string | null;
    title_image_url?: string | null;
    subtitle_image_url?: string | null;
    tagline_image_url?: string | null;
    color?: string | null;
    color_secondary?: string | null;
    background_position?: string | null;
    show_in_nav?: boolean;
    visual_settings?: CategoryVisualSettings | null;
    /** Alto MÍNIMO forzado a mano de la sección completa, por vista — null
     * (o vista ausente) = automático, crece con el contenido como siempre.
     * Nunca es un tope: si el contenido real es más alto, se sale
     * visualmente, nunca se recorta. Ver sectionHeightFor() más abajo. */
    section_height?: Partial<Record<MenuDevice, number | null>> | null;
    items: MenuItemData[];
    decorations?: MenuDecorationData[];
}

/**
 * Alto mínimo forzado de una sección para un ancho de viewport dado —
 * a propósito NO interpola entre vistas como resolveElementConfig(): es un
 * valor discreto que el admin fija a mano por dispositivo (mobile/tablet/
 * desktop, ver resolveMenuDevice), sin un "intermedio" con sentido propio.
 * Si la vista resuelta no tiene un alto guardado, es automático (null).
 */
export function sectionHeightFor(
    category: Pick<MenuCategoryData, 'section_height'>,
    viewportWidth: MenuBreakpoint,
): number | null {
    const device = resolveMenuDevice(viewportWidth);

    return category.section_height?.[device] ?? null;
}

/** Config visual de UN adorno para un ancho de viewport — mismo mecanismo
 * de interpolación/extrapolación que categoryElementFor/itemElementFor (ver
 * resolveElementConfig), aplicado directamente sobre su ElementSettings
 * propio (un adorno no tiene "elementos" internos, ES el elemento). */
export function decorationElementFor(
    decoration: Pick<MenuDecorationData, 'visual_settings'>,
    breakpoint: MenuBreakpoint,
): StoredElementConfig {
    return resolveElementConfig(decoration.visual_settings, breakpoint);
}

export function money(value: number | string | null | undefined): string {
    return Number(value ?? 0).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function byZone(items: MenuItemData[], zone: string): MenuItemData[] {
    return items.filter((i) => i.zone === zone);
}

export function itemElementFor(
    item: Pick<MenuItemData, 'layout_settings'>,
    key: ItemElementKey,
    breakpoint: MenuBreakpoint,
): StoredElementConfig {
    return resolveElementConfig(item.layout_settings?.[key], breakpoint);
}

export function categoryElementFor(
    category: Pick<MenuCategoryData, 'visual_settings'>,
    key: CategoryElementKey,
    breakpoint: MenuBreakpoint,
): StoredElementConfig {
    return resolveElementConfig(category.visual_settings?.[key], breakpoint);
}

export const ITEM_ELEMENT_LABELS: Record<ItemElementKey, string> = {
    container: 'Contenedor',
    image: 'Imagen',
    name: 'Nombre',
    description: 'Descripción',
    price: 'Precio',
    price_label: 'Etiqueta de precio',
    price_secondary: 'Precio secundario',
    price_secondary_label: 'Etiqueta de precio secundario',
    presentation: 'Presentación',
    ingredients: 'Ingredientes',
    choice_label: 'Etiqueta de elección',
    badge: 'Insignia',
    caption_image: 'Imagen de leyenda',
};

export const CATEGORY_ELEMENT_LABELS: Record<CategoryElementKey, string> = {
    title: 'Título',
    subtitle: 'Subtítulo',
    tagline: 'Tagline',
    tagline_sub: 'Tagline secundario',
    title_image: 'Imagen de título',
    subtitle_image: 'Imagen de subtítulo',
    tagline_image: 'Imagen de tagline',
    image: 'Imagen de sección',
};

type CategoryElementPresence = (category: MenuCategoryData) => boolean;

/**
 * Qué claves de categoría EXISTEN REALMENTE en el DOM para cada layout —
 * espejo deliberado de los v-if de cada *Page.vue (PozolePage.vue,
 * PancitaPage.vue, etc.). Única fuente de verdad para el editor visual: sin
 * esto, la barra lateral no puede saber (solo con `title_image_url`/
 * `subtitle`/`tagline` presentes en los datos) si la plantilla concreta de
 * ESTA categoría realmente renderiza ese elemento — p. ej. Destilados no
 * tiene NINGÚN título editable y Postres solo muestra su `subtitle` de
 * texto cuando NO hay título gráfico. Un título/subtítulo con imagen y su
 * variante de texto son SIEMPRE mutuamente excluyentes (si..si-no en la
 * plantilla), así que nunca aparecen ambos a la vez — eso es justo lo que
 * elimina el control fantasma "Imagen de título" cuando en realidad se
 * renderizó el <h2> de texto, y viceversa.
 */
const CATEGORY_LAYOUT_ELEMENTS: Record<
    string,
    Partial<Record<CategoryElementKey, CategoryElementPresence>>
> = {
    portada: {},
    pozole: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        subtitle_image: (c) => !!c.subtitle_image_url,
    },
    pancita: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        tagline: (c) => !!c.tagline,
        tagline_image: (c) => !!c.tagline_image_url,
    },
    birria: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        tagline: (c) => !!c.tagline,
    },
    fusiones: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
    },
    comal: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
    },
    postres: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        subtitle: (c) => !c.title_image_url && !!c.subtitle,
        tagline_image: (c) => !!c.tagline_image_url,
    },
    bebidas_promo: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        image: (c) => !!c.image_url,
        subtitle_image: (c) => !!c.subtitle_image_url,
    },
    bebidas_tabla: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        tagline_image: (c) => !!c.tagline_image_url,
    },
    destilados: {
        tagline_image: (c) => !!c.tagline_image_url,
    },
    promo_full_image: {
        image: (c) => !!c.image_url,
    },
};

/** GridPage.vue — layout de reserva para cualquier `layout` no listado arriba. */
const DEFAULT_LAYOUT_ELEMENTS: Partial<
    Record<CategoryElementKey, CategoryElementPresence>
> = {
    title: (c) => !c.title_image_url,
    title_image: (c) => !!c.title_image_url,
};

/** Orden de aparición en la barra lateral del editor. */
const CATEGORY_ELEMENT_ORDER: CategoryElementKey[] = [
    'title',
    'title_image',
    'subtitle',
    'subtitle_image',
    'tagline',
    'tagline_image',
    'image',
];

/**
 * Claves de categoría que existen REALMENTE en el DOM para esta categoría
 * concreta, según su layout y sus datos — nunca un control fantasma, nunca
 * falta uno que sí se renderiza. Reemplaza cualquier heurística ad-hoc
 * basada solo en "¿este campo de dato existe?" (ver CATEGORY_LAYOUT_ELEMENTS).
 */
export function categoryElementKeysFor(
    category: MenuCategoryData,
): CategoryElementKey[] {
    const rules =
        CATEGORY_LAYOUT_ELEMENTS[category.layout] ?? DEFAULT_LAYOUT_ELEMENTS;

    return CATEGORY_ELEMENT_ORDER.filter(
        (key) => rules[key]?.(category) ?? false,
    );
}
