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

    /** Alterna is_active/image_hidden/ingredients_hidden/choice_label_hidden
     * desde la vista rápida del listado, sin navegar al formulario completo —
     * ninguno borra nada, solo deja de renderizarse en el menú público hasta
     * reactivarse. */
    public function quickVisibility(Request $request, MenuItem $menuItem): JsonResponse
    {
        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'image_hidden' => 'sometimes|boolean',
            'ingredients_hidden' => 'sometimes|boolean',
            'choice_label_hidden' => 'sometimes|boolean',
        ]);

        $menuItem->update($data);
        Cache::flush();

        // fresh(['primaryImage']) — igual que en forPublicMenu(), sin cargar
        // esta relación image_url cae al campo legacy `image` (null en un
        // platillo cuya foto vive solo en la galería de varias imágenes),
        // provocando que la miniatura desapareciera un instante en la lista
        // del admin al alternar visibilidad, aunque la foto siguiera
        // guardada correctamente.
        $fresh = $menuItem->fresh(['primaryImage']);

        return response()->json([
            'item' => array_merge($fresh->toArray(), [
                'image_url' => $fresh->image_url,
                'has_image' => $fresh->image !== null || $fresh->primaryImage !== null,
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
        $this->storeFromRequest($request);

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo creado correctamente.']]);
    }

    /** Misma validación/creación que store(), pero devuelve el modelo en vez
     * de un redirect — reutilizada por MenuEditorController::storeItem() (el
     * modal rápido "Agregar platillo" del editor visual) para no duplicar
     * las reglas de negocio en dos controladores. */
    public function storeFromRequest(Request $request): MenuItem
    {
        $data = $request->validate($this->rules($request));

        if ($request->hasFile('image')) {
            $data['image'] = $this->storeUploadedImage($request->file('image'), $data['alt_text'] ?? null);
        } elseif ($request->filled('image_library_path')) {
            $data['image'] = $this->resolveLibraryPath($request->string('image_library_path'));
        }
        unset($data['image_library_path']);

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? $this->nextSortOrder($data['menu_category_id']);

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

        return $item;
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
        // 'items.primaryImage'/'items.images' — ver comentario completo en
        // MenuCategory::forPublicMenu(): sin esto, la vista previa en vivo
        // de Create.vue/Edit.vue tampoco mostraría fotos subidas por la
        // galería de varias imágenes de los DEMÁS platillos ya existentes.
        return MenuCategory::with([
            'items' => function ($q) {
                $q->where('is_active', true)->orderBy('sort_order')->orderBy('name');
            },
            'items.primaryImage',
            'items.images',
        ])->orderBy('sort_order')->orderBy('name');
    }

    public function update(Request $request, MenuItem $menuItem): RedirectResponse
    {
        $data = $request->validate($this->rules($request, $menuItem));

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

        // Edit.vue nunca envía `sort_order` (el orden se controla arrastrando
        // en el listado, ver Create.vue) — sin este fallback al valor YA
        // guardado, cada edición normal (nombre/precio/descripción) reseteaba
        // en silencio el orden del platillo a 0, empujándolo al frente de su
        // categoría/zona cada vez que se guardaba el formulario completo.
        $data['sort_order'] = $data['sort_order'] ?? $menuItem->sort_order;
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

    /** Siguiente `sort_order` disponible dentro de la categoría — nunca 0 fijo,
     * para que un platillo nuevo se agregue AL FINAL sin empatar con (ni
     * desordenar) los que ya existían. */
    private function nextSortOrder(int $menuCategoryId): int
    {
        return ((int) MenuItem::where('menu_category_id', $menuCategoryId)->max('sort_order')) + 1;
    }

    private function rules(Request $request, ?MenuItem $menuItem = null): array
    {
        $layout = MenuCategory::find($request->input('menu_category_id'))?->layout;
        $allowedZones = MenuLayoutZones::valuesFor($layout);

        return [
            'menu_category_id' => 'required|exists:menu_categories,id',
            // La plantilla (layout) de la categoría decide si `zone` es de
            // verdad obligatoria: los layouts con zonas reales (pozole,
            // pancita, birria, comal, bebidas_tabla, destilados) FILTRAN sus
            // platillos por zona (ver byZone() en cada *Page.vue) — un
            // platillo guardado con zone=null en uno de esos layouts no
            // aparece en NINGUNA parte del menú público (ni su imagen, ni su
            // nombre, nada), sin ningún error visible para el admin. Antes
            // este campo era 'nullable' incluso cuando el layout SÍ tenía
            // zonas, lo que permitía crear platillos invisibles por
            // accidente. Los layouts sin zonas (grid, fusiones, postres,
            // bebidas_promo, portada, promo_full_image) siguen aceptando
            // cualquier texto libre opcional, igual que antes.
            'zone' => $allowedZones !== [] ? ['required', Rule::in($allowedZones)] : 'nullable|string|max:40',
            'name' => [
                'required', 'string', 'max:255',
                // `slug` (derivado de `name`) tiene un índice ÚNICO a nivel de
                // BD (ver migración 2025_01_01_000002) que nunca se validaba
                // aquí — dos platillos con el mismo nombre (en cualquier
                // categoría/zona) hacían que MenuItem::create()/update()
                // lanzaran una UniqueConstraintViolationException sin
                // capturar (500 genérico) en vez de un 422 con el campo
                // exacto. Esto NO tiene relación con `zone`: se confirmó
                // reproduciendo el 500 con dos categorías distintas y el
                // mismo `name`.
                function (string $attribute, mixed $value, \Closure $fail) use ($menuItem) {
                    $slug = Str::slug($value);
                    $query = MenuItem::where('slug', $slug);

                    if ($menuItem) {
                        $query->whereKeyNot($menuItem->id);
                    }

                    if ($query->exists()) {
                        $fail('Ya existe un platillo con un nombre muy parecido a "'.$value.'". Usa un nombre distinto para diferenciarlo.');
                    }
                },
            ],
            'description' => 'nullable|string',
            'badge' => 'nullable|string|max:60',
            'choice_label' => 'nullable|string|max:40',
            'choice_label_hidden' => 'boolean',
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
            'ingredients_hidden' => 'boolean',
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
