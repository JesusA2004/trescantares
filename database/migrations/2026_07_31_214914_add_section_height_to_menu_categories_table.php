<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            // Alto MÍNIMO forzado a mano por vista (mobile/tablet/desktop),
            // null por defecto = automático (crece con el contenido, como
            // hoy). Nunca recorta contenido que no quepa — ver min-height en
            // Menu.vue/app.css.
            $table->json('section_height')->nullable()->after('visual_settings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->dropColumn('section_height');
        });
    }
};
