<?php

namespace Database\Seeders;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Entradas', 'description' => 'Para comenzar con el pie derecho.', 'sort_order' => 1],
            ['name' => 'Tacos', 'description' => 'Los auténticos tacos mexicanos.', 'sort_order' => 2],
            ['name' => 'Especialidades', 'description' => 'Platillos estrella de la casa.', 'sort_order' => 3],
            ['name' => 'Bebidas', 'description' => 'Frescas y refrescantes opciones.', 'sort_order' => 4],
            ['name' => 'Postres', 'description' => 'El dulce cierre perfecto.', 'sort_order' => 5],
        ];

        $items = [
            'Entradas' => [
                ['name' => 'Guacamole con totopos', 'price' => 85, 'description' => 'Aguacate fresco con totopos artesanales.', 'is_featured' => true],
                ['name' => 'Queso fundido', 'price' => 110, 'description' => 'Queso Oaxaca fundido con chorizo.', 'is_featured' => false],
                ['name' => 'Sopa azteca', 'price' => 95, 'description' => 'Sopa de tortilla con crema y aguacate.', 'is_featured' => false],
            ],
            'Tacos' => [
                ['name' => 'Taco de birria', 'price' => 45, 'description' => 'Birria de res en tortilla de maíz.', 'is_featured' => true],
                ['name' => 'Taco de suadero', 'price' => 35, 'description' => 'Suadero estilo CDMX.', 'is_featured' => false],
                ['name' => 'Taco de pastor', 'price' => 35, 'description' => 'Al pastor con piña y cilantro.', 'is_featured' => true],
                ['name' => 'Taco de barbacoa', 'price' => 45, 'description' => 'Barbacoa de borrego estilo Hidalgo.', 'is_featured' => false],
            ],
            'Especialidades' => [
                ['name' => 'Mole negro', 'price' => 185, 'description' => 'Pollo en mole negro con arroz y frijoles.', 'is_featured' => true],
                ['name' => 'Chiles en nogada', 'price' => 210, 'description' => 'Poblano relleno con nogada y granada.', 'is_featured' => true],
                ['name' => 'Pozole rojo', 'price' => 165, 'description' => 'Pozole de cerdo con tostadas y oregano.', 'is_featured' => false],
            ],
            'Bebidas' => [
                ['name' => 'Cantarito', 'price' => 120, 'description' => 'Tequila con jugo de naranja, limón y sal.', 'is_featured' => true],
                ['name' => 'Agua de horchata', 'price' => 45, 'description' => 'Horchata de arroz con canela.', 'is_featured' => false],
                ['name' => 'Michelada', 'price' => 75, 'description' => 'Cerveza preparada al estilo mexicano.', 'is_featured' => false],
                ['name' => 'Margarita', 'price' => 110, 'description' => 'Tequila con limón y sal.', 'is_featured' => false],
            ],
            'Postres' => [
                ['name' => 'Churros con cajeta', 'price' => 75, 'description' => 'Churros crujientes con cajeta casera.', 'is_featured' => false],
                ['name' => 'Flan napolitano', 'price' => 65, 'description' => 'Flan cremoso con caramelo.', 'is_featured' => false],
            ],
        ];

        foreach ($categories as $cat) {
            $category = MenuCategory::firstOrCreate(
                ['slug' => Str::slug($cat['name'])],
                array_merge($cat, ['slug' => Str::slug($cat['name']), 'is_active' => true])
            );

            if (isset($items[$cat['name']])) {
                foreach ($items[$cat['name']] as $i => $item) {
                    MenuItem::firstOrCreate(
                        ['slug' => Str::slug($item['name'])],
                        array_merge($item, [
                            'menu_category_id' => $category->id,
                            'slug' => Str::slug($item['name']),
                            'is_active' => true,
                            'sort_order' => $i + 1,
                        ])
                    );
                }
            }
        }
    }
}
