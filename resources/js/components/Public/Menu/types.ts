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

/** Un elemento tiene como máximo tres configuraciones guardadas (una por
 * MenuDevice) — todo ancho intermedio se calcula interpolando entre ellas,
 * nunca se guarda un cuarto/quinto/sexto valor. `_legacy_breakpoints` es un
 * respaldo de solo lectura que deja la migración de datos del formato
 * anterior (base/sm/md/lg/xl/2xl) — el código público nunca lo lee. */
export type ElementSettings = Partial<Record<MenuDevice, ElementConfig>> & {
    _legacy_breakpoints?: unknown;
};

const INTERPOLATED_FIELDS = [
    'x',
    'y',
    'scale',
    'rotation',
    'font_size',
    'line_height',
    'letter_spacing',
    'max_width',
    'object_x',
    'object_y',
    'inner_scale',
] as const satisfies readonly (keyof ElementConfig)[];

/** Campos discretos: no tiene sentido "mezclar" un z-index o una alineación
 * a medio camino — siempre toman el valor del ancla inferior más cercana. */
const DISCRETE_FIELDS = [
    'z_index',
    'locked',
    'align',
    'fit',
    'color',
] as const satisfies readonly (keyof ElementConfig)[];

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

interface DeviceAnchor {
    device: MenuDevice;
    width: number;
    config: ElementConfig;
}

function anchorsOf(settings: ElementSettings | null | undefined): DeviceAnchor[] {
    const anchors: DeviceAnchor[] = [];

    for (const device of MENU_DEVICE_ORDER) {
        const config = settings?.[device];

        if (config) {
            anchors.push({ device, width: MENU_DEVICE_WIDTH[device], config });
        }
    }

    return anchors;
}

/**
 * Calcula la configuración real de un elemento para un ancho de viewport
 * arbitrario, interpolando linealmente entre las dos vistas configuradas más
 * cercanas (spec: t = (viewportWidth - anchoInferior) / (anchoSuperior -
 * anchoInferior), clamp 0..1). Por debajo de la vista más angosta configurada
 * usa esa misma sin cambios; por encima de la más ancha, ídem — nunca
 * extrapola fuera del rango que el administrador definió.
 */
export function resolveElementConfig(
    settings: ElementSettings | null | undefined,
    viewportWidth: number,
): ElementConfig {
    const anchors = anchorsOf(settings);

    if (anchors.length === 0) {
        return defaultElementConfig();
    }

    const first = anchors[0];
    const last = anchors[anchors.length - 1];

    if (anchors.length === 1 || viewportWidth <= first.width) {
        return { ...defaultElementConfig(), ...first.config };
    }

    if (viewportWidth >= last.width) {
        return { ...defaultElementConfig(), ...last.config };
    }

    let lower = first;
    let upper = last;

    for (let i = 0; i < anchors.length - 1; i++) {
        if (viewportWidth >= anchors[i].width && viewportWidth <= anchors[i + 1].width) {
            lower = anchors[i];
            upper = anchors[i + 1];
            break;
        }
    }

    const t = clamp01(
        (viewportWidth - lower.width) / (upper.width - lower.width),
    );
    const a: ElementConfig = { ...defaultElementConfig(), ...lower.config };
    const b: ElementConfig = { ...defaultElementConfig(), ...upper.config };
    const out: ElementConfig = { ...a };

    for (const field of INTERPOLATED_FIELDS) {
        (out as unknown as Record<string, unknown>)[field] = lerpOptional(
            a[field] as number | null | undefined,
            b[field] as number | null | undefined,
            t,
        );
    }

    out.width = lerpSize(a.width, b.width, t);
    out.height = lerpSize(a.height, b.height, t);

    for (const field of DISCRETE_FIELDS) {
        (out as unknown as Record<string, unknown>)[field] = a[field];
    }

    return out;
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
    ingredients?: string | null;
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
    sort_order: number;
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
    title_image_url?: string | null;
    subtitle_image_url?: string | null;
    tagline_image_url?: string | null;
    color?: string | null;
    color_secondary?: string | null;
    background_position?: string | null;
    visual_settings?: CategoryVisualSettings | null;
    items: MenuItemData[];
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
): ElementConfig {
    return resolveElementConfig(item.layout_settings?.[key], breakpoint);
}

export function categoryElementFor(
    category: Pick<MenuCategoryData, 'visual_settings'>,
    key: CategoryElementKey,
    breakpoint: MenuBreakpoint,
): ElementConfig {
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
