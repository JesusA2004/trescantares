export interface ZoneOption {
    value: string;
    label: string;
}

// Zonas válidas por plantilla (layout de categoría). Debe mantenerse en
// paridad con App\Support\MenuLayoutZones en el backend.
export const LAYOUT_ZONES: Record<string, ZoneOption[]> = {
    pozole: [
        { value: 'main', label: 'Principal' },
        { value: 'accompaniment', label: 'Acompañamiento' },
    ],
    pancita: [
        { value: 'main', label: 'Principal' },
        { value: 'option', label: 'Opción' },
        { value: 'footer', label: 'Pie' },
    ],
    birria: [
        { value: 'main', label: 'Principal' },
        { value: 'side', label: 'Complementario' },
    ],
    fusiones: [{ value: 'item', label: 'Producto' }],
    comal: [
        { value: 'main', label: 'Principal' },
        { value: 'filling', label: 'Relleno' },
        { value: 'sope', label: 'Sope' },
    ],
    postres: [{ value: 'item', label: 'Producto' }],
    bebidas_promo: [{ value: 'drink', label: 'Bebida' }],
    bebidas_tabla: [
        { value: 'top_table', label: 'Litros / medio litro' },
        { value: 'con_alcohol', label: 'Con alcohol' },
        { value: 'cerveza', label: 'Cerveza' },
        { value: 'sin_alcohol', label: 'Sin alcohol' },
        { value: 'complementos', label: 'Complementos' },
        { value: 'calientes', label: 'Calientes' },
    ],
    destilados: [
        { value: 'tequila', label: 'Tequila' },
        { value: 'mezcal', label: 'Mezcal' },
        { value: 'ron', label: 'Ron' },
    ],
    // "grid" (plantilla genérica de respaldo) no filtra por zona en
    // GridPage.vue, así que no ofrece opciones — el campo queda sin uso para
    // esas categorías, igual que en el backend (ver MenuLayoutZones).
};

export function zonesForLayout(
    layout: string | undefined | null,
): ZoneOption[] {
    return LAYOUT_ZONES[layout ?? ''] ?? [];
}
