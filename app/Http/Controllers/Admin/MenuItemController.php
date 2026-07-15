<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuItemImage;
use App\Models\MenuMediaAsset;
use App\Support\MenuLayoutZones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MenuItemController extends Controller
{
    // Los platillos SEMBRADOS inicialmente (ver ImportMenuCommand) siguen
    // viviendo en 'menu/items' — este disco solo aplica a lo que se sube
    // DESDE el administrador de aquí en adelante (nunca se mezclan ni se
    // versionan en git, ver storage/app/public/.gitignore).
    private const IMAGE_DISK_PATH = 'menu/uploads';

    public function index(Request $request): Response
    {
        $query = MenuItem::with(['category', 'primaryImage'])
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($request->filled('category')) {
            $query->where('menu_category_id', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        // 'visibility' alimenta el filtro rápido del listado: publicado
        // (activo + imagen visible), oculto (inactivo O imagen oculta), o
        // sin imagen (activo pero sin ninguna foto) — ver Index.vue.
        $items = $query->get()->map(fn ($item) => array_merge($item->toArray(), [
            'image_url' => $item->image_url,
            'has_image' => $item->image !== null || $item->primaryImage !== null,
        ]));

        $categories = MenuCategory::orderBy('sort_order')->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/MenuItems/Index', compact('items', 'categories'));
    }

    /** Alterna is_active/image_hidden desde la vista rápida del listado, sin
     * navegar al formulario completo — ninguno de los dos borra nada, solo
     * deja de renderizarse en el menú público hasta reactivarse. */
    public function quickVisibility(Request $request, MenuItem $menuItem): JsonResponse
    {
        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'image_hidden' => 'sometimes|boolean',
        ]);

        $menuItem->update($data);
        Cache::flush();

        return response()->json([
            'item' => array_merge($menuItem->fresh()->toArray(), [
                'image_url' => $menuItem->fresh()->image_url,
                'has_image' => $menuItem->image !== null || $menuItem->primaryImage()->exists(),
            ]),
        ]);
    }

    /** Intercambia `image` <-> `previous_image` — un solo nivel de deshacer
     * no destructivo para cuando se reemplazó una foto por error. */
    public function restoreImage(MenuItem $menuItem): JsonResponse
    {
        abort_unless($menuItem->previous_image, 422, 'No hay una imagen anterior guardada para este platillo.');

        [$current, $previous] = [$menuItem->image, $menuItem->previous_image];
        $menuItem->update(['image' => $previous, 'previous_image' => $current]);
        Cache::flush();

        return response()->json(['item' => array_merge($menuItem->fresh()->toArray(), [
            'image_url' => $menuItem->fresh()->image_url,
        ])]);
    }

    public function create(): Response
    {
        $categories = $this->categoriesForPreview()->where('is_active', true)->get();

        return Inertia::render('Admin/MenuItems/Create', [
            'categories' => $categories->map(fn (MenuCategory $c) => $c->toPublicArray()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules($request));

        if ($request->hasFile('image')) {
            $data['image'] = $this->storeUploadedImage($request->file('image'), $data['alt_text'] ?? null);
        } elseif ($request->filled('image_library_path')) {
            $data['image'] = $this->resolveLibraryPath($request->string('image_library_path'));
        }
        unset($data['image_library_path']);

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;

        $item = MenuItem::create($data);

        if ($request->hasFile('images')) {
            $primaryIndex = (int) ($request->input('primary_image_index', 0));
            $order = 0;
            foreach ($request->file('images') as $idx => $file) {
                $path = $this->storeUploadedImage($file);
                $item->images()->create([
                    'image_path' => $path,
                    'is_primary' => $idx === $primaryIndex,
                    'sort_order' => $order++,
                ]);
            }
        }

        Cache::flush();

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo creado correctamente.']]);
    }

    public function edit(MenuItem $menuItem): Response
    {
        $categories = $this->categoriesForPreview()->get();
        $menuItem->load('images');

        return Inertia::render('Admin/MenuItems/Edit', [
            'item' => array_merge($menuItem->toArray(), [
                'image_url' => $menuItem->image_url,
                'caption_image_url' => $menuItem->caption_image_url,
                'gallery' => $menuItem->images->map(fn ($img) => [
                    'id' => $img->id,
                    'image_url' => $img->image_url,
                    'alt_text' => $img->alt_text,
                    'is_primary' => $img->is_primary,
                    'sort_order' => $img->sort_order,
                ]),
            ]),
            'categories' => $categories->map(fn (MenuCategory $c) => $c->toPublicArray()),
        ]);
    }

    /**
     * Categorías con sus platillos activos, usadas para poblar el selector
     * de categoría/zona y la vista previa en vivo del CRUD.
     */
    private function categoriesForPreview()
    {
        return MenuCategory::with(['items' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('name');
        }])->orderBy('sort_order')->orderBy('name');
    }

    public function update(Request $request, MenuItem $menuItem): RedirectResponse
    {
        $data = $request->validate($this->rules($request));

        if ($request->hasFile('image') || $request->filled('image_library_path')) {
            $newPath = $request->hasFile('image')
                ? $this->storeUploadedImage($request->file('image'), $data['alt_text'] ?? null)
                : $this->resolveLibraryPath($request->string('image_library_path'));

            // La posición/tamaño/ajustes responsive viven en layout_settings
            // (nunca se tocan aquí) — reemplazar la foto NUNCA los pierde.
            // La imagen VIEJA se guarda como `previous_image` (un nivel de
            // deshacer) en vez de borrarse de inmediato; la que YA estaba en
            // previous_image se libera (borra el archivo solo si ningún otro
            // platillo/categoría/adorno la sigue usando).
            if ($menuItem->previous_image && $menuItem->previous_image !== $newPath) {
                MenuMediaAsset::deleteIfUnused($menuItem->previous_image);
            }

            $data['previous_image'] = $menuItem->image;
            $data['image'] = $newPath;
        }
        unset($data['image_library_path']);

        if ($request->hasFile('caption_image')) {
            if ($menuItem->caption_image) {
                MenuMediaAsset::deleteIfUnused($menuItem->caption_image);
            }
            $data['caption_image'] = $this->storeUploadedImage($request->file('caption_image'));
        }

        $data['sort_order'] = $data['sort_order'] ?? 0;
        $menuItem->update($data);

        if (! empty($data['delete_image_ids'])) {
            $toDelete = MenuItemImage::whereIn('id', $data['delete_image_ids'])
                ->where('menu_item_id', $menuItem->id)
                ->get();
            foreach ($toDelete as $img) {
                MenuMediaAsset::deleteIfUnused($img->image_path);
                $img->delete();
            }
        }

        if ($request->filled('primary_image_id')) {
            MenuItemImage::where('menu_item_id', $menuItem->id)->update(['is_primary' => false]);
            MenuItemImage::where('id', $request->integer('primary_image_id'))
                ->where('menu_item_id', $menuItem->id)
                ->update(['is_primary' => true]);
        }

        if ($request->hasFile('new_images')) {
            $maxOrder = $menuItem->images()->max('sort_order') ?? -1;
            $hasPrimary = $menuItem->images()->where('is_primary', true)->exists();

            foreach ($request->file('new_images') as $file) {
                $path = $this->storeUploadedImage($file);
                $menuItem->images()->create([
                    'image_path' => $path,
                    'is_primary' => ! $hasPrimary,
                    'sort_order' => ++$maxOrder,
                ]);
                $hasPrimary = true;
            }
        }

        Cache::flush();

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo actualizado correctamente.']]);
    }

    public function destroy(MenuItem $menuItem): RedirectResponse
    {
        $menuItem->load('images');

        foreach ($menuItem->images as $img) {
            MenuMediaAsset::deleteIfUnused($img->image_path);
        }

        foreach ([$menuItem->image, $menuItem->previous_image, $menuItem->caption_image] as $path) {
            if ($path) {
                MenuMediaAsset::deleteIfUnused($path);
            }
        }

        $menuItem->delete();
        Cache::flush();

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo eliminado correctamente.']]);
    }

    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:menu_items,id',
            'items.*.menu_category_id' => 'required|integer|exists:menu_categories,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($data['items'] as $row) {
            MenuItem::whereKey($row['id'])->update([
                'menu_category_id' => $row['menu_category_id'],
                'sort_order' => $row['sort_order'],
            ]);
        }

        Cache::flush();

        return back();
    }

    private function rules(Request $request): array
    {
        $layout = MenuCategory::find($request->input('menu_category_id'))?->layout;
        $allowedZones = MenuLayoutZones::valuesFor($layout);

        return [
            'menu_category_id' => 'required|exists:menu_categories,id',
            'zone' => $allowedZones !== [] ? ['nullable', Rule::in($allowedZones)] : 'nullable|string|max:40',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'badge' => 'nullable|string|max:60',
            'choice_label' => 'nullable|string|max:40',
            'price' => 'required|numeric|min:0',
            'price_label' => 'nullable|string|max:40',
            'price_secondary' => 'nullable|numeric|min:0',
            'price_secondary_label' => 'nullable|string|max:40',
            'presentation' => 'nullable|string|max:60',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144|dimensions:min_width=20,min_height=20',
            'image_library_path' => 'nullable|string|max:500',
            'caption_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096|dimensions:min_width=20,min_height=20',
            'alt_text' => 'nullable|string|max:255',
            'image_position_x' => 'nullable|integer|min:0|max:100',
            'image_position_y' => 'nullable|integer|min:0|max:100',
            'image_scale' => 'nullable|numeric|min:0.5|max:3',
            'image_fit' => 'nullable|in:cover,contain',
            'image_align' => 'nullable|in:left,center,right',
            'visual_size' => 'nullable|in:sm,md,lg',
            'images.*' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144|dimensions:min_width=20,min_height=20',
            'primary_image_index' => 'nullable|integer',
            'new_images.*' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144|dimensions:min_width=20,min_height=20',
            'delete_image_ids' => 'nullable|array',
            'delete_image_ids.*' => 'integer',
            'primary_image_id' => 'nullable|integer',
            'ingredients' => 'nullable|string',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'image_hidden' => 'boolean',
            'sort_order' => 'nullable|integer',
        ];
    }

    /** Guarda un archivo subido con nombre único (Storage::store ya lo
     * genera) y lo registra en la biblioteca de imágenes del menú para que
     * pueda reutilizarse después sin volver a subirlo. */
    private function storeUploadedImage(\Illuminate\Http\UploadedFile $file, ?string $altText = null): string
    {
        $path = $file->store(self::IMAGE_DISK_PATH, 'public');
        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];

        MenuMediaAsset::updateOrCreate(['disk_path' => $path], [
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'alt_text' => $altText,
        ]);

        return $path;
    }

    /** Valida que una ruta elegida desde la biblioteca exista realmente en
     * el disco público antes de asignarla — nunca guarda una ruta absoluta
     * de Windows ni una ruta arbitraria fuera de storage/app/public. */
    private function resolveLibraryPath(string $path): string
    {
        abort_unless(Storage::disk('public')->exists($path), 422, 'La imagen seleccionada de la biblioteca ya no existe.');

        return $path;
    }
}
