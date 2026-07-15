<?php

use App\Models\MenuCategory;
use Illuminate\Database\Migrations\Migration;

/**
 * Prueba la lógica de
 * database/migrations/2026_07_14_230000_migrate_menu_layout_settings_to_three_tier_breakpoints.php
 * de forma aislada de RefreshDatabase — igual que
 * SplitMenuCategoryTitleImageSettingsMigrationTest, ver ese archivo para el
 * porqué de requerir el archivo directamente en vez de usar el runner de
 * migraciones de Laravel.
 */
function threeTierMigration(): Migration
{
    return require database_path('migrations/2026_07_14_230000_migrate_menu_layout_settings_to_three_tier_breakpoints.php');
}

test('conserva una clave "desktop" real ya presente aunque conviva con una clave legacy huérfana', function () {
    // Regresión: una fila con AMBAS '2xl' (legacy huérfana de una migración
    // parcial anterior) y 'desktop' (formato nuevo, real, con datos que un
    // administrador ya guardó) no debe descartar 'desktop' en favor del
    // fallback legacy — antes de este fix, `desktop: xl ?? lg ?? '2xl'`
    // pisaba silenciosamente la posición real con el valor legacy huérfano.
    $category = MenuCategory::factory()->create([
        'visual_settings' => [
            'title' => [
                '2xl' => ['x' => 0, 'y' => 0, 'scale' => 1, 'width' => null, 'height' => null, 'z_index' => 1, 'rotation' => 0],
                'desktop' => ['x' => 335, 'y' => 10, 'scale' => 1, 'width' => 645, 'height' => 600, 'z_index' => 1, 'rotation' => 0],
            ],
        ],
    ]);

    threeTierMigration()->up();
    $category->refresh();

    expect($category->visual_settings['title']['desktop'])
        ->toMatchArray(['x' => 335, 'y' => 10, 'width' => 645, 'height' => 600])
        ->and($category->visual_settings['title']['_legacy_breakpoints']['2xl']['x'])->toBe(0);
});

test('sigue migrando claves puramente legacy (base/sm/md/lg/xl/2xl) al formato de tres vistas', function () {
    $category = MenuCategory::factory()->create([
        'visual_settings' => [
            'subtitle' => [
                'base' => ['x' => -1, 'y' => 0, 'scale' => 1, 'width' => null, 'height' => null, 'z_index' => 1, 'rotation' => 0],
            ],
        ],
    ]);

    threeTierMigration()->up();
    $category->refresh();

    expect($category->visual_settings['subtitle']['mobile']['x'])->toBe(-1)
        ->and($category->visual_settings['subtitle']['tablet']['x'])->toBe(-1)
        ->and($category->visual_settings['subtitle'])->not->toHaveKey('desktop');
});

test('no toca un elemento que ya está limpio en formato de tres vistas', function () {
    $category = MenuCategory::factory()->create([
        'visual_settings' => [
            'title' => [
                'desktop' => ['x' => 12, 'y' => 6, 'scale' => 1, 'width' => null, 'height' => null, 'z_index' => 1, 'rotation' => 0],
            ],
        ],
    ]);

    threeTierMigration()->up();
    $category->refresh();

    expect($category->visual_settings['title'])->toBe([
        'desktop' => ['x' => 12, 'y' => 6, 'scale' => 1, 'width' => null, 'height' => null, 'z_index' => 1, 'rotation' => 0],
    ]);
});
