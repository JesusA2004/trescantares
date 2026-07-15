<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Migración de DATOS (no de esquema): layout_settings/visual_settings ya
     * eran columnas JSON — solo cambia la forma que guardan. Antes: un único
     * "elemento" implícito (la imagen del platillo / el bloque de categoría)
     * con {mobile,tablet,desktop} -> {move_x,move_y,width,z_index}. Ahora:
     * varios elementos independientes (image/name/price/...) cada uno con
     * {base,sm,md,lg,xl,2xl} -> {x,y,width,height,scale,rotation,z_index}.
     * mobile->base, tablet->md, desktop->lg (no se pierde ningún ajuste ya
     * guardado por el editor).
     */
    private const BREAKPOINT_MAP = [
        'mobile' => 'base',
        'tablet' => 'md',
        'desktop' => 'lg',
    ];

    public function up(): void
    {
        DB::table('menu_items')->whereNotNull('layout_settings')->orderBy('id')->each(function ($item) {
            $old = json_decode($item->layout_settings, true);

            if (! is_array($old) || $this->alreadyMigrated($old)) {
                return;
            }

            $imageSettings = [];

            foreach (self::BREAKPOINT_MAP as $oldKey => $newKey) {
                if (isset($old[$oldKey])) {
                    $imageSettings[$newKey] = $this->toElementConfig($old[$oldKey]);
                }
            }

            if ($imageSettings === []) {
                return;
            }

            DB::table('menu_items')->where('id', $item->id)->update([
                'layout_settings' => json_encode(['image' => $imageSettings]),
            ]);
        });

        DB::table('menu_categories')->whereNotNull('visual_settings')->orderBy('id')->each(function ($category) {
            $old = json_decode($category->visual_settings, true);

            if (! is_array($old)) {
                return;
            }

            $new = [];

            foreach ($old as $element => $byOldBreakpoint) {
                if (! is_array($byOldBreakpoint)) {
                    continue;
                }

                // Ya migrado (las claves ya son base/sm/md/lg/xl/2xl): deja tal cual.
                if ($this->alreadyMigrated($byOldBreakpoint)) {
                    $new[$element] = $byOldBreakpoint;

                    continue;
                }

                $elementSettings = [];

                foreach (self::BREAKPOINT_MAP as $oldKey => $newKey) {
                    if (isset($byOldBreakpoint[$oldKey])) {
                        $elementSettings[$newKey] = $this->toElementConfig($byOldBreakpoint[$oldKey]);
                    }
                }

                if ($elementSettings !== []) {
                    $new[$element] = $elementSettings;
                }
            }

            if ($new === []) {
                return;
            }

            DB::table('menu_categories')->where('id', $category->id)->update([
                'visual_settings' => json_encode($new),
            ]);
        });
    }

    public function down(): void
    {
        // Reversión best-effort: toma el primer breakpoint disponible de
        // cada elemento y lo aplana de vuelta a la forma anterior de una
        // sola posición (image únicamente para items). No hay forma de
        // recuperar exactamente el estado previo a la migración de ida.
        DB::table('menu_items')->whereNotNull('layout_settings')->orderBy('id')->each(function ($item) {
            $new = json_decode($item->layout_settings, true);

            if (! is_array($new) || ! isset($new['image']) || ! is_array($new['image'])) {
                return;
            }

            $old = [];
            $reverseMap = array_flip(self::BREAKPOINT_MAP);

            foreach ($new['image'] as $newKey => $config) {
                if (isset($reverseMap[$newKey]) && is_array($config)) {
                    $old[$reverseMap[$newKey]] = $this->toLegacyConfig($config);
                }
            }

            DB::table('menu_items')->where('id', $item->id)->update([
                'layout_settings' => $old === [] ? null : json_encode($old),
            ]);
        });
    }

    private function alreadyMigrated(array $byBreakpoint): bool
    {
        $newKeys = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

        foreach (array_keys($byBreakpoint) as $key) {
            if (in_array($key, $newKeys, true)) {
                return true;
            }
        }

        return false;
    }

    private function toElementConfig(array $legacy): array
    {
        return [
            'x' => $legacy['move_x'] ?? 0,
            'y' => $legacy['move_y'] ?? 0,
            'width' => $legacy['width'] ?? null,
            'height' => null,
            'scale' => 1,
            'rotation' => 0,
            'z_index' => $legacy['z_index'] ?? 1,
        ];
    }

    private function toLegacyConfig(array $config): array
    {
        return [
            'move_x' => $config['x'] ?? 0,
            'move_y' => $config['y'] ?? 0,
            'width' => $config['width'] ?? null,
            'z_index' => $config['z_index'] ?? 1,
        ];
    }
};
