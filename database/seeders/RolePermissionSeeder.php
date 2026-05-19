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
            'users.view', 'users.create', 'users.update', 'users.delete',
            'roles.view', 'roles.update',
            'menu.view', 'menu.create', 'menu.update', 'menu.delete',
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            'settings.view', 'settings.update',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions([
            'menu.view', 'menu.create', 'menu.update', 'menu.delete',
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            'users.view', 'settings.view',
        ]);

        $editor = Role::firstOrCreate(['name' => 'editor']);
        $editor->syncPermissions([
            'menu.view', 'menu.create', 'menu.update',
            'categories.view',
        ]);

        $viewer = Role::firstOrCreate(['name' => 'viewer']);
        $viewer->syncPermissions([
            'menu.view', 'categories.view',
        ]);
    }
}
