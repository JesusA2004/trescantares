<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE menu_items ALTER image_fit SET DEFAULT 'contain'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE menu_items ALTER COLUMN image_fit SET DEFAULT 'contain'");
        }
        // SQLite no soporta ALTER COLUMN DEFAULT; el valor por defecto ya se aplica
        // explícitamente desde el formulario y el importador, por lo que no es crítico.

        // Los platillos son recortes PNG transparentes: "contener" es el ajuste correcto,
        // no "cubrir" (que sólo aplica a fotografías rectangulares reales).
        \App\Models\MenuItem::where('image_fit', 'cover')->update(['image_fit' => 'contain']);
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE menu_items ALTER image_fit SET DEFAULT 'cover'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE menu_items ALTER COLUMN image_fit SET DEFAULT 'cover'");
        }
    }
};
