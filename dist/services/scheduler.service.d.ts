import { Task } from "../models/schedule.model";
export declare const schedulerService: {
    register(task: Task): void;
    deregister(taskId: string): void;
    recoverOnStartup(): Promise<void>;
    stopAll(): void;
    isRegistered(taskId: string): boolean;
    registrySize(): number;
};
//# sourceMappingURL=scheduler.service.d.ts.map