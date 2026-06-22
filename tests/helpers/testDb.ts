import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

let testDb: Database.Database | null = null;
let testDbPath: string;

/**
 * Sets up an in-memory (or temp file) SQLite DB for tests and overrides the
 * module-level db singleton so that the app code uses it during tests.
 */
export function setupTestDb(): Database.Database {
  testDbPath = path.join(os.tmpdir(), `test-tasks-${Date.now()}.db`);

  // Patch config before importing db module
  process.env.DB_PATH = testDbPath;

  const db = new Database(testDbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const migrationSql = fs.readFileSync(
    path.join(__dirname, "../../src/database/migrations/001_create_tasks.sql"),
    "utf-8",
  );
  db.exec(migrationSql);

  testDb = db;
  return db;
}

export function getTestDb(): Database.Database {
  if (!testDb) throw new Error("Test DB not initialized");
  return testDb;
}

export function teardownTestDb(): void {
  testDb?.close();
  testDb = null;
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
}
