<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Import;
use App\Jobs\ProcessImport;

class ImportController extends Controller
{
    public function store(Request $req)
    {
        $req->validate([
            'file' => 'required|file|max:307200', // ~300MB; ajusta según servidor
            'type' => 'nullable|in:auto,csv,xlsx',
        ]);

        $file = $req->file('file');
        $path = $file->store('imports');

        $import = Import::create([
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'status' => 'queued',
            'meta' => [
                'client_ext' => $file->getClientOriginalExtension(),
                'hint_type'  => $req->string('type')->toString() ?: 'auto',
            ],
        ]);

        ProcessImport::dispatch($import->id);

        return response()->json([
            'import_id' => $import->id,
            'message'   => 'File queued for processing',
        ], 202);
    }

    public function show(int $id)
    {
        $import = Import::findOrFail($id);
        return response()->json($import);
    }
}
