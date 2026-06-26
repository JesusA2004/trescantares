<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\JobsAdminController;
use App\Http\Controllers\Admin\MenuItemController;
use App\Http\Controllers\Admin\ModuleController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\JobsController;
use App\Http\Controllers\Public\LocationController;
use App\Http\Controllers\Public\MenuController;
use App\Http\Controllers\Public\PrivacyController;
use Illuminate\Support\Facades\Route;

// Public routes with no-cache
Route::middleware(['prevent-cache'])->group(function () {
    Route::get('/', [HomeController::class, 'index'])->name('home');
    Route::get('/ubicacion', [LocationController::class, 'index'])->name('public.location');
    Route::get('/menu', [MenuController::class, 'index'])->name('public.menu');
    Route::get('/bolsa-de-trabajo', [JobsController::class, 'index'])->name('public.jobs');
    Route::get('/aviso-de-privacidad', [PrivacyController::class, 'index'])->name('public.privacy');
});

// Authenticated dashboard
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

// Admin routes
Route::prefix('admin')->name('admin.')->middleware(['auth', 'verified', 'prevent-cache'])->group(function () {
    Route::resource('categories', CategoryController::class)->except(['show'])
        ->middleware(['permission:categories.view|super-admin', 'module:categories']);

    Route::resource('menu-items', MenuItemController::class)->except(['show'])
        ->middleware(['permission:menu.view|super-admin', 'module:menu']);

    Route::resource('users', UserController::class)->except(['show'])
        ->middleware(['permission:users.view|super-admin', 'module:users']);

    Route::resource('roles', RoleController::class)->except(['show'])
        ->middleware(['permission:roles.view|super-admin', 'module:roles']);

    Route::get('settings', [SettingController::class, 'index'])->name('settings.index')
        ->middleware('permission:settings.view|super-admin');
    Route::post('settings', [SettingController::class, 'update'])->name('settings.update')
        ->middleware('permission:settings.update|super-admin');

    Route::get('modules', [ModuleController::class, 'index'])->name('modules.index')
        ->middleware('permission:modules.view|super-admin');
    Route::patch('modules/{module}', [ModuleController::class, 'update'])->name('modules.update')
        ->middleware('permission:modules.update|super-admin');

    Route::get('reports', [ReportsController::class, 'index'])->name('reports.index')
        ->middleware(['permission:reports.view|super-admin', 'module:reports']);
    Route::get('reports/export/pdf', [ReportsController::class, 'exportPdf'])->name('reports.export.pdf')
        ->middleware(['permission:reports.export|super-admin', 'module:reports']);
    Route::get('reports/export/excel', [ReportsController::class, 'exportExcel'])->name('reports.export.excel')
        ->middleware(['permission:reports.export|super-admin', 'module:reports']);

    Route::get('jobs', [JobsAdminController::class, 'index'])->name('jobs.index')
        ->middleware(['permission:jobs.view|super-admin', 'module:jobs']);
    Route::post('jobs', [JobsAdminController::class, 'update'])->name('jobs.update')
        ->middleware(['permission:jobs.update|super-admin', 'module:jobs']);
});

require __DIR__.'/settings.php';
