<?php

namespace Database\Seeders;

use Illuminate\Console\Command;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use RuntimeException;

class MenuSeeder extends Seeder
{
    /**
     * Ejecuta `menu:import-initial` (idempotente: usa updateOrCreate por
     * slug, correrlo varias veces no duplica nada, y elimina cualquier
     * categoría/platillo fuera de la definición oficial). Deja exactamente
     * el menú real del PDF: 10 categorías (incluida Portada) y 79 platillos.
     *
     * Forma parte de DatabaseSeeder::run() para que un VPS limpio obtenga
     * el menú completo con solo `php artisan migrate --seed`.
     */
    public function run(): void
    {
        $exitCode = Artisan::call('menu:import-initial', [], $this->command?->getOutput());

        if ($exitCode !== Command::SUCCESS) {
            throw new RuntimeException('menu:import-initial falló — revisa las imágenes faltantes reportadas arriba antes de continuar.');
        }
    }
}
