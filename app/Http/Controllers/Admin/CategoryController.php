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
    public function index(): Response
    {
        $categories = MenuCategory::withCount('items')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => array_merge($c->toArray(), [
                'image_url' => $c->image_url,
            ]));

        return Inertia::render('Admin/Categories/Index', compact('categories'));
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Categories/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:60',
            'color' => 'nullable|string|max:20',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('menu/categories', 'public');
        }

        $data['slug'] = Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;

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
            ]),
        ]);
    }

    public function update(Request $request, MenuCategory $category): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:60',
            'color' => 'nullable|string|max:20',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($request->hasFile('image')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $data['image'] = $request->file('image')->store('menu/categories', 'public');
        }

        $data['sort_order'] = $data['sort_order'] ?? 0;
        $category->update($data);
        Cache::flush();

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría actualizada correctamente.']]);
    }

    public function destroy(MenuCategory $category): RedirectResponse
    {
        if ($category->image) {
            Storage::disk('public')->delete($category->image);
        }
        $category->delete();
        Cache::flush();

        return redirect()->route('admin.categories.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Categoría eliminada correctamente.']]);
    }
}
