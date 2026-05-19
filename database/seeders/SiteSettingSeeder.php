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
            ['key' => 'contact_phone', 'value' => '+52 (55) 1234-5678', 'type' => 'text'],
            ['key' => 'whatsapp_phone', 'value' => '5512345678', 'type' => 'text'],
            ['key' => 'address', 'value' => 'Av. Principal #123, Col. Centro, CDMX', 'type' => 'text'],
            ['key' => 'google_maps_embed_url', 'value' => '', 'type' => 'text'],
            ['key' => 'schedule', 'value' => "Lunes a Jueves: 1:00 pm – 10:00 pm\nViernes y Sábado: 1:00 pm – 12:00 am\nDomingo: 1:00 pm – 8:00 pm", 'type' => 'text'],
            ['key' => 'facebook_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'instagram_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'tiktok_url', 'value' => '#', 'type' => 'text'],
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
