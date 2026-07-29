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

        foreach (['logo', 'hero_background', 'location_background', 'menu_background'] as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $settings[$key.'_url'] = $setting?->image_url;
        }

        $categories = MenuCategory::forPublicMenu();

        return Inertia::render('Public/Menu', compact('settings', 'categories'));
    }
}
