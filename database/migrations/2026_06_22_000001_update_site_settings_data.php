<?php

use App\Models\SiteSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $updates = [
            'contact_phone'      => '777 447 5431',
            'whatsapp_phone'     => '527774475431',
            'address'            => 'Arq. Pablo González 1, La Santísima, 62520 Tepoztlán, Mor.',
            'schedule'           => "Lunes, miércoles y domingo: 9:00–20:00 hrs.\nJueves, viernes y sábado: 9:00–22:00 hrs.\nMartes: cerrado",
            'privacy_policy_url' => '/aviso-de-privacidad',
            'jobs_url'           => '/bolsa-de-trabajo',
        ];

        foreach ($updates as $key => $value) {
            SiteSetting::where('key', $key)->update(['value' => $value]);
        }
    }

    public function down(): void {}
};
