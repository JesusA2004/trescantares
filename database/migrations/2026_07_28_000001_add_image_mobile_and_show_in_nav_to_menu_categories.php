<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->string('image_mobile')->nullable()->after('image');
            $table->boolean('show_in_nav')->default(true)->after('is_active');
        });

        // La portada nunca ha aparecido en la navegación lateral (se excluía
        // por layout === 'portada' en Menu.vue) — se preserva ese
        // comportamiento con el nuevo campo explícito.
        DB::table('menu_categories')->where('layout', 'portada')->update(['show_in_nav' => false]);
    }

    public function down(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->dropColumn(['image_mobile', 'show_in_nav']);
        });
    }
};
