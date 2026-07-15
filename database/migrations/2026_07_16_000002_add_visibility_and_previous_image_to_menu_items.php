<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `is_active` ya existía (oculta el platillo COMPLETO). `image_hidden`
     * permite ocultar SOLO la fotografía, conservando nombre/descripción/
     * precio visibles — un ocultamiento independiente y no destructivo (la
     * ruta en `image` nunca se borra, solo se deja de renderizar). Ver
     * MenuItem::getImageUrlAttribute().
     *
     * `previous_image` guarda la ruta de la imagen ANTERIOR cada vez que se
     * reemplaza una (un solo nivel de "deshacer" no destructivo) — permite
     * el botón "Restaurar imagen anterior" sin tocar images.php.
     */
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->boolean('image_hidden')->default(false)->after('is_active');
            $table->string('previous_image')->nullable()->after('image');
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn(['image_hidden', 'previous_image']);
        });
    }
};
