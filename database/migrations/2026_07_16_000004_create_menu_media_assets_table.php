<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Biblioteca de imágenes del menú: un registro por archivo físico subido
     * desde el administrador (platillos, adornos, títulos de categoría…) que
     * permite REUTILIZAR una imagen ya subida en vez de volver a subirla —
     * evita duplicar archivos innecesariamente. Quién usa cada asset se
     * calcula en caliente consultando menu_items/menu_categories/
     * menu_decorations por `disk_path` (ver MediaLibraryController), no con
     * una tabla pivote que podría desincronizarse.
     */
    public function up(): void
    {
        Schema::create('menu_media_assets', function (Blueprint $table) {
            $table->id();
            $table->string('disk_path')->unique();
            $table->string('original_name')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('alt_text')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_media_assets');
    }
};
