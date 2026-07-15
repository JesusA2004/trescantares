<?php

use App\Models\MenuCategory;
use Illuminate\Database\Migrations\Migration;

/**
 * Prueba la lógica de
 * database/migrations/2026_07_16_000001_split_menu_category_title_image_settings.php
 * de forma AISLADA de RefreshDatabase: para cuando el framework de pruebas
 * construye el esquema de la base de datos de pruebas, esta migración ya
 * corrió sobre una tabla vacía (no-op) — así que aquí se siembra el estado
 * "viejo" a mano y se invoca up()/down() directamente sobre esas filas.
 */
function splitMigration(): Migration
{
    return require database_path('migrations/2026_07_16_000001_split_menu_category_title_image_settings.php');
}

/** Config completo válido de ElementConfig (mismo shape que usa el editor). */
function splitElementConfig(array $overrides = []): array
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

test('migra un ajuste real guardado bajo "title" a "title_image" cuando la categoría tiene imagen de título', function () {
    $category = MenuCategory::factory()->create([
        'title_image' => 'menu/design/title-pozole.png',
        'visual_settings' => [
            'title' => [
                'desktop' => splitElementConfig(['x' => 335, 'y' => 10, 'width' => 645, 'height' => 600]),
            ],
            'title_image' => [
                'desktop' => splitElementConfig(), // fantasma: nunca personalizado de verdad
            ],
        ],
    ]);

    splitMigration()->up();
    $category->refresh();

    expect($category->visual_settings['title_image']['desktop'])
        ->toMatchArray(['x' => 335, 'y' => 10, 'width' => 645, 'height' => 600])
        ->and($category->visual_settings)->not->toHaveKey('title')
        ->and($category->visual_settings['_pre_title_image_split_backup']['title']['desktop']['x'])->toBe(335);
});

test('no migra nada si la categoría no tiene imagen de título (el título de texto es real)', function () {
    $category = MenuCategory::factory()->create([
        'title_image' => null,
        'visual_settings' => [
            'title' => ['desktop' => splitElementConfig(['x' => 12, 'y' => 6])],
        ],
    ]);

    splitMigration()->up();
    $category->refresh();

    expect($category->visual_settings['title']['desktop'])->toMatchArray(['x' => 12, 'y' => 6])
        ->and($category->visual_settings)->not->toHaveKey('_pre_title_image_split_backup');
});

test('nunca sobrescribe una config de imagen ya personalizada', function () {
    $category = MenuCategory::factory()->create([
        'title_image' => 'menu/design/title-pancita.png',
        'visual_settings' => [
            'title' => ['desktop' => splitElementConfig(['x' => 999, 'y' => 999])],
            'title_image' => ['desktop' => splitElementConfig(['x' => 40, 'y' => 20, 'width' => 300])],
        ],
    ]);

    splitMigration()->up();
    $category->refresh();

    // La config de imagen YA personalizada (no trivial) se conserva intacta.
    expect($category->visual_settings['title_image']['desktop'])
        ->toMatchArray(['x' => 40, 'y' => 20, 'width' => 300]);
});

test('migra subtitle_image y tagline_image de la misma forma que title_image', function () {
    $category = MenuCategory::factory()->create([
        'title_image' => 'menu/design/title-pozole.png',
        'subtitle_image' => 'menu/design/title-acompanalo.png',
        'tagline_image' => null,
        'visual_settings' => [
            'subtitle' => ['mobile' => splitElementConfig(['x' => 5, 'y' => 5])],
        ],
    ]);

    splitMigration()->up();
    $category->refresh();

    expect($category->visual_settings['subtitle_image']['mobile'])->toMatchArray(['x' => 5, 'y' => 5]);
});

test('correr la migración dos veces es idempotente (no duplica ni pierde el respaldo)', function () {
    $category = MenuCategory::factory()->create([
        'title_image' => 'menu/design/title-pozole.png',
        'visual_settings' => [
            'title' => ['desktop' => splitElementConfig(['x' => 50, 'y' => 25])],
        ],
    ]);

    $migration = splitMigration();
    $migration->up();
    $category->refresh();
    $firstBackup = $category->visual_settings['_pre_title_image_split_backup'];

    $migration->up();
    $category->refresh();

    expect($category->visual_settings['title_image']['desktop'])->toMatchArray(['x' => 50, 'y' => 25])
        ->and($category->visual_settings['_pre_title_image_split_backup'])->toBe($firstBackup);
});

test('down() restaura el visual_settings original desde el respaldo', function () {
    $original = [
        'title' => ['desktop' => splitElementConfig(['x' => 70, 'y' => 35])],
    ];
    $category = MenuCategory::factory()->create([
        'title_image' => 'menu/design/title-birria.png',
        'visual_settings' => $original,
    ]);

    $migration = splitMigration();
    $migration->up();
    $migration->down();
    $category->refresh();

    expect($category->visual_settings)->toBe($original);
});
