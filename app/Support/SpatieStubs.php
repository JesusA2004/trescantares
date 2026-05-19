<?php

/**
 * Minimal Spatie Permission stubs loaded ONLY when the real package is not installed.
 * Remove this file after running: composer require spatie/laravel-permission
 */

namespace Spatie\Permission\Traits;

if (!trait_exists('Spatie\Permission\Traits\HasRoles')) {
    trait HasRoles
    {
        public function roles(): \Illuminate\Database\Eloquent\Relations\MorphToMany
        {
            return $this->morphToMany(
                config('permission.models.role', 'Spatie\Permission\Models\Role'),
                'model',
                config('permission.table_names.model_has_roles', 'model_has_roles'),
                'model_id',
                'role_id'
            );
        }

        public function permissions(): \Illuminate\Database\Eloquent\Relations\MorphToMany
        {
            return $this->morphToMany(
                config('permission.models.permission', 'Spatie\Permission\Models\Permission'),
                'model',
                config('permission.table_names.model_has_permissions', 'model_has_permissions'),
                'model_id',
                'permission_id'
            );
        }

        public function hasRole(string|array $roles): bool { return false; }
        public function hasAnyRole(string|array $roles): bool { return false; }
        public function hasAllRoles(string|array $roles): bool { return false; }
        public function hasPermissionTo(string $permission): bool { return false; }
        public function hasDirectPermission(string $permission): bool { return false; }
        public function hasAnyPermission(string|array $permissions): bool { return false; }
        public function assignRole(string|array $roles): static { return $this; }
        public function removeRole(string $role): static { return $this; }
        public function syncRoles(string|array $roles): static { return $this; }
        public function givePermissionTo(string|array $permissions): static { return $this; }
        public function revokePermissionTo(string $permission): static { return $this; }
        public function syncPermissions(string|array $permissions): static { return $this; }
        public function getRoleNames(): \Illuminate\Support\Collection { return collect(); }
    }
}
