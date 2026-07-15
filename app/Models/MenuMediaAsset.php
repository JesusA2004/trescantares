<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class MenuMediaAsset extends Model
{
    protected $fillable = [
        'disk_path',
        'original_name',
        'mime_type',
        'size',
        'width',
        'height',
        'alt_text',
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function getUrlAttribute(): string
    {
        return Storage::url($this->disk_path).'?v='.$this->updated_at->timestamp;
    }

    /**
     * Dónde se está usando este archivo AHORA MISMO — se calcula en caliente
     * (nunca una tabla pivote que podría desincronizarse) para poder avisar
     * "esta imagen está en uso" antes de borrarla físicamente.
     *
     * @return array<int, array{type: string, id: int, label: string}>
     */
    public function usages(): array
    {
        return self::usagesForPath($this->disk_path);
    }

    /**
     * Igual que usages(), pero por ruta directa — reutilizable desde
     * cualquier controlador que borre una imagen (platillos, categorías,
     * adornos) SIN requerir que exista un registro MenuMediaAsset para esa
     * ruta (una imagen puede estar en uso sin haber pasado nunca por el
     * endpoint de subida de la biblioteca).
     *
     * @return array<int, array{type: string, id: int, label: string}>
     */
    public static function usagesForPath(?string $path): array
    {
        if (! $path) {
            return [];
        }

        $usages = [];

        MenuItem::where('image', $path)->orWhere('previous_image', $path)->orWhere('caption_image', $path)
            ->get(['id', 'name'])
            ->each(function (MenuItem $item) use (&$usages) {
                $usages[] = ['type' => 'item', 'id' => $item->id, 'label' => "Platillo: {$item->name}"];
            });

        MenuCategory::where('image', $path)
            ->orWhere('title_image', $path)
            ->orWhere('subtitle_image', $path)
            ->orWhere('tagline_image', $path)
            ->get(['id', 'name'])
            ->each(function (MenuCategory $category) use (&$usages) {
                $usages[] = ['type' => 'category', 'id' => $category->id, 'label' => "Categoría: {$category->name}"];
            });

        MenuDecoration::where('image_path', $path)
            ->get(['id', 'name'])
            ->each(function (MenuDecoration $decoration) use (&$usages) {
                $usages[] = ['type' => 'decoration', 'id' => $decoration->id, 'label' => "Adorno: {$decoration->name}"];
            });

        return $usages;
    }

    /**
     * Borra el archivo físico y su registro SOLO si ya no tiene ninguna
     * referencia — nunca deja un platillo/categoría/adorno con una ruta
     * rota. Devuelve true si borró, false si seguía en uso (y no tocó nada).
     */
    public static function deleteIfUnused(string $path, string $disk = 'public'): bool
    {
        if (self::usagesForPath($path) !== []) {
            return false;
        }

        \Illuminate\Support\Facades\Storage::disk($disk)->delete($path);
        self::where('disk_path', $path)->delete();

        return true;
    }
}
