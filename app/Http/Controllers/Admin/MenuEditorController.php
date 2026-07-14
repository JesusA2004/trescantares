<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Support\MenuLayoutZones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MenuEditorController extends Controller
{
    private const BREAKPOINTS = ['mobile', 'tablet', 'desktop'];

    private const CATEGORY_ELEMENTS = ['title', 'subtitle', 'tagline', 'tagline_image', 'image'];

    public function index(): Response
    {
        $categories = MenuCategory::with(['items' => fn ($q) => $q->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/MenuEditor/Index', [
            'categories' => $categories->map(fn (MenuCategory $c) => $c->toPublicArray())->values(),
        ]);
    }

    public function updateItemLayout(Request $request, MenuItem $menuItem): JsonResponse
    {
        if ($request->boolean('clear')) {
            $breakpoint = $request->validate(['breakpoint' => ['required', Rule::in(self::BREAKPOINTS)]])['breakpoint'];
            $settings = $menuItem->layout_settings ?? [];
            unset($settings[$breakpoint]);
            $menuItem->update(['layout_settings' => $settings === [] ? null : $settings]);
            Cache::flush();

            return response()->json(['layout_settings' => $menuItem->layout_settings]);
        }

        $data = $request->validate($this->breakpointRules());

        $settings = $menuItem->layout_settings ?? [];
        $settings[$data['breakpoint']] = [
            'move_x' => $data['move_x'],
            'move_y' => $data['move_y'],
            'width' => $data['width'],
            'z_index' => $data['z_index'],
        ];

        $menuItem->update(['layout_settings' => $settings]);
        Cache::flush();

        return response()->json(['layout_settings' => $menuItem->layout_settings]);
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

    public function updateCategoryVisualLayout(Request $request, MenuCategory $category): JsonResponse
    {
        if ($request->boolean('clear')) {
            $clearData = $request->validate([
                'element' => ['required', Rule::in(self::CATEGORY_ELEMENTS)],
                'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            ]);
            $settings = $category->visual_settings ?? [];
            unset($settings[$clearData['element']][$clearData['breakpoint']]);

            if (($settings[$clearData['element']] ?? []) === []) {
                unset($settings[$clearData['element']]);
            }

            $category->update(['visual_settings' => $settings === [] ? null : $settings]);
            Cache::flush();

            return response()->json(['visual_settings' => $category->visual_settings]);
        }

        $data = $request->validate(array_merge(
            ['element' => ['required', Rule::in(self::CATEGORY_ELEMENTS)]],
            $this->breakpointRules(),
        ));

        $settings = $category->visual_settings ?? [];
        $element = $data['element'];

        $settings[$element][$data['breakpoint']] = [
            'move_x' => $data['move_x'],
            'move_y' => $data['move_y'],
            'width' => $data['width'],
            'z_index' => $data['z_index'],
        ];

        $category->update(['visual_settings' => $settings]);
        Cache::flush();

        return response()->json(['visual_settings' => $category->visual_settings]);
    }

    private function breakpointRules(): array
    {
        return [
            'breakpoint' => ['required', Rule::in(self::BREAKPOINTS)],
            'move_x' => 'required|numeric|min:-2000|max:2000',
            'move_y' => 'required|numeric|min:-2000|max:2000',
            'width' => 'nullable|numeric|min:5|max:100',
            'z_index' => 'required|integer|min:0|max:999',
        ];
    }
}
