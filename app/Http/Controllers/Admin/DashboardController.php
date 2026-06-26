<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Module;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $totalItems = MenuItem::count();
        $activeItems = MenuItem::where('is_active', true)->count();
        $inactiveItems = $totalItems - $activeItems;
        $featuredItems = MenuItem::where('is_featured', true)->count();
        $totalCategories = MenuCategory::count();
        $activeCategories = MenuCategory::where('is_active', true)->count();
        $totalUsers = User::count();

        $itemsWithoutImage = MenuItem::whereNull('image')->where('is_active', true)->count();
        $itemsWithoutPrice = MenuItem::where('price', 0)->count();
        $categoriesEmpty = MenuCategory::withCount('items')
            ->having('items_count', 0)
            ->count();

        $byCategory = MenuCategory::withCount(['items', 'items as active_items_count' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'name' => $c->name,
                'total' => $c->items_count,
                'active' => $c->active_items_count,
            ]);

        $recentItems = MenuItem::with('category')
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category?->name,
                'price' => $item->price,
                'is_active' => $item->is_active,
                'image_url' => $item->image_url,
                'updated_at' => $item->updated_at->diffForHumans(),
            ]);

        $recentUsers = User::with('roles')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'roles' => $u->roles->pluck('name'),
                'created_at' => $u->created_at->diffForHumans(),
            ]);

        $activeModules = Module::where('is_enabled', true)->count();
        $totalModules = Module::count();

        $rawActivity = MenuItem::selectRaw('DATE(updated_at) as date, COUNT(*) as count')
            ->where('updated_at', '>=', now()->subDays(13)->startOfDay())
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $dailyActivity = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $dailyActivity[] = [
                'label' => now()->subDays($i)->format('d/m'),
                'count' => (int) ($rawActivity->get($date)?->count ?? 0),
            ];
        }

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalItems' => $totalItems,
                'activeItems' => $activeItems,
                'inactiveItems' => $inactiveItems,
                'featuredItems' => $featuredItems,
                'totalCategories' => $totalCategories,
                'activeCategories' => $activeCategories,
                'totalUsers' => $totalUsers,
                'activeModules' => $activeModules,
                'totalModules' => $totalModules,
            ],
            'alerts' => [
                'itemsWithoutImage' => $itemsWithoutImage,
                'itemsWithoutPrice' => $itemsWithoutPrice,
                'categoriesEmpty' => $categoriesEmpty,
            ],
            'byCategory' => $byCategory,
            'recentItems' => $recentItems,
            'recentUsers' => $recentUsers,
            'dailyActivity' => $dailyActivity,
        ]);
    }
}
