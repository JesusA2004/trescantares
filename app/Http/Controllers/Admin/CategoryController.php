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
    ];

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
        $data = $request->validate($this->rules());
        $data = $this->handleUploads($request, $data);

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['layout'] = $data['layout'] ?? 'grid';

        MenuCategory::create($data);
        Cache::flush();

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría creada correctamente.']]);
    }

    public function edit(MenuCategory $category): Response
    {
        return Inertia::render('Admin/Categories/Edit', [
            'category' => array_merge($category->toArray(), [
                'image_url' => $category->image_url,
                'title_image_url' => $category->title_image_url,
                'subtitle_image_url' => $category->subtitle_image_url,
                'tagline_image_url' => $category->tagline_image_url,
            ]),
            'layouts' => self::LAYOUTS,
        ]);
    }

    public function update(Request $request, MenuCategory $category): RedirectResponse
    {
        $data = $request->validate($this->rules());
        $data = $this->handleUploads($request, $data, $category);

        $data['sort_order'] = $data['sort_order'] ?? 0;
        $category->update($data);
        Cache::flush();

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría actualizada correctamente.']]);
    }

    public function destroy(MenuCategory $category): RedirectResponse
    {
        foreach (['image', 'title_image', 'subtitle_image', 'tagline_image'] as $field) {
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
        foreach (['image', 'title_image', 'subtitle_image', 'tagline_image'] as $field) {
            if ($request->hasFile($field)) {
                if ($category && $category->{$field}) {
                    Storage::disk('public')->delete($category->{$field});
                }
                $data[$field] = $request->file($field)->store(self::IMAGE_DISK_PATH, 'public');
            }
        }

        return $data;
    }

    private function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
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
            'title_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'subtitle_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'tagline_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ];
    }
}
