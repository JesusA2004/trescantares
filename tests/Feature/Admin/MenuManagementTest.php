<?php

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAsSuperAdmin(): User
{
    test()->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    test()->actingAs($user);

    return $user;
}

test('admin can create a menu category', function () {
    actingAsSuperAdmin();

    $response = $this->post('/admin/categories', [
        'name' => 'Sopas',
        'layout' => 'grid',
        'color' => '#144E8F',
        'is_active' => true,
    ]);

    $response->assertRedirect('/admin/categories');
    $this->assertDatabaseHas('menu_categories', ['name' => 'Sopas', 'slug' => 'sopas', 'layout' => 'grid']);
});

test('admin can update a menu category', function () {
    actingAsSuperAdmin();
    $category = MenuCategory::factory()->create(['name' => 'Original']);

    $response = $this->put("/admin/categories/{$category->id}", [
        'name' => 'Actualizada',
        'layout' => 'pozole',
        'is_active' => true,
    ]);

    $response->assertRedirect('/admin/categories');
    $this->assertDatabaseHas('menu_categories', ['id' => $category->id, 'name' => 'Actualizada', 'layout' => 'pozole']);
});

test('admin can delete a menu category', function () {
    actingAsSuperAdmin();
    $category = MenuCategory::factory()->create();

    $response = $this->delete("/admin/categories/{$category->id}");

    $response->assertRedirect('/admin/categories');
    $this->assertDatabaseMissing('menu_categories', ['id' => $category->id]);
});

test('admin can reorder menu categories', function () {
    actingAsSuperAdmin();
    $a = MenuCategory::factory()->create(['sort_order' => 1]);
    $b = MenuCategory::factory()->create(['sort_order' => 2]);

    $response = $this->post('/admin/categories/reorder', [
        'categories' => [
            ['id' => $b->id, 'sort_order' => 1],
            ['id' => $a->id, 'sort_order' => 2],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('menu_categories', ['id' => $b->id, 'sort_order' => 1]);
    $this->assertDatabaseHas('menu_categories', ['id' => $a->id, 'sort_order' => 2]);
});

test('admin can create a menu item with layout fields', function () {
    actingAsSuperAdmin();
    $category = MenuCategory::factory()->create();

    $response = $this->post('/admin/menu-items', [
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'name' => 'Pozole Blanco',
        'price' => 131,
        'price_label' => 'Blanco',
        'choice_label' => 'TÚ ELIGES',
        'is_active' => true,
    ]);

    $response->assertRedirect('/admin/menu-items');
    $this->assertDatabaseHas('menu_items', [
        'name' => 'Pozole Blanco',
        'menu_category_id' => $category->id,
        'zone' => 'main',
        'price_label' => 'Blanco',
        'choice_label' => 'TÚ ELIGES',
    ]);
});

test('admin can update a menu item', function () {
    actingAsSuperAdmin();
    $category = MenuCategory::factory()->create();
    $item = MenuItem::factory()->for($category, 'category')->create(['menu_category_id' => $category->id]);

    $response = $this->put("/admin/menu-items/{$item->id}", [
        'menu_category_id' => $category->id,
        'name' => 'Nombre actualizado',
        'price' => 99.5,
        'is_active' => true,
    ]);

    $response->assertRedirect('/admin/menu-items');
    $this->assertDatabaseHas('menu_items', ['id' => $item->id, 'name' => 'Nombre actualizado', 'price' => 99.50]);
});

test('admin can delete a menu item', function () {
    actingAsSuperAdmin();
    $category = MenuCategory::factory()->create();
    $item = MenuItem::factory()->for($category, 'category')->create(['menu_category_id' => $category->id]);

    $response = $this->delete("/admin/menu-items/{$item->id}");

    $response->assertRedirect('/admin/menu-items');
    $this->assertDatabaseMissing('menu_items', ['id' => $item->id]);
});

test('admin can reorder menu items and move them between categories', function () {
    actingAsSuperAdmin();
    $catA = MenuCategory::factory()->create();
    $catB = MenuCategory::factory()->create();
    $item1 = MenuItem::factory()->create(['menu_category_id' => $catA->id, 'sort_order' => 1]);
    $item2 = MenuItem::factory()->create(['menu_category_id' => $catA->id, 'sort_order' => 2]);

    $response = $this->post('/admin/menu-items/reorder', [
        'items' => [
            ['id' => $item2->id, 'menu_category_id' => $catB->id, 'sort_order' => 1],
            ['id' => $item1->id, 'menu_category_id' => $catA->id, 'sort_order' => 1],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('menu_items', ['id' => $item2->id, 'menu_category_id' => $catB->id, 'sort_order' => 1]);
    $this->assertDatabaseHas('menu_items', ['id' => $item1->id, 'menu_category_id' => $catA->id, 'sort_order' => 1]);
});

test('public menu page renders active categories with only active items', function () {
    $category = MenuCategory::factory()->create(['is_active' => true, 'layout' => 'pozole']);
    $activeItem = MenuItem::factory()->create(['menu_category_id' => $category->id, 'is_active' => true]);
    MenuItem::factory()->create(['menu_category_id' => $category->id, 'is_active' => false]);
    $inactiveCategory = MenuCategory::factory()->create(['is_active' => false]);

    $response = $this->get('/menu');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Public/Menu')
        ->where('categories', function ($categories) use ($category, $activeItem, $inactiveCategory) {
            $ids = collect($categories)->pluck('id');
            expect($ids)->toContain($category->id);
            expect($ids)->not->toContain($inactiveCategory->id);

            $itemNames = collect($categories)->firstWhere('id', $category->id)['items'];
            expect(collect($itemNames)->pluck('id'))->toContain($activeItem->id)
                ->and(collect($itemNames))->toHaveCount(1);

            return true;
        })
    );
});
