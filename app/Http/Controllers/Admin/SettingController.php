<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    private array $imageKeys = ['logo', 'hero_background', 'location_background'];

    private array $textKeys = [
        'restaurant_name', 'contact_phone', 'whatsapp_phone', 'address',
        'google_maps_embed_url', 'schedule', 'facebook_url', 'instagram_url', 'tiktok_url',
        'billing_url', 'privacy_policy_url', 'jobs_url',
    ];

    public function index(): Response
    {
        $settings = SiteSetting::allAsArray();

        $imageUrls = [];
        foreach ($this->imageKeys as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $imageUrls[$key.'_url'] = $setting?->image_url;
        }

        return Inertia::render('Admin/Settings/Index', [
            'settings' => array_merge($settings, $imageUrls),
            'imageKeys' => $this->imageKeys,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $rules = [];
        foreach ($this->textKeys as $key) {
            $rules[$key] = 'nullable|string';
        }
        foreach ($this->imageKeys as $key) {
            $rules[$key] = 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120';
        }

        $request->validate($rules);

        foreach ($this->textKeys as $key) {
            SiteSetting::set($key, $request->input($key));
        }

        foreach ($this->imageKeys as $key) {
            if ($request->hasFile($key)) {
                $existing = SiteSetting::get($key);
                if ($existing) {
                    Storage::disk('public')->delete($existing);
                }
                $path = $request->file($key)->store('site', 'public');
                SiteSetting::updateOrCreate(['key' => $key], ['value' => $path, 'type' => 'image']);
            }
        }

        Cache::flush();

        return redirect()->route('admin.settings.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Configuración guardada correctamente.']]);
    }
}
