<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MenuDecoration extends Model
{
    protected $fillable = [
        'menu_category_id',
        'name',
        'image_path',
        'alt_text',
        'is_active',
        'sort_order',
        'visual_settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'visual_settings' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class, 'menu_category_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? Storage::url($this->image_path).'?v='.$this->updated_at->timestamp
            : null;
    }

    /** Clave estable usada por el editor visual y el menú público — NUNCA un
     * índice de array, que se invalidaría al reordenar. */
    public function getElementKeyAttribute(): string
    {
        return "decoration-{$this->id}:image";
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'menu_category_id' => $this->menu_category_id,
            'name' => $this->name,
            'alt_text' => $this->alt_text,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'visual_settings' => $this->visual_settings,
            'image_url' => $this->image_url,
            'element_key' => $this->element_key,
        ];
    }
}
