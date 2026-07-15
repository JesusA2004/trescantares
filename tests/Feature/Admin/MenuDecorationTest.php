<?php

use App\Models\MenuCategory;
use App\Models\MenuDecoration;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/** Config completo válido de ElementConfig — mismo shape que categorías/platillos. */
function decorationElementConfig(array $overrides = []): array
{
    return array_merge([
        'x' => 0,
        'y' => 0,
        'width' => null,
        'height' => null,
        'scale' => 1,
        'rotation' => 0,
        'z_index' => 1,
    ], $overrides);
}

test('crear un adorno subiendo un PNG transparente nuevo', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create();
    $file = UploadedFile::fake()->image('flor.png', 100, 100);

    $response = $this->post('/admin/menu-decorations', [
        'menu_category_id' => $category->id,
        'name' => 'Flor decorativa',
        'image' => $file,
    ])->assertCreated();

    $decoration = MenuDecoration::firstOrFail();
    expect($decoration->name)->toBe('Flor decorativa')
        ->and($decoration->is_active)->toBeTrue()
        ->and($decoration->element_key)->toBe("decoration-{$decoration->id}:image");

    Storage::disk('public')->assertExists($decoration->image_path);
    expect($response->json('decoration.image_url'))->not->toBeNull();
});

test('crear un adorno eligiendo una imagen ya existente de la biblioteca no duplica el archivo', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    Storage::disk('public')->put('menu/uploads/curva.png', 'bytes');
    $category = MenuCategory::factory()->create();

    $this->post('/admin/menu-decorations', [
        'menu_category_id' => $category->id,
        'name' => 'Curva',
        'image_library_path' => 'menu/uploads/curva.png',
    ])->assertCreated();

    $decoration = MenuDecoration::firstOrFail();
    expect($decoration->image_path)->toBe('menu/uploads/curva.png');
    expect(Storage::disk('public')->allFiles('menu/uploads'))->toHaveCount(1);
});

test('mover y redimensionar un adorno guarda su ElementConfig por vista, y persiste tras recargar', function () {
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create();
    $decoration = MenuDecoration::create([
        'menu_category_id' => $category->id,
        'name' => 'Textura',
        'image_path' => 'menu/decorations/textura.png',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->patchJson("/admin/menu-decorations/{$decoration->id}/element", [
        'breakpoint' => 'desktop',
        'config' => decorationElementConfig(['x' => 120, 'y' => 45, 'width' => 180]),
    ])->assertOk();

    $decoration->refresh();
    expect($decoration->visual_settings['desktop'])->toMatchArray(['x' => 120, 'y' => 45, 'width' => 180]);

    // "Recargar" = leer de nuevo desde la BD, no desde ningún caché en memoria.
    $reloaded = MenuDecoration::find($decoration->id);
    expect($reloaded->visual_settings['desktop'])->toMatchArray(['x' => 120, 'y' => 45, 'width' => 180]);
});

test('ocultar un adorno en una sola vista (mobile) no afecta las demás', function () {
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create();
    $decoration = MenuDecoration::create([
        'menu_category_id' => $category->id,
        'name' => 'Punto',
        'image_path' => 'menu/decorations/punto.png',
        'is_active' => true,
        'sort_order' => 0,
        'visual_settings' => [
            'desktop' => decorationElementConfig(['x' => 10, 'y' => 10]),
        ],
    ]);

    $this->patchJson("/admin/menu-decorations/{$decoration->id}/element", [
        'breakpoint' => 'mobile',
        'config' => decorationElementConfig(['hidden' => true]),
    ])->assertOk();

    $decoration->refresh();
    expect($decoration->visual_settings['mobile']['hidden'])->toBeTrue()
        ->and($decoration->visual_settings['desktop'])->not->toHaveKey('hidden');
});

test('el menú público solo renderiza adornos activos y filtra los ocultos en el dispositivo actual', function () {
    forceProductionSsr();
    Storage::fake('public');

    $category = MenuCategory::factory()->create(['is_active' => true, 'layout' => 'grid']);
    Storage::disk('public')->put('menu/decorations/visible.png', 'a');
    Storage::disk('public')->put('menu/decorations/oculto.png', 'b');

    MenuDecoration::create([
        'menu_category_id' => $category->id,
        'name' => 'Visible',
        'image_path' => 'menu/decorations/visible.png',
        'alt_text' => 'adorno-visible-alt',
        'is_active' => true,
        'sort_order' => 0,
    ]);
    MenuDecoration::create([
        'menu_category_id' => $category->id,
        'name' => 'Inactivo',
        'image_path' => 'menu/decorations/oculto.png',
        'alt_text' => 'adorno-inactivo-alt',
        'is_active' => false,
        'sort_order' => 1,
    ]);

    $html = $this->get('/menu')->assertOk()->getContent();
    expect($html)->toContain('visible.png')
        // El adorno inactivo NUNCA llega al HTML/JSON público — ni su ruta.
        ->and($html)->not->toContain('oculto.png');
});

test('duplicar un adorno comparte la misma imagen (no duplica el archivo)', function () {
    actingAsMenuAdmin();
    Storage::fake('public');
    Storage::disk('public')->put('menu/decorations/orig.png', 'bytes');

    $category = MenuCategory::factory()->create();
    $decoration = MenuDecoration::create([
        'menu_category_id' => $category->id,
        'name' => 'Original',
        'image_path' => 'menu/decorations/orig.png',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->postJson("/admin/menu-decorations/{$decoration->id}/duplicate")->assertCreated();

    expect(MenuDecoration::count())->toBe(2);
    $copy = MenuDecoration::where('id', '!=', $decoration->id)->firstOrFail();
    expect($copy->image_path)->toBe('menu/decorations/orig.png')
        ->and($copy->name)->toBe('Original (copia)');
    expect(Storage::disk('public')->allFiles('menu/decorations'))->toHaveCount(1);
});

test('eliminar un adorno no borra el archivo si otro registro lo sigue usando', function () {
    actingAsMenuAdmin();
    Storage::fake('public');
    Storage::disk('public')->put('menu/decorations/shared.png', 'bytes');

    $category = MenuCategory::factory()->create();
    $d1 = MenuDecoration::create([
        'menu_category_id' => $category->id, 'name' => 'A',
        'image_path' => 'menu/decorations/shared.png', 'is_active' => true, 'sort_order' => 0,
    ]);
    $d2 = MenuDecoration::create([
        'menu_category_id' => $category->id, 'name' => 'B',
        'image_path' => 'menu/decorations/shared.png', 'is_active' => true, 'sort_order' => 1,
    ]);

    $this->deleteJson("/admin/menu-decorations/{$d1->id}")->assertOk();

    Storage::disk('public')->assertExists('menu/decorations/shared.png');
    expect(MenuDecoration::find($d2->id))->not->toBeNull();
});

test('eliminar el último adorno que usa una imagen sí borra el archivo físico', function () {
    actingAsMenuAdmin();
    Storage::fake('public');
    Storage::disk('public')->put('menu/decorations/solo.png', 'bytes');

    $category = MenuCategory::factory()->create();
    $decoration = MenuDecoration::create([
        'menu_category_id' => $category->id, 'name' => 'Solo',
        'image_path' => 'menu/decorations/solo.png', 'is_active' => true, 'sort_order' => 0,
    ]);

    $response = $this->deleteJson("/admin/menu-decorations/{$decoration->id}")->assertOk();

    expect($response->json('file_deleted'))->toBeTrue();
    Storage::disk('public')->assertMissing('menu/decorations/solo.png');
});

test('reordenar adornos guarda el nuevo sort_order', function () {
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create();
    $d1 = MenuDecoration::create(['menu_category_id' => $category->id, 'name' => 'A', 'image_path' => 'x.png', 'sort_order' => 0]);
    $d2 = MenuDecoration::create(['menu_category_id' => $category->id, 'name' => 'B', 'image_path' => 'y.png', 'sort_order' => 1]);

    $this->postJson('/admin/menu-decorations/reorder', [
        'items' => [
            ['id' => $d2->id, 'sort_order' => 0],
            ['id' => $d1->id, 'sort_order' => 1],
        ],
    ])->assertOk();

    expect($d1->fresh()->sort_order)->toBe(1)
        ->and($d2->fresh()->sort_order)->toBe(0);
});

test('el editor visual (index) lista adornos inactivos para poder reactivarlos', function () {
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create();
    MenuDecoration::create([
        'menu_category_id' => $category->id, 'name' => 'Oculto en editor',
        'image_path' => 'x.png', 'is_active' => false, 'sort_order' => 0,
    ]);

    $response = $this->get('/admin/menu-editor');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('categories.0.decorations.0.name', 'Oculto en editor')
        ->where('categories.0.decorations.0.is_active', false)
    );
});
