<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    private const IMAGE_DISK_PATH = 'menu/categories';

    public const LAYOUTS = [
        'portada', 'pozole', 'pancita', 'birria', 'fusiones', 'comal',
        'postres', 'bebidas_promo', 'bebidas_tabla', 'destilados', 'grid',
        'promo_full_image',
    ];

    /** Campos de imagen que soportan subir/reemplazar/quitar. */
    private const IMAGE_FIELDS = ['image', 'image_mobile', 'title_image', 'subtitle_image', 'tagline_image'];

    public function index(): Response
    {
        $categories = MenuCategory::withCount('items')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => array_merge($c->toArray(), [
                'image_url' => $c->image_url,
            ]));

        return Inertia::render('Admin/Categories/Index', [
            'categories' => $categories,
            'layouts' => self::LAYOUTS,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Categories/Create', ['layouts' => self::LAYOUTS]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->storeFromRequest($request);

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría creada correctamente.']]);
    }

    /** Misma validación/creación que store(), pero devuelve el modelo en vez
     * de un redirect — reutilizada por MenuEditorController::storeCategory()
     * (el botón "+ Nueva sección" del editor visual). */
    public function storeFromRequest(Request $request): MenuCategory
    {
        $data = $request->validate($this->rules());
        $data = $this->handleUploads($request, $data);

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? ((int) MenuCategory::max('sort_order') + 1);
        $data['layout'] = $data['layout'] ?? 'grid';

        $category = MenuCategory::create($data);
        Cache::flush();

        return $category;
    }

    public function edit(MenuCategory $category): Response
    {
        // 'items.primaryImage'/'items.images' — ver comentario completo en
        // MenuCategory::forPublicMenu(): sin esto, la vista previa en vivo
        // (MenuLivePreview.vue) tampoco mostraría fotos subidas por la
        // galería de varias imágenes.
        $category->load([
            'items' => fn ($q) => $q->orderBy('sort_order')->orderBy('name'),
            'items.primaryImage',
            'items.images',
        ]);

        return Inertia::render('Admin/Categories/Edit', [
            'category' => $category->toPublicArray(),
            'layouts' => self::LAYOUTS,
        ]);
    }

    public function update(Request $request, MenuCategory $category): RedirectResponse
    {
        $data = $request->validate($this->rules());
        $data = $this->handleUploads($request, $data, $category);

        // Edit.vue no envía `sort_order` (el orden se controla arrastrando en
        // el listado) — sin este fallback al valor YA guardado, cada edición
        // normal reseteaba en silencio el orden de la categoría a 0.
        $data['sort_order'] = $data['sort_order'] ?? $category->sort_order;
        $category->update($data);
        Cache::flush();

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría actualizada correctamente.']]);
    }

    public function destroy(MenuCategory $category): RedirectResponse
    {
        foreach (self::IMAGE_FIELDS as $field) {
            if ($category->{$field}) {
                Storage::disk('public')->delete($category->{$field});
            }
        }
        $category->delete();
        Cache::flush();

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría eliminada correctamente.']]);
    }

    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'categories' => 'required|array',
            'categories.*.id' => 'required|integer|exists:menu_categories,id',
            'categories.*.sort_order' => 'required|integer',
        ]);

        foreach ($data['categories'] as $row) {
            MenuCategory::whereKey($row['id'])->update(['sort_order' => $row['sort_order']]);
        }

        Cache::flush();

        return back();
    }

    private function handleUploads(Request $request, array $data, ?MenuCategory $category = null): array
    {
        foreach (self::IMAGE_FIELDS as $field) {
            if ($request->hasFile($field)) {
                if ($category && $category->{$field}) {
                    Storage::disk('public')->delete($category->{$field});
                }
                $data[$field] = $request->file($field)->store(self::IMAGE_DISK_PATH, 'public');
            } elseif ($request->boolean("remove_{$field}") && $category && $category->{$field}) {
                // Quitar sin reemplazar (p. ej. portada móvil o la imagen de
                // una página promocional) — solo aplica cuando no llegó un
                // archivo nuevo para este mismo campo en la misma petición.
                Storage::disk('public')->delete($category->{$field});
                $data[$field] = null;
            }
        }

        return $data;
    }

    private function rules(): array
    {
        $category = request()->route('category');

        return [
            'name' => [
                'required', 'string', 'max:255',
                // Mismo bug de MenuItemController::rules(): `slug` es único
                // en BD pero nunca se validaba aquí — dos categorías con el
                // mismo nombre hacían que MenuCategory::create()/update()
                // lanzaran una UniqueConstraintViolationException sin
                // capturar (500 genérico) en vez de un 422 con el campo
                // exacto.
                function (string $attribute, mixed $value, \Closure $fail) use ($category) {
                    $slug = Str::slug($value);
                    $query = MenuCategory::where('slug', $slug);

                    if ($category instanceof MenuCategory) {
                        $query->whereKeyNot($category->id);
                    }

                    if ($query->exists()) {
                        $fail('Ya existe una categoría con un nombre muy parecido a "'.$value.'". Usa un nombre distinto.');
                    }
                },
            ],
            'description' => 'nullable|string',
            'subtitle' => 'nullable|string|max:120',
            'tagline' => 'nullable|string|max:255',
            'tagline_sub' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:60',
            'color' => 'nullable|string|max:20',
            'color_secondary' => 'nullable|string|max:20',
            'layout' => 'nullable|string|in:'.implode(',', self::LAYOUTS),
            'background_position' => 'nullable|string|max:40',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'image_mobile' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'title_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'subtitle_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'tagline_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'remove_image' => 'nullable|boolean',
            'remove_image_mobile' => 'nullable|boolean',
            'remove_title_image' => 'nullable|boolean',
            'remove_subtitle_image' => 'nullable|boolean',
            'remove_tagline_image' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'show_in_nav' => 'nullable|boolean',
        ];
    }
}
