<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): Response
    {
        $roles = Role::withCount('users')
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'users_count' => $r->users_count,
                'permissions' => $r->permissions->pluck('name'),
            ]);

        return Inertia::render('Admin/Roles/Index', compact('roles'));
    }

    public function create(): Response
    {
        $permissions = Permission::orderBy('name')->get(['id', 'name']);
        $grouped = $permissions->groupBy(fn ($p) => explode('.', $p->name)[0]);

        return Inertia::render('Admin/Roles/Create', [
            'permissions' => $permissions,
            'groupedPermissions' => $grouped,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $role = Role::create(['name' => $data['name']]);

        if (! empty($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        return redirect()->route('admin.roles.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Rol creado correctamente.']]);
    }

    public function edit(Role $role): Response
    {
        $permissions = Permission::orderBy('name')->get(['id', 'name']);
        $grouped = $permissions->groupBy(fn ($p) => explode('.', $p->name)[0]);

        return Inertia::render('Admin/Roles/Edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ],
            'permissions' => $permissions,
            'groupedPermissions' => $grouped,
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60|unique:roles,name,'.$role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if ($role->name === 'super-admin') {
            return back()->withErrors(['name' => 'No puedes modificar el rol super-admin.']);
        }

        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);

        return redirect()->route('admin.roles.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Rol actualizado correctamente.']]);
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->name === 'super-admin') {
            return back()->withErrors(['general' => 'No puedes eliminar el rol super-admin.']);
        }

        if ($role->users()->count() > 0) {
            return back()->withErrors(['general' => 'No puedes eliminar un rol asignado a usuarios.']);
        }

        $role->delete();

        return redirect()->route('admin.roles.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Rol eliminado correctamente.']]);
    }
}
