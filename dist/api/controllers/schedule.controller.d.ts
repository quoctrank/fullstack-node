import { Request, Response, NextFunction } from "express";
export declare const scheduleController: {
    /**
     * POST /api/schedules
     * Create a new scheduled task. For import_files, multipart/form-data with files field.
     */
    createTask(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/schedules/push
     * Push a task from an external system (idempotent by idempotencyKey).
     */
    pushTask(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/schedules
     */
    listTasks(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/schedules/:id
     */
    getTask(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /api/schedules/:id/cancel
     */
    cancelTask(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=schedule.controller.d.ts.map