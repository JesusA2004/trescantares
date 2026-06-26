<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'restaurant_name', 'value' => 'Tres Cantares', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'contact_phone', 'value' => '777 447 5431', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'whatsapp_phone', 'value' => '527774475431', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'address', 'value' => 'Arq. Pablo González 1, La Santísima, 62520 Tepoztlán, Mor.', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'google_maps_embed_url', 'value' => '', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'schedule', 'value' => "Lunes, miércoles y domingo: 9:00–20:00 hrs.\nJueves, viernes y sábado: 9:00–22:00 hrs.\nMartes: cerrado", 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'currency', 'value' => 'MXN', 'type' => 'text', 'group' => 'general', 'is_public' => false],
            ['key' => 'timezone', 'value' => 'America/Mexico_City', 'type' => 'text', 'group' => 'general', 'is_public' => false],
            // Social
            ['key' => 'facebook_url', 'value' => 'https://www.facebook.com/share/1CrCrq1MSs/?mibextid=wwXIfr', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'instagram_url', 'value' => 'https://www.instagram.com/trescantares/', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'tiktok_url', 'value' => 'https://www.tiktok.com/@tres.cantares?_r=1&_t=ZS-97GLHhgk5EC', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'billing_url', 'value' => '#', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'privacy_policy_url', 'value' => '/aviso-de-privacidad', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            ['key' => 'jobs_url', 'value' => '/bolsa-de-trabajo', 'type' => 'text', 'group' => 'general', 'is_public' => true],
            // Branding
            ['key' => 'logo', 'value' => null, 'type' => 'image', 'group' => 'branding', 'is_public' => true],
            ['key' => 'favicon', 'value' => null, 'type' => 'image', 'group' => 'branding', 'is_public' => true],
            ['key' => 'hero_background', 'value' => null, 'type' => 'image', 'group' => 'branding', 'is_public' => true],
            ['key' => 'location_background', 'value' => null, 'type' => 'image', 'group' => 'branding', 'is_public' => true],
            // Menú público
            ['key' => 'menu_show_prices', 'value' => '1', 'type' => 'boolean', 'group' => 'menu', 'is_public' => false],
            ['key' => 'menu_intro_text', 'value' => '', 'type' => 'text', 'group' => 'menu', 'is_public' => true],
            // Bolsa de trabajo
            ['key' => 'jobs_whatsapp', 'value' => '527772678443', 'type' => 'text', 'group' => 'jobs', 'is_public' => true],
            ['key' => 'jobs_intro_text', 'value' => '', 'type' => 'text', 'group' => 'jobs', 'is_public' => true],
            ['key' => 'jobs_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'jobs', 'is_public' => false],
            // Legal
            ['key' => 'privacy_policy_text', 'value' => '', 'type' => 'textarea', 'group' => 'legal', 'is_public' => true],
        ];

        foreach ($settings as $setting) {
            SiteSetting::firstOrCreate(['key' => $setting['key']], [
                'value' => $setting['value'],
                'type' => $setting['type'],
                'group' => $setting['group'] ?? 'general',
                'is_public' => $setting['is_public'] ?? false,
            ]);
        }
    }
}
