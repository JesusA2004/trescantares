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
        'image', 'title_image', 'subtitle_image', 'tagline_image',
        'icon', 'color', 'color_secondary', 'layout', 'background_position',
        'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
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

    public function getImageUrlAttribute(): ?string
    {
        return $this->assetUrl('image');
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
            'title_image_url' => $this->title_image_url,
            'subtitle_image_url' => $this->subtitle_image_url,
            'tagline_image_url' => $this->tagline_image_url,
            'items' => $this->relationLoaded('items')
                ? $this->items->map(fn (MenuItem $item) => $item->toPublicArray())->values()
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
