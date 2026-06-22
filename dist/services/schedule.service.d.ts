import { Task, CreateTaskDto } from "../models/schedule.model";
import { ListTasksOptions, ListTasksResult } from "../repositories/schedule.repository";
export declare const scheduleService: {
    createTask(dto: CreateTaskDto, correlationId: string): Task;
    pushTask(dto: CreateTaskDto, correlationId: string): {
        task: Task;
        created: boolean;
    };
    getTask(id: string): Task;
    listTasks(opts: ListTasksOptions): ListTasksResult;
    cancelTask(id: string, correlationId: string): Task;
    getTaskWithLogs(id: string): {
        task: Task;
        logs: import("../models/schedule.model").TaskLog[];
    };
};
//# sourceMappingURL=schedule.service.d.ts.map