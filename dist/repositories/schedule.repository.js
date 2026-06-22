"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRepository = void 0;
const uuid_1 = require("uuid");
const db_1 = require("../database/db");
const schedule_model_1 = require("../models/schedule.model");
const config_1 = require("../config");
exports.scheduleRepository = {
    create(dto, correlationId) {
        const db = (0, db_1.getDb)();
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const maxRetries = dto.maxRetries ?? config_1.config.retry.defaultMaxRetries;
        const timeoutMs = dto.timeoutMs ?? config_1.config.retry.defaultTimeoutMs;
        db.prepare(`
      INSERT INTO scheduled_tasks
        (id, type, payload, status, schedule_at, cron_expr, idempotency_key, correlation_id,
         retry_count, max_retries, timeout_ms, created_at, updated_at)
      VALUES
        (?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(id, dto.type, JSON.stringify(dto.payload), dto.scheduleAt ?? null, dto.cronExpr ?? null, dto.idempotencyKey ?? null, correlationId, maxRetries, timeoutMs, now, now);
        return this.findById(id);
    },
    findById(id) {
        const row = (0, db_1.getDb)()
            .prepare("SELECT * FROM scheduled_tasks WHERE id = ?")
            .get(id);
        return row ? (0, schedule_model_1.rowToTask)(row) : null;
    },
    findByIdempotencyKey(key) {
        const row = (0, db_1.getDb)()
            .prepare("SELECT * FROM scheduled_tasks WHERE idempotency_key = ?")
            .get(key);
        return row ? (0, schedule_model_1.rowToTask)(row) : null;
    },
    findAll(opts = {}) {
        const db = (0, db_1.getDb)();
        const page = Math.max(1, opts.page ?? 1);
        const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        if (opts.status) {
            conditions.push("status = ?");
            params.push(opts.status);
        }
        if (opts.type) {
            conditions.push("type = ?");
            params.push(opts.type);
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const total = db
            .prepare(`SELECT COUNT(*) as count FROM scheduled_tasks ${where}`)
            .get(...params);
        const totalCount = total["count(*)"] ?? total["count"] ?? 0;
        const rows = db
            .prepare(`SELECT * FROM scheduled_tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
            .all(...[...params, limit, offset]);
        return { data: rows.map(schedule_model_1.rowToTask), total: totalCount, page, limit };
    },
    updateStatus(id, status, extra = {}) {
        const db = (0, db_1.getDb)();
        const now = new Date().toISOString();
        const sets = ["status = ?", "updated_at = ?"];
        const params = [status, now];
        if (extra.error !== undefined) {
            sets.push("error = ?");
            params.push(extra.error);
        }
        if (extra.result !== undefined) {
            sets.push("result = ?");
            params.push(extra.result);
        }
        if (extra.executed_at !== undefined) {
            sets.push("executed_at = ?");
            params.push(extra.executed_at);
        }
        if (extra.retry_count !== undefined) {
            sets.push("retry_count = ?");
            params.push(extra.retry_count);
        }
        params.push(id);
        db.prepare(`UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    },
    // Recover tasks eligible to run after a server restart
    findRecoverable() {
        const now = new Date().toISOString();
        const rows = (0, db_1.getDb)()
            .prepare(`
      SELECT * FROM scheduled_tasks
      WHERE status IN ('pending', 'retrying')
      AND (
        (cron_expr IS NOT NULL AND cron_expr != '')
        OR (schedule_at IS NOT NULL AND schedule_at > ?)
      )
    `)
            .all(now);
        return rows.map(schedule_model_1.rowToTask);
    },
    addLog(taskId, level, message, correlationId, meta) {
        (0, db_1.getDb)()
            .prepare(`
      INSERT INTO task_logs (id, task_id, correlation_id, level, message, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
            .run((0, uuid_1.v4)(), taskId, correlationId ?? null, level, message, meta ? JSON.stringify(meta) : null, new Date().toISOString());
    },
    getLogs(taskId) {
        const rows = (0, db_1.getDb)()
            .prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC")
            .all(taskId);
        return rows.map((r) => ({
            id: r.id,
            taskId: r.task_id,
            correlationId: r.correlation_id,
            level: r.level,
            message: r.message,
            meta: r.meta ? JSON.parse(r.meta) : null,
            createdAt: r.created_at,
        }));
    },
};
//# sourceMappingURL=schedule.repository.js.map