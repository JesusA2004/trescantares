<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModuleController extends Controller
{
    public function index(): Response
    {
        $modules = Module::orderBy('sort_order')->get();

        return Inertia::render('Admin/Modules/Index', compact('modules'));
    }

    public function update(Request $request, Module $module): RedirectResponse
    {
        if ($module->is_core) {
            return back()->withErrors(['general' => 'Los módulos core no se pueden desactivar.']);
        }

        $data = $request->validate([
            'is_enabled' => 'required|boolean',
        ]);

        $module->update($data);

        return back()->with('flash', ['toast' => ['type' => 'success', 'message' => 'Módulo actualizado.']]);
    }
}
