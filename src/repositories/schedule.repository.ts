import { v4 as uuidv4 } from "uuid";
import { getDb } from "../database/db";
import {
  Task,
  TaskLog,
  TaskRow,
  TaskLogRow,
  TaskStatus,
  TaskType,
  rowToTask,
  CreateTaskDto,
} from "../models/schedule.model";
import { config } from "../config";

export interface ListTasksOptions {
  status?: TaskStatus;
  type?: TaskType;
  page?: number;
  limit?: number;
}

export interface ListTasksResult {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

export const scheduleRepository = {
  create(dto: CreateTaskDto, correlationId: string): Task {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const maxRetries = dto.maxRetries ?? config.retry.defaultMaxRetries;
    const timeoutMs = dto.timeoutMs ?? config.retry.defaultTimeoutMs;

    db.prepare(
      `
      INSERT INTO scheduled_tasks
        (id, type, payload, status, schedule_at, cron_expr, idempotency_key, correlation_id,
         retry_count, max_retries, timeout_ms, created_at, updated_at)
      VALUES
        (?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `,
    ).run(
      id,
      dto.type,
      JSON.stringify(dto.payload),
      dto.scheduleAt ?? null,
      dto.cronExpr ?? null,
      dto.idempotencyKey ?? null,
      correlationId,
      maxRetries,
      timeoutMs,
      now,
      now,
    );

    return this.findById(id)!;
  },

  findById(id: string): Task | null {
    const row = getDb()
      .prepare("SELECT * FROM scheduled_tasks WHERE id = ?")
      .get(id) as TaskRow | undefined;
    return row ? rowToTask(row) : null;
  },

  findByIdempotencyKey(key: string): Task | null {
    const row = getDb()
      .prepare("SELECT * FROM scheduled_tasks WHERE idempotency_key = ?")
      .get(key) as TaskRow | undefined;
    return row ? rowToTask(row) : null;
  },

  findAll(opts: ListTasksOptions = {}): ListTasksResult {
    const db = getDb();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

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
      .get(...(params as any[])) as
      | { "count(*)": number }
      | { count: number } as any;
    const totalCount: number = total["count(*)"] ?? total["count"] ?? 0;

    const rows = db
      .prepare(
        `SELECT * FROM scheduled_tasks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...([...params, limit, offset] as any[])) as unknown as TaskRow[];

    return { data: rows.map(rowToTask), total: totalCount, page, limit };
  },

  updateStatus(
    id: string,
    status: TaskStatus,
    extra: Partial<
      Pick<TaskRow, "error" | "result" | "executed_at" | "retry_count">
    > = {},
  ): void {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ["status = ?", "updated_at = ?"];
    const params: unknown[] = [status, now];

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
    db.prepare(
      `UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = ?`,
    ).run(...(params as any[]));
  },

  // Recover tasks eligible to run after a server restart
  findRecoverable(): Task[] {
    const now = new Date().toISOString();
    const rows = getDb()
      .prepare(
        `
      SELECT * FROM scheduled_tasks
      WHERE status IN ('pending', 'retrying')
      AND (
        (cron_expr IS NOT NULL AND cron_expr != '')
        OR (schedule_at IS NOT NULL AND schedule_at > ?)
      )
    `,
      )
      .all(now) as unknown as TaskRow[];
    return rows.map(rowToTask);
  },

  addLog(
    taskId: string,
    level: "info" | "warn" | "error",
    message: string,
    correlationId?: string,
    meta?: unknown,
  ): void {
    getDb()
      .prepare(
        `
      INSERT INTO task_logs (id, task_id, correlation_id, level, message, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        uuidv4(),
        taskId,
        correlationId ?? null,
        level,
        message,
        meta ? JSON.stringify(meta) : null,
        new Date().toISOString(),
      );
  },

  getLogs(taskId: string): TaskLog[] {
    const rows = getDb()
      .prepare(
        "SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC",
      )
      .all(taskId) as unknown as TaskLogRow[];
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
