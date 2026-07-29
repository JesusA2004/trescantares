<?php

use App\Models\MenuCategory;
use App\Models\MenuDecoration;
use App\Models\MenuItem;
use App\Models\MenuMediaAsset;
use Database\Seeders\MenuSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

const OFFICIAL_CATEGORY_SLUGS = [
    'portada', 'pozole', 'pancita', 'birria', 'nuestras-fusiones',
    'del-comal-a-tu-mesa', 'postres', 'cantaritos-mojitos-cervezas',
    'bebidas', 'destilados', 'promo-299',
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

test('MenuSeeder deja exactamente 11 categorías y 79 platillos, eliminando registros que no pertenecen al PDF', function () {
    // Registros falsos que deben desaparecer tras correr el seeder.
    $fakeCategory = MenuCategory::factory()->create(['slug' => 'categoria-demo-inventada']);
    MenuItem::factory()->create(['menu_category_id' => $fakeCategory->id, 'slug' => 'platillo-demo-inventado']);

    (new MenuSeeder)->run();

    expect(MenuCategory::where('slug', 'categoria-demo-inventada')->exists())->toBeFalse()
        ->and(MenuItem::where('slug', 'platillo-demo-inventado')->exists())->toBeFalse()
        ->and(MenuCategory::count())->toBe(11)
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

    expect(MenuCategory::count())->toBe(11)
        ->and(MenuItem::count())->toBe(79)
        ->and(MenuDecoration::count())->toBe(13)
        ->and(MenuMediaAsset::count())->toBe(13);
});

test('MenuSeeder siembra los 13 adornos oficiales asignados a su categoría correcta y no los duplica', function () {
    (new MenuSeeder)->run();
    (new MenuSeeder)->run();

    expect(MenuDecoration::count())->toBe(13);

    $pozole = MenuCategory::where('slug', 'pozole')->firstOrFail();
    expect($pozole->decorations()->count())->toBe(3);

    $promo = MenuCategory::where('slug', 'promo-299')->firstOrFail();
    expect($promo->layout)->toBe('promo_full_image')
        ->and($promo->show_in_nav)->toBeFalse()
        ->and($promo->is_active)->toBeTrue();
});

test('MenuSeeder no borra un adorno agregado manualmente ni pisa una posición personalizada al reimportar', function () {
    (new MenuSeeder)->run();

    $pozole = MenuCategory::where('slug', 'pozole')->firstOrFail();
    $manual = MenuDecoration::create([
        'menu_category_id' => $pozole->id,
        'name' => 'Adorno manual del admin',
        'image_path' => 'menu/decorations/adorno-manual.png',
        'is_active' => true,
        'sort_order' => 99,
    ]);

    $official = MenuDecoration::where('image_path', 'menu/decorations/initial/02-blanco-pag-2.png')->firstOrFail();
    $official->update(['visual_settings' => ['desktop' => ['x' => 42, 'y' => 7]]]);

    (new MenuSeeder)->run();

    expect(MenuDecoration::whereKey($manual->id)->exists())->toBeTrue()
        ->and($official->fresh()->visual_settings)->toBe(['desktop' => ['x' => 42, 'y' => 7]]);
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

test('--reset-layout descarta layout_settings/visual_settings de productos oficiales y de adornos', function () {
    $this->artisan('menu:import-initial')->assertSuccessful();

    $item = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();
    $item->update(['layout_settings' => ['name' => ['mobile' => ['x' => 12, 'y' => 34]]]]);

    $decoration = MenuDecoration::where('image_path', 'menu/decorations/initial/02-blanco-pag-2.png')->firstOrFail();
    $decoration->update(['visual_settings' => ['desktop' => ['x' => 42, 'y' => 7]]]);

    $this->artisan('menu:import-initial', ['--reset-layout' => true])->assertSuccessful();

    expect($item->fresh()->layout_settings)->toBeNull()
        ->and($decoration->fresh()->visual_settings)->toBeNull();
});
