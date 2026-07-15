// Breakpoints reales de Tailwind (mobile-first) — deben coincidir
// exactamente con tailwind.config / los prefijos sm:/md:/lg:/xl:/2xl:.
export type MenuBreakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const BREAKPOINT_ORDER: MenuBreakpoint[] = [
    'base',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
];

export const BREAKPOINT_MIN_WIDTH: Record<MenuBreakpoint, number> = {
    base: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

export function resolveBreakpoint(width: number): MenuBreakpoint {
    let current: MenuBreakpoint = 'base';

    for (const bp of BREAKPOINT_ORDER) {
        if (width >= BREAKPOINT_MIN_WIDTH[bp]) {
            current = bp;
        }
    }

    return current;
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

/** Un elemento puede tener config en cualquier subconjunto de breakpoints;
 * los breakpoints sin config heredan del inferior más cercano (cascade
 * mobile-first, igual que Tailwind). */
export type ElementSettings = Partial<Record<MenuBreakpoint, ElementConfig>>;

export function resolveElementConfig(
    settings: ElementSettings | null | undefined,
    breakpoint: MenuBreakpoint,
): ElementConfig {
    const idx = BREAKPOINT_ORDER.indexOf(breakpoint);

    for (let i = idx; i >= 0; i--) {
        const found = settings?.[BREAKPOINT_ORDER[i]];

        if (found) {
            return { ...defaultElementConfig(), ...found };
        }
    }

    return defaultElementConfig();
}

export function hasOwnElementConfig(
    settings: ElementSettings | null | undefined,
    breakpoint: MenuBreakpoint,
): boolean {
    return !!settings?.[breakpoint];
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
