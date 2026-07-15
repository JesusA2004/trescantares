<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adornos de sección (flores, curvas, puntos, texturas…) — imágenes
     * decorativas que NO pertenecen a ningún platillo, adjuntas a una
     * categoría (sección del menú). `visual_settings` reutiliza EXACTAMENTE
     * el mismo shape `ElementSettings` (mobile/tablet/desktop -> ElementConfig)
     * que ya usan MenuCategory.visual_settings/MenuItem.layout_settings — ver
     * decorationElementFor() en resources/js/components/Public/Menu/types.ts.
     * Cada adorno tiene una clave estable `decoration-{id}:image` (nunca un
     * índice de array, que se invalidaría al reordenar).
     */
    public function up(): void
    {
        Schema::create('menu_decorations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('image_path');
            $table->string('alt_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->json('visual_settings')->nullable();
            $table->timestamps();

            $table->index(['menu_category_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_decorations');
    }
};
