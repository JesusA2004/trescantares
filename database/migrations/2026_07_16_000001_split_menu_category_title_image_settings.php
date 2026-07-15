<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Migración de DATOS (no de esquema): antes, el <img> gráfico de
     * título/subtítulo/tagline de una categoría se renderizaba en la
     * plantilla pública bajo la MISMA clave que su variante de texto
     * ('title', 'subtitle', 'tagline'), mientras que el editor visual
     * agregaba ADEMÁS un control fantasma ('title_image', 'subtitle_image',
     * 'tagline_image') sin ningún elemento real correspondiente en el DOM.
     * Cualquier posición/tamaño que el administrador ya haya guardado para
     * el título gráfico quedó, por ese bug, almacenada bajo la clave de
     * texto — este movimiento la traslada a la clave de imagen correcta
     * (ver PozolePage.vue y hermanas, que ahora sí usan 'title_image' para
     * el <img>).
     *
     * No destructiva: se conserva un respaldo completo del
     * `visual_settings` original de cada categoría tocada bajo la clave
     * reservada `_pre_title_image_split_backup` (el código público nunca la
     * lee). Nunca se sobrescribe una configuración de imagen que YA exista
     * y no sea trivial (todavía sin personalizar) — si el administrador ya
     * había guardado algo real bajo la clave de imagen nueva, eso se
     * conserva intacto y el valor viejo bajo la clave de texto simplemente
     * se descarta de su ubicación incorrecta (queda en el respaldo).
     */
    private const PAIRS = [
        'title' => ['title_image', 'title_image'],
        'subtitle' => ['subtitle_image', 'subtitle_image'],
        'tagline' => ['tagline_image', 'tagline_image'],
    ];

    private const DEVICES = ['mobile', 'tablet', 'desktop'];

    private const BACKUP_KEY = '_pre_title_image_split_backup';

    public function up(): void
    {
        DB::table('menu_categories')->whereNotNull('visual_settings')->orderBy('id')->each(function ($category) {
            $this->migrateCategory($category);
        });
    }

    public function down(): void
    {
        // Reversión best-effort: solo restaura categorías que guardaron el
        // respaldo (ver BACKUP_KEY) — cualquier edición hecha DESPUÉS de la
        // migración bajo las claves *_image ya no puede reconstruirse desde
        // el respaldo, así que esa categoría se deja tal cual.
        DB::table('menu_categories')->whereNotNull('visual_settings')->orderBy('id')->each(function ($category) {
            $settings = json_decode($category->visual_settings ?? 'null', true);

            if (! is_array($settings) || ! array_key_exists(self::BACKUP_KEY, $settings)) {
                return;
            }

            DB::table('menu_categories')->where('id', $category->id)->update([
                'visual_settings' => json_encode($settings[self::BACKUP_KEY]) ?: null,
            ]);
        });
    }

    private function migrateCategory(object $category): void
    {
        $settings = json_decode($category->visual_settings ?? 'null', true);

        if (! is_array($settings) || $settings === []) {
            return;
        }

        $imageAssets = [
            'title' => $category->title_image ?? null,
            'subtitle' => $category->subtitle_image ?? null,
            'tagline' => $category->tagline_image ?? null,
        ];

        $changed = false;

        foreach (self::PAIRS as $textKey => [$imageKey]) {
            // Sin un asset gráfico real para esta categoría, la plantilla
            // pública SIEMPRE renderiza la variante de texto bajo $textKey
            // — no hay nada que trasladar (evita mover, p. ej., un ajuste
            // real de un título de TEXTO a una clave *_image que nunca se
            // usará mientras no exista el gráfico).
            if (! $imageAssets[$textKey]) {
                continue;
            }

            $textSettings = $settings[$textKey] ?? null;

            if (! is_array($textSettings)) {
                continue;
            }

            foreach (self::DEVICES as $device) {
                $oldConfig = $textSettings[$device] ?? null;

                if (! is_array($oldConfig)) {
                    continue;
                }

                $existingImageConfig = $settings[$imageKey][$device] ?? null;

                if (is_array($existingImageConfig) && ! $this->isTrivialConfig($existingImageConfig)) {
                    // Ya hay algo real guardado bajo la clave de imagen para
                    // esta vista — no lo pisa, conserva lo nuevo.
                    continue;
                }

                if (! $changed) {
                    // Respaldo del blob ORIGINAL completo, una sola vez,
                    // antes de la primera mutación real de esta categoría.
                    $settings[self::BACKUP_KEY] = json_decode($category->visual_settings, true);
                }

                $settings[$imageKey][$device] = $oldConfig;
                unset($settings[$textKey][$device]);
                $changed = true;
            }

            if (($settings[$textKey] ?? []) === []) {
                unset($settings[$textKey]);
            }
        }

        if (! $changed) {
            return;
        }

        DB::table('menu_categories')->where('id', $category->id)->update([
            'visual_settings' => json_encode($settings),
        ]);
    }

    /** "Trivial" = indistinguible de una config nunca personalizada. */
    private function isTrivialConfig(array $config): bool
    {
        $defaults = [
            'x' => 0,
            'y' => 0,
            'width' => null,
            'height' => null,
            'scale' => 1,
            'rotation' => 0,
            'z_index' => 1,
        ];

        foreach ($defaults as $field => $default) {
            $value = $config[$field] ?? $default;

            if ($value != $default) { // @phpstan-ignore-line loose por num/str mixtos de json
                return false;
            }
        }

        if (! empty($config['locked'])) {
            return false;
        }

        $extraFields = array_diff(array_keys($config), array_keys($defaults), ['locked']);

        foreach ($extraFields as $field) {
            if ($config[$field] !== null) {
                return false;
            }
        }

        return true;
    }
};
