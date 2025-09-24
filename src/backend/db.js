
// /src/backend/db.js
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const DB_DIR = app.getPath("userData");
const DB_PATH = path.join(DB_DIR, "yamato-auth.db");

export function openDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      verified_at   INTEGER,
      created_at    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      user_id   TEXT NOT NULL,
      code      TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, code)
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      user_id   TEXT NOT NULL,
      code      TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}
