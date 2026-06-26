<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            [
                'name' => 'Dashboard',
                'slug' => 'dashboard',
                'description' => 'Panel principal con métricas y resumen',
                'icon' => 'LayoutDashboard',
                'route' => '/dashboard',
                'permission' => 'dashboard.view',
                'is_enabled' => true,
                'is_core' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Menú',
                'slug' => 'menu',
                'description' => 'Gestión de platillos del restaurante',
                'icon' => 'UtensilsCrossed',
                'route' => '/admin/menu-items',
                'permission' => 'menu.view',
                'is_enabled' => true,
                'is_core' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Categorías',
                'slug' => 'categories',
                'description' => 'Organización del menú por categorías',
                'icon' => 'Tag',
                'route' => '/admin/categories',
                'permission' => 'categories.view',
                'is_enabled' => true,
                'is_core' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Usuarios',
                'slug' => 'users',
                'description' => 'Administración de usuarios del sistema',
                'icon' => 'Users',
                'route' => '/admin/users',
                'permission' => 'users.view',
                'is_enabled' => true,
                'is_core' => false,
                'sort_order' => 4,
            ],
            [
                'name' => 'Roles',
                'slug' => 'roles',
                'description' => 'Gestión de roles y permisos',
                'icon' => 'ShieldCheck',
                'route' => '/admin/roles',
                'permission' => 'roles.view',
                'is_enabled' => true,
                'is_core' => false,
                'sort_order' => 5,
            ],
            [
                'name' => 'Configuración',
                'slug' => 'settings',
                'description' => 'Configuración general del sitio',
                'icon' => 'Settings',
                'route' => '/admin/settings',
                'permission' => 'settings.view',
                'is_enabled' => true,
                'is_core' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'Bolsa de Trabajo',
                'slug' => 'jobs',
                'description' => 'Gestión de la bolsa de trabajo',
                'icon' => 'Briefcase',
                'route' => '/admin/jobs',
                'permission' => 'jobs.view',
                'is_enabled' => true,
                'is_core' => false,
                'sort_order' => 7,
            ],
            [
                'name' => 'Reportes',
                'slug' => 'reports',
                'description' => 'Reportes y estadísticas del sistema',
                'icon' => 'BarChart3',
                'route' => '/admin/reports',
                'permission' => 'reports.view',
                'is_enabled' => false,
                'is_core' => false,
                'sort_order' => 8,
            ],
        ];

        foreach ($modules as $module) {
            Module::firstOrCreate(['slug' => $module['slug']], $module);
        }
    }
}
