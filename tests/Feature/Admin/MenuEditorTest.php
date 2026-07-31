<?php

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

// forceProductionSsr()/resetSsrStateBetweenRequests() viven en tests/Pest.php
// (compartidas por toda la suite — declararlas aquí también fatal-errorearía
// al correr todos los tests juntos).

function actingAsMenuEditorAdmin(): User
{
    test()->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    test()->actingAs($user);

    return $user;
}

/** Config completo válido para MenuEditorController::configRules(). */
function elementConfig(array $overrides = []): array
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

test('admin can open the visual editor page', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole']);
    MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main']);

    $response = $this->get('/admin/menu-editor');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/MenuEditor/Index')
        ->has('categories', 1)
    );
});

test('admin can open the WYSIWYG preview route with the same Public/Menu component', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    MenuItem::factory()->create(['menu_category_id' => $category->id, 'zone' => 'main', 'is_active' => true]);

    $response = $this->get('/admin/menu-editor/preview');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Public/Menu')
        ->where('editable', true)
        ->has('categories', 1)
    );
});

test('admin can save an item element config for a single breakpoint without touching the others', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();
    $item = MenuItem::factory()->create(['menu_category_id' => $category->id]);

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'mobile',
        'config' => elementConfig(['x' => 10, 'y' => 20, 'width' => 40, 'z_index' => 2]),
    ])->assertOk();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'desktop',
        'config' => elementConfig(['x' => 180, 'y' => 120]),
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['image']['mobile'])->toMatchArray(['x' => 10, 'y' => 20, 'width' => 40, 'z_index' => 2]);
    expect($item->layout_settings['image']['desktop'])->toMatchArray(['x' => 180, 'y' => 120, 'width' => null, 'z_index' => 1]);
});

test('admin can clear a single breakpoint from an item element', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create([
        'layout_settings' => [
            'image' => [
                'mobile' => elementConfig(['x' => 1, 'y' => 1, 'width' => 40]),
                'desktop' => elementConfig(['x' => 2, 'y' => 2]),
            ],
        ],
    ]);

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'mobile',
        'clear' => true,
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['image'])->not->toHaveKey('mobile');
    expect($item->layout_settings['image'])->toHaveKey('desktop');
});

test('viewer without menu.update permission cannot save item element', function () {
    test()->seed(RolePermissionSeeder::class);
    $user = User::factory()->create();
    $user->assignRole('viewer');
    test()->actingAs($user);

    $item = MenuItem::factory()->create();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'mobile',
        'config' => elementConfig(['x' => 10, 'y' => 20, 'width' => 40]),
    ])->assertForbidden();
});

test('admin can save a category element config per breakpoint', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();

    $this->patchJson("/admin/menu-editor/categories/{$category->id}/element", [
        'element' => 'title',
        'breakpoint' => 'tablet',
        'config' => elementConfig(['x' => 12, 'y' => 4, 'width' => 60]),
    ])->assertOk();

    $category->refresh();
    expect($category->visual_settings['title']['tablet'])->toMatchArray([
        'x' => 12, 'y' => 4, 'width' => 60, 'z_index' => 1,
    ]);
});

test('a locked element config is preserved through the config payload', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'name',
        'breakpoint' => 'desktop',
        'config' => elementConfig(['x' => 5, 'y' => 5, 'locked' => true]),
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['name']['desktop']['locked'])->toBeTrue();
});

test('hidden can be set on an item element config and persists per breakpoint', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'name',
        'breakpoint' => 'mobile',
        'config' => elementConfig(['hidden' => true]),
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['name']['mobile']['hidden'])->toBeTrue();

    // Otro breakpoint del mismo elemento no se ve afectado — mismo mecanismo
    // discreto por vista que ya usaban los adornos.
    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'name',
        'breakpoint' => 'desktop',
        'config' => elementConfig(),
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['name']['desktop'])->not->toHaveKey('hidden');
});

test('admin can force a manual section height per breakpoint, and clear it back to auto', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();

    $this->patchJson("/admin/menu-editor/categories/{$category->id}/section-height", [
        'breakpoint' => 'desktop',
        'height' => 2400,
    ])->assertOk();

    $category->refresh();
    expect($category->section_height)->toMatchArray(['desktop' => 2400.0]);

    // Otro breakpoint no se ve afectado — mismo mecanismo discreto por vista
    // que ElementConfig.hidden/z_index.
    $this->patchJson("/admin/menu-editor/categories/{$category->id}/section-height", [
        'breakpoint' => 'mobile',
        'height' => 1200,
    ])->assertOk();

    $category->refresh();
    expect($category->section_height)->toMatchArray(['desktop' => 2400.0, 'mobile' => 1200.0]);

    // height=null limpia SOLO esa vista, vuelve a automático.
    $this->patchJson("/admin/menu-editor/categories/{$category->id}/section-height", [
        'breakpoint' => 'desktop',
        'height' => null,
    ])->assertOk();

    $category->refresh();
    expect($category->section_height)->not->toHaveKey('desktop')
        ->and($category->section_height)->toHaveKey('mobile');
});

test('hidden can be set on a category element config (tagline, title, etc.)', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();

    $this->patchJson("/admin/menu-editor/categories/{$category->id}/element", [
        'element' => 'tagline',
        'breakpoint' => 'desktop',
        'config' => elementConfig(['hidden' => true]),
    ])->assertOk();

    $category->refresh();
    expect($category->visual_settings['tagline']['desktop']['hidden'])->toBeTrue();
});

test('admin can quick-edit an item without leaving the editor', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create(['name' => 'Original', 'price' => 50]);

    $this->patchJson("/admin/menu-editor/items/{$item->id}/quick", [
        'name' => 'Actualizado',
        'price' => 75.5,
    ])->assertOk();

    $this->assertDatabaseHas('menu_items', ['id' => $item->id, 'name' => 'Actualizado', 'price' => 75.50]);
});

test('admin can reorder items via the JSON editor endpoint', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();
    $item1 = MenuItem::factory()->create(['menu_category_id' => $category->id, 'sort_order' => 1]);
    $item2 = MenuItem::factory()->create(['menu_category_id' => $category->id, 'sort_order' => 2]);

    $response = $this->postJson('/admin/menu-editor/items/reorder', [
        'items' => [
            ['id' => $item2->id, 'menu_category_id' => $category->id, 'sort_order' => 1],
            ['id' => $item1->id, 'menu_category_id' => $category->id, 'sort_order' => 2],
        ],
    ]);

    $response->assertOk()->assertJson(['ok' => true]);
    $this->assertDatabaseHas('menu_items', ['id' => $item2->id, 'sort_order' => 1]);
    $this->assertDatabaseHas('menu_items', ['id' => $item1->id, 'sort_order' => 2]);
});

test('menu:import-initial does not overwrite layout_settings or visual_settings already saved from the editor', function () {
    Storage::fake('public');
    Artisan::call('menu:import-initial');

    $pozole = MenuCategory::where('slug', 'pozole')->firstOrFail();
    $pozoleBlanco = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();

    $pozole->update(['visual_settings' => ['title' => ['mobile' => elementConfig(['x' => 9, 'y' => 9, 'width' => 50])]]]);
    $pozoleBlanco->update(['layout_settings' => ['image' => ['mobile' => elementConfig(['x' => 7, 'y' => 7, 'width' => 45])]]]);

    Artisan::call('menu:import-initial');

    $pozole->refresh();
    $pozoleBlanco->refresh();
    expect($pozole->visual_settings['title']['mobile']['x'])->toBe(9);
    expect($pozoleBlanco->layout_settings['image']['mobile']['x'])->toBe(7);
});

test('menu:import-initial --reset-layout clears layout_settings and visual_settings for everyone', function () {
    Storage::fake('public');
    Artisan::call('menu:import-initial');

    $pozole = MenuCategory::where('slug', 'pozole')->firstOrFail();
    $pozoleBlanco = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();
    $pozole->update(['visual_settings' => ['title' => ['mobile' => elementConfig(['x' => 9, 'y' => 9, 'width' => 50])]]]);
    $pozoleBlanco->update(['layout_settings' => ['image' => ['mobile' => elementConfig(['x' => 7, 'y' => 7, 'width' => 45])]]]);

    Artisan::call('menu:import-initial', ['--reset-layout' => true]);

    $pozole->refresh();
    $pozoleBlanco->refresh();
    expect($pozole->visual_settings)->toBeNull();
    expect($pozoleBlanco->layout_settings)->toBeNull();
});

test('saved x/y for a real photo item render as a real translate shift on the public menu', function () {
    forceProductionSsr();
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    $item = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'is_active' => true,
        'image' => 'menu/items/pozole-blanco.png',
    ]);

    // Baseline: sin layout_settings, el wrapper .tc-mp-photo del platillo no
    // debe traer ningún transform (posición original de la plantilla).
    $baseline = $this->get('/menu')->assertOk()->getContent();
    expect($baseline)->toContain("id=\"cat-{$category->id}\"");
    preg_match('/tc-mp-photo[^"]*"[^>]*style="([^"]*)"/', substr($baseline, strpos($baseline, "id=\"cat-{$category->id}\"")), $beforeMatch);
    expect($beforeMatch[1] ?? '')->not->toContain('translate');

    actingAsMenuEditorAdmin();
    // 'desktop' (ancho de referencia 1440px) es la vista que /menu resuelve
    // para el ancho por defecto del cliente de pruebas de Laravel (sin JS
    // real) — useViewportWidth() usa 1440 como valor SSR-safe antes de
    // montar, que coincide exactamente con el ancla 'desktop', así que la
    // interpolación devuelve ese config sin mezclar con ningún otro nivel.
    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'desktop',
        'config' => elementConfig(['x' => 180, 'y' => 120]),
    ])->assertOk();

    // Recarga /menu (nueva petición == "F5") y confirma que el HTML servido
    // trae el transform exacto — translate(180px, 120px) es determinístico:
    // si el navegador lo aplica, el rectángulo del platillo se mueve
    // exactamente esos px, sin ambigüedad de redondeo.
    resetSsrStateBetweenRequests();
    $reloaded = $this->get('/menu')->assertOk()->getContent();
    $section = substr($reloaded, strpos($reloaded, "id=\"cat-{$category->id}\""));
    expect($section)->toContain('translate(180px, 120px)');

    // Restaura a cero y confirma que el transform desaparece de nuevo.
    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'desktop',
        'clear' => true,
    ])->assertOk();
    resetSsrStateBetweenRequests();

    $restored = $this->get('/menu')->assertOk()->getContent();
    $restoredSection = substr($restored, strpos($restored, "id=\"cat-{$category->id}\""));
    expect($restoredSection)->not->toContain('translate(180px');
});

test('saved x/y for a category title render as a real translate shift on the public menu', function () {
    forceProductionSsr();
    $category = MenuCategory::factory()->create([
        'layout' => 'pozole',
        'is_active' => true,
    ]);

    $before = $this->get('/menu')->assertOk()->getContent();
    $beforeSection = substr($before, strpos($before, "id=\"cat-{$category->id}\""));
    expect($beforeSection)->not->toContain('translate(');

    actingAsMenuEditorAdmin();
    $this->patchJson("/admin/menu-editor/categories/{$category->id}/element", [
        'element' => 'title',
        'breakpoint' => 'desktop',
        'config' => elementConfig(['x' => 60, 'y' => 30]),
    ])->assertOk();

    resetSsrStateBetweenRequests();
    $after = $this->get('/menu')->assertOk()->getContent();
    $afterSection = substr($after, strpos($after, "id=\"cat-{$category->id}\""));
    expect($afterSection)->toContain('translate(60px, 30px)');
});

test('a mobile-only config does not affect the desktop render and vice versa', function () {
    forceProductionSsr();
    $category = MenuCategory::factory()->create(['layout' => 'pozole', 'is_active' => true]);
    $item = MenuItem::factory()->create([
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'is_active' => true,
        'image' => 'menu/uploads/mobile-desktop-test.png',
        'layout_settings' => [
            'image' => [
                'mobile' => elementConfig(['x' => 11, 'y' => 22]),
                'desktop' => elementConfig(['x' => 180, 'y' => 120]),
            ],
        ],
    ]);

    // El render SSR de /menu (sin JS) resuelve un ancho fijo de 1440px (ver
    // useViewportWidth.ts) — que coincide exactamente con el ancla
    // 'desktop', así que la interpolación devuelve ESE nivel puro y nunca se
    // mezcla con 'mobile', demostrando que ambos se guardan independientes.
    $item->refresh();
    expect($item->layout_settings['image']['mobile'])->toMatchArray(['x' => 11, 'y' => 22]);
    expect($item->layout_settings['image']['desktop'])->toMatchArray(['x' => 180, 'y' => 120]);

    resetSsrStateBetweenRequests();
    $html = $this->get('/menu')->assertOk()->getContent();
    $section = substr($html, strpos($html, "id=\"cat-{$category->id}\""));
    expect($section)->toContain('translate(180px, 120px)');
    expect($section)->not->toContain('translate(11px, 22px)');
});
