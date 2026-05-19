<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MenuItemController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MenuItem::with('category')
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

        $categories = MenuCategory::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/MenuItems/Index', compact('items', 'categories'));
    }

    public function create(): Response
    {
        $categories = MenuCategory::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/MenuItems/Create', compact('categories'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'menu_category_id' => 'required|exists:menu_categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'ingredients' => 'nullable|string',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('menu/items', 'public');
        }

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;

        MenuItem::create($data);
        Cache::flush();

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo creado correctamente.']]);
    }

    public function edit(MenuItem $menuItem): Response
    {
        $categories = MenuCategory::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/MenuItems/Edit', [
            'item' => array_merge($menuItem->toArray(), ['image_url' => $menuItem->image_url]),
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, MenuItem $menuItem): RedirectResponse
    {
        $data = $request->validate([
            'menu_category_id' => 'required|exists:menu_categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'ingredients' => 'nullable|string',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        if ($request->hasFile('image')) {
            if ($menuItem->image) {
                Storage::disk('public')->delete($menuItem->image);
            }
            $data['image'] = $request->file('image')->store('menu/items', 'public');
        }

        $data['sort_order'] = $data['sort_order'] ?? 0;
        $menuItem->update($data);
        Cache::flush();

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo actualizado correctamente.']]);
    }

    public function destroy(MenuItem $menuItem): RedirectResponse
    {
        if ($menuItem->image) {
            Storage::disk('public')->delete($menuItem->image);
        }
        $menuItem->delete();
        Cache::flush();

        return redirect()->route('admin.menu-items.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Platillo eliminado correctamente.']]);
    }
}
