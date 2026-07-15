<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\JobsAdminController;
use App\Http\Controllers\Admin\MediaLibraryController;
use App\Http\Controllers\Admin\MenuDecorationController;
use App\Http\Controllers\Admin\MenuEditorController;
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

// Registro público deshabilitado
Route::get('/register', fn () => redirect()->route('login'))->name('register');

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
    Route::post('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder')
        ->middleware(['permission:categories.update|super-admin', 'module:categories']);

    Route::resource('menu-items', MenuItemController::class)->except(['show'])
        ->middleware(['permission:menu.view|super-admin', 'module:menu']);
    Route::post('menu-items/reorder', [MenuItemController::class, 'reorder'])->name('menu-items.reorder')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::patch('menu-items/{menuItem}/visibility', [MenuItemController::class, 'quickVisibility'])->name('menu-items.visibility')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::post('menu-items/{menuItem}/restore-image', [MenuItemController::class, 'restoreImage'])->name('menu-items.restore-image')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);

    Route::get('menu-editor', [MenuEditorController::class, 'index'])->name('menu-editor.index')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::get('menu-editor/preview', [MenuEditorController::class, 'preview'])->name('menu-editor.preview')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::patch('menu-editor/items/{menuItem}/element', [MenuEditorController::class, 'updateItemElement'])->name('menu-editor.items.element')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::patch('menu-editor/items/{menuItem}/quick', [MenuEditorController::class, 'updateItemQuick'])->name('menu-editor.items.quick')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::post('menu-editor/items/reorder', [MenuEditorController::class, 'reorderItems'])->name('menu-editor.items.reorder')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::patch('menu-editor/categories/{category}/element', [MenuEditorController::class, 'updateCategoryElement'])->name('menu-editor.categories.element')
        ->middleware(['permission:categories.update|super-admin', 'module:categories']);

    Route::post('menu-decorations', [MenuDecorationController::class, 'store'])->name('menu-decorations.store')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::patch('menu-decorations/{menuDecoration}', [MenuDecorationController::class, 'update'])->name('menu-decorations.update')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::delete('menu-decorations/{menuDecoration}', [MenuDecorationController::class, 'destroy'])->name('menu-decorations.destroy')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::post('menu-decorations/{menuDecoration}/duplicate', [MenuDecorationController::class, 'duplicate'])->name('menu-decorations.duplicate')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::post('menu-decorations/reorder', [MenuDecorationController::class, 'reorder'])->name('menu-decorations.reorder')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::patch('menu-decorations/{menuDecoration}/element', [MenuDecorationController::class, 'updateElement'])->name('menu-decorations.element')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);

    Route::get('media-library', [MediaLibraryController::class, 'index'])->name('media-library.index')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::post('media-library', [MediaLibraryController::class, 'store'])->name('media-library.store')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);
    Route::delete('media-library/{menuMediaAsset}', [MediaLibraryController::class, 'destroy'])->name('media-library.destroy')
        ->middleware(['permission:menu.update|super-admin', 'module:menu']);

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
