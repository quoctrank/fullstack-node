import { z } from "zod";
export declare const TaskType: {
    readonly READ_FILE: "read_file";
    readonly IMPORT_FILES: "import_files";
    readonly FORM_FILL: "form_fill";
    readonly SEND_EMAIL: "send_email";
};
export type TaskType = (typeof TaskType)[keyof typeof TaskType];
export declare const TaskStatus: {
    readonly PENDING: "pending";
    readonly RUNNING: "running";
    readonly SUCCESS: "success";
    readonly FAILED: "failed";
    readonly RETRYING: "retrying";
    readonly CANCELLED: "cancelled";
    readonly PAUSED: "paused";
};
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
export declare const ReadFilePayloadSchema: z.ZodObject<{
    filePath: z.ZodString;
    encoding: z.ZodDefault<z.ZodOptional<z.ZodEnum<["utf8", "utf-8", "ascii", "base64", "binary"]>>>;
    previewLines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    encoding: "ascii" | "utf8" | "utf-8" | "base64" | "binary";
    previewLines: number;
}, {
    filePath: string;
    encoding?: "ascii" | "utf8" | "utf-8" | "base64" | "binary" | undefined;
    previewLines?: number | undefined;
}>;
export declare const ImportFilesPayloadSchema: z.ZodObject<{
    /** File paths saved by multer (populated after upload) */
    files: z.ZodArray<z.ZodObject<{
        originalName: z.ZodString;
        storedPath: z.ZodString;
        mimeType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        originalName: string;
        storedPath: string;
        mimeType: string;
    }, {
        originalName: string;
        storedPath: string;
        mimeType: string;
    }>, "many">;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["csv", "json", "auto"]>>>;
}, "strip", z.ZodTypeAny, {
    format: "json" | "csv" | "auto";
    files: {
        originalName: string;
        storedPath: string;
        mimeType: string;
    }[];
}, {
    files: {
        originalName: string;
        storedPath: string;
        mimeType: string;
    }[];
    format?: "json" | "csv" | "auto" | undefined;
}>;
export declare const FormFillPayloadSchema: z.ZodObject<{
    template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    template: Record<string, unknown>;
    data: Record<string, unknown>;
}, {
    template: Record<string, unknown>;
    data: Record<string, unknown>;
}>;
export declare const SendEmailPayloadSchema: z.ZodObject<{
    to: z.ZodArray<z.ZodString, "many">;
    cc: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    bcc: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    subject: z.ZodString;
    body: z.ZodString;
    isHtml: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    isHtml: boolean;
}, {
    to: string[];
    subject: string;
    body: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    isHtml?: boolean | undefined;
}>;
export type ReadFilePayload = z.infer<typeof ReadFilePayloadSchema>;
export type ImportFilesPayload = z.infer<typeof ImportFilesPayloadSchema>;
export type FormFillPayload = z.infer<typeof FormFillPayloadSchema>;
export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;
export type TaskPayload = ReadFilePayload | ImportFilesPayload | FormFillPayload | SendEmailPayload;
export declare const CreateTaskSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["read_file", "import_files", "form_fill", "send_email"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    scheduleAt: z.ZodOptional<z.ZodString>;
    cronExpr: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "read_file" | "import_files" | "form_fill" | "send_email";
    payload: Record<string, unknown>;
    scheduleAt?: string | undefined;
    cronExpr?: string | undefined;
    idempotencyKey?: string | undefined;
    maxRetries?: number | undefined;
    timeoutMs?: number | undefined;
}, {
    type: "read_file" | "import_files" | "form_fill" | "send_email";
    payload: Record<string, unknown>;
    scheduleAt?: string | undefined;
    cronExpr?: string | undefined;
    idempotencyKey?: string | undefined;
    maxRetries?: number | undefined;
    timeoutMs?: number | undefined;
}>, {
    type: "read_file" | "import_files" | "form_fill" | "send_email";
    payload: Record<string, unknown>;
    scheduleAt?: string | undefined;
    cronExpr?: string | undefined;
    idempotencyKey?: string | undefined;
    maxRetries?: number | undefined;
    timeoutMs?: number | undefined;
}, {
    type: "read_file" | "import_files" | "form_fill" | "send_email";
    payload: Record<string, unknown>;
    scheduleAt?: string | undefined;
    cronExpr?: string | undefined;
    idempotencyKey?: string | undefined;
    maxRetries?: number | undefined;
    timeoutMs?: number | undefined;
}>;
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export interface TaskRow {
    id: string;
    type: TaskType;
    payload: string;
    status: TaskStatus;
    schedule_at: string | null;
    cron_expr: string | null;
    idempotency_key: string | null;
    correlation_id: string | null;
    retry_count: number;
    max_retries: number;
    timeout_ms: number;
    result: string | null;
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
    meta: string | null;
    created_at: string;
}
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
export declare function rowToTask(row: TaskRow): Task;
//# sourceMappingURL=schedule.model.d.ts.map