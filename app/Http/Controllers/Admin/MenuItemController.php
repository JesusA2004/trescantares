<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuItemImage;
use App\Support\MenuLayoutZones;
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
    private const IMAGE_DISK_PATH = 'menu/items';

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

        $items = $query->get()->map(fn ($item) => array_merge($item->toArray(), [
            'image_url' => $item->image_url,
        ]));

        $categories = MenuCategory::orderBy('sort_order')->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/MenuItems/Index', compact('items', 'categories'));
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
            $data['image'] = $request->file('image')->store(self::IMAGE_DISK_PATH, 'public');
        }

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;

        $item = MenuItem::create($data);

        if ($request->hasFile('images')) {
            $primaryIndex = (int) ($request->input('primary_image_index', 0));
            $order = 0;
            foreach ($request->file('images') as $idx => $file) {
                $path = $file->store(self::IMAGE_DISK_PATH, 'public');
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

        if ($request->hasFile('image')) {
            if ($menuItem->image) {
                Storage::disk('public')->delete($menuItem->image);
            }
            $data['image'] = $request->file('image')->store(self::IMAGE_DISK_PATH, 'public');
        }

        if ($request->hasFile('caption_image')) {
            if ($menuItem->caption_image) {
                Storage::disk('public')->delete($menuItem->caption_image);
            }
            $data['caption_image'] = $request->file('caption_image')->store(self::IMAGE_DISK_PATH, 'public');
        }

        $data['sort_order'] = $data['sort_order'] ?? 0;
        $menuItem->update($data);

        if (! empty($data['delete_image_ids'])) {
            $toDelete = MenuItemImage::whereIn('id', $data['delete_image_ids'])
                ->where('menu_item_id', $menuItem->id)
                ->get();
            foreach ($toDelete as $img) {
                Storage::disk('public')->delete($img->image_path);
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
                $path = $file->store(self::IMAGE_DISK_PATH, 'public');
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
            Storage::disk('public')->delete($img->image_path);
        }

        if ($menuItem->image) {
            Storage::disk('public')->delete($menuItem->image);
        }

        if ($menuItem->caption_image) {
            Storage::disk('public')->delete($menuItem->caption_image);
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
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144',
            'caption_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'alt_text' => 'nullable|string|max:255',
            'image_position_x' => 'nullable|integer|min:0|max:100',
            'image_position_y' => 'nullable|integer|min:0|max:100',
            'image_scale' => 'nullable|numeric|min:0.5|max:3',
            'image_fit' => 'nullable|in:cover,contain',
            'image_align' => 'nullable|in:left,center,right',
            'visual_size' => 'nullable|in:sm,md,lg',
            'images.*' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144',
            'primary_image_index' => 'nullable|integer',
            'new_images.*' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144',
            'delete_image_ids' => 'nullable|array',
            'delete_image_ids.*' => 'integer',
            'primary_image_id' => 'nullable|integer',
            'ingredients' => 'nullable|string',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ];
    }
}
