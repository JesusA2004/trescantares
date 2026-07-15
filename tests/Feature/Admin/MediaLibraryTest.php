<?php

use App\Models\MenuCategory;
use App\Models\MenuDecoration;
use App\Models\MenuItem;
use App\Models\MenuMediaAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('subir una imagen la registra en la biblioteca con nombre único y sin ruta absoluta', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    $response = $this->post('/admin/media-library', [
        'file' => UploadedFile::fake()->image('mi foto.png', 300, 300),
    ])->assertCreated();

    $asset = MenuMediaAsset::firstOrFail();
    expect($asset->disk_path)->toStartWith('menu/uploads/')
        ->and($asset->disk_path)->not->toContain('\\')
        ->and($asset->disk_path)->not->toContain('C:')
        ->and($asset->width)->toBe(300)
        ->and($asset->height)->toBe(300);

    Storage::disk('public')->assertExists($asset->disk_path);
    expect($response->json('asset.url'))->toContain($asset->disk_path);
});

test('rechaza un archivo que no es imagen', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    $this->post('/admin/media-library', [
        'file' => UploadedFile::fake()->create('documento.pdf', 100),
    ])->assertInvalid(['file']);
});

test('lista la biblioteca completa', function () {
    Storage::fake('public');
    actingAsMenuAdmin();
    Storage::disk('public')->put('menu/uploads/a.png', 'x');
    MenuMediaAsset::create(['disk_path' => 'menu/uploads/a.png', 'original_name' => 'a.png']);

    $response = $this->getJson('/admin/media-library')->assertOk();

    expect($response->json('assets'))->toHaveCount(1);
});

test('borra un asset sin referencias', function () {
    Storage::fake('public');
    actingAsMenuAdmin();
    Storage::disk('public')->put('menu/uploads/huerfano.png', 'x');
    $asset = MenuMediaAsset::create(['disk_path' => 'menu/uploads/huerfano.png']);

    $this->deleteJson("/admin/media-library/{$asset->id}")->assertOk();

    Storage::disk('public')->assertMissing('menu/uploads/huerfano.png');
    expect(MenuMediaAsset::find($asset->id))->toBeNull();
});

test('no borra un asset todavía en uso y avisa dónde', function () {
    Storage::fake('public');
    actingAsMenuAdmin();
    Storage::disk('public')->put('menu/uploads/en-uso.png', 'x');
    $asset = MenuMediaAsset::create(['disk_path' => 'menu/uploads/en-uso.png']);

    $category = MenuCategory::factory()->create();
    MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'image' => 'menu/uploads/en-uso.png',
        'name' => 'Platillo Referenciado',
    ]);

    $response = $this->deleteJson("/admin/media-library/{$asset->id}")->assertStatus(409);

    Storage::disk('public')->assertExists('menu/uploads/en-uso.png');
    expect(MenuMediaAsset::find($asset->id))->not->toBeNull()
        ->and($response->json('usages.0.label'))->toContain('Platillo Referenciado');
});

test('reporta el uso de un asset por un adorno', function () {
    Storage::fake('public');
    actingAsMenuAdmin();
    Storage::disk('public')->put('menu/decorations/flor.png', 'x');
    $asset = MenuMediaAsset::create(['disk_path' => 'menu/decorations/flor.png']);

    $category = MenuCategory::factory()->create();
    MenuDecoration::create([
        'menu_category_id' => $category->id,
        'name' => 'Flor',
        'image_path' => 'menu/decorations/flor.png',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $response = $this->deleteJson("/admin/media-library/{$asset->id}")->assertStatus(409);
    expect($response->json('usages.0.label'))->toContain('Flor');
});
