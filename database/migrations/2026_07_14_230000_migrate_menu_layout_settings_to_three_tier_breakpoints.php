<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Migración de DATOS (no de esquema): reemplaza los seis breakpoints
     * discretos de Tailwind (base/sm/md/lg/xl/2xl) por las tres vistas
     * configurables del editor (mobile/tablet/desktop) que el menú público
     * ahora interpola de forma continua entre 390/768/1440px. No destructiva:
     * el objeto de breakpoints anterior de cada elemento se conserva íntegro
     * bajo la clave de respaldo `_legacy_breakpoints` (el código público
     * nunca lee esa clave).
     *
     * mobile: base, o sm si no existe base.
     * tablet: md, o el inferior más cercano (base/sm) si no existe md.
     * desktop: xl, o lg, o 2xl (en ese orden) si no existe xl.
     */
    private const LEGACY_KEYS = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

    public function up(): void
    {
        DB::table('menu_items')->whereNotNull('layout_settings')->orderBy('id')->each(function ($item) {
            $this->migrateColumn('menu_items', $item->id, 'layout_settings', $item->layout_settings);
        });

        DB::table('menu_categories')->whereNotNull('visual_settings')->orderBy('id')->each(function ($category) {
            $this->migrateColumn('menu_categories', $category->id, 'visual_settings', $category->visual_settings);
        });
    }

    public function down(): void
    {
        // Reversión best-effort: si el elemento trae respaldo _legacy_breakpoints,
        // se restaura tal cual; si no lo trae (se guardó ya en formato nuevo
        // después de la migración), no hay forma de reconstruir los seis
        // breakpoints originales y el elemento se deja como estaba.
        foreach ([['menu_items', 'layout_settings'], ['menu_categories', 'visual_settings']] as [$table, $column]) {
            DB::table($table)->whereNotNull($column)->orderBy('id')->each(function ($row) use ($table, $column) {
                $settings = json_decode($row->$column, true);

                if (! is_array($settings)) {
                    return;
                }

                $restored = [];

                foreach ($settings as $element => $byBreakpoint) {
                    if (is_array($byBreakpoint) && isset($byBreakpoint['_legacy_breakpoints'])) {
                        $restored[$element] = $byBreakpoint['_legacy_breakpoints'];
                    } elseif (is_array($byBreakpoint)) {
                        $restored[$element] = $byBreakpoint;
                    }
                }

                DB::table($table)->where('id', $row->id)->update([
                    $column => $restored === [] ? null : json_encode($restored),
                ]);
            });
        }
    }

    private function migrateColumn(string $table, int $id, string $column, ?string $raw): void
    {
        $settings = json_decode($raw ?? 'null', true);

        if (! is_array($settings) || $settings === []) {
            return;
        }

        $changed = false;
        $new = [];

        foreach ($settings as $element => $byBreakpoint) {
            if (! is_array($byBreakpoint)) {
                $new[$element] = $byBreakpoint;

                continue;
            }

            if (! $this->hasLegacyKeys($byBreakpoint)) {
                // Ya está en formato mobile/tablet/desktop (o vacío) — se deja tal cual.
                $new[$element] = $byBreakpoint;

                continue;
            }

            $changed = true;
            $migrated = [
                'mobile' => $byBreakpoint['base'] ?? $byBreakpoint['sm'] ?? null,
                'tablet' => $byBreakpoint['md'] ?? $byBreakpoint['base'] ?? $byBreakpoint['sm'] ?? null,
                'desktop' => $byBreakpoint['xl'] ?? $byBreakpoint['lg'] ?? $byBreakpoint['2xl'] ?? null,
            ];

            $elementSettings = array_filter($migrated, fn ($v) => $v !== null);
            $elementSettings['_legacy_breakpoints'] = $byBreakpoint;

            $new[$element] = $elementSettings;
        }

        if (! $changed) {
            return;
        }

        DB::table($table)->where('id', $id)->update([
            $column => json_encode($new),
        ]);
    }

    private function hasLegacyKeys(array $byBreakpoint): bool
    {
        return array_intersect(array_keys($byBreakpoint), self::LEGACY_KEYS) !== [];
    }
};
