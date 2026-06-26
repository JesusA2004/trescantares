<?php

namespace App\Http\Middleware;

use App\Models\Module;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string $moduleSlug): Response
    {
        $module = Module::where('slug', $moduleSlug)->first();

        if ($module && ! $module->is_enabled) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return response()->json(['message' => 'Este módulo está desactivado.'], 403);
            }

            return redirect()->route('dashboard')
                ->with('flash', ['toast' => ['type' => 'error', 'message' => 'El módulo "' . $module->name . '" está desactivado.']]);
        }

        return $next($request);
    }
}
