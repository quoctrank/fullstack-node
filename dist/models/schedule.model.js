"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTaskSchema = exports.SendEmailPayloadSchema = exports.FormFillPayloadSchema = exports.ImportFilesPayloadSchema = exports.ReadFilePayloadSchema = exports.TaskStatus = exports.TaskType = void 0;
exports.rowToTask = rowToTask;
const zod_1 = require("zod");
// ─── Task Types ───────────────────────────────────────────────────────────────
exports.TaskType = {
    READ_FILE: "read_file",
    IMPORT_FILES: "import_files",
    FORM_FILL: "form_fill",
    SEND_EMAIL: "send_email",
};
exports.TaskStatus = {
    PENDING: "pending",
    RUNNING: "running",
    SUCCESS: "success",
    FAILED: "failed",
    RETRYING: "retrying",
    CANCELLED: "cancelled",
    PAUSED: "paused",
};
// ─── Payload Schemas ──────────────────────────────────────────────────────────
exports.ReadFilePayloadSchema = zod_1.z.object({
    filePath: zod_1.z.string().min(1, "filePath is required"),
    encoding: zod_1.z
        .enum(["utf8", "utf-8", "ascii", "base64", "binary"])
        .optional()
        .default("utf8"),
    previewLines: zod_1.z.number().int().min(1).max(1000).optional().default(10),
});
exports.ImportFilesPayloadSchema = zod_1.z.object({
    /** File paths saved by multer (populated after upload) */
    files: zod_1.z
        .array(zod_1.z.object({
        originalName: zod_1.z.string(),
        storedPath: zod_1.z.string(),
        mimeType: zod_1.z.string(),
    }))
        .min(1, "At least one file is required"),
    format: zod_1.z.enum(["csv", "json", "auto"]).optional().default("auto"),
});
exports.FormFillPayloadSchema = zod_1.z.object({
    template: zod_1.z.record(zod_1.z.unknown()),
    data: zod_1.z.record(zod_1.z.unknown()),
});
exports.SendEmailPayloadSchema = zod_1.z.object({
    to: zod_1.z.array(zod_1.z.string().email()).min(1, "At least one recipient is required"),
    cc: zod_1.z.array(zod_1.z.string().email()).optional().default([]),
    bcc: zod_1.z.array(zod_1.z.string().email()).optional().default([]),
    subject: zod_1.z.string().min(1, "subject is required"),
    body: zod_1.z.string().min(1, "body is required"),
    isHtml: zod_1.z.boolean().optional().default(false),
});
// ─── Task creation schema ─────────────────────────────────────────────────────
exports.CreateTaskSchema = zod_1.z
    .object({
    type: zod_1.z.enum([
        exports.TaskType.READ_FILE,
        exports.TaskType.IMPORT_FILES,
        exports.TaskType.FORM_FILL,
        exports.TaskType.SEND_EMAIL,
    ]),
    payload: zod_1.z.record(zod_1.z.unknown()),
    scheduleAt: zod_1.z
        .string()
        .datetime({ message: "scheduleAt must be ISO 8601 datetime" })
        .optional(),
    cronExpr: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().optional(),
    maxRetries: zod_1.z.number().int().min(0).max(10).optional(),
    timeoutMs: zod_1.z.number().int().min(1000).max(300000).optional(),
})
    .refine((data) => data.scheduleAt || data.cronExpr, {
    message: "Either scheduleAt or cronExpr must be provided",
    path: ["scheduleAt"],
});
function rowToTask(row) {
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
//# sourceMappingURL=schedule.model.js.map