<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'is_public'];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        return $setting?->value ?? $default;
    }

    public static function set(string $key, mixed $value, string $group = 'general', string $type = 'text'): void
    {
        static::updateOrCreate(['key' => $key], [
            'value' => $value,
            'group' => $group,
            'type' => $type,
        ]);
    }

    public static function allAsArray(): array
    {
        return static::all()->pluck('value', 'key')->toArray();
    }

    public static function byGroup(string $group): array
    {
        return static::where('group', $group)->get()->pluck('value', 'key')->toArray();
    }

    public function getImageUrlAttribute(): ?string
    {
        if (! in_array($this->type, ['image']) || ! $this->value) {
            return null;
        }

        return Storage::url($this->value).'?v='.$this->updated_at->timestamp;
    }
}
