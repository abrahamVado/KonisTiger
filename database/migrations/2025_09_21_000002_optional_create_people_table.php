<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable('people')) {
            Schema::create('people', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->string('name')->nullable()->index();
                $t->string('email')->nullable()->index();
                $t->unsignedSmallInteger('age')->nullable();
                $t->timestamps();
            });
        }
    }
    public function down(): void { Schema::dropIfExists('people'); }
};
