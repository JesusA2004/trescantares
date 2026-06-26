<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuItem extends Model
{
    protected $fillable = [
        'menu_category_id', 'name', 'slug', 'description', 'price',
        'image', 'badge', 'ingredients', 'is_featured', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (MenuItem $item) {
            if (empty($item->slug)) {
                $item->slug = Str::slug($item->name);
            }
        });

        static::updating(function (MenuItem $item) {
            if ($item->isDirty('name') && ! $item->isDirty('slug')) {
                $item->slug = Str::slug($item->name);
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class, 'menu_category_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(MenuItemImage::class)->orderBy('sort_order');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(MenuItemImage::class)->where('is_primary', true);
    }

    public function getImageUrlAttribute(): ?string
    {
        // Use primary image from new table if loaded
        if ($this->relationLoaded('primaryImage') && $this->primaryImage) {
            return Storage::url($this->primaryImage->image_path).'?v='.$this->primaryImage->updated_at->timestamp;
        }

        // Check images relation if loaded
        if ($this->relationLoaded('images')) {
            $primary = $this->images->firstWhere('is_primary', true) ?? $this->images->first();
            if ($primary) {
                return Storage::url($primary->image_path).'?v='.$primary->updated_at->timestamp;
            }
        }

        // Fallback to legacy single image field
        return $this->image
            ? Storage::url($this->image).'?v='.$this->updated_at->timestamp
            : null;
    }
}
