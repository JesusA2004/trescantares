<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class JobsAdminController extends Controller
{
    public function index(): Response
    {
        $raw = SiteSetting::allAsArray();

        return Inertia::render('Admin/Jobs/Index', [
            'settings' => [
                'jobs_enabled'     => ($raw['jobs_enabled'] ?? '0') === '1',
                'jobs_whatsapp'    => $raw['jobs_whatsapp'] ?? '',
                'jobs_intro_text'  => $raw['jobs_intro_text'] ?? '',
                'jobs_positions'   => $raw['jobs_positions'] ?? '',
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'jobs_enabled'    => 'nullable|boolean',
            'jobs_whatsapp'   => 'nullable|string|max:25',
            'jobs_intro_text' => 'nullable|string|max:1500',
            'jobs_positions'  => 'nullable|string',
        ]);

        SiteSetting::set('jobs_enabled', $request->boolean('jobs_enabled') ? '1' : '0', 'jobs');
        SiteSetting::set('jobs_whatsapp', $data['jobs_whatsapp'] ?? '', 'jobs');
        SiteSetting::set('jobs_intro_text', $data['jobs_intro_text'] ?? '', 'jobs');
        SiteSetting::set('jobs_positions', $data['jobs_positions'] ?? '', 'jobs');

        Cache::flush();

        return back()->with('flash', ['toast' => ['type' => 'success', 'message' => 'Configuración de bolsa de trabajo guardada.']]);
    }
}
