<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\SiteSetting;
use App\Support\MenuElementConfigRules;
use App\Support\MenuLayoutZones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
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
            'layouts' => CategoryController::LAYOUTS,
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

    /**
     * "Agregar platillo" rápido del editor visual — misma validación/reglas
     * de negocio que MenuItemController::store() (reutilizada vía
     * storeFromRequest(), nunca duplicada), pero responde JSON en vez de
     * redirigir para que el modal pueda insertar el platillo en la barra
     * lateral y el lienzo sin salir del editor ni recargar la página. El
     * `sort_order` se resuelve solo (MAX+1 de la categoría, ver
     * MenuItemController::nextSortOrder) — un platillo nuevo SIEMPRE se
     * agrega al final, nunca reemplaza ni reordena los que ya existían.
     */
    public function storeItem(Request $request, MenuItemController $menuItems): JsonResponse
    {
        $item = $menuItems->storeFromRequest($request);
        $item->load(['images', 'primaryImage']);

        return response()->json([
            'item' => array_merge($item->toPublicArray(), [
                'has_image' => $item->image !== null || $item->primaryImage !== null,
            ]),
        ], 201);
    }

    /**
     * "Duplicar platillo" — el admin pidió poder copiar los textos/precio de
     * un platillo existente como punto de partida para uno nuevo (en vez de
     * escribir todo desde cero), igual que ya podía duplicar un adorno (ver
     * MenuDecorationController::duplicate, mismo patrón). Comparte la MISMA
     * imagen (legacy `image` + cada fila de `images`, nunca duplica el
     * archivo físico) y copia `layout_settings` (si el original se movió a
     * mano en el editor, la copia nace en la misma posición — el admin
     * puede reacomodarla después). `slug` es único en BD, así que el nombre
     * copiado se desambigua solo si hace falta (copia de una copia, etc.).
     */
    public function duplicateItem(MenuItem $menuItem): JsonResponse
    {
        $menuItem->load('images');

        $name = $menuItem->name.' (copia)';
        $slug = Str::slug($name);
        $suffix = 2;

        while (MenuItem::where('slug', $slug)->exists()) {
            $name = $menuItem->name.' (copia '.$suffix.')';
            $slug = Str::slug($name);
            $suffix++;
        }

        $copy = MenuItem::create([
            'menu_category_id' => $menuItem->menu_category_id,
            'zone' => $menuItem->zone,
            'name' => $name,
            'slug' => $slug,
            'description' => $menuItem->description,
            'price' => $menuItem->price,
            'price_label' => $menuItem->price_label,
            'price_secondary' => $menuItem->price_secondary,
            'price_secondary_label' => $menuItem->price_secondary_label,
            'presentation' => $menuItem->presentation,
            'image' => $menuItem->image,
            'alt_text' => $menuItem->alt_text,
            'image_position_x' => $menuItem->image_position_x,
            'image_position_y' => $menuItem->image_position_y,
            'image_scale' => $menuItem->image_scale,
            'image_fit' => $menuItem->image_fit,
            'image_align' => $menuItem->image_align,
            'visual_size' => $menuItem->visual_size,
            'layout_settings' => $menuItem->layout_settings,
            'badge' => $menuItem->badge,
            'choice_label' => $menuItem->choice_label,
            'choice_label_hidden' => $menuItem->choice_label_hidden,
            'ingredients' => $menuItem->ingredients,
            'ingredients_hidden' => $menuItem->ingredients_hidden,
            'is_featured' => false,
            'is_active' => $menuItem->is_active,
            'image_hidden' => $menuItem->image_hidden,
            'sort_order' => (int) MenuItem::where('menu_category_id', $menuItem->menu_category_id)->max('sort_order') + 1,
        ]);

        foreach ($menuItem->images as $image) {
            $copy->images()->create([
                'image_path' => $image->image_path,
                'alt_text' => $image->alt_text,
                'is_primary' => $image->is_primary,
                'sort_order' => $image->sort_order,
            ]);
        }

        $copy->load(['images', 'primaryImage']);
        Cache::flush();

        return response()->json([
            'item' => array_merge($copy->toPublicArray(), [
                'has_image' => $copy->image !== null || $copy->primaryImage !== null,
            ]),
        ], 201);
    }

    /**
     * "+ Nueva sección" del editor visual — misma validación/reglas de
     * negocio que CategoryController::store() (reutilizada vía
     * storeFromRequest()), pero responde JSON para insertar la sección
     * nueva en la barra lateral sin salir del editor.
     */
    public function storeCategory(Request $request, CategoryController $categories): JsonResponse
    {
        $category = $categories->storeFromRequest($request);

        return response()->json(['category' => $category->toPublicArray()], 201);
    }

    public function updateItemElement(Request $request, MenuItem $menuItem): JsonResponse
    {
        if ($request->boolean('clear')) {
            return $this->clearElement($request, self::ITEM_ELEMENTS, function () use ($menuItem) {
                return [$menuItem->layout_settings ?? [], fn ($settings) => $menuItem->update(['layout_settings' => $settings])];
            }, fn () => $menuItem->fresh()->layout_settings);
        }

        $data = $request->validate(array_merge(
            [
                'element' => ['required', Rule::in(self::ITEM_ELEMENTS)],
                'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            ],
            MenuElementConfigRules::forConfig($request->input('config')),
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
            [
                'element' => ['required', Rule::in(self::CATEGORY_ELEMENTS)],
                'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            ],
            MenuElementConfigRules::forConfig($request->input('config')),
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

    /**
     * Edición rápida de texto de CATEGORÍA desde el editor visual — hoy solo
     * cubre tagline/tagline_sub: el admin pidió poder ELIMINAR un tagline
     * que no quiere (para poner en su lugar un adorno con su propio texto
     * de imagen) sin salir del editor a la pantalla de Categorías. null
     * borra el texto por completo (no es un "ocultar por vista" como
     * config.hidden — ver ElementConfig/DISCRETE_FIELDS en types.ts, esto
     * es contenido real de la categoría, igual que updateItemQuick con los
     * campos de un platillo). Al quedar en null, categoryElementKeysFor()
     * (types.ts) deja de listar la clave automáticamente — mismo mecanismo
     * que ya decide title vs title_image, no hace falta un flag aparte.
     */
    public function updateCategoryQuick(Request $request, MenuCategory $category): JsonResponse
    {
        $data = $request->validate([
            'tagline' => 'sometimes|nullable|string|max:255',
            'tagline_sub' => 'sometimes|nullable|string|max:255',
        ]);

        $category->update($data);
        Cache::flush();

        return response()->json($category->fresh()->toPublicArray());
    }

    public function updateItemQuick(Request $request, MenuItem $menuItem): JsonResponse
    {
        $layout = MenuCategory::find($request->input('menu_category_id', $menuItem->menu_category_id))?->layout;
        $allowedZones = MenuLayoutZones::valuesFor($layout);

        $data = $request->validate([
            // Mismo `slug` único de MenuItemController::rules() — un cambio
            // de nombre rápido desde el editor puede colisionar igual que
            // desde el formulario completo, y sin esto también terminaba en
            // una UniqueConstraintViolationException sin capturar.
            'name' => [
                'sometimes', 'required', 'string', 'max:255',
                function (string $attribute, mixed $value, \Closure $fail) use ($menuItem) {
                    if (MenuItem::where('slug', Str::slug($value))->whereKeyNot($menuItem->id)->exists()) {
                        $fail('Ya existe un platillo con un nombre muy parecido a "'.$value.'". Usa un nombre distinto para diferenciarlo.');
                    }
                },
            ],
            'description' => 'nullable|string',
            // 'sometimes' porque este endpoint recibe actualizaciones
            // parciales (un solo campo a la vez, ver updateQuickField en
            // Index.vue) — a diferencia de MenuItemController::rules()
            // (formulario completo, donde 'zone' SIEMPRE se envía y por eso
            // sí puede ser 'required' a secas), aquí exigirlo sin 'sometimes'
            // rompería cualquier edición rápida de OTRO campo (nombre,
            // precio…) en una categoría con zonas, porque 'zone' no viaja en
            // esa petición. Cuando SÍ viaja (el admin edita la zona), sigue
            // sin poder quedar vacía en un layout que la usa para filtrar
            // (ver MenuItemController::rules() para el porqué).
            'zone' => $allowedZones !== [] ? ['sometimes', 'required', Rule::in($allowedZones)] : 'sometimes|nullable|string|max:40',
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
}
