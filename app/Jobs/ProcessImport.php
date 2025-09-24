<?php

namespace App\Jobs;

use App\Models\Import;
use Box\Spout\Reader\Common\Creator\ReaderEntityFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ProcessImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600; // 1h por intento
    public int $tries   = 3;

    public function __construct(public int $importId) {}

    public function handle(): void
    {
        $import = Import::findOrFail($this->importId);
        $import->update(['status' => 'processing', 'error' => null]);

        $path = storage_path('app/'.$import->path);
        if (!is_file($path)) throw new \RuntimeException("File not found: $path");

        $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $hint = $import->meta['hint_type'] ?? 'auto';
        $type = $hint !== 'auto' ? $hint : $ext;

        $reader = match ($type) {
            'xlsx' => ReaderEntityFactory::createXLSXReader(),
            'csv'  => ReaderEntityFactory::createCSVReader(),
            default => throw new \RuntimeException("Unsupported type: .$ext (use CSV/XLSX)"),
        };

        if ($type === 'csv') {
            // Adjust these if needed:
            $reader->setFieldDelimiter(',');
            $reader->setFieldEnclosure('"');
        }

        // DB tuning
        DB::connection()->disableQueryLog();

        $batchSize = 10000; // tune throughput
        $buffer = [];
        $rowsOk = 0; $rowsFailed = 0; $rowsTotal = 0;

        $targetTable = env('IMPORT_TARGET_TABLE', 'people');
        $columns = $this->getTableColumns($targetTable);
        $hasCreated = in_array('created_at', $columns, true);
        $hasUpdated = in_array('updated_at', $columns, true);

        $reader->open($path);
        foreach ($reader->getSheetIterator() as $sheet) {
            $isHeader = true;
            $header = [];
            foreach ($sheet->getRowIterator() as $row) {
                $rowsTotal++;
                $cells = $row->toArray();

                if ($isHeader) {
                    $header = $this->normalizeHeader($cells);
                    $isHeader = false;
                    continue;
                }

                try {
                    $mapped = $this->mapRow($header, $cells, $columns, $hasCreated, $hasUpdated);
                    if ($mapped === null) { $rowsFailed++; continue; }
                    $buffer[] = $mapped;

                    if (count($buffer) >= $batchSize) {
                        $rowsOk += $this->flushBatch($targetTable, $buffer);
                        $buffer = [];
                        $import->update([
                            'rows_ok' => $rowsOk,
                            'rows_failed' => $rowsFailed,
                            'rows_total' => $rowsTotal,
                        ]);
                    }
                } catch (\Throwable $e) {
                    $rowsFailed++;
                }
            }
        }
        $reader->close();

        if ($buffer) $rowsOk += $this->flushBatch($targetTable, $buffer);

        $import->update([
            'status' => 'done',
            'rows_ok' => $rowsOk,
            'rows_failed' => $rowsFailed,
            'rows_total' => $rowsTotal,
        ]);
    }

    private function normalizeHeader(array $h): array
    {
        return array_map(function ($k) {
            $k = is_null($k) ? '' : (string)$k;
            $k = strtolower(trim($k));
            $k = preg_replace('/\s+/', '_', $k);
            $k = preg_replace('/[^a-z0-9_]/', '', $k);
            return $k ?: ('col_'.uniqid());
        }, $h);
    }

    private function mapRow(array $header, array $cells, array $tableCols, bool $hasCreated, bool $hasUpdated): ?array
    {
        // align sizes
        if (count($cells) < count($header)) {
            $cells = array_pad($cells, count($header), null);
        }
        $assoc = array_combine($header, array_map(function($v){
            return $v;
        }, $cells));

        // Keep only keys that exist in target table
        $row = [];
        foreach ($assoc as $k => $v) {
            if (in_array($k, $tableCols, true)) {
                $row[$k] = ($v === '') ? null : $v;
            }
        }
        if (empty($row)) return null;

        $now = now();
        if ($hasCreated && !isset($row['created_at'])) $row['created_at'] = $now;
        if ($hasUpdated && !isset($row['updated_at'])) $row['updated_at'] = $now;
        return $row;
    }

    private function flushBatch(string $table, array $buffer): int
    {
        return DB::transaction(function () use ($table, $buffer) {
            $inserted = 0;
            foreach (array_chunk($buffer, 2000) as $chunk) {
                DB::table($table)->insert($chunk);
                $inserted += count($chunk);
            }
            return $inserted;
        }, 1);
    }

    private function getTableColumns(string $table): array
    {
        // Works for MySQL/MariaDB & Postgres (simple attempt)
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            $rows = DB::select('SELECT COLUMN_NAME as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [$table]);
            return array_map(fn($r) => strtolower($r->c), $rows);
        }
        if ($driver === 'pgsql') {
            $rows = DB::select('SELECT column_name as c FROM information_schema.columns WHERE table_name = ?', [$table]);
            return array_map(fn($r) => strtolower($r->c), $rows);
        }
        // Fallback: common timestamp cols
        return ['created_at','updated_at']; 
    }
}
