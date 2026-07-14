<?php

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Vite;

/**
 * Fuerza la ruta SSR de producción (bootstrap/ssr/app.js) en vez de la del
 * servidor Vite en caliente: si hay un `npm run dev` corriendo en la máquina
 * (public/hot presente), Inertia delega el render SSR a ese proceso ajeno a
 * este test — no queremos que el resultado dependa de un proceso externo que
 * este test no controla ni puede rearrancar.
 */
function forceProductionSsr(): void
{
    Vite::useHotFile(storage_path('framework/testing-disabled-hot-file'));
}

/**
 * Inertia\Ssr\SsrState se registra como binding `scoped()`: en producción se
 * reinicia solo porque cada request real pasa por Kernel::terminate(). Dentro
 * de un mismo test de Feature, varias llamadas a $this->get() reutilizan el
 * mismo contenedor y jamás disparan ese terminate(), así que SsrState memoiza
 * el `dispatched=true`/response de la primera petición SSR y las siguientes
 * llamadas a /menu dentro del mismo test nunca vuelven a golpear el servidor
 * SSR. No es un bug de la app — es este artefacto del entorno de test.
 */
function resetSsrStateBetweenRequests(): void
{
    app()->forgetScopedInstances();
}

function actingAsMenuEditorAdmin(): User
{
    test()->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    test()->actingAs($user);

    return $user;
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

test('admin can save an item layout for a single breakpoint without touching the others', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();
    $item = MenuItem::factory()->create(['menu_category_id' => $category->id]);

    $this->patchJson("/admin/menu-editor/items/{$item->id}/layout", [
        'breakpoint' => 'mobile',
        'move_x' => 10,
        'move_y' => 20,
        'width' => 40,
        'z_index' => 2,
    ])->assertOk();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/layout", [
        'breakpoint' => 'desktop',
        'move_x' => 180,
        'move_y' => 120,
        'width' => null,
        'z_index' => 1,
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['mobile'])->toMatchArray(['move_x' => 10, 'move_y' => 20, 'width' => 40, 'z_index' => 2]);
    expect($item->layout_settings['desktop'])->toMatchArray(['move_x' => 180, 'move_y' => 120, 'width' => null, 'z_index' => 1]);
});

test('admin can clear a single breakpoint from an item layout', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create([
        'layout_settings' => [
            'mobile' => ['move_x' => 1, 'move_y' => 1, 'width' => 40, 'z_index' => 1],
            'desktop' => ['move_x' => 2, 'move_y' => 2, 'width' => null, 'z_index' => 1],
        ],
    ]);

    $this->patchJson("/admin/menu-editor/items/{$item->id}/layout", [
        'breakpoint' => 'mobile',
        'clear' => true,
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings)->not->toHaveKey('mobile');
    expect($item->layout_settings)->toHaveKey('desktop');
});

test('viewer without menu.update permission cannot save item layout', function () {
    test()->seed(RolePermissionSeeder::class);
    $user = User::factory()->create();
    $user->assignRole('viewer');
    test()->actingAs($user);

    $item = MenuItem::factory()->create();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/layout", [
        'breakpoint' => 'mobile',
        'move_x' => 10,
        'move_y' => 20,
        'width' => 40,
        'z_index' => 1,
    ])->assertForbidden();
});

test('admin can save a category visual element layout per breakpoint', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();

    $this->patchJson("/admin/menu-editor/categories/{$category->id}/visual-layout", [
        'element' => 'title',
        'breakpoint' => 'tablet',
        'move_x' => 12,
        'move_y' => 4,
        'width' => 60,
        'z_index' => 1,
    ])->assertOk();

    $category->refresh();
    expect($category->visual_settings['title']['tablet'])->toMatchArray([
        'move_x' => 12, 'move_y' => 4, 'width' => 60, 'z_index' => 1,
    ]);
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

    $pozole->update(['visual_settings' => ['title' => ['mobile' => ['move_x' => 9, 'move_y' => 9, 'width' => 50, 'z_index' => 1]]]]);
    $pozoleBlanco->update(['layout_settings' => ['mobile' => ['move_x' => 7, 'move_y' => 7, 'width' => 45, 'z_index' => 1]]]);

    Artisan::call('menu:import-initial');

    $pozole->refresh();
    $pozoleBlanco->refresh();
    expect($pozole->visual_settings['title']['mobile']['move_x'])->toBe(9);
    expect($pozoleBlanco->layout_settings['mobile']['move_x'])->toBe(7);
});

test('menu:import-initial --reset-layout clears layout_settings and visual_settings for everyone', function () {
    Storage::fake('public');
    Artisan::call('menu:import-initial');

    $pozole = MenuCategory::where('slug', 'pozole')->firstOrFail();
    $pozoleBlanco = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();
    $pozole->update(['visual_settings' => ['title' => ['mobile' => ['move_x' => 9, 'move_y' => 9, 'width' => 50, 'z_index' => 1]]]]);
    $pozoleBlanco->update(['layout_settings' => ['mobile' => ['move_x' => 7, 'move_y' => 7, 'width' => 45, 'z_index' => 1]]]);

    Artisan::call('menu:import-initial', ['--reset-layout' => true]);

    $pozole->refresh();
    $pozoleBlanco->refresh();
    expect($pozole->visual_settings)->toBeNull();
    expect($pozoleBlanco->layout_settings)->toBeNull();
});

test('saved move_x/move_y for a real photo item render as a real translate3d shift on the public menu', function () {
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
    expect($beforeMatch[1] ?? '')->not->toContain('translate3d');

    actingAsMenuEditorAdmin();
    $this->patchJson("/admin/menu-editor/items/{$item->id}/layout", [
        'breakpoint' => 'desktop',
        'move_x' => 180,
        'move_y' => 120,
        'width' => null,
        'z_index' => 1,
    ])->assertOk();

    // Recarga /menu (nueva petición == "F5") y confirma que el HTML servido
    // trae el transform exacto — translate3d(180px, 120px, 0) es
    // determinístico: si el navegador lo aplica, el rectángulo del platillo
    // se mueve exactamente esos px, sin ambigüedad de redondeo.
    resetSsrStateBetweenRequests();
    $reloaded = $this->get('/menu')->assertOk()->getContent();
    $section = substr($reloaded, strpos($reloaded, "id=\"cat-{$category->id}\""));
    expect($section)->toContain('translate3d(180px, 120px, 0)');

    // Restaura a cero y confirma que el transform desaparece de nuevo.
    $this->patchJson("/admin/menu-editor/items/{$item->id}/layout", [
        'breakpoint' => 'desktop',
        'clear' => true,
    ])->assertOk();
    resetSsrStateBetweenRequests();

    $restored = $this->get('/menu')->assertOk()->getContent();
    $restoredSection = substr($restored, strpos($restored, "id=\"cat-{$category->id}\""));
    expect($restoredSection)->not->toContain('translate3d(180px');
});

test('saved move_x/move_y for a category title render as a real translate3d shift on the public menu', function () {
    forceProductionSsr();
    $category = MenuCategory::factory()->create([
        'layout' => 'pozole',
        'is_active' => true,
    ]);

    $before = $this->get('/menu')->assertOk()->getContent();
    $beforeSection = substr($before, strpos($before, "id=\"cat-{$category->id}\""));
    expect($beforeSection)->not->toContain('translate3d');

    actingAsMenuEditorAdmin();
    $this->patchJson("/admin/menu-editor/categories/{$category->id}/visual-layout", [
        'element' => 'title',
        'breakpoint' => 'desktop',
        'move_x' => 60,
        'move_y' => 30,
        'width' => null,
        'z_index' => 1,
    ])->assertOk();

    resetSsrStateBetweenRequests();
    $after = $this->get('/menu')->assertOk()->getContent();
    $afterSection = substr($after, strpos($after, "id=\"cat-{$category->id}\""));
    expect($afterSection)->toContain('translate3d(60px, 30px, 0)');
});
