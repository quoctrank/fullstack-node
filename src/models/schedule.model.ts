import { z } from "zod";

// ─── Task Types ───────────────────────────────────────────────────────────────

export const TaskType = {
  READ_FILE: "read_file",
  IMPORT_FILES: "import_files",
  FORM_FILL: "form_fill",
  SEND_EMAIL: "send_email",
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskStatus = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  RETRYING: "retrying",
  CANCELLED: "cancelled",
  PAUSED: "paused",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// ─── Payload Schemas ──────────────────────────────────────────────────────────

export const ReadFilePayloadSchema = z.object({
  filePath: z.string().min(1, "filePath is required"),
  encoding: z
    .enum(["utf8", "utf-8", "ascii", "base64", "binary"])
    .optional()
    .default("utf8"),
  previewLines: z.number().int().min(1).max(1000).optional().default(10),
});

export const ImportFilesPayloadSchema = z.object({
  /** File paths saved by multer (populated after upload) */
  files: z
    .array(
      z.object({
        originalName: z.string(),
        storedPath: z.string(),
        mimeType: z.string(),
      }),
    )
    .min(1, "At least one file is required"),
  format: z.enum(["csv", "json", "auto"]).optional().default("auto"),
});

export const FormFillPayloadSchema = z.object({
  template: z.record(z.unknown()),
  data: z.record(z.unknown()),
});

export const SendEmailPayloadSchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one recipient is required"),
  cc: z.array(z.string().email()).optional().default([]),
  bcc: z.array(z.string().email()).optional().default([]),
  subject: z.string().min(1, "subject is required"),
  body: z.string().min(1, "body is required"),
  isHtml: z.boolean().optional().default(false),
});

export type ReadFilePayload = z.infer<typeof ReadFilePayloadSchema>;
export type ImportFilesPayload = z.infer<typeof ImportFilesPayloadSchema>;
export type FormFillPayload = z.infer<typeof FormFillPayloadSchema>;
export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;

export type TaskPayload =
  | ReadFilePayload
  | ImportFilesPayload
  | FormFillPayload
  | SendEmailPayload;

// ─── Task creation schema ─────────────────────────────────────────────────────

export const CreateTaskSchema = z
  .object({
    type: z.enum([
      TaskType.READ_FILE,
      TaskType.IMPORT_FILES,
      TaskType.FORM_FILL,
      TaskType.SEND_EMAIL,
    ]),
    payload: z.record(z.unknown()),
    scheduleAt: z
      .string()
      .datetime({ message: "scheduleAt must be ISO 8601 datetime" })
      .optional(),
    cronExpr: z.string().optional(),
    idempotencyKey: z.string().optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
    timeoutMs: z.number().int().min(1000).max(300_000).optional(),
  })
  .refine((data) => data.scheduleAt || data.cronExpr, {
    message: "Either scheduleAt or cronExpr must be provided",
    path: ["scheduleAt"],
  });

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;

// ─── DB row type ──────────────────────────────────────────────────────────────

export interface TaskRow {
  id: string;
  type: TaskType;
  payload: string; // JSON
  status: TaskStatus;
  schedule_at: string | null;
  cron_expr: string | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  retry_count: number;
  max_retries: number;
  timeout_ms: number;
  result: string | null; // JSON
  error: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskLogRow {
  id: string;
  task_id: string;
  correlation_id: string | null;
  level: "info" | "warn" | "error";
  message: string;
  meta: string | null; // JSON
  created_at: string;
}

// ─── Domain type (camelCase) ──────────────────────────────────────────────────

export interface Task {
  id: string;
  type: TaskType;
  payload: TaskPayload;
  status: TaskStatus;
  scheduleAt: string | null;
  cronExpr: string | null;
  idempotencyKey: string | null;
  correlationId: string | null;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  result: unknown | null;
  error: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  correlationId: string | null;
  level: "info" | "warn" | "error";
  message: string;
  meta: unknown | null;
  createdAt: string;
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload),
    status: row.status,
    scheduleAt: row.schedule_at,
    cronExpr: row.cron_expr,
    idempotencyKey: row.idempotency_key,
    correlationId: row.correlation_id,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    timeoutMs: row.timeout_ms,
    result: row.result ? JSON.parse(row.result) : null,
    error: row.error,
    executedAt: row.executed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
