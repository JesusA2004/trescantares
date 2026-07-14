<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->string('alt_text')->nullable()->after('image');
            $table->string('choice_label', 40)->nullable()->after('badge');
            $table->string('price_label', 40)->nullable()->after('price');
            $table->decimal('price_secondary', 10, 2)->nullable()->after('price_label');
            $table->string('price_secondary_label', 40)->nullable()->after('price_secondary');
            $table->string('presentation', 60)->nullable()->after('price_secondary_label');
            $table->string('caption_image')->nullable()->after('presentation');
            $table->string('zone', 40)->nullable()->after('menu_category_id');
            $table->unsignedTinyInteger('image_position_x')->default(50)->after('image');
            $table->unsignedTinyInteger('image_position_y')->default(50)->after('image_position_x');
            $table->decimal('image_scale', 4, 2)->default(1.00)->after('image_position_y');
            $table->string('image_fit', 10)->default('cover')->after('image_scale');
            $table->string('image_align', 10)->nullable()->default('center')->after('image_fit');
            $table->string('visual_size', 10)->nullable()->default('md')->after('image_align');

            $table->index(['menu_category_id', 'zone']);
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropIndex(['menu_category_id', 'zone']);
            $table->dropColumn([
                'alt_text', 'choice_label', 'price_label', 'price_secondary', 'price_secondary_label',
                'presentation', 'caption_image', 'zone', 'image_position_x', 'image_position_y',
                'image_scale', 'image_fit', 'image_align', 'visual_size',
            ]);
        });
    }
};
