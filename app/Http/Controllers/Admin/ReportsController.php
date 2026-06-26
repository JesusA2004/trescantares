<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        $data = $this->buildReportData($request);

        $categories = MenuCategory::orderBy('name')->get(['id', 'name']);

        $availableMonths = MenuItem::selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month")
            ->distinct()
            ->orderBy('month', 'desc')
            ->pluck('month')
            ->toArray();

        if (! in_array($data['filters']['month'], $availableMonths)) {
            array_unshift($availableMonths, $data['filters']['month']);
        }

        return Inertia::render('Admin/Reports/Index', array_merge($data, [
            'categories'     => $categories,
            'availableMonths' => $availableMonths,
        ]));
    }

    public function exportPdf(Request $request): HttpResponse|\Illuminate\Http\RedirectResponse
    {
        if (! class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            return back()->with('flash', ['toast' => ['type' => 'error', 'message' => 'El módulo PDF no está instalado.']]);
        }

        $data = $this->buildReportData($request);
        $data['restaurant_name'] = SiteSetting::get('restaurant_name', 'Tres Cantares');
        $data['generated_at'] = now()->format('d/m/Y H:i');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download('reporte-menu-' . now()->format('Y-m-d') . '.pdf');
    }

    public function exportExcel(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\RedirectResponse
    {
        if (! class_exists(\Maatwebsite\Excel\Facades\Excel::class)) {
            return back()->with('flash', ['toast' => ['type' => 'error', 'message' => 'El módulo Excel no está instalado.']]);
        }

        $data = $this->buildReportData($request);

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\MenuReportExport($data),
            'reporte-menu-' . now()->format('Y-m-d') . '.xlsx'
        );
    }

    private function buildReportData(Request $request): array
    {
        $monthFilter = $request->input('month', now()->format('Y-m'));
        [$year, $month] = explode('-', $monthFilter);

        $categoryFilter = $request->input('category');
        $statusFilter = $request->input('status', 'all');

        $stats = [
            'total_items'       => MenuItem::count(),
            'active_items'      => MenuItem::where('is_active', true)->count(),
            'inactive_items'    => MenuItem::where('is_active', false)->count(),
            'featured_items'    => MenuItem::where('is_featured', true)->count(),
            'without_image'     => MenuItem::whereNull('image')->count(),
            'without_price'     => MenuItem::where('price', 0)->orWhereNull('price')->count(),
            'total_categories'  => MenuCategory::count(),
            'active_categories' => MenuCategory::where('is_active', true)->count(),
        ];

        $createdThisMonth = MenuItem::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count();

        $updatedThisMonth = MenuItem::where(function ($q) use ($year, $month) {
            $q->whereYear('updated_at', $year)->whereMonth('updated_at', $month);
        })->count();

        $byCategory = MenuCategory::withCount([
            'items',
            'items as active_count'   => fn ($q) => $q->where('is_active', true),
            'items as featured_count' => fn ($q) => $q->where('is_featured', true),
            'items as no_image_count' => fn ($q) => $q->whereNull('image'),
        ])
            ->orderByDesc('items_count')
            ->get()
            ->map(fn ($c) => [
                'id'       => $c->id,
                'name'     => $c->name,
                'total'    => $c->items_count,
                'active'   => $c->active_count,
                'featured' => $c->featured_count,
                'no_image' => $c->no_image_count,
            ]);

        $query = MenuItem::with('category')->latest('updated_at');

        if ($categoryFilter) {
            $query->where('menu_category_id', $categoryFilter);
        }

        if ($statusFilter === 'active') {
            $query->where('is_active', true);
        } elseif ($statusFilter === 'inactive') {
            $query->where('is_active', false);
        }

        $recentActivity = $query->limit(50)->get()->map(fn ($item) => [
            'id'           => $item->id,
            'name'         => $item->name,
            'category'     => $item->category?->name,
            'price'        => $item->price,
            'is_active'    => $item->is_active,
            'is_featured'  => $item->is_featured,
            'image_url'    => $item->image_url,
            'updated_at'   => $item->updated_at->format('d/m/Y H:i'),
            'updated_diff' => $item->updated_at->diffForHumans(),
        ]);

        return [
            'stats'            => $stats,
            'createdThisMonth' => $createdThisMonth,
            'updatedThisMonth' => $updatedThisMonth,
            'byCategory'       => $byCategory,
            'recentActivity'   => $recentActivity,
            'filters'          => [
                'month'    => $monthFilter,
                'category' => $categoryFilter,
                'status'   => $statusFilter,
            ],
        ];
    }
}
