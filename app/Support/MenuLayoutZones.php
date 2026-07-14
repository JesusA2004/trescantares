<?php

namespace App\Support;

class MenuLayoutZones
{
    /**
     * Zonas válidas por plantilla (layout de categoría). Debe mantenerse en
     * paridad con resources/js/pages/Admin/MenuItems/zones.ts.
     */
    private const MAP = [
        'pozole' => ['main', 'accompaniment'],
        'pancita' => ['main', 'option', 'footer'],
        'birria' => ['main', 'side'],
        'fusiones' => ['item'],
        'comal' => ['main', 'filling', 'sope'],
        'postres' => ['item'],
        'bebidas_promo' => ['drink'],
        'bebidas_tabla' => ['top_table', 'con_alcohol', 'cerveza', 'sin_alcohol', 'complementos', 'calientes'],
        'destilados' => ['tequila', 'mezcal', 'ron'],
        // "grid" (plantilla genérica de respaldo) NO filtra por zona —
        // GridPage.vue itera category.items sin usar byZone() — así que no
        // debe restringirse a un valor fijo; cualquier item de esa categoría
        // pasa por la validación genérica de texto libre.
    ];

    /**
     * @return string[]
     */
    public static function valuesFor(?string $layout): array
    {
        return self::MAP[$layout] ?? [];
    }
}
