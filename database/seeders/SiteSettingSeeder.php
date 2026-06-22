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
            ['key' => 'contact_phone', 'value' => '777 447 5431', 'type' => 'text'],
            ['key' => 'whatsapp_phone', 'value' => '527774475431', 'type' => 'text'],
            ['key' => 'address', 'value' => 'Arq. Pablo González 1, La Santísima, 62520 Tepoztlán, Mor.', 'type' => 'text'],
            ['key' => 'google_maps_embed_url', 'value' => '', 'type' => 'text'],
            ['key' => 'schedule', 'value' => "Lunes, miércoles y domingo: 9:00–20:00 hrs.\nJueves, viernes y sábado: 9:00–22:00 hrs.\nMartes: cerrado", 'type' => 'text'],
            ['key' => 'facebook_url', 'value' => 'https://www.facebook.com/share/1CrCrq1MSs/?mibextid=wwXIfr', 'type' => 'text'],
            ['key' => 'instagram_url', 'value' => 'https://www.instagram.com/trescantares/', 'type' => 'text'],
            ['key' => 'tiktok_url', 'value' => 'https://www.tiktok.com/@tres.cantares?_r=1&_t=ZS-97GLHhgk5EC', 'type' => 'text'],
            ['key' => 'billing_url', 'value' => '#', 'type' => 'text'],
            ['key' => 'privacy_policy_url', 'value' => '/aviso-de-privacidad', 'type' => 'text'],
            ['key' => 'jobs_url', 'value' => '/bolsa-de-trabajo', 'type' => 'text'],
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
