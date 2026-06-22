"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleController = void 0;
const schedule_service_1 = require("../../services/schedule.service");
const schedule_model_1 = require("../../models/schedule.model");
exports.scheduleController = {
    /**
     * POST /api/schedules
     * Create a new scheduled task. For import_files, multipart/form-data with files field.
     */
    async createTask(req, res, next) {
        try {
            const body = req.body;
            // For import_files tasks, inject multer file info into payload
            if (body.type === schedule_model_1.TaskType.IMPORT_FILES && req.files) {
                const files = req.files.map((f) => ({
                    originalName: f.originalname,
                    storedPath: f.path,
                    mimeType: f.mimetype,
                }));
                body.payload = {
                    ...(typeof body.payload === "string"
                        ? JSON.parse(body.payload)
                        : (body.payload ?? {})),
                    files,
                };
            }
            // Parse payload field if it's a JSON string (happens with multipart)
            if (typeof body.payload === "string") {
                try {
                    body.payload = JSON.parse(body.payload);
                }
                catch {
                    /* leave as-is */
                }
            }
            const dto = schedule_model_1.CreateTaskSchema.parse(body);
            const task = schedule_service_1.scheduleService.createTask(dto, req.correlationId);
            res.status(201).json({ success: true, data: task });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * POST /api/schedules/push
     * Push a task from an external system (idempotent by idempotencyKey).
     */
    async pushTask(req, res, next) {
        try {
            const body = req.body;
            if (typeof body.payload === "string") {
                try {
                    body.payload = JSON.parse(body.payload);
                }
                catch {
                    /* leave as-is */
                }
            }
            const dto = schedule_model_1.CreateTaskSchema.parse(body);
            const { task, created } = schedule_service_1.scheduleService.pushTask(dto, req.correlationId);
            res
                .status(created ? 201 : 200)
                .json({ success: true, created, data: task });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * GET /api/schedules
     */
    async listTasks(req, res, next) {
        try {
            const { status, type, page, limit } = req.query;
            const result = schedule_service_1.scheduleService.listTasks({
                status: status,
                type: type,
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
            });
            res.json({ success: true, ...result });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * GET /api/schedules/:id
     */
    async getTask(req, res, next) {
        try {
            const { task, logs } = schedule_service_1.scheduleService.getTaskWithLogs(req.params.id);
            res.json({ success: true, data: task, logs });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * PATCH /api/schedules/:id/cancel
     */
    async cancelTask(req, res, next) {
        try {
            const task = schedule_service_1.scheduleService.cancelTask(req.params.id, req.correlationId);
            res.json({ success: true, data: task });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=schedule.controller.js.map