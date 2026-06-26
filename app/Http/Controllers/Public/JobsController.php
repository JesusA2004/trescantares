<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Inertia\Inertia;
use Inertia\Response;

class JobsController extends Controller
{
    public function index(): Response
    {
        $enabled = SiteSetting::get('jobs_enabled', '0');

        if ($enabled !== '1') {
            abort(404);
        }

        $settings = SiteSetting::allAsArray();

        foreach (['logo', 'hero_background', 'location_background'] as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $settings[$key.'_url'] = $setting?->image_url;
        }

        return Inertia::render('Public/Jobs', compact('settings'));
    }
}
