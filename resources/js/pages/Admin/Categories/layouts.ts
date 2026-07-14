const LABELS: Record<string, string> = {
    portada: 'Portada (página de inicio)',
    pozole: 'Pozole',
    pancita: 'Pancita',
    birria: 'Birria',
    fusiones: 'Fusiones',
    comal: 'Del comal a tu mesa',
    postres: 'Postres',
    bebidas_promo: 'Bebidas — promoción / cantaritos',
    bebidas_tabla: 'Bebidas — tabla de precios',
    destilados: 'Destilados',
    grid: 'Genérico (lista simple)',
};

export function layoutOptions(layouts: string[]): { value: string; label: string }[] {
    return layouts.map((l) => ({ value: l, label: LABELS[l] ?? l }));
}
