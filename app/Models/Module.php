<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'icon', 'route',
        'permission', 'is_enabled', 'is_core', 'sort_order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'is_core' => 'boolean',
        'sort_order' => 'integer',
    ];

    public static function allEnabled(): \Illuminate\Database\Eloquent\Collection
    {
        return static::where('is_enabled', true)->orderBy('sort_order')->get();
    }
}
