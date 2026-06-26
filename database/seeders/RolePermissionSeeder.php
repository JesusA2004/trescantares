<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Dashboard
            'dashboard.view',
            // Menú
            'menu.view', 'menu.create', 'menu.update', 'menu.delete',
            // Categorías
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            // Usuarios
            'users.view', 'users.create', 'users.update', 'users.delete',
            // Roles
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            // Configuración
            'settings.view', 'settings.update',
            // Bolsa de trabajo
            'jobs.view', 'jobs.update',
            // Módulos
            'modules.view', 'modules.update',
            // Reportes
            'reports.view', 'reports.export',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        // Super Admin — todo
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        // Administrador — casi todo, sin eliminar roles/usuarios críticos
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions([
            'dashboard.view',
            'menu.view', 'menu.create', 'menu.update', 'menu.delete',
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            'users.view', 'users.create', 'users.update',
            'roles.view',
            'settings.view', 'settings.update',
            'jobs.view', 'jobs.update',
            'modules.view',
            'reports.view', 'reports.export',
        ]);

        // Editor de menú — solo menú y categorías
        $editor = Role::firstOrCreate(['name' => 'editor']);
        $editor->syncPermissions([
            'dashboard.view',
            'menu.view', 'menu.create', 'menu.update',
            'categories.view', 'categories.create', 'categories.update',
        ]);

        // Recursos Humanos — bolsa de trabajo y consulta
        $rrhh = Role::firstOrCreate(['name' => 'rrhh']);
        $rrhh->syncPermissions([
            'dashboard.view',
            'jobs.view', 'jobs.update',
            'reports.view',
        ]);

        // Consulta — solo lectura
        $viewer = Role::firstOrCreate(['name' => 'viewer']);
        $viewer->syncPermissions([
            'dashboard.view',
            'menu.view',
            'categories.view',
            'reports.view',
        ]);
    }
}
