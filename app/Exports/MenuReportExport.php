<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class MenuReportExport implements WithMultipleSheets
{
    use Exportable;

    public function __construct(private array $data) {}

    public function sheets(): array
    {
        return [
            new MenuReportResumenSheet($this->data),
            new MenuReportCategoriasSheet($this->data),
            new MenuReportPlatillosSheet($this->data),
            new MenuReportAlertasSheet($this->data),
        ];
    }
}

class MenuReportResumenSheet implements
    \Maatwebsite\Excel\Concerns\FromArray,
    \Maatwebsite\Excel\Concerns\WithTitle,
    \Maatwebsite\Excel\Concerns\WithStyles,
    \Maatwebsite\Excel\Concerns\WithColumnWidths
{
    public function __construct(private array $data) {}

    public function title(): string { return 'Resumen'; }

    public function array(): array
    {
        $s = $this->data['stats'];
        $f = $this->data['filters'];

        return [
            ['REPORTE DEL MENÚ — TRES CANTARES'],
            [''],
            ['Filtros aplicados'],
            ['Mes', $f['month']],
            ['Estado', $f['status'] === 'all' ? 'Todos' : ($f['status'] === 'active' ? 'Solo activos' : 'Solo inactivos')],
            [''],
            ['KPI', 'Valor'],
            ['Total platillos', $s['total_items']],
            ['Platillos activos', $s['active_items']],
            ['Platillos inactivos', $s['inactive_items']],
            ['Destacados', $s['featured_items']],
            ['Sin imagen', $s['without_image']],
            ['Sin precio', $s['without_price']],
            ['Total categorías', $s['total_categories']],
            ['Categorías activas', $s['active_categories']],
            ['Creados este mes', $this->data['createdThisMonth']],
            ['Actualizados este mes', $this->data['updatedThisMonth']],
        ];
    }

    public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '144e8f']]],
            7 => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'dbeafe']]],
        ];
    }

    public function columnWidths(): array
    {
        return ['A' => 30, 'B' => 20];
    }
}

class MenuReportCategoriasSheet implements
    \Maatwebsite\Excel\Concerns\FromArray,
    \Maatwebsite\Excel\Concerns\WithTitle,
    \Maatwebsite\Excel\Concerns\WithHeadings,
    \Maatwebsite\Excel\Concerns\WithStyles,
    \Maatwebsite\Excel\Concerns\WithColumnWidths
{
    public function __construct(private array $data) {}

    public function title(): string { return 'Por Categoría'; }

    public function headings(): array
    {
        return ['Categoría', 'Total', 'Activos', 'Inactivos', 'Destacados', 'Sin Imagen', '% Activo'];
    }

    public function array(): array
    {
        return $this->data['byCategory']->map(fn ($c) => [
            $c['name'],
            $c['total'],
            $c['active'],
            $c['total'] - $c['active'],
            $c['featured'],
            $c['no_image'],
            $c['total'] > 0 ? round(($c['active'] / $c['total']) * 100) . '%' : '0%',
        ])->toArray();
    }

    public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '144e8f']], 'font' => ['color' => ['rgb' => 'FFFFFF'], 'bold' => true]],
        ];
    }

    public function columnWidths(): array
    {
        return ['A' => 28, 'B' => 10, 'C' => 10, 'D' => 10, 'E' => 12, 'F' => 12, 'G' => 12];
    }
}

class MenuReportPlatillosSheet implements
    \Maatwebsite\Excel\Concerns\FromArray,
    \Maatwebsite\Excel\Concerns\WithTitle,
    \Maatwebsite\Excel\Concerns\WithHeadings,
    \Maatwebsite\Excel\Concerns\WithStyles,
    \Maatwebsite\Excel\Concerns\WithColumnWidths
{
    public function __construct(private array $data) {}

    public function title(): string { return 'Platillos'; }

    public function headings(): array
    {
        return ['Nombre', 'Categoría', 'Precio', 'Estado', 'Destacado', 'Última actualización'];
    }

    public function array(): array
    {
        return collect($this->data['recentActivity'])->map(fn ($item) => [
            $item['name'],
            $item['category'] ?? '—',
            '$' . number_format((float) $item['price'], 2),
            $item['is_active'] ? 'Activo' : 'Inactivo',
            $item['is_featured'] ? 'Sí' : 'No',
            $item['updated_at'],
        ])->toArray();
    }

    public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '144e8f']]],
        ];
    }

    public function columnWidths(): array
    {
        return ['A' => 30, 'B' => 20, 'C' => 12, 'D' => 12, 'E' => 12, 'F' => 20];
    }
}

class MenuReportAlertasSheet implements
    \Maatwebsite\Excel\Concerns\FromArray,
    \Maatwebsite\Excel\Concerns\WithTitle,
    \Maatwebsite\Excel\Concerns\WithStyles,
    \Maatwebsite\Excel\Concerns\WithColumnWidths
{
    public function __construct(private array $data) {}

    public function title(): string { return 'Alertas'; }

    public function array(): array
    {
        $s = $this->data['stats'];
        $rows = [['ALERTAS DEL MENÚ'], [''], ['Alerta', 'Cantidad', 'Acción sugerida']];

        if ($s['without_image'] > 0) {
            $rows[] = ['Platillos sin imagen', $s['without_image'], 'Subir imagen para mejorar presentación'];
        }
        if ($s['without_price'] > 0) {
            $rows[] = ['Platillos sin precio', $s['without_price'], 'Asignar precio o desactivar el platillo'];
        }
        if ($s['inactive_items'] > 0) {
            $rows[] = ['Platillos inactivos', $s['inactive_items'], 'Revisar si deben activarse o eliminarse'];
        }
        if (count($rows) === 3) {
            $rows[] = ['Sin alertas', 0, '¡Todo en orden!'];
        }

        return $rows;
    }

    public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 13]],
            3 => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'fef3c7']]],
        ];
    }

    public function columnWidths(): array
    {
        return ['A' => 30, 'B' => 12, 'C' => 40];
    }
}
