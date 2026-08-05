<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Los adornos ahora pueden ser 'image' (comportamiento de siempre) o
     * 'text' — un bloque de texto libre (nombre de platillo manual, precio
     * escrito a mano, promo, etc.) que el admin puede mover/redimensionar/
     * estilizar exactamente igual que cualquier otro texto del editor, sin
     * estar ligado a ningún MenuItem real.
     *
     * `image_path` se queda NOT NULL a propósito (evita un ALTER de
     * nullability específico por motor de BD, y este proyecto no tiene
     * doctrine/dbal instalado para Blueprint::change()) — un adorno de texto
     * simplemente guarda '' ahí; MenuDecoration::getImageUrlAttribute() ya
     * trata cualquier valor "falsy" (incluida la cadena vacía) como "sin
     * imagen".
     */
    public function up(): void
    {
        Schema::table('menu_decorations', function (Blueprint $table) {
            $table->string('kind')->default('image')->after('name');
            $table->text('text_content')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('menu_decorations', function (Blueprint $table) {
            $table->dropColumn(['kind', 'text_content']);
        });
    }
};
