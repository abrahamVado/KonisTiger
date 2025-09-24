<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ImportController;

Route::post('/imports', [ImportController::class, 'store']);
Route::get('/imports/{id}', [ImportController::class, 'show']);
