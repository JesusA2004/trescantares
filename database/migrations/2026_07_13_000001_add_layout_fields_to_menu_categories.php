<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->string('layout', 30)->default('grid')->after('color');
            $table->string('subtitle', 120)->nullable()->after('description');
            $table->string('tagline', 255)->nullable()->after('subtitle');
            $table->string('tagline_sub', 255)->nullable()->after('tagline');
            $table->string('title_image')->nullable()->after('image');
            $table->string('subtitle_image')->nullable()->after('title_image');
            $table->string('tagline_image')->nullable()->after('subtitle_image');
            $table->string('color_secondary', 20)->nullable()->after('color');
            $table->string('background_position', 40)->nullable()->after('color_secondary');
        });
    }

    public function down(): void
    {
        Schema::table('menu_categories', function (Blueprint $table) {
            $table->dropColumn([
                'layout', 'subtitle', 'tagline', 'tagline_sub',
                'title_image', 'subtitle_image', 'tagline_image',
                'color_secondary', 'background_position',
            ]);
        });
    }
};
