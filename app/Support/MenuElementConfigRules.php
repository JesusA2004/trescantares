<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * Reglas de validación de un ElementConfig (posición/tamaño/tipografía/
 * imagen de un elemento del editor visual) — único punto que usan
 * MenuEditorController y MenuDecorationController para las claves
 * 'config'/'config.*', así que la rama V1/V2 se escribe una sola vez en vez
 * de duplicarse (y divergir) en cada controlador.
 *
 * El request declara qué forma envía vía config.coordinate_version: ausente
 * (o cualquier valor != 2) = V1 histórico en px (x/y/width/height, ver
 * ElementConfig en types.ts); 2 = V2 normalizado en % (x_pct/y_pct/
 * width_pct/height_pct, ver ElementConfigV2). Laravel's $request->validate()
 * solo conserva las claves con una regla definida, así que enviar una forma
 * nunca puede colar campos de la otra en lo que se guarda.
 *
 * No incluye 'breakpoint' (cada controlador ya lo declara con su propio
 * `Rule::in(self::BREAKPOINTS)`) — solo las claves bajo 'config'.
 */
class MenuElementConfigRules
{
    /**
     * @param  array<string, mixed>|null  $config  El array crudo 'config'
     *                                              del request (se lee ANTES
     *                                              de validar, solo para
     *                                              decidir la rama V1/V2).
     * @param  bool  $includeTypography  false para adornos (nunca tienen
     *                                    texto) — evita listar reglas para
     *                                    campos que ese controlador nunca usa.
     */
    public static function forConfig(?array $config, bool $includeTypography = true): array
    {
        $isV2 = ($config['coordinate_version'] ?? null) === 2;

        return array_merge(
            $isV2 ? self::positionRulesV2() : self::positionRulesV1(),
            self::sharedRules($includeTypography),
        );
    }

    private static function positionRulesV1(): array
    {
        return [
            'config.x' => 'required|numeric|min:-20000|max:20000',
            'config.y' => 'required|numeric|min:-20000|max:20000',
            'config.width' => 'nullable|numeric|min:1|max:20000',
            'config.height' => 'nullable|numeric|min:1|max:20000',
        ];
    }

    private static function positionRulesV2(): array
    {
        return [
            'config.coordinate_version' => ['required', 'integer', 'in:2'],
            'config.position_mode' => ['required', Rule::in(['flow', 'normalized'])],
            // % del ANCHO del positioning-root — no de 0-100 estricto: un
            // elemento parcial o totalmente fuera del lienzo (ver "Traer a la
            // vista" en Index.vue) es un estado real y válido, no un error.
            'config.x_pct' => 'required|numeric|min:-500|max:500',
            'config.y_pct' => 'required|numeric|min:-500|max:500',
            'config.width_pct' => 'nullable|numeric|min:0|max:500',
            'config.height_pct' => 'nullable|numeric|min:0|max:500',
        ];
    }

    private static function sharedRules(bool $includeTypography): array
    {
        $rules = [
            'config' => 'required|array',
            'config.scale' => 'required|numeric|min:0.1|max:5',
            'config.rotation' => 'required|numeric|min:-360|max:360',
            'config.z_index' => 'required|integer|min:0|max:999',
            'config.locked' => 'nullable|boolean',
            'config.hidden' => 'nullable|boolean',
            'config.opacity' => 'nullable|numeric|min:0|max:1',
            'config.fit' => ['nullable', Rule::in(['contain', 'cover'])],
            'config.object_x' => 'nullable|numeric|min:0|max:100',
            'config.object_y' => 'nullable|numeric|min:0|max:100',
            'config.inner_scale' => 'nullable|numeric|min:0.1|max:5',
        ];

        if ($includeTypography) {
            $rules = array_merge($rules, [
                'config.font_size' => 'nullable|numeric|min:1|max:400',
                'config.line_height' => 'nullable|numeric|min:0.1|max:10',
                'config.letter_spacing' => 'nullable|numeric|min:-20|max:100',
                'config.align' => ['nullable', Rule::in(['left', 'center', 'right'])],
                'config.max_width' => 'nullable|numeric|min:1|max:20000',
                'config.color' => 'nullable|string|max:30',
            ]);
        }

        return $rules;
    }
}
