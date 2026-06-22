<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\MenuItemController;
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
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
});

// Admin routes
Route::prefix('admin')->name('admin.')->middleware(['auth', 'verified', 'prevent-cache'])->group(function () {
    Route::resource('categories', CategoryController::class)->except(['show']);
    Route::resource('menu-items', MenuItemController::class)->except(['show']);
    Route::resource('users', UserController::class)->except(['show']);
    Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
    Route::post('settings', [SettingController::class, 'update'])->name('settings.update');
});

require __DIR__.'/settings.php';
