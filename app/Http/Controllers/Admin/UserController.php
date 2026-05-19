<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::with('roles')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'roles' => $u->roles->pluck('name'),
                'created_at' => $u->created_at,
            ]);

        return Inertia::render('Admin/Users/Index', compact('users'));
    }

    public function create(): Response
    {
        $roles = Role::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Users/Create', compact('roles'));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'roles' => 'nullable|array',
            'roles.*' => 'exists:roles,name',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        if (! empty($data['roles'])) {
            $user->syncRoles($data['roles']);
        }

        return redirect()->route('admin.users.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Usuario creado correctamente.']]);
    }

    public function edit(User $user): Response
    {
        $roles = Role::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Users/Edit', [
            'editUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
            ],
            'roles' => $roles,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'roles' => 'nullable|array',
            'roles.*' => 'exists:roles,name',
        ]);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            ...($data['password'] ? ['password' => Hash::make($data['password'])] : []),
        ]);

        $superAdminCount = User::role('super-admin')->count();
        $isSuperAdmin = $user->hasRole('super-admin');
        $removingSuperAdmin = $isSuperAdmin && ! in_array('super-admin', $data['roles'] ?? []);

        if ($removingSuperAdmin && $superAdminCount <= 1) {
            return back()->withErrors(['roles' => 'No puedes quitar el rol super-admin al único super-administrador.']);
        }

        $user->syncRoles($data['roles'] ?? []);

        return redirect()->route('admin.users.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Usuario actualizado correctamente.']]);
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->hasRole('super-admin')) {
            $count = User::role('super-admin')->count();
            if ($count <= 1) {
                return back()->withErrors(['general' => 'No puedes eliminar al único super-administrador.']);
            }
        }

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('flash', ['toast' => ['type' => 'success', 'message' => 'Usuario eliminado correctamente.']]);
    }
}
