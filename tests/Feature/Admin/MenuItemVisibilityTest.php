<?php

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// actingAsMenuAdmin() vive en tests/Pest.php (compartida por toda la suite).

test('ocultar un platillo lo elimina del menú público sin borrarlo de la BD', function () {
    forceProductionSsr();
    Storage::fake('public');
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create(['is_active' => true]);
    $item = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'is_active' => true,
        'layout_settings' => ['image' => ['desktop' => ['x' => 12, 'y' => 34, 'width' => 200, 'height' => null, 'scale' => 1, 'rotation' => 0, 'z_index' => 1]]],
    ]);

    $before = $this->get('/menu')->assertOk()->getContent();
    expect($before)->toContain($item->name);

    $this->patchJson("/admin/menu-items/{$item->id}/visibility", ['is_active' => false])->assertOk();

    resetSsrStateBetweenRequests();
    $after = $this->get('/menu')->assertOk()->getContent();
    expect($after)->not->toContain($item->name);

    // Sigue en la BD, intacto — nunca se borró el registro ni su configuración.
    $item->refresh();
    expect($item->exists)->toBeTrue()
        ->and($item->is_active)->toBeFalse()
        ->and($item->layout_settings['image']['desktop']['x'])->toBe(12);
});

test('reactivar un platillo recupera exactamente su posición/tamaño anteriores', function () {
    forceProductionSsr();
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create(['is_active' => true]);
    $item = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'is_active' => false,
        'layout_settings' => ['image' => ['desktop' => ['x' => 55, 'y' => 66, 'width' => 300, 'height' => null, 'scale' => 1, 'rotation' => 0, 'z_index' => 1]]],
    ]);

    $hidden = $this->get('/menu')->assertOk()->getContent();
    expect($hidden)->not->toContain($item->name);

    $this->patchJson("/admin/menu-items/{$item->id}/visibility", ['is_active' => true])->assertOk();

    resetSsrStateBetweenRequests();
    $shown = $this->get('/menu')->assertOk()->getContent();
    expect($shown)->toContain($item->name);

    $item->refresh();
    expect($item->layout_settings['image']['desktop'])->toMatchArray(['x' => 55, 'y' => 66, 'width' => 300]);
});

test('ocultar solo la imagen conserva nombre, descripción y precio visibles', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create(['is_active' => true]);
    $item = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'is_active' => true,
        'image' => 'menu/uploads/foo.png',
        'name' => 'Platillo Con Foto',
        'price' => 99.50,
    ]);

    Storage::disk('public')->put('menu/uploads/foo.png', 'fake-image-bytes');

    expect($item->image_url)->not->toBeNull();

    $this->patchJson("/admin/menu-items/{$item->id}/visibility", ['image_hidden' => true])->assertOk();

    $item->refresh();
    expect($item->image_hidden)->toBeTrue()
        ->and($item->image_url)->toBeNull() // oculto: no se sirve la URL
        ->and($item->image)->toBe('menu/uploads/foo.png'); // pero la ruta sigue guardada, intacta

    $html = $this->get('/menu')->assertOk()->getContent();
    // El nombre/precio se siguen mostrando — solo la FOTO se oculta. La ruta
    // cruda puede seguir viajando dentro del JSON de props de Inertia (no es
    // un secreto ni dispara ninguna petición), lo que realmente importa es
    // que nunca se renderiza un <img> real apuntando a ella.
    expect($html)->toContain('Platillo Con Foto')
        ->and($html)->not->toContain('<img src="/storage/menu/uploads/foo.png');
});

test('reemplazar una imagen conserva la posición/tamaño (layout_settings) y guarda un nivel de deshacer', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    $category = MenuCategory::factory()->create();
    $item = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'image' => 'menu/uploads/old.png',
        'layout_settings' => ['image' => ['desktop' => ['x' => 40, 'y' => 20, 'width' => null, 'height' => null, 'scale' => 1, 'rotation' => 0, 'z_index' => 1]]],
    ]);
    Storage::disk('public')->put('menu/uploads/old.png', 'old-bytes');

    $newFile = UploadedFile::fake()->image('new.png', 400, 400);

    $this->put("/admin/menu-items/{$item->id}", [
        'menu_category_id' => $category->id,
        'name' => $item->name,
        'price' => $item->price,
        'image' => $newFile,
        'is_active' => true,
        'is_featured' => false,
    ])->assertRedirect();

    $item->refresh();
    expect($item->image)->not->toBe('menu/uploads/old.png')
        ->and($item->previous_image)->toBe('menu/uploads/old.png')
        // La posición NUNCA se toca al reemplazar la imagen.
        ->and($item->layout_settings['image']['desktop'])->toMatchArray(['x' => 40, 'y' => 20]);

    Storage::disk('public')->assertExists($item->image);
    // La vieja sigue en disco (referenciada como previous_image, "un nivel de deshacer").
    Storage::disk('public')->assertExists('menu/uploads/old.png');
});

test('restaurar la imagen anterior intercambia image y previous_image', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    Storage::disk('public')->put('menu/uploads/current.png', 'a');
    Storage::disk('public')->put('menu/uploads/prev.png', 'b');

    $item = MenuItem::factory()->create([
        'image' => 'menu/uploads/current.png',
        'previous_image' => 'menu/uploads/prev.png',
    ]);

    $this->postJson("/admin/menu-items/{$item->id}/restore-image")->assertOk();

    $item->refresh();
    expect($item->image)->toBe('menu/uploads/prev.png')
        ->and($item->previous_image)->toBe('menu/uploads/current.png');
});

test('seleccionar una imagen de la biblioteca no duplica el archivo', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    Storage::disk('public')->put('menu/uploads/shared.png', 'bytes');
    \App\Models\MenuMediaAsset::create(['disk_path' => 'menu/uploads/shared.png']);

    $category = MenuCategory::factory()->create();

    $this->post('/admin/menu-items', [
        'menu_category_id' => $category->id,
        'name' => 'Nuevo Platillo Biblioteca',
        'price' => 50,
        'image_library_path' => 'menu/uploads/shared.png',
        'is_active' => true,
        'is_featured' => false,
    ])->assertRedirect();

    $item = MenuItem::where('name', 'Nuevo Platillo Biblioteca')->firstOrFail();
    expect($item->image)->toBe('menu/uploads/shared.png');

    // Solo debe existir UN archivo físico — nunca se copió/duplicó.
    expect(Storage::disk('public')->allFiles('menu/uploads'))->toHaveCount(1);
});

test('borrar un platillo no elimina una imagen que sigue en uso por otro registro', function () {
    Storage::fake('public');
    actingAsMenuAdmin();

    Storage::disk('public')->put('menu/uploads/shared.png', 'bytes');

    $category = MenuCategory::factory()->create();
    $item1 = MenuItem::factory()->create(['menu_category_id' => $category->id, 'image' => 'menu/uploads/shared.png']);
    $item2 = MenuItem::factory()->create(['menu_category_id' => $category->id, 'image' => 'menu/uploads/shared.png']);

    $this->delete("/admin/menu-items/{$item1->id}")->assertRedirect();

    Storage::disk('public')->assertExists('menu/uploads/shared.png');
    expect(MenuItem::find($item2->id))->not->toBeNull();
});
