<?php

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Database\Seeders\MenuSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

const OFFICIAL_CATEGORY_SLUGS = [
    'portada', 'pozole', 'pancita', 'birria', 'nuestras-fusiones',
    'del-comal-a-tu-mesa', 'postres', 'cantaritos-mojitos-cervezas',
    'bebidas', 'destilados',
];

/** Nombre => precio esperado para una muestra representativa del PDF (una por categoría con productos). */
const EXPECTED_ITEMS = [
    'Pozole Blanco' => 131.00,
    'Tacos Dorados' => 53.00,
    'Pancita' => 135.00,
    'Tortillas' => 0.00,
    'Birria' => 165.00,
    'Quesabirria' => 73.00,
    'El Valiente' => 165.00,
    'El Todo Terreno' => 201.00,
    'Quesadillas' => 37.00,
    'Sopes' => 33.00,
    'Pay de Limón' => 55.00,
    'Flan Napolitano' => 65.00,
    'Cerveza' => 98.00,
    'Cantarito' => 129.00,
    'Café Americano' => 45.00,
    'Tarro Cubano' => 30.00,
    '1800 Cristalino' => 169.00,
    'Don Julio 70' => 253.00,
];

beforeEach(function () {
    Storage::fake('public');
});

test('MenuSeeder deja exactamente 10 categorías y 79 platillos, eliminando registros que no pertenecen al PDF', function () {
    // Registros falsos que deben desaparecer tras correr el seeder.
    $fakeCategory = MenuCategory::factory()->create(['slug' => 'categoria-demo-inventada']);
    MenuItem::factory()->create(['menu_category_id' => $fakeCategory->id, 'slug' => 'platillo-demo-inventado']);

    (new MenuSeeder)->run();

    expect(MenuCategory::where('slug', 'categoria-demo-inventada')->exists())->toBeFalse()
        ->and(MenuItem::where('slug', 'platillo-demo-inventado')->exists())->toBeFalse()
        ->and(MenuCategory::count())->toBe(10)
        ->and(MenuItem::count())->toBe(79)
        ->and(MenuCategory::pluck('slug')->sort()->values()->all())
        ->toBe(collect(OFFICIAL_CATEGORY_SLUGS)->sort()->values()->all());
});

test('MenuSeeder importa nombres y precios exactos del PDF', function () {
    (new MenuSeeder)->run();

    foreach (EXPECTED_ITEMS as $name => $price) {
        $item = MenuItem::where('name', $name)->first();

        expect($item)->not->toBeNull("Falta el platillo '{$name}' del PDF.")
            ->and((float) $item->price)->toBe($price);
    }
});

test('MenuSeeder es idempotente: correrlo dos veces no duplica nada', function () {
    (new MenuSeeder)->run();
    (new MenuSeeder)->run();

    expect(MenuCategory::count())->toBe(10)
        ->and(MenuItem::count())->toBe(79);
});

test('MenuSeeder conserva layout_settings existentes de productos oficiales al reimportar', function () {
    (new MenuSeeder)->run();

    $item = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();
    $item->update(['layout_settings' => ['name' => ['mobile' => ['x' => 12, 'y' => 34]]]]);

    $category = MenuCategory::where('slug', 'pozole')->firstOrFail();
    $category->update(['visual_settings' => ['title' => ['mobile' => ['x' => 5, 'y' => 6]]]]);

    (new MenuSeeder)->run();

    expect($item->fresh()->layout_settings)->toBe(['name' => ['mobile' => ['x' => 12, 'y' => 34]]])
        ->and($category->fresh()->visual_settings)->toBe(['title' => ['mobile' => ['x' => 5, 'y' => 6]]]);
});

test('--reset-layout descarta layout_settings/visual_settings de productos oficiales', function () {
    $this->artisan('menu:import-initial')->assertSuccessful();

    $item = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();
    $item->update(['layout_settings' => ['name' => ['mobile' => ['x' => 12, 'y' => 34]]]]);

    $this->artisan('menu:import-initial', ['--reset-layout' => true])->assertSuccessful();

    expect($item->fresh()->layout_settings)->toBeNull();
});
