<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Fuerza la ruta SSR de producción (bootstrap/ssr/app.js) en vez de la del
 * servidor Vite en caliente: si hay un `npm run dev` corriendo en la máquina
 * (public/hot presente), Inertia delega el render SSR a ese proceso ajeno a
 * este test — no queremos que el resultado dependa de un proceso externo que
 * este test no controla ni puede rearrancar. Compartido en Pest.php (no en
 * un solo archivo de test) porque declarar la misma función dos veces en
 * distintos archivos de test fatal-errorea al correr la suite completa.
 */
function forceProductionSsr(): void
{
    \Illuminate\Support\Facades\Vite::useHotFile(storage_path('framework/testing-disabled-hot-file'));
}

/**
 * Inertia\Ssr\SsrState se registra como binding `scoped()`: en producción se
 * reinicia solo porque cada request real pasa por Kernel::terminate(). Dentro
 * de un mismo test de Feature, varias llamadas a $this->get() reutilizan el
 * mismo contenedor y jamás disparan ese terminate(), así que SsrState memoiza
 * el `dispatched=true`/response de la primera petición SSR y las siguientes
 * llamadas a /menu dentro del mismo test nunca vuelven a golpear el servidor
 * SSR. No es un bug de la app — es este artefacto del entorno de test. Llama
 * a esto entre dos `$this->get('/menu')` del mismo test para forzar un
 * render fresco de verdad en el segundo.
 */
function resetSsrStateBetweenRequests(): void
{
    app()->forgetScopedInstances();
}

/** Autentica un super-admin con permisos completos sobre el módulo de menú
 * — usado por los tests de visibilidad de platillos/adornos/biblioteca. */
function actingAsMenuAdmin(): \App\Models\User
{
    test()->seed(\Database\Seeders\RolePermissionSeeder::class);

    $user = \App\Models\User::factory()->create();
    $user->assignRole('super-admin');
    test()->actingAs($user);

    return $user;
}
