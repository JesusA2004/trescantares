export type MenuBreakpoint = 'mobile' | 'tablet' | 'desktop';

export interface BreakpointLayout {
    move_x: number;
    move_y: number;
    width: number | null;
    z_index: number;
}

export function defaultLayout(): BreakpointLayout {
    // Siempre un objeto nuevo — nunca una referencia compartida: en SSR el
    // proceso de Node vive entre requests, así que una sola instancia mutada
    // por accidente en cualquier parte contaminaría el render de todos los
    // platillos/títulos sin personalizar del resto de peticiones.
    return { move_x: 0, move_y: 0, width: null, z_index: 1 };
}

export type LayoutSettings = Partial<Record<MenuBreakpoint, BreakpointLayout>>;

export type CategoryVisualElement =
    | 'title'
    | 'subtitle'
    | 'tagline'
    | 'tagline_image'
    | 'image';

export type CategoryVisualSettings = Partial<
    Record<CategoryVisualElement, LayoutSettings>
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
    layout_settings?: LayoutSettings | null;
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

export function itemLayoutFor(
    item: Pick<MenuItemData, 'layout_settings'>,
    breakpoint: MenuBreakpoint,
): BreakpointLayout {
    const stored = item.layout_settings?.[breakpoint];

    return stored ? { ...stored } : defaultLayout();
}

export function categoryVisualFor(
    category: Pick<MenuCategoryData, 'visual_settings'>,
    element: CategoryVisualElement,
    breakpoint: MenuBreakpoint,
): BreakpointLayout {
    const stored = category.visual_settings?.[element]?.[breakpoint];

    return stored ? { ...stored } : defaultLayout();
}
