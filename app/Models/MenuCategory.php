<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'description', 'subtitle', 'tagline', 'tagline_sub',
        'image', 'image_mobile', 'title_image', 'subtitle_image', 'tagline_image',
        'icon', 'color', 'color_secondary', 'layout', 'background_position',
        'visual_settings', 'section_height', 'sort_order', 'is_active', 'show_in_nav',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_in_nav' => 'boolean',
        'sort_order' => 'integer',
        'visual_settings' => 'array',
        'section_height' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (MenuCategory $category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });

        static::updating(function (MenuCategory $category) {
            if ($category->isDirty('name') && ! $category->isDirty('slug')) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function decorations(): HasMany
    {
        return $this->hasMany(MenuDecoration::class)->orderBy('sort_order');
    }

    /**
     * Datos tal como los consume el menú público — usado tanto por
     * Public\MenuController como por el preview WYSIWYG del editor visual
     * (Admin\MenuEditorController::preview), para garantizar que ambos
     * rendericen exactamente la misma información. Los adornos INACTIVOS ni
     * siquiera se cargan aquí — nunca llegan al HTML/JSON público ni al
     * iframe de vista previa, así no hay petición HTTP de una imagen oculta.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forPublicMenu(): array
    {
        return self::with([
            'items' => function ($q) {
                $q->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name');
            },
            // Bug real encontrado: MenuItem::getImageUrlAttribute() SOLO
            // consulta primaryImage/images cuando esa relación ya viene
            // cargada (relationLoaded()) — nunca hace lazy-load, a propósito,
            // para no disparar una consulta por cada platillo. Sin cargar
            // aquí estas dos relaciones, CUALQUIER platillo cuya foto se
            // subió desde la galería de varias imágenes (el dropzone
            // "Imágenes del platillo" del formulario completo, que crea
            // filas en menu_item_images y deja el campo legacy `image` en
            // null) se quedaba SIN imagen en el menú público — sin ningún
            // error, la foto simplemente nunca aparecía. El modal rápido
            // "Agregar platillo" del editor visual nunca tocó este bug
            // porque solo usa el campo legacy `image`.
            'items.primaryImage',
            'items.images',
            'decorations' => function ($q) {
                $q->where('is_active', true);
            },
        ])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (self $category) => $category->toPublicArray())
            ->values()
            ->all();
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->assetUrl('image');
    }

    public function getImageMobileUrlAttribute(): ?string
    {
        return $this->assetUrl('image_mobile');
    }

    public function getTitleImageUrlAttribute(): ?string
    {
        return $this->assetUrl('title_image');
    }

    public function getSubtitleImageUrlAttribute(): ?string
    {
        return $this->assetUrl('subtitle_image');
    }

    public function getTaglineImageUrlAttribute(): ?string
    {
        return $this->assetUrl('tagline_image');
    }

    /**
     * Representación usada por el menú público y por la vista previa del
     * CRUD: mismos campos calculados (URLs de imagen) en ambos lugares.
     */
    public function toPublicArray(): array
    {
        return array_merge($this->toArray(), [
            'image_url' => $this->image_url,
            'image_mobile_url' => $this->image_mobile_url,
            'title_image_url' => $this->title_image_url,
            'subtitle_image_url' => $this->subtitle_image_url,
            'tagline_image_url' => $this->tagline_image_url,
            'items' => $this->relationLoaded('items')
                ? $this->items->map(fn (MenuItem $item) => $item->toPublicArray())->values()
                : [],
            'decorations' => $this->relationLoaded('decorations')
                ? $this->decorations->map(fn (MenuDecoration $d) => $d->toPublicArray())->values()
                : [],
        ]);
    }

    private function assetUrl(string $field): ?string
    {
        $path = $this->{$field};

        return $path
            ? Storage::url($path).'?v='.$this->updated_at->timestamp
            : null;
    }
}
