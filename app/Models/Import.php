<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Import extends Model
{
    protected $fillable = [
        'original_name','path','status','rows_total','rows_ok','rows_failed','meta','error'
    ];

    protected $casts = ['meta' => 'array'];
}
