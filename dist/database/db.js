"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
exports.closeDb = closeDb;
const node_sqlite_1 = require("node:sqlite");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
let _db = null;
function getDb() {
    if (!_db) {
        throw new Error("Database not initialized. Call initDb() first.");
    }
    return _db;
}
function initDb() {
    const dbDir = path_1.default.dirname(config_1.config.db.path);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    _db = new node_sqlite_1.DatabaseSync(config_1.config.db.path);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    runMigrations(_db);
    logger_1.logger.info(`Database initialized at ${config_1.config.db.path}`);
    return _db;
}
function runMigrations(db) {
    const migrationsDir = path_1.default.join(__dirname, "migrations");
    const files = fs_1.default
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
        if (already)
            continue;
        const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), "utf-8");
        db.exec(sql);
        db.prepare("INSERT INTO _migrations (name, ran_at) VALUES (?, ?)").run(file, new Date().toISOString());
        logger_1.logger.info(`Ran migration: ${file}`);
    }
}
function closeDb() {
    _db?.close();
    _db = null;
}
//# sourceMappingURL=db.js.map