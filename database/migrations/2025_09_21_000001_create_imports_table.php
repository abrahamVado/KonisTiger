<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('imports', function (Blueprint $t) {
            $t->id();
            $t->string('original_name');
            $t->string('path');
            $t->enum('status', ['queued','processing','done','failed'])->default('queued');
            $t->unsignedBigInteger('rows_total')->nullable();
            $t->unsignedBigInteger('rows_ok')->default(0);
            $t->unsignedBigInteger('rows_failed')->default(0);
            $t->text('error')->nullable();
            $t->json('meta')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('imports'); }
};
