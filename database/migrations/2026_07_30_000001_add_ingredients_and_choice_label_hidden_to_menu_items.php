<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mismo mecanismo que `image_hidden` (ver
     * 2026_07_16_000002_add_visibility_and_previous_image_to_menu_items.php):
     * ocultar SOLO el bloque de ingredientes o SOLO la etiqueta de elección,
     * sin tocar `is_active` (que oculta el platillo COMPLETO) ni borrar el
     * texto guardado en `ingredients`/`choice_label` — reactivarlo restaura
     * el texto tal cual estaba. Ver MenuItem::toPublicArray().
     */
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->boolean('ingredients_hidden')->default(false)->after('ingredients');
            $table->boolean('choice_label_hidden')->default(false)->after('choice_label');
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn(['ingredients_hidden', 'choice_label_hidden']);
        });
    }
};
