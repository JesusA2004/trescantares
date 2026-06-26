<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 11px;
        color: #1f1f1f;
        background: #fff;
        padding: 32px;
    }

    /* Header */
    .pdf-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 3px solid #144e8f;
        padding-bottom: 16px;
        margin-bottom: 20px;
    }
    .pdf-title { font-size: 20px; font-weight: bold; color: #144e8f; }
    .pdf-subtitle { font-size: 11px; color: #666; margin-top: 4px; }
    .pdf-meta { text-align: right; font-size: 10px; color: #666; }
    .pdf-restaurant { font-size: 13px; font-weight: bold; color: #db3465; }

    /* Section title */
    .section-title {
        font-size: 13px;
        font-weight: bold;
        color: #144e8f;
        border-left: 4px solid #144e8f;
        padding-left: 10px;
        margin: 20px 0 12px;
    }

    /* KPI grid */
    .kpi-grid {
        display: table;
        width: 100%;
        border-collapse: separate;
        border-spacing: 8px;
        margin-bottom: 8px;
    }
    .kpi-row { display: table-row; }
    .kpi-cell {
        display: table-cell;
        background: #f8f6f0;
        border: 1px solid #e5e0d4;
        border-top: 3px solid #144e8f;
        border-radius: 6px;
        padding: 12px;
        text-align: center;
        width: 16.6%;
        vertical-align: top;
    }
    .kpi-cell.pink { border-top-color: #db3465; }
    .kpi-cell.green { border-top-color: #079a4a; }
    .kpi-cell.yellow { border-top-color: #eec325; }
    .kpi-value { font-size: 22px; font-weight: bold; color: #144e8f; }
    .kpi-cell.pink .kpi-value { color: #db3465; }
    .kpi-cell.green .kpi-value { color: #079a4a; }
    .kpi-cell.yellow .kpi-value { color: #eec325; }
    .kpi-label { font-size: 9px; color: #666; margin-top: 4px; }

    /* Charts — SVG bar chart */
    .chart-wrap {
        background: #f8f6f0;
        border: 1px solid #e5e0d4;
        border-radius: 6px;
        padding: 14px;
        margin-bottom: 16px;
    }
    .chart-title { font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 10px; }

    .bar-row { margin-bottom: 7px; }
    .bar-label { font-size: 9px; color: #374151; margin-bottom: 2px; }
    .bar-track {
        background: #e5e0d4;
        height: 12px;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }
    .bar-fill {
        height: 100%;
        border-radius: 4px;
        background: #144e8f;
    }
    .bar-fill-inner {
        height: 100%;
        border-radius: 4px;
        background: #079a4a;
    }
    .bar-value { font-size: 9px; color: #666; margin-top: 1px; text-align: right; }

    /* Donut — CSS simulation */
    .donut-wrap { display: flex; align-items: center; gap: 20px; }
    .donut-legend { flex: 1; }
    .legend-item { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 10px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

    /* Table */
    table.data-table { width: 100%; border-collapse: collapse; }
    table.data-table thead tr { background: #144e8f; color: white; }
    table.data-table th { padding: 7px 10px; text-align: left; font-size: 9px; font-weight: bold; }
    table.data-table tbody tr:nth-child(odd) { background: #f8f6f0; }
    table.data-table tbody tr:nth-child(even) { background: #ffffff; }
    table.data-table td { padding: 6px 10px; font-size: 9px; border-bottom: 1px solid #e5e0d4; }
    .badge-green { background: #dcfce7; color: #079a4a; padding: 2px 6px; border-radius: 9px; font-size: 8px; }
    .badge-gray { background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 9px; font-size: 8px; }
    .badge-yellow { background: #fef9c3; color: #a16207; padding: 2px 6px; border-radius: 9px; font-size: 8px; }

    /* Footer */
    .pdf-footer {
        margin-top: 24px;
        padding-top: 12px;
        border-top: 1px solid #e5e0d4;
        font-size: 9px;
        color: #999;
        text-align: center;
    }
</style>
</head>
<body>

<!-- Header -->
<div class="pdf-header">
    <div>
        <div class="pdf-title">Reporte del Menú</div>
        <div class="pdf-subtitle">
            Mes: {{ \Carbon\Carbon::createFromFormat('Y-m', $filters['month'])->locale('es')->isoFormat('MMMM Y') }}
            @if($filters['category']) · Categoría filtrada @endif
            @if($filters['status'] !== 'all') · {{ $filters['status'] === 'active' ? 'Solo activos' : 'Solo inactivos' }} @endif
        </div>
    </div>
    <div class="pdf-meta">
        <div class="pdf-restaurant">{{ $restaurant_name }}</div>
        <div>Generado: {{ $generated_at }}</div>
    </div>
</div>

<!-- KPIs -->
<div class="section-title">Resumen General</div>

<table class="kpi-grid" style="width:100%; border-collapse: separate; border-spacing: 6px;">
<tr>
    <td class="kpi-cell" style="width:16.5%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #144e8f; padding:10px; text-align:center;">
        <div class="kpi-value">{{ $stats['total_items'] }}</div>
        <div class="kpi-label">Total platillos</div>
    </td>
    <td class="kpi-cell green" style="width:16.5%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #079a4a; padding:10px; text-align:center;">
        <div class="kpi-value" style="color:#079a4a;">{{ $stats['active_items'] }}</div>
        <div class="kpi-label">Activos</div>
    </td>
    <td class="kpi-cell pink" style="width:16.5%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #db3465; padding:10px; text-align:center;">
        <div class="kpi-value" style="color:#db3465;">{{ $stats['inactive_items'] }}</div>
        <div class="kpi-label">Inactivos</div>
    </td>
    <td class="kpi-cell yellow" style="width:16.5%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #eec325; padding:10px; text-align:center;">
        <div class="kpi-value" style="color:#a16207;">{{ $stats['featured_items'] }}</div>
        <div class="kpi-label">Destacados</div>
    </td>
    <td class="kpi-cell" style="width:16.5%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #6b7280; padding:10px; text-align:center;">
        <div class="kpi-value" style="color:#6b7280;">{{ $stats['without_image'] }}</div>
        <div class="kpi-label">Sin imagen</div>
    </td>
    <td class="kpi-cell" style="width:16.5%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #f97316; padding:10px; text-align:center;">
        <div class="kpi-value" style="color:#f97316;">{{ $stats['without_price'] }}</div>
        <div class="kpi-label">Sin precio</div>
    </td>
</tr>
</table>

<table style="width:100%; border-collapse:separate; border-spacing:6px; margin-top:6px;">
<tr>
    <td style="width:25%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #144e8f; padding:10px; text-align:center;">
        <div style="font-size:20px; font-weight:bold; color:#144e8f;">{{ $stats['total_categories'] }}</div>
        <div style="font-size:9px; color:#666; margin-top:4px;">Categorías</div>
    </td>
    <td style="width:25%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #079a4a; padding:10px; text-align:center;">
        <div style="font-size:20px; font-weight:bold; color:#079a4a;">{{ $stats['active_categories'] }}</div>
        <div style="font-size:9px; color:#666; margin-top:4px;">Categorías activas</div>
    </td>
    <td style="width:25%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #144e8f; padding:10px; text-align:center;">
        <div style="font-size:20px; font-weight:bold; color:#144e8f;">{{ $createdThisMonth }}</div>
        <div style="font-size:9px; color:#666; margin-top:4px;">Creados este mes</div>
    </td>
    <td style="width:25%; background:#f8f6f0; border:1px solid #e5e0d4; border-top:3px solid #eec325; padding:10px; text-align:center;">
        <div style="font-size:20px; font-weight:bold; color:#a16207;">{{ $updatedThisMonth }}</div>
        <div style="font-size:9px; color:#666; margin-top:4px;">Actualizados este mes</div>
    </td>
</tr>
</table>

<!-- Estado del menú — visual bar -->
@php
    $total = $stats['total_items'];
    $activeW = $total > 0 ? round(($stats['active_items'] / $total) * 100) : 0;
    $inactiveW = $total > 0 ? round(($stats['inactive_items'] / $total) * 100) : 0;
    $featuredW = $total > 0 ? round(($stats['featured_items'] / $total) * 100) : 0;
@endphp

<div class="section-title">Estado del Menú</div>
<div class="chart-wrap">
    <div style="margin-bottom: 8px;">
        <div class="bar-label">Activos ({{ $stats['active_items'] }} de {{ $total }})</div>
        <div class="bar-track"><div class="bar-fill" style="width: {{ $activeW }}%; background: #079a4a;"></div></div>
        <div class="bar-value">{{ $activeW }}%</div>
    </div>
    <div style="margin-bottom: 8px;">
        <div class="bar-label">Inactivos ({{ $stats['inactive_items'] }} de {{ $total }})</div>
        <div class="bar-track"><div class="bar-fill" style="width: {{ $inactiveW }}%; background: #db3465;"></div></div>
        <div class="bar-value">{{ $inactiveW }}%</div>
    </div>
    <div>
        <div class="bar-label">Destacados ({{ $stats['featured_items'] }} de {{ $total }})</div>
        <div class="bar-track"><div class="bar-fill" style="width: {{ $featuredW }}%; background: #eec325;"></div></div>
        <div class="bar-value">{{ $featuredW }}%</div>
    </div>
</div>

<!-- Platillos por categoría -->
<div class="section-title">Platillos por Categoría</div>
@php $maxCat = $byCategory->max('total') ?: 1; @endphp
<div class="chart-wrap">
    @foreach($byCategory as $cat)
    @php
        $barW = round(($cat['total'] / $maxCat) * 100);
        $activeBarW = $cat['total'] > 0 ? round(($cat['active'] / $cat['total']) * 100) : 0;
    @endphp
    <div class="bar-row">
        <div class="bar-label">{{ $cat['name'] }} · {{ $cat['total'] }} platillos · {{ $cat['active'] }} activos · {{ $cat['featured'] }} destacados</div>
        <div class="bar-track" style="height: 10px;">
            <div style="width: {{ $barW }}%; height: 100%; background: #d4cabb; border-radius: 4px; position: relative;">
                <div style="width: {{ $activeBarW }}%; height: 100%; background: #144e8f; border-radius: 4px;"></div>
            </div>
        </div>
    </div>
    @endforeach
</div>

<!-- Tabla detalle -->
<div class="section-title">Platillos ({{ count($recentActivity) }} registros)</div>
<table class="data-table">
    <thead>
        <tr>
            <th>Platillo</th>
            <th>Categoría</th>
            <th style="text-align:right;">Precio</th>
            <th style="text-align:center;">Estado</th>
            <th>Actualizado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($recentActivity as $item)
        <tr>
            <td>
                {{ $item['name'] }}
                @if($item['is_featured']) <span class="badge-yellow">⭐ Destacado</span> @endif
            </td>
            <td>{{ $item['category'] ?? '—' }}</td>
            <td style="text-align:right;">
                ${{ number_format($item['price'], 2) }}
            </td>
            <td style="text-align:center;">
                @if($item['is_active'])
                    <span class="badge-green">Activo</span>
                @else
                    <span class="badge-gray">Inactivo</span>
                @endif
            </td>
            <td>{{ $item['updated_at'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="pdf-footer">
    Reporte generado automáticamente por el sistema de administración de {{ $restaurant_name }} · {{ $generated_at }}
</div>

</body>
</html>
