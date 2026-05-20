<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $settings = SiteSetting::allAsArray();
        $settings = $this->addImageUrls($settings);

        return Inertia::render('Public/Home', compact('settings'));
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
