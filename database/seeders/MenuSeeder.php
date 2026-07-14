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
     * slug, correrlo varias veces no duplica nada). Solo contiene el menú
     * real del PDF: 10 categorías (incluida Portada) y 79 platillos.
     *
     * A propósito NO se llama desde DatabaseSeeder::run() — es una acción
     * manual y controlada: `php artisan db:seed --class=MenuSeeder`.
     */
    public function run(): void
    {
        $exitCode = Artisan::call('menu:import-initial', [], $this->command?->getOutput());

        if ($exitCode !== Command::SUCCESS) {
            throw new RuntimeException('menu:import-initial falló — revisa las imágenes faltantes reportadas arriba antes de continuar.');
        }
    }
}
