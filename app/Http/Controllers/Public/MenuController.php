<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\SiteSetting;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function index(): Response
    {
        $settings = SiteSetting::allAsArray();

        foreach (['logo', 'hero_background', 'location_background'] as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $settings[$key.'_url'] = $setting?->image_url;
        }

        $categories = MenuCategory::with(['items' => function ($q) {
            $q->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($category) {
                return array_merge($category->toArray(), [
                    'image_url' => $category->image_url,
                    'items' => $category->items->map(fn ($item) => array_merge($item->toArray(), [
                        'image_url' => $item->image_url,
                    ])),
                ]);
            });

        return Inertia::render('Public/Menu', compact('settings', 'categories'));
    }
}
