<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'restaurant_name', 'value' => 'Tres Cantares', 'type' => 'text'],
            ['key' => 'contact_phone', 'value' => '+52 777 153 1475', 'type' => 'text'],
            ['key' => 'whatsapp_phone', 'value' => '527771531475', 'type' => 'text'],
            ['key' => 'address', 'value' => 'Pino González 1, La Santísima, 62520 Tepoztlán, Mor.', 'type' => 'text'],
            ['key' => 'google_maps_embed_url', 'value' => '', 'type' => 'text'],
            ['key' => 'schedule', 'value' => 'Lunes a Domingo, 08:00 a 22:00 hrs.', 'type' => 'text'],
            ['key' => 'facebook_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'instagram_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'tiktok_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'billing_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'privacy_policy_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'jobs_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'logo', 'value' => null, 'type' => 'image'],
            ['key' => 'hero_background', 'value' => null, 'type' => 'image'],
            ['key' => 'location_background', 'value' => null, 'type' => 'image'],
        ];

        foreach ($settings as $setting) {
            SiteSetting::firstOrCreate(['key' => $setting['key']], [
                'value' => $setting['value'],
                'type' => $setting['type'],
            ]);
        }
    }
}
