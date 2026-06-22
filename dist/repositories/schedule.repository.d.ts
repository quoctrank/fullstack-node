import { Task, TaskLog, TaskRow, TaskStatus, TaskType, CreateTaskDto } from "../models/schedule.model";
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
export declare const scheduleRepository: {
    create(dto: CreateTaskDto, correlationId: string): Task;
    findById(id: string): Task | null;
    findByIdempotencyKey(key: string): Task | null;
    findAll(opts?: ListTasksOptions): ListTasksResult;
    updateStatus(id: string, status: TaskStatus, extra?: Partial<Pick<TaskRow, "error" | "result" | "executed_at" | "retry_count">>): void;
    findRecoverable(): Task[];
    addLog(taskId: string, level: "info" | "warn" | "error", message: string, correlationId?: string, meta?: unknown): void;
    getLogs(taskId: string): TaskLog[];
};
//# sourceMappingURL=schedule.repository.d.ts.map