<?php

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAsZonesAdmin(): User
{
    test()->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    test()->actingAs($user);

    return $user;
}

// ---------------------------------------------------------------------
// 1. Crear un platillo correctamente en cada zona disponible.
// ---------------------------------------------------------------------
test('admin can create an item in every zone allowed by the pozole layout', function (string $zone) {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);

    $response = test()->postJson('/admin/menu-editor/items', [
        'menu_category_id' => $category->id,
        'zone' => $zone,
        'name' => "Platillo {$zone}",
        'price' => 100,
    ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('menu_items', [
        'menu_category_id' => $category->id,
        'zone' => $zone,
        'name' => "Platillo {$zone}",
    ]);
})->with(['main', 'accompaniment']);

// ---------------------------------------------------------------------
// 2 + 3. Crear dos platillos activos en la MISMA zona — ambos siguen
// existiendo en base de datos, ninguno se desactiva/reemplaza.
// ---------------------------------------------------------------------
test('admin can create two active items in the same zone and both persist in the database', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);

    $first = test()->postJson('/admin/menu-editor/items', [
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'name' => 'Pozole Blanco',
        'price' => 131,
    ])->assertStatus(201)->json('item');

    $second = test()->postJson('/admin/menu-editor/items', [
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'name' => 'Pozole Verde',
        'price' => 140,
    ])->assertStatus(201)->json('item');

    $this->assertDatabaseHas('menu_items', ['id' => $first['id'], 'zone' => 'main', 'is_active' => true]);
    $this->assertDatabaseHas('menu_items', ['id' => $second['id'], 'zone' => 'main', 'is_active' => true]);
    expect(MenuItem::where('menu_category_id', $category->id)->where('zone', 'main')->count())->toBe(2);

    // El segundo se agrega AL FINAL (MAX(sort_order)+1), nunca empata ni
    // pisa el orden del primero.
    expect($second['sort_order'])->toBeGreaterThan($first['sort_order']);
});

// ---------------------------------------------------------------------
// 4. Ambos aparecen en la lista izquierda del editor (Inertia props).
// ---------------------------------------------------------------------
test('both items in the same zone appear in the editor sidebar props', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);
    $a = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);
    $b = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);

    $response = test()->get('/admin/menu-editor');

    $response->assertOk();
    $response->assertInertia(function ($page) use ($category, $a, $b) {
        $cat = collect($page->toArray()['props']['categories'])->firstWhere('id', $category->id);
        $ids = collect($cat['items'])->pluck('id');

        expect($ids)->toContain($a->id)->toContain($b->id);

        return true;
    });
});

// ---------------------------------------------------------------------
// 5. Ambos aparecen en el canvas (vista previa WYSIWYG del editor).
// ---------------------------------------------------------------------
// NOTA: estas comprobaciones usan las props Inertia (assertInertia), no el
// HTML server-rendered — los mismos datos (categories[].items) alimentan
// tanto el iframe del editor como /menu, así que confirmar que AMBOS ids
// están en la lista de items de la categoría es la prueba real de "se
// renderizan los dos", sin depender de que un proceso Node de SSR
// (`php artisan inertia:start-ssr`) esté corriendo en la máquina que corre
// la suite — varias pruebas SSR YA existentes en MenuEditorTest.php
// dependen de ese proceso externo y fallan igual sin él (ver auditoría).
test('both items in the same zone render as separate elements in the editor canvas preview', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    $a = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);
    $b = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);

    $response = test()->get('/admin/menu-editor/preview');
    $response->assertOk();
    $response->assertInertia(function ($page) use ($category, $a, $b) {
        $cat = collect($page->toArray()['props']['categories'])->firstWhere('id', $category->id);
        $ids = collect($cat['items'])->pluck('id');

        expect($ids)->toContain($a->id)->toContain($b->id);

        return true;
    });
});

// ---------------------------------------------------------------------
// 6. Ambos aparecen en /menu (público).
// ---------------------------------------------------------------------
test('both items in the same zone render on the public /menu page', function () {
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    $a = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true, 'name' => 'Pozole Blanco']);
    $b = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true, 'name' => 'Pozole Verde']);

    $response = test()->get('/menu');
    $response->assertOk();
    $response->assertInertia(function ($page) use ($category, $a, $b) {
        $cat = collect($page->toArray()['props']['categories'])->firstWhere('id', $category->id);
        $items = collect($cat['items']);

        expect($items->pluck('id'))->toContain($a->id)->toContain($b->id);
        expect($items->pluck('name'))->toContain('Pozole Blanco')->toContain('Pozole Verde');

        return true;
    });
});

// ---------------------------------------------------------------------
// 7 + 8. Cambiar un platillo hacia una zona ya ocupada — el platillo que
// YA estaba ahí no cambia ni desaparece (ni su fila en BD, ni su render).
// ---------------------------------------------------------------------
test('moving an item into an already-occupied zone never touches the item already there', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    $occupant = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'is_active' => true,
        'name' => 'Ya estaba aquí',
        'image_hidden' => false,
        'sort_order' => 3,
    ]);
    $mover = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'accompaniment',
        'is_active' => true,
        'name' => 'Me estoy moviendo',
    ]);

    $occupantSnapshotBefore = $occupant->toArray();

    test()->patchJson("/admin/menu-editor/items/{$mover->id}/quick", [
        'zone' => 'main',
    ])->assertOk();

    $occupant->refresh();
    $mover->refresh();

    // El que ya estaba: CERO cambios (ni is_active, ni zone, ni sort_order,
    // ni ningún otro campo) — nunca se ejecuta update/delete sobre él.
    expect($occupant->zone)->toBe('main');
    expect($occupant->is_active)->toBeTrue();
    expect($occupant->sort_order)->toBe(3);
    expect($occupant->name)->toBe('Ya estaba aquí');
    expect($occupant->toArray())->toMatchArray($occupantSnapshotBefore);

    // El que se movió: solo su propia zona cambió.
    expect($mover->zone)->toBe('main');

    $response = test()->get('/menu');
    $response->assertInertia(function ($page) use ($category, $occupant, $mover) {
        $cat = collect($page->toArray()['props']['categories'])->firstWhere('id', $category->id);
        $names = collect($cat['items'])->pluck('name');

        expect($names)->toContain('Ya estaba aquí')->toContain('Me estoy moviendo');

        return true;
    });
});

// ---------------------------------------------------------------------
// 9. Recargar el editor — ambos siguen presentes tras F5.
// ---------------------------------------------------------------------
test('reloading the editor after a zone change still shows both items', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);
    $occupant = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main']);
    $mover = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'accompaniment']);

    test()->patchJson("/admin/menu-editor/items/{$mover->id}/quick", ['zone' => 'main'])->assertOk();

    $response = test()->get('/admin/menu-editor');
    $response->assertInertia(function ($page) use ($category, $occupant, $mover) {
        $cat = collect($page->toArray()['props']['categories'])->firstWhere('id', $category->id);
        $ids = collect($cat['items'])->pluck('id');

        expect($ids)->toContain($occupant->id)->toContain($mover->id);

        return true;
    });
});

// ---------------------------------------------------------------------
// 10. Cambiar entre Móvil/Tablet/Escritorio — ninguno desaparece.
//
// Qué platillos EXISTEN en una zona nunca depende del breakpoint — el
// servidor manda siempre la MISMA lista completa de items (ver
// MenuCategory::toPublicArray()); es resolveElementConfig() (types.ts,
// ya cubierto en types.spec.ts) quien resuelve la POSICIÓN de cada
// elemento por ancho de viewport en el cliente, nunca decide si un
// platillo entero se omite. Por eso una sola carga de /menu ya demuestra
// que ambos platillos están disponibles para las tres vistas — cambiar de
// Móvil a Tablet a Escritorio en el editor no vuelve a pedir la lista de
// platillos al servidor.
// ---------------------------------------------------------------------
test('both items in the same zone remain present in the data that feeds every viewport', function () {
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    $a = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);
    $b = MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);

    $response = test()->get('/menu');
    $response->assertInertia(function ($page) use ($category, $a, $b) {
        $cat = collect($page->toArray()['props']['categories'])->firstWhere('id', $category->id);
        $ids = collect($cat['items'])->pluck('id');

        expect($ids)->toContain($a->id)->toContain($b->id);

        return true;
    });
});

// ---------------------------------------------------------------------
// 11. Formulario inválido — muestra el error EXACTO (campo por campo).
// ---------------------------------------------------------------------
test('creating without a name returns the exact field error, not a generic failure', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);

    $response = test()->postJson('/admin/menu-editor/items', [
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'price' => 100,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('name');
});

test('creating with a duplicate name returns a clear 422 field error instead of a 500 crash', function () {
    actingAsZonesAdmin();
    $catA = MenuCategory::factory()->create(['layout' => 'pozole']);
    $catB = MenuCategory::factory()->create(['layout' => 'birria']);
    MenuItem::factory()->create(['menu_category_id' => $catA->id, 'zone' => 'main', 'name' => 'Especial de la casa']);

    $response = test()->postJson('/admin/menu-editor/items', [
        'menu_category_id' => $catB->id,
        'zone' => 'main',
        'name' => 'Especial de la casa',
        'price' => 100,
    ]);

    // Causa raíz original: esto devolvía 500 (UniqueConstraintViolationException
    // sin capturar sobre el slug único) — ahora es un 422 con el campo exacto.
    $response->assertStatus(422);
    $response->assertJsonValidationErrors('name');
    expect(MenuItem::where('menu_category_id', $catB->id)->count())->toBe(0);
});

// ---------------------------------------------------------------------
// 12. Una falla de creación NUNCA genera un registro incompleto.
// ---------------------------------------------------------------------
test('a failed creation never leaves a partial record in the database', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);
    $before = MenuItem::count();

    test()->postJson('/admin/menu-editor/items', [
        'menu_category_id' => $category->id,
        'zone' => 'main',
        // sin name ni price -> falla de validación
    ])->assertStatus(422);

    expect(MenuItem::count())->toBe($before);
});

// ---------------------------------------------------------------------
// Full-page form (Create.vue -> MenuItemController::store) — mismo
// contrato de validación/errores que el endpoint del editor.
// ---------------------------------------------------------------------
test('the full-page create form also surfaces the duplicate-name error as a 422, never a 500', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);
    MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'name' => 'Repetido']);

    $response = test()->post('/admin/menu-items', [
        'menu_category_id' => $category->id,
        'zone' => 'accompaniment',
        'name' => 'Repetido',
        'price' => 50,
    ]);

    $response->assertSessionHasErrors('name');
    expect(MenuItem::where('name', 'Repetido')->count())->toBe(1);
});

// ---------------------------------------------------------------------
// Edición normal del formulario completo ya NO resetea sort_order a 0
// (bug encontrado en la auditoría, fuera de lo reportado pero dentro del
// mismo método auditado).
// ---------------------------------------------------------------------
test('editing an item via the full form keeps its existing sort_order when not provided', function () {
    actingAsZonesAdmin();
    $category = MenuCategory::factory()->create();
    $item = MenuItem::factory()->create(['menu_category_id' => $category->id, 'sort_order' => 7]);

    test()->put("/admin/menu-items/{$item->id}", [
        'menu_category_id' => $category->id,
        'name' => 'Nombre actualizado',
        'price' => 99.5,
        'is_active' => true,
    ])->assertRedirect('/admin/menu-items');

    $item->refresh();
    expect($item->sort_order)->toBe(7);
});
