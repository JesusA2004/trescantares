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
        'breakpoint' => 'base',
        'config' => elementConfig(['x' => 10, 'y' => 20, 'width' => 40, 'z_index' => 2]),
    ])->assertOk();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'xl',
        'config' => elementConfig(['x' => 180, 'y' => 120]),
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['image']['base'])->toMatchArray(['x' => 10, 'y' => 20, 'width' => 40, 'z_index' => 2]);
    expect($item->layout_settings['image']['xl'])->toMatchArray(['x' => 180, 'y' => 120, 'width' => null, 'z_index' => 1]);
});

test('admin can clear a single breakpoint from an item element', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create([
        'layout_settings' => [
            'image' => [
                'base' => elementConfig(['x' => 1, 'y' => 1, 'width' => 40]),
                'xl' => elementConfig(['x' => 2, 'y' => 2]),
            ],
        ],
    ]);

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'base',
        'clear' => true,
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['image'])->not->toHaveKey('base');
    expect($item->layout_settings['image'])->toHaveKey('xl');
});

test('viewer without menu.update permission cannot save item element', function () {
    test()->seed(RolePermissionSeeder::class);
    $user = User::factory()->create();
    $user->assignRole('viewer');
    test()->actingAs($user);

    $item = MenuItem::factory()->create();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'base',
        'config' => elementConfig(['x' => 10, 'y' => 20, 'width' => 40]),
    ])->assertForbidden();
});

test('admin can save a category element config per breakpoint', function () {
    actingAsMenuEditorAdmin();
    $category = MenuCategory::factory()->create();

    $this->patchJson("/admin/menu-editor/categories/{$category->id}/element", [
        'element' => 'title',
        'breakpoint' => 'md',
        'config' => elementConfig(['x' => 12, 'y' => 4, 'width' => 60]),
    ])->assertOk();

    $category->refresh();
    expect($category->visual_settings['title']['md'])->toMatchArray([
        'x' => 12, 'y' => 4, 'width' => 60, 'z_index' => 1,
    ]);
});

test('a locked element config is preserved through the config payload', function () {
    actingAsMenuEditorAdmin();
    $item = MenuItem::factory()->create();

    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'name',
        'breakpoint' => 'lg',
        'config' => elementConfig(['x' => 5, 'y' => 5, 'locked' => true]),
    ])->assertOk();

    $item->refresh();
    expect($item->layout_settings['name']['lg']['locked'])->toBeTrue();
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

    $pozole->update(['visual_settings' => ['title' => ['base' => elementConfig(['x' => 9, 'y' => 9, 'width' => 50])]]]);
    $pozoleBlanco->update(['layout_settings' => ['image' => ['base' => elementConfig(['x' => 7, 'y' => 7, 'width' => 45])]]]);

    Artisan::call('menu:import-initial');

    $pozole->refresh();
    $pozoleBlanco->refresh();
    expect($pozole->visual_settings['title']['base']['x'])->toBe(9);
    expect($pozoleBlanco->layout_settings['image']['base']['x'])->toBe(7);
});

test('menu:import-initial --reset-layout clears layout_settings and visual_settings for everyone', function () {
    Storage::fake('public');
    Artisan::call('menu:import-initial');

    $pozole = MenuCategory::where('slug', 'pozole')->firstOrFail();
    $pozoleBlanco = MenuItem::where('slug', 'pozole-blanco')->firstOrFail();
    $pozole->update(['visual_settings' => ['title' => ['base' => elementConfig(['x' => 9, 'y' => 9, 'width' => 50])]]]);
    $pozoleBlanco->update(['layout_settings' => ['image' => ['base' => elementConfig(['x' => 7, 'y' => 7, 'width' => 45])]]]);

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
    // xl es el breakpoint que /menu resuelve para el ancho por defecto del
    // cliente de pruebas de Laravel (sin JS real) — el propio helper
    // resolveBreakpoint() de types.ts usa 'lg' como default antes de montar,
    // que es justo el que la plantilla usa en el layout SSR sin viewport.
    $this->patchJson("/admin/menu-editor/items/{$item->id}/element", [
        'element' => 'image',
        'breakpoint' => 'lg',
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
        'breakpoint' => 'lg',
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
        'breakpoint' => 'lg',
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
        'layout_settings' => [
            'image' => [
                'base' => elementConfig(['x' => 11, 'y' => 22]),
                'lg' => elementConfig(['x' => 180, 'y' => 120]),
            ],
        ],
    ]);

    // El render SSR de /menu (sin JS) resuelve el breakpoint por defecto
    // ('lg', ver useBreakpoint.ts) — confirma que ese es el que aparece, no
    // el de 'base', demostrando que ambos breakpoints se guardan
    // independientes y no se pisan entre sí en el JSON persistido.
    $item->refresh();
    expect($item->layout_settings['image']['base'])->toMatchArray(['x' => 11, 'y' => 22]);
    expect($item->layout_settings['image']['lg'])->toMatchArray(['x' => 180, 'y' => 120]);

    resetSsrStateBetweenRequests();
    $html = $this->get('/menu')->assertOk()->getContent();
    $section = substr($html, strpos($html, "id=\"cat-{$category->id}\""));
    expect($section)->toContain('translate(180px, 120px)');
    expect($section)->not->toContain('translate(11px, 22px)');
});
