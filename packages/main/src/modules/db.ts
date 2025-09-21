    import Database from 'better-sqlite3';
    import fs from 'node:fs';
    import path from 'node:path';
    import { app } from 'electron';

    let _db: Database.Database | null = null;

    export function ensureDb() {
      if (_db) return _db;
      const dbPath = path.join(app.getPath('userData'), 'konistiger.db');
      _db = new Database(dbPath);
      _db.pragma('journal_mode = WAL');
      return _db;
    }

    export function runMigrations(db: Database.Database, migrationsDir: string) {
      db.exec(`CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT DEFAULT (datetime('now')));`);
      const applied = new Set(db.prepare('SELECT name FROM migrations').all().map((r: any) => r.name));
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      let count = 0;
      for (const file of files) {
        if (applied.has(file)) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        db.exec(sql);
        db.prepare('INSERT INTO migrations(name) VALUES (?)').run(file);
        count++;
      }
      return count;
    }

    export function seed(db: Database.Database, migrationsDir: string) {
      // seed logic present in 002_seed.sql; re-run safe due to INSERT OR IGNORE
      const before = db.prepare('SELECT COUNT(*) as c FROM settings').get().c as number;
      const seedSql = fs.readFileSync(path.join(migrationsDir, '002_seed.sql'), 'utf-8');
      db.exec(seedSql);
      const after = db.prepare('SELECT COUNT(*) as c FROM settings').get().c as number;
      return after - before;
    }

    export function exec(db: Database.Database, name: string, args: any) {
      switch (name) {
        case 'upsertSetting':
          return setSetting(args.key, args.value);
        case 'listSettings':
          return db.prepare('SELECT key, value FROM settings').all();
        default:
          throw new Error('Unknown DB exec: ' + name);
      }
    }

    export function getSetting(key: string) {
      const db = ensureDb();
      return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;
    }

    export function setSetting(key: string, value: string) {
      const db = ensureDb();
      db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
      return true;
    }
    