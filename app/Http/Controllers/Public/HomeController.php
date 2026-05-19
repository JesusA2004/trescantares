<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $settings = SiteSetting::allAsArray();
        $settings = $this->addImageUrls($settings);

        $featuredItems = MenuItem::with('category')
            ->where('is_active', true)
            ->where('is_featured', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($item) => array_merge($item->toArray(), [
                'image_url' => $item->image_url,
            ]));

        return Inertia::render('Public/Home', compact('settings', 'featuredItems'));
    }

    private function addImageUrls(array $settings): array
    {
        foreach (['logo', 'hero_background', 'location_background'] as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $settings[$key.'_url'] = $setting?->image_url;
        }

        return $settings;
    }
}
