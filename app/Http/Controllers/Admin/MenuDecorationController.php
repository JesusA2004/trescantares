<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuDecoration;
use App\Models\MenuMediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class MenuDecorationController extends Controller
{
    private const IMAGE_DISK_PATH = 'menu/decorations';

    private const BREAKPOINTS = ['mobile', 'tablet', 'desktop'];

    /**
     * Crea un adorno subiendo una imagen nueva O reutilizando una ruta ya
     * existente en la biblioteca (`image_library_path`) — nunca ambas a la
     * vez, y nunca duplica el archivo si se reutiliza.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'menu_category_id' => 'required|exists:menu_categories,id',
            'name' => 'required|string|max:120',
            'alt_text' => 'nullable|string|max:255',
            'image' => 'required_without:image_library_path|nullable|image|mimes:jpg,jpeg,png,webp|max:6144|dimensions:min_width=20,min_height=20',
            'image_library_path' => 'required_without:image|nullable|string|max:500',
        ]);

        $imagePath = $this->resolveImagePath($request, $data);

        $maxOrder = MenuDecoration::where('menu_category_id', $data['menu_category_id'])->max('sort_order') ?? -1;

        $decoration = MenuDecoration::create([
            'menu_category_id' => $data['menu_category_id'],
            'name' => $data['name'],
            'image_path' => $imagePath,
            'alt_text' => $data['alt_text'] ?? null,
            'is_active' => true,
            'sort_order' => $maxOrder + 1,
            // Un adorno nuevo debe quedar SIEMPRE por encima de los demás
            // adornos ya existentes de la misma categoría (nunca detrás,
            // nunca empatado con el default) — un solo ancla 'desktop' basta:
            // resolveElementConfig (types.ts) extrapola z_index (campo
            // discreto, nunca interpolado) a CUALQUIER breakpoint sin
            // necesidad de repetirlo en mobile/tablet.
            'visual_settings' => ['desktop' => ['z_index' => $this->nextDecorationZIndex($data['menu_category_id'])]],
        ]);

        Cache::flush();

        return response()->json(['decoration' => $decoration->toPublicArray()], 201);
    }

    public function update(Request $request, MenuDecoration $menuDecoration): JsonResponse
    {
        $data = $request->validate([
            'menu_category_id' => 'sometimes|required|exists:menu_categories,id',
            'name' => 'sometimes|required|string|max:120',
            'alt_text' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144|dimensions:min_width=20,min_height=20',
            'image_library_path' => 'nullable|string|max:500',
        ]);

        if ($request->hasFile('image') || $request->filled('image_library_path')) {
            $oldPath = $menuDecoration->image_path;
            $data['image_path'] = $this->resolveImagePath($request, $data);
            unset($data['image'], $data['image_library_path']);

            $menuDecoration->update($data);

            if ($oldPath && $oldPath !== $menuDecoration->image_path) {
                MenuMediaAsset::deleteIfUnused($oldPath);
            }
        } else {
            unset($data['image'], $data['image_library_path']);
            $menuDecoration->update($data);
        }

        Cache::flush();

        return response()->json(['decoration' => $menuDecoration->fresh()->toPublicArray()]);
    }

    public function destroy(Request $request, MenuDecoration $menuDecoration): JsonResponse
    {
        $path = $menuDecoration->image_path;
        $menuDecoration->delete();

        $fileDeleted = MenuMediaAsset::deleteIfUnused($path);

        Cache::flush();

        return response()->json(['ok' => true, 'file_deleted' => $fileDeleted]);
    }

    public function duplicate(MenuDecoration $menuDecoration): JsonResponse
    {
        $maxOrder = MenuDecoration::where('menu_category_id', $menuDecoration->menu_category_id)->max('sort_order') ?? -1;

        // Comparte la MISMA ruta de imagen — duplicar un adorno nunca
        // duplica el archivo físico.
        $copy = MenuDecoration::create([
            'menu_category_id' => $menuDecoration->menu_category_id,
            'name' => $menuDecoration->name.' (copia)',
            'image_path' => $menuDecoration->image_path,
            'alt_text' => $menuDecoration->alt_text,
            'is_active' => $menuDecoration->is_active,
            'sort_order' => $maxOrder + 1,
            'visual_settings' => $menuDecoration->visual_settings,
        ]);

        Cache::flush();

        return response()->json(['decoration' => $copy->toPublicArray()], 201);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:menu_decorations,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($data['items'] as $row) {
            MenuDecoration::whereKey($row['id'])->update(['sort_order' => $row['sort_order']]);
        }

        Cache::flush();

        return response()->json(['ok' => true]);
    }

    /** Config visual (posición/tamaño/rotación/opacidad/oculto…) por vista —
     * mismo shape ElementConfig/ElementSettings que categorías y platillos. */
    public function updateElement(Request $request, MenuDecoration $menuDecoration): JsonResponse
    {
        if ($request->boolean('clear')) {
            $data = $request->validate([
                'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            ]);

            $settings = $menuDecoration->visual_settings ?? [];
            unset($settings[$data['breakpoint']]);
            $menuDecoration->update(['visual_settings' => $settings === [] ? null : $settings]);
            Cache::flush();

            return response()->json(['visual_settings' => $menuDecoration->fresh()->visual_settings]);
        }

        $data = $request->validate([
            'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            'config' => 'required|array',
            'config.x' => 'required|numeric|min:-20000|max:20000',
            'config.y' => 'required|numeric|min:-20000|max:20000',
            'config.width' => 'nullable|numeric|min:1|max:20000',
            'config.height' => 'nullable|numeric|min:1|max:20000',
            'config.scale' => 'required|numeric|min:0.1|max:5',
            'config.rotation' => 'required|numeric|min:-360|max:360',
            'config.z_index' => 'required|integer|min:0|max:999',
            'config.locked' => 'nullable|boolean',
            'config.hidden' => 'nullable|boolean',
            'config.opacity' => 'nullable|numeric|min:0|max:1',
            'config.fit' => ['nullable', Rule::in(['contain', 'cover'])],
            'config.object_x' => 'nullable|numeric|min:0|max:100',
            'config.object_y' => 'nullable|numeric|min:0|max:100',
            'config.inner_scale' => 'nullable|numeric|min:0.1|max:5',
        ]);

        $settings = $menuDecoration->visual_settings ?? [];
        $settings[$data['breakpoint']] = $data['config'];
        $menuDecoration->update(['visual_settings' => $settings]);
        Cache::flush();

        return response()->json(['visual_settings' => $menuDecoration->fresh()->visual_settings]);
    }

    /** z_index más alto entre los adornos ya existentes de la categoría + 1
     * (mínimo 2, ya que un adorno sin visual_settings resuelve a z_index=1
     * por defaultElementConfig() — el primer adorno creado en una categoría
     * vacía debe empezar por encima de ese default implícito). Revisa las
     * tres vistas de cada adorno existente (no solo 'desktop') porque
     * bringToFront/sendToBack pueden haber personalizado cualquiera. */
    private function nextDecorationZIndex(int $categoryId): int
    {
        $max = 1;

        foreach (MenuDecoration::where('menu_category_id', $categoryId)->get(['visual_settings']) as $sibling) {
            foreach (self::BREAKPOINTS as $breakpoint) {
                $z = $sibling->visual_settings[$breakpoint]['z_index'] ?? null;

                if ($z !== null) {
                    $max = max($max, (int) $z);
                }
            }
        }

        return $max + 1;
    }

    private function resolveImagePath(Request $request, array $data): string
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $path = $file->store(self::IMAGE_DISK_PATH, 'public');

            MenuMediaAsset::updateOrCreate(['disk_path' => $path], [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'width' => @getimagesize($file->getRealPath())[0] ?? null,
                'height' => @getimagesize($file->getRealPath())[1] ?? null,
                'alt_text' => $data['alt_text'] ?? null,
            ]);

            return $path;
        }

        $libraryPath = $data['image_library_path'];
        abort_unless(
            Storage::disk('public')->exists($libraryPath),
            422,
            'La imagen seleccionada de la biblioteca ya no existe.'
        );

        return $libraryPath;
    }
}
