<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('menu:import-initial', [], $this->command?->getOutput());
    }
}
