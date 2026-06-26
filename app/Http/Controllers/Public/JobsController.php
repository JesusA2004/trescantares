<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobsController extends Controller
{
    public function index(Request $request)
    {
        $enabled = SiteSetting::get('jobs_enabled', '0');

        if ($enabled !== '1') {
            $response = Inertia::render('Public/Maintenance', [
                'title' => 'Bolsa de Trabajo',
                'message' => 'La sección de bolsa de trabajo no está disponible en este momento. Próximamente estaremos de vuelta.',
            ])->toResponse($request);

            $response->setStatusCode(404);

            return $response;
        }

        $settings = SiteSetting::allAsArray();

        foreach (['logo', 'hero_background', 'location_background'] as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $settings[$key.'_url'] = $setting?->image_url;
        }

        return Inertia::render('Public/Jobs', compact('settings'));
    }
}
