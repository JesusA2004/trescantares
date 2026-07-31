<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\SiteSetting;
use App\Support\MenuLayoutZones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MenuEditorController extends Controller
{
    /**
     * Las tres vistas configurables que ve el administrador. El menú público
     * interpola de forma continua entre estos tres anchos de referencia
     * (390/768/1440px) — ver MENU_BREAKPOINT_WIDTH en types.ts. Tailwind
     * sigue usando sm/md/lg/xl/2xl internamente para la estructura de la
     * página, pero esas clases nunca se exponen como una vista configurable.
     */
    private const BREAKPOINTS = ['mobile', 'tablet', 'desktop'];

    private const ITEM_ELEMENTS = [
        'container', 'image', 'name', 'description', 'price', 'price_label',
        'price_secondary', 'price_secondary_label', 'presentation',
        'ingredients', 'choice_label', 'badge', 'caption_image',
    ];

    private const CATEGORY_ELEMENTS = [
        'title', 'subtitle', 'tagline', 'tagline_sub',
        'title_image', 'subtitle_image', 'tagline_image', 'image',
    ];

    public function index(): Response
    {
        // A diferencia de forPublicMenu() (ver MenuCategory), aquí se cargan
        // TODOS los adornos sin filtrar por is_active — el panel "ADORNOS"
        // de la barra lateral necesita poder listar (y reactivar) los
        // ocultos, aunque el iframe de vista previa (preview(), que sí usa
        // forPublicMenu) no los renderice mientras estén inactivos.
        $categories = MenuCategory::with([
            'items' => fn ($q) => $q->orderBy('sort_order')->orderBy('name'),
            'decorations',
        ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/MenuEditor/Index', [
            'categories' => $categories->map(fn (MenuCategory $c) => $c->toPublicArray())->values(),
        ]);
    }

    /**
     * Vista previa WYSIWYG: renderiza EXACTAMENTE el mismo componente
     * Public/Menu (mismos sub-componentes, mismo app.css, mismas fuentes)
     * que usa el visitante real, con editable=true para que MenuEditableElement
     * active selección/arrastre/redimensionado dentro de este mismo documento
     * (sin iframe anidado ni maquetación aparte — así el WYSIWYG es real).
     */
    public function preview(): Response
    {
        $settings = SiteSetting::allAsArray();

        foreach (['logo', 'hero_background', 'location_background', 'menu_background'] as $key) {
            $setting = SiteSetting::where('key', $key)->first();
            $settings[$key.'_url'] = $setting?->image_url;
        }

        $categories = MenuCategory::forPublicMenu();

        return Inertia::render('Public/Menu', [
            'settings' => $settings,
            'categories' => $categories,
            'editable' => true,
        ]);
    }

    public function updateItemElement(Request $request, MenuItem $menuItem): JsonResponse
    {
        if ($request->boolean('clear')) {
            return $this->clearElement($request, self::ITEM_ELEMENTS, function () use ($menuItem) {
                return [$menuItem->layout_settings ?? [], fn ($settings) => $menuItem->update(['layout_settings' => $settings])];
            }, fn () => $menuItem->fresh()->layout_settings);
        }

        $data = $request->validate(array_merge(
            ['element' => ['required', Rule::in(self::ITEM_ELEMENTS)]],
            $this->configRules(),
        ));

        $settings = $menuItem->layout_settings ?? [];
        $settings[$data['element']][$data['breakpoint']] = $data['config'];

        $menuItem->update(['layout_settings' => $settings]);
        Cache::flush();

        return response()->json(['layout_settings' => $menuItem->layout_settings]);
    }

    public function updateCategoryElement(Request $request, MenuCategory $category): JsonResponse
    {
        if ($request->boolean('clear')) {
            return $this->clearElement($request, self::CATEGORY_ELEMENTS, function () use ($category) {
                return [$category->visual_settings ?? [], fn ($settings) => $category->update(['visual_settings' => $settings])];
            }, fn () => $category->fresh()->visual_settings);
        }

        $data = $request->validate(array_merge(
            ['element' => ['required', Rule::in(self::CATEGORY_ELEMENTS)]],
            $this->configRules(),
        ));

        $settings = $category->visual_settings ?? [];
        $settings[$data['element']][$data['breakpoint']] = $data['config'];

        $category->update(['visual_settings' => $settings]);
        Cache::flush();

        return response()->json(['visual_settings' => $category->visual_settings]);
    }

    /**
     * Alto MÍNIMO forzado a mano de la sección completa (no de un elemento),
     * por vista — null limpia esa vista y vuelve al crecimiento automático
     * (el comportamiento de siempre). Nunca es un tope: el contenido real
     * puede seguir siendo más alto, nunca se recorta (ver min-height en
     * Menu.vue/app.css).
     */
    public function updateCategorySectionHeight(Request $request, MenuCategory $category): JsonResponse
    {
        $data = $request->validate([
            'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            'height' => 'nullable|numeric|min:1|max:20000',
        ]);

        $heights = $category->section_height ?? [];

        if ($data['height'] === null) {
            unset($heights[$data['breakpoint']]);
        } else {
            $heights[$data['breakpoint']] = $data['height'];
        }

        $category->update(['section_height' => $heights === [] ? null : $heights]);
        Cache::flush();

        return response()->json(['section_height' => $category->fresh()->section_height]);
    }

    public function updateItemQuick(Request $request, MenuItem $menuItem): JsonResponse
    {
        $layout = MenuCategory::find($request->input('menu_category_id', $menuItem->menu_category_id))?->layout;
        $allowedZones = MenuLayoutZones::valuesFor($layout);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'zone' => $allowedZones !== [] ? ['nullable', Rule::in($allowedZones)] : 'nullable|string|max:40',
            'price' => 'sometimes|required|numeric|min:0',
            'price_label' => 'nullable|string|max:40',
            'price_secondary' => 'nullable|numeric|min:0',
            'price_secondary_label' => 'nullable|string|max:40',
            'presentation' => 'nullable|string|max:60',
            'choice_label' => 'nullable|string|max:40',
            'choice_label_hidden' => 'sometimes|boolean',
            'ingredients' => 'nullable|string',
            'ingredients_hidden' => 'sometimes|boolean',
            'badge' => 'nullable|string|max:60',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $menuItem->update($data);
        Cache::flush();

        return response()->json($menuItem->fresh()->toPublicArray());
    }

    public function reorderItems(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:menu_items,id',
            'items.*.menu_category_id' => 'required|integer|exists:menu_categories,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($data['items'] as $row) {
            MenuItem::whereKey($row['id'])->update([
                'menu_category_id' => $row['menu_category_id'],
                'sort_order' => $row['sort_order'],
            ]);
        }

        Cache::flush();

        return response()->json(['ok' => true]);
    }

    /**
     * @param  string[]  $allowedElements
     * @param  callable(): array{0: array, 1: callable(array): void}  $loadAndSaver
     * @param  callable(): ?array  $freshSettings
     */
    private function clearElement(Request $request, array $allowedElements, callable $loadAndSaver, callable $freshSettings): JsonResponse
    {
        $data = $request->validate([
            'element' => ['required', Rule::in($allowedElements)],
            'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
        ]);

        [$settings, $save] = $loadAndSaver();
        unset($settings[$data['element']][$data['breakpoint']]);

        if (($settings[$data['element']] ?? []) === []) {
            unset($settings[$data['element']]);
        }

        $save($settings === [] ? null : $settings);
        Cache::flush();

        return response()->json(['settings' => $freshSettings()]);
    }

    private function configRules(): array
    {
        return [
            'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            'config' => 'required|array',
            'config.x' => 'required|numeric|min:-20000|max:20000',
            'config.y' => 'required|numeric|min:-20000|max:20000',
            'config.width' => 'nullable|numeric|min:1|max:20000',
            'config.height' => 'nullable|numeric|min:1|max:20000',
            'config.scale' => 'required|numeric|min:0.1|max:5',
            'config.rotation' => 'required|numeric|min:-360|max:360',
            'config.z_index' => 'required|integer|min:0|max:999',
            'config.locked' => 'nullable|boolean',
            'config.hidden' => 'nullable|boolean',
            'config.font_size' => 'nullable|numeric|min:1|max:400',
            'config.line_height' => 'nullable|numeric|min:0.1|max:10',
            'config.letter_spacing' => 'nullable|numeric|min:-20|max:100',
            'config.align' => ['nullable', Rule::in(['left', 'center', 'right'])],
            'config.max_width' => 'nullable|numeric|min:1|max:20000',
            'config.color' => 'nullable|string|max:30',
            'config.fit' => ['nullable', Rule::in(['contain', 'cover'])],
            'config.object_x' => 'nullable|numeric|min:0|max:100',
            'config.object_y' => 'nullable|numeric|min:0|max:100',
            'config.inner_scale' => 'nullable|numeric|min:0.1|max:5',
        ];
    }
}
