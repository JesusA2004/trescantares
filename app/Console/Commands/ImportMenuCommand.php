<?php

namespace App\Console\Commands;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class ImportMenuCommand extends Command
{
    protected $signature = 'menu:import-initial';

    protected $description = 'Importa (de forma idempotente) las categorías y platillos reales del menú Tres Cantares y normaliza sus imágenes en storage';

    /** Mapea archivo origen (tal como existe hoy en storage) -> ruta destino normalizada. */
    private array $assetCopies = [
        // Diseño
        'menu/design/FONDO.png' => 'menu/design/fondo.png',
        'menu/design/Portada.png' => 'menu/design/portada.png',
        'menu/titles/01.png' => 'menu/design/title-pozole.png',
        'menu/titles/02.png' => 'menu/design/title-acompanalo.png',
        'menu/titles/03.png' => 'menu/design/title-pancita.png',
        'menu/titles/04.png' => 'menu/design/title-tortillas-caption.png',
        'menu/titles/05.png' => 'menu/design/title-birria.png',
        'menu/titles/06.png' => 'menu/design/title-fusiones.png',
        'menu/titles/07.png' => 'menu/design/title-comal.png',
        'menu/titles/08.png' => 'menu/design/title-postres.png',
        'menu/titles/09.png' => 'menu/design/title-postres-caption.png',
        'menu/titles/10.png' => 'menu/design/title-bebidas.png',
        'menu/titles/11.png' => 'menu/design/title-compra-dos.png',
        'menu/titles/12.png' => 'menu/design/title-mesa-momento.png',
        'menu/titles/13.png' => 'menu/design/title-refrescar-antojo.png',
        // Imagen de categoría (hero de bebidas con alcohol)
        'menu/items/28 Bebidas.png' => 'menu/categories/cantaritos-mojitos-cervezas.png',
        // Platillos
        'menu/items/01 Pozole Blanco.png' => 'menu/items/pozole-blanco.png',
        'menu/items/02 Tacos Dorados.png' => 'menu/items/tacos-dorados.png',
        'menu/items/03 Pancita.png' => 'menu/items/pancita.png',
        'menu/items/04 Panal.png' => 'menu/items/panal.png',
        'menu/items/05 Pata.png' => 'menu/items/pata.png',
        'menu/items/06 Callo.png' => 'menu/items/callo.png',
        'menu/items/07 Libro.png' => 'menu/items/libro.png',
        'menu/items/08 Panza.png' => 'menu/items/panza.png',
        'menu/items/09 Tortillas.png' => 'menu/items/tortillas.png',
        'menu/items/10 Birria.png' => 'menu/items/birria.png',
        'menu/items/11 Chilaquiles Birria.png' => 'menu/items/chilaquiles-birria.png',
        'menu/items/12 Enchiladas Birria.png' => 'menu/items/enchiladas-birria.png',
        'menu/items/13 Quesabirria.png' => 'menu/items/quesabirria.png',
        'menu/items/14 El valiente.png' => 'menu/items/el-valiente.png',
        'menu/items/15 El consentido.png' => 'menu/items/el-consentido.png',
        'menu/items/16 El Norteño.png' => 'menu/items/el-norteno.png',
        'menu/items/17 Todo Terreno.png' => 'menu/items/todo-terreno.png',
        'menu/items/18 Quesadillas.png' => 'menu/items/quesadillas.png',
        'menu/items/19 Setas.png' => 'menu/items/setas.png',
        'menu/items/20 Champiñones.png' => 'menu/items/champinones.png',
        'menu/items/21 Huitlacoche.png' => 'menu/items/huitlacoche.png',
        'menu/items/22 Flor de Calabaza.png' => 'menu/items/flor-de-calabaza.png',
        'menu/items/23 Pollo.png' => 'menu/items/pollo.png',
        'menu/items/24 Sope.png' => 'menu/items/sope.png',
        'menu/items/25 Pay de Limon.png' => 'menu/items/pay-de-limon.png',
        'menu/items/26 Arroz con Leche.png' => 'menu/items/arroz-con-leche.png',
        'menu/items/27 Flan.png' => 'menu/items/flan.png',
    ];

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $missing = [];

        $this->info('Normalizando recursos gráficos…');
        foreach ($this->assetCopies as $source => $destination) {
            if (! $disk->exists($source)) {
                $missing[] = $source;

                continue;
            }
            $disk->put($destination, $disk->get($source));
        }

        $resolve = fn (string $normalized): ?string => $disk->exists($normalized) ? $normalized : null;

        $categories = $this->categoryDefinitions();

        foreach ($categories as $catData) {
            $items = $catData['items'] ?? [];
            unset($catData['items']);

            foreach (['image', 'title_image', 'subtitle_image', 'tagline_image'] as $field) {
                if (isset($catData[$field])) {
                    $catData[$field] = $resolve($catData[$field]);
                }
            }

            $category = MenuCategory::updateOrCreate(
                ['slug' => $catData['slug']],
                $catData,
            );

            foreach ($items as $i => $itemData) {
                if (isset($itemData['image'])) {
                    $itemData['image'] = $resolve($itemData['image']);
                }

                $itemData['menu_category_id'] = $category->id;
                $itemData['sort_order'] = $itemData['sort_order'] ?? ($i + 1);
                $itemData['is_active'] = $itemData['is_active'] ?? true;
                $itemData['slug'] = $itemData['slug'] ?? str($itemData['name'])->slug()->toString();

                MenuItem::updateOrCreate(
                    ['slug' => $itemData['slug']],
                    $itemData,
                );
            }

            $this->line("  ✓ {$category->name} ({$catData['slug']}) — ".count($items).' platillo(s)');
        }

        if ($missing !== []) {
            $this->newLine();
            $this->warn('Las siguientes imágenes de origen no se encontraron y fueron omitidas:');
            foreach (array_unique($missing) as $m) {
                $this->warn("  - {$m}");
            }
        }

        $this->newLine();
        $this->info('Importación completada.');

        return self::SUCCESS;
    }

    private function categoryDefinitions(): array
    {
        return [
            [
                'slug' => 'portada',
                'name' => 'Portada',
                'layout' => 'portada',
                'image' => 'menu/design/portada.png',
                'color' => '#DB3465',
                'color_secondary' => '#144E8F',
                'sort_order' => 0,
                'is_active' => true,
                'items' => [],
            ],
            [
                'slug' => 'pozole',
                'name' => 'Pozole',
                'layout' => 'pozole',
                'title_image' => 'menu/design/title-pozole.png',
                'subtitle_image' => 'menu/design/title-acompanalo.png',
                'color' => '#144E8F',
                'color_secondary' => '#DB3465',
                'sort_order' => 1,
                'is_active' => true,
                'items' => [
                    [
                        'name' => 'Pozole Blanco', 'zone' => 'main', 'price' => 131.00,
                        'price_label' => 'Blanco', 'choice_label' => 'TÚ ELIGES', 'ingredients' => 'Maciza o surtida',
                        'image' => 'menu/items/pozole-blanco.png', 'sort_order' => 1,
                    ],
                    [
                        'name' => 'Tacos Dorados', 'zone' => 'accompaniment', 'price' => 53.00,
                        'ingredients' => 'Papa, requesón o pollo',
                        'image' => 'menu/items/tacos-dorados.png', 'sort_order' => 2,
                    ],
                ],
            ],
            [
                'slug' => 'pancita',
                'name' => 'Pancita',
                'layout' => 'pancita',
                'title_image' => 'menu/design/title-pancita.png',
                'tagline_image' => 'menu/design/title-tortillas-caption.png',
                'tagline' => 'CALDO ILIMITADO',
                'tagline_sub' => 'Mientras tengas hambre, seguimos sirviendo',
                'color' => '#EEC325',
                'color_secondary' => '#DB3465',
                'sort_order' => 2,
                'is_active' => true,
                'items' => [
                    [
                        'name' => 'Pancita', 'zone' => 'main', 'price' => 135.00, 'choice_label' => 'TÚ ELIGES',
                        'image' => 'menu/items/pancita.png', 'sort_order' => 1,
                    ],
                    ['name' => 'Panal', 'zone' => 'option', 'price' => 0, 'image' => 'menu/items/panal.png', 'sort_order' => 2],
                    ['name' => 'Panza', 'zone' => 'option', 'price' => 0, 'image' => 'menu/items/panza.png', 'sort_order' => 3],
                    ['name' => 'Pata', 'zone' => 'option', 'price' => 0, 'image' => 'menu/items/pata.png', 'sort_order' => 4],
                    ['name' => 'Callo', 'zone' => 'option', 'price' => 0, 'image' => 'menu/items/callo.png', 'sort_order' => 5],
                    ['name' => 'Libro', 'zone' => 'option', 'price' => 0, 'image' => 'menu/items/libro.png', 'sort_order' => 6],
                    ['name' => 'Tortillas', 'zone' => 'footer', 'price' => 0, 'image' => 'menu/items/tortillas.png', 'sort_order' => 7],
                ],
            ],
            [
                'slug' => 'birria',
                'name' => 'Birria',
                'layout' => 'birria',
                'title_image' => 'menu/design/title-birria.png',
                'tagline' => 'Y MÁS…',
                'color' => '#DB3465',
                'color_secondary' => '#079A4A',
                'sort_order' => 3,
                'is_active' => true,
                'items' => [
                    ['name' => 'Birria', 'zone' => 'main', 'price' => 165.00, 'image' => 'menu/items/birria.png', 'sort_order' => 1],
                    ['name' => 'Chilaquiles de Birria', 'zone' => 'side', 'price' => 131.00, 'image' => 'menu/items/chilaquiles-birria.png', 'sort_order' => 2],
                    ['name' => 'Enchiladas de Birria', 'zone' => 'side', 'price' => 149.00, 'image' => 'menu/items/enchiladas-birria.png', 'sort_order' => 3],
                    ['name' => 'Quesabirria', 'zone' => 'side', 'price' => 73.00, 'image' => 'menu/items/quesabirria.png', 'sort_order' => 4],
                ],
            ],
            [
                'slug' => 'nuestras-fusiones',
                'name' => 'Nuestras Fusiones',
                'layout' => 'fusiones',
                'title_image' => 'menu/design/title-fusiones.png',
                'color' => '#DB3465',
                'color_secondary' => '#144E8F',
                'sort_order' => 4,
                'is_active' => true,
                'items' => [
                    ['name' => 'El Valiente', 'zone' => 'item', 'description' => 'Pancita + Granos', 'price' => 165.00, 'image' => 'menu/items/el-valiente.png', 'sort_order' => 1],
                    ['name' => 'El Consentido', 'zone' => 'item', 'description' => 'Pozole + Pancita', 'price' => 157.00, 'image' => 'menu/items/el-consentido.png', 'sort_order' => 2],
                    ['name' => 'El Norteño', 'zone' => 'item', 'description' => 'Birria + Granos', 'price' => 189.00, 'image' => 'menu/items/el-norteno.png', 'sort_order' => 3],
                    ['name' => 'El Todo Terreno', 'zone' => 'item', 'description' => 'Pozole + Birria + Pancita', 'price' => 201.00, 'image' => 'menu/items/todo-terreno.png', 'sort_order' => 4],
                ],
            ],
            [
                'slug' => 'del-comal-a-tu-mesa',
                'name' => 'Del Comal a tu Mesa',
                'layout' => 'comal',
                'title_image' => 'menu/design/title-comal.png',
                'color' => '#144E8F',
                'color_secondary' => '#DB3465',
                'sort_order' => 5,
                'is_active' => true,
                'items' => [
                    ['name' => 'Quesadillas', 'zone' => 'main', 'price' => 37.00, 'image' => 'menu/items/quesadillas.png', 'sort_order' => 1],
                    ['name' => 'Setas', 'zone' => 'filling', 'price' => 0, 'image' => 'menu/items/setas.png', 'sort_order' => 2],
                    ['name' => 'Pollo', 'zone' => 'filling', 'price' => 0, 'image' => 'menu/items/pollo.png', 'sort_order' => 3],
                    ['name' => 'Champiñones', 'zone' => 'filling', 'price' => 0, 'image' => 'menu/items/champinones.png', 'sort_order' => 4],
                    ['name' => 'Huitlacoche', 'zone' => 'filling', 'price' => 0, 'image' => 'menu/items/huitlacoche.png', 'sort_order' => 5],
                    ['name' => 'Flor de Calabaza', 'zone' => 'filling', 'price' => 0, 'image' => 'menu/items/flor-de-calabaza.png', 'sort_order' => 6],
                    ['name' => 'Sopes', 'zone' => 'sope', 'price' => 33.00, 'image' => 'menu/items/sope.png', 'sort_order' => 7],
                ],
            ],
            [
                'slug' => 'postres',
                'name' => 'Postres',
                'layout' => 'postres',
                'title_image' => 'menu/design/title-postres.png',
                'tagline_image' => 'menu/design/title-postres-caption.png',
                'subtitle' => 'Para cerrar con broche de oro',
                'color' => '#EEC325',
                'color_secondary' => '#DB3465',
                'sort_order' => 6,
                'is_active' => true,
                'items' => [
                    ['name' => 'Pay de Limón', 'zone' => 'item', 'price' => 55.00, 'image' => 'menu/items/pay-de-limon.png', 'sort_order' => 1],
                    ['name' => 'Arroz con Leche', 'zone' => 'item', 'price' => 37.00, 'image' => 'menu/items/arroz-con-leche.png', 'sort_order' => 2],
                    ['name' => 'Flan Napolitano', 'zone' => 'item', 'price' => 65.00, 'image' => 'menu/items/flan.png', 'sort_order' => 3],
                ],
            ],
            [
                'slug' => 'cantaritos-mojitos-cervezas',
                'name' => 'Cantaritos, Mojitos y Cervezas',
                'layout' => 'bebidas_promo',
                'image' => 'menu/categories/cantaritos-mojitos-cervezas.png',
                'subtitle_image' => 'menu/design/title-compra-dos.png',
                'tagline' => 'Cantaritos, Mojitos y Cervezas',
                'color' => '#DB3465',
                'color_secondary' => '#079A4A',
                'sort_order' => 7,
                'is_active' => true,
                'items' => [
                    ['name' => 'Cerveza', 'zone' => 'drink', 'price' => 98.00, 'sort_order' => 1],
                    ['name' => 'Cantarito', 'zone' => 'drink', 'price' => 129.00, 'sort_order' => 2],
                    ['name' => 'Mojito', 'zone' => 'drink', 'price' => 129.00, 'sort_order' => 3],
                ],
            ],
            [
                'slug' => 'bebidas',
                'name' => 'Bebidas',
                'layout' => 'bebidas_tabla',
                'title_image' => 'menu/design/title-bebidas.png',
                'tagline_image' => 'menu/design/title-mesa-momento.png',
                'color' => '#DB3465',
                'color_secondary' => '#144E8F',
                'sort_order' => 8,
                'is_active' => true,
                'items' => $this->bebidasItems(),
            ],
            [
                'slug' => 'destilados',
                'name' => 'Destilados',
                'layout' => 'destilados',
                'tagline_image' => 'menu/design/title-refrescar-antojo.png',
                'color' => '#144E8F',
                'color_secondary' => '#DB3465',
                'sort_order' => 9,
                'is_active' => true,
                'items' => $this->destiladosItems(),
            ],
        ];
    }

    private function bebidasItems(): array
    {
        $rows = [
            ['zone' => 'top_table', 'name' => 'Mojitos', 'slug' => 'mojitos-litro', 'price' => 129.00, 'price_secondary' => 65.00],
            ['zone' => 'top_table', 'name' => 'Cantaritos', 'slug' => 'cantaritos-litro', 'price' => 129.00, 'price_secondary' => 65.00],
            ['zone' => 'top_table', 'name' => 'Corona', 'slug' => 'corona-litro', 'price' => 98.00],
            ['zone' => 'top_table', 'name' => 'Victoria', 'slug' => 'victoria-litro', 'price' => 98.00],

            ['zone' => 'con_alcohol', 'name' => 'Margaritas', 'price' => 127.00],
            ['zone' => 'con_alcohol', 'name' => 'Paloma', 'price' => 127.00],
            ['zone' => 'con_alcohol', 'name' => 'Mezcalita', 'price' => 157.00],
            ['zone' => 'con_alcohol', 'name' => 'Topo Chico', 'price' => 60.00],
            ['zone' => 'con_alcohol', 'name' => 'Jugo de Naranja', 'price' => 60.00],
            ['zone' => 'con_alcohol', 'name' => 'Jugo de Toronja', 'price' => 60.00],

            ['zone' => 'cerveza', 'name' => 'Corona', 'price' => 60.00],
            ['zone' => 'cerveza', 'name' => 'Victoria', 'price' => 60.00],
            ['zone' => 'cerveza', 'name' => 'Negra Modelo', 'price' => 79.00],
            ['zone' => 'cerveza', 'name' => 'Modelo Especial', 'price' => 79.00],
            ['zone' => 'cerveza', 'name' => 'Heineken', 'price' => 70.00],
            ['zone' => 'cerveza', 'name' => 'Heineken 0.0', 'price' => 50.00],
            ['zone' => 'cerveza', 'name' => 'Bohemia Clara', 'price' => 79.00],
            ['zone' => 'cerveza', 'name' => 'Bohemia Oscura', 'price' => 79.00],
            ['zone' => 'cerveza', 'name' => 'Bohemia Clásica', 'price' => 79.00],

            ['zone' => 'sin_alcohol', 'name' => 'Naranjada', 'price' => 59.00],
            ['zone' => 'sin_alcohol', 'name' => 'Limonada', 'price' => 59.00],
            ['zone' => 'sin_alcohol', 'name' => 'Piñada', 'price' => 89.00],
            ['zone' => 'sin_alcohol', 'name' => 'Fresada', 'price' => 69.00],
            ['zone' => 'sin_alcohol', 'name' => 'Clamato Natural', 'price' => 90.00],
            ['zone' => 'sin_alcohol', 'name' => 'Rusa', 'price' => 80.00],
            ['zone' => 'sin_alcohol', 'name' => 'Rusa Topo Chico', 'price' => 95.00],
            ['zone' => 'sin_alcohol', 'name' => 'Agua Mineral', 'price' => 55.00],
            ['zone' => 'sin_alcohol', 'name' => 'Botella de Agua Natural', 'price' => 49.00],
            ['zone' => 'sin_alcohol', 'name' => 'Refrescos', 'price' => 55.00],

            ['zone' => 'complementos', 'name' => 'Tarro Michelado', 'price' => 25.00],
            ['zone' => 'complementos', 'name' => 'Tarro Cubano', 'price' => 30.00],
            ['zone' => 'complementos', 'name' => 'Tarro Escarchado', 'price' => 19.00],
            ['zone' => 'complementos', 'name' => 'Tarro Clamato', 'price' => 45.00],

            ['zone' => 'calientes', 'name' => 'Café Americano', 'price' => 45.00],
            ['zone' => 'calientes', 'name' => 'Café de Olla', 'price' => 57.00],
            ['zone' => 'calientes', 'name' => 'Chocolate', 'price' => 79.00],
        ];

        foreach ($rows as $i => &$row) {
            $row['sort_order'] = $i + 1;
        }

        return $rows;
    }

    private function destiladosItems(): array
    {
        $rows = [
            ['zone' => 'tequila', 'name' => '1800 Cristalino', 'presentation' => '700 ml', 'price' => 169.00, 'price_secondary' => 2067.00],
            ['zone' => 'tequila', 'name' => 'Don Julio 70', 'presentation' => '750 ml', 'price' => 253.00, 'price_secondary' => 2337.00],
            ['zone' => 'tequila', 'name' => 'Don Julio Blanco', 'presentation' => '750 ml', 'price' => 159.00, 'price_secondary' => 1707.00],
            ['zone' => 'tequila', 'name' => 'Don Julio Reposado', 'presentation' => '750 ml', 'price' => 173.00, 'price_secondary' => 1941.00],
            ['zone' => 'tequila', 'name' => 'José Cuervo Tradicional Reposado', 'presentation' => '695 ml', 'price' => 143.00, 'price_secondary' => 879.00],
            ['zone' => 'tequila', 'name' => 'José Cuervo Tradicional Plata', 'presentation' => '695 ml', 'price' => 149.00, 'price_secondary' => 834.00],
            ['zone' => 'tequila', 'name' => 'Maestro Doble Diamante', 'presentation' => '750 ml', 'price' => 181.00, 'price_secondary' => 1851.00],

            ['zone' => 'mezcal', 'name' => '400 Conejos Espadín', 'presentation' => '700 ml', 'price' => 119.00, 'price_secondary' => 1281.00],
            ['zone' => 'mezcal', 'name' => 'Montelobos Ensamble', 'presentation' => '700 ml', 'price' => 217.00, 'price_secondary' => 2327.00],
            ['zone' => 'mezcal', 'name' => 'Montelobos Espadín', 'presentation' => '700 ml', 'price' => 147.00, 'price_secondary' => 1428.00],

            ['zone' => 'ron', 'name' => 'Bacardí Blanco', 'presentation' => '700 ml', 'price' => 119.00, 'price_secondary' => 481.00],
            ['zone' => 'ron', 'name' => 'Matusalem Clásico', 'presentation' => '750 ml', 'price' => 147.00, 'price_secondary' => 933.00],
            ['zone' => 'ron', 'name' => 'Matusalem Platino', 'presentation' => '750 ml', 'price' => 133.00, 'price_secondary' => 757.00],
        ];

        foreach ($rows as $i => &$row) {
            $row['price_label'] = 'Copa';
            $row['price_secondary_label'] = 'Botella';
            $row['sort_order'] = $i + 1;
        }

        return $rows;
    }
}
