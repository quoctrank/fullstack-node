import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { logger } from "../utils/logger";

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}

export function initDb(): DatabaseSync {
  const dbDir = path.dirname(config.db.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new DatabaseSync(config.db.path);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");

  runMigrations(_db);
  logger.info(`Database initialized at ${config.db.path}`);
  return _db;
}

function runMigrations(db: DatabaseSync): void {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      ran_at TEXT NOT NULL
    )
  `);

  for (const file of files) {
    const already = db
      .prepare("SELECT name FROM _migrations WHERE name = ?")
      .get(file);
    if (already) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name, ran_at) VALUES (?, ?)").run(
      file,
      new Date().toISOString(),
    );
    logger.info(`Ran migration: ${file}`);
  }
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
