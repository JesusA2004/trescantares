<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuMediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaLibraryController extends Controller
{
    private const IMAGE_DISK_PATH = 'menu/uploads';

    /** Lista la biblioteca de imágenes del menú — usada por el selector
     * "Elegir de biblioteca" tanto en el CRUD de platillos como en el
     * editor visual (adornos, títulos, etc). */
    public function index(): JsonResponse
    {
        $assets = MenuMediaAsset::orderByDesc('created_at')->get()->map(fn (MenuMediaAsset $a) => [
            'id' => $a->id,
            'disk_path' => $a->disk_path,
            'url' => $a->url,
            'original_name' => $a->original_name,
            'width' => $a->width,
            'height' => $a->height,
            'alt_text' => $a->alt_text,
        ]);

        return response()->json(['assets' => $assets]);
    }

    /** Sube un archivo nuevo a la biblioteca (sin asignarlo todavía a ningún
     * platillo/categoría/adorno) — valida tipo, peso y dimensiones mínimas,
     * y genera un nombre de archivo único vía Storage::store(). */
    public function store(Request $request): JsonResponse
    {
        // Mensajes explícitos en español — sin esto, Laravel devuelve el
        // texto de validación en inglés (locale por defecto de la app) y el
        // admin solo ve un error genérico sin saber si fue el tamaño, el
        // tipo de archivo o las dimensiones.
        $request->validate([
            'file' => 'required|image|mimes:jpg,jpeg,png,webp|max:6144|dimensions:min_width=20,min_height=20',
            'alt_text' => 'nullable|string|max:255',
        ], [
            'file.required' => 'Selecciona una imagen para subir.',
            'file.image' => 'El archivo no es una imagen válida.',
            'file.mimes' => 'Solo se admiten imágenes JPG, PNG o WEBP.',
            'file.max' => 'La imagen pesa demasiado — el máximo es 6MB.',
            'file.dimensions' => 'La imagen es demasiado pequeña (mínimo 20x20 px).',
        ]);

        $file = $request->file('file');
        $path = $file->store(self::IMAGE_DISK_PATH, 'public');
        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];

        $asset = MenuMediaAsset::create([
            'disk_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'alt_text' => $request->input('alt_text'),
        ]);

        return response()->json([
            'asset' => [
                'id' => $asset->id,
                'disk_path' => $asset->disk_path,
                'url' => $asset->url,
                'original_name' => $asset->original_name,
                'width' => $asset->width,
                'height' => $asset->height,
                'alt_text' => $asset->alt_text,
            ],
        ], 201);
    }

    /** Borra un asset de la biblioteca — solo físicamente si NADA lo
     * referencia ya; si sigue en uso, devuelve 409 con el detalle de dónde,
     * para que el admin decida (nunca deja una ruta rota). */
    public function destroy(MenuMediaAsset $menuMediaAsset): JsonResponse
    {
        $usages = $menuMediaAsset->usages();

        if ($usages !== []) {
            return response()->json([
                'message' => 'Esta imagen sigue en uso y no se puede borrar.',
                'usages' => $usages,
            ], 409);
        }

        Storage::disk('public')->delete($menuMediaAsset->disk_path);
        $menuMediaAsset->delete();

        return response()->json(['ok' => true]);
    }
}
