"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleService = void 0;
const schedule_model_1 = require("../models/schedule.model");
const schedule_repository_1 = require("../repositories/schedule.repository");
const scheduler_service_1 = require("./scheduler.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const payloadValidators = {
    [schedule_model_1.TaskType.READ_FILE]: (p) => schedule_model_1.ReadFilePayloadSchema.parse(p),
    [schedule_model_1.TaskType.IMPORT_FILES]: (p) => schedule_model_1.ImportFilesPayloadSchema.parse(p),
    [schedule_model_1.TaskType.FORM_FILL]: (p) => schedule_model_1.FormFillPayloadSchema.parse(p),
    [schedule_model_1.TaskType.SEND_EMAIL]: (p) => schedule_model_1.SendEmailPayloadSchema.parse(p),
};
exports.scheduleService = {
    createTask(dto, correlationId) {
        // Validate type-specific payload
        try {
            dto.payload = payloadValidators[dto.type](dto.payload);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                throw new errors_1.AppError(errors_1.ErrorCodes.VALIDATION_ERROR, `Payload validation failed: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
            }
            throw err;
        }
        const task = schedule_repository_1.scheduleRepository.create(dto, correlationId);
        logger_1.logger.info(`Task created: ${task.id}`, { correlationId, type: task.type });
        scheduler_service_1.schedulerService.register(task);
        return task;
    },
    pushTask(dto, correlationId) {
        // Idempotency check
        if (dto.idempotencyKey) {
            const existing = schedule_repository_1.scheduleRepository.findByIdempotencyKey(dto.idempotencyKey);
            if (existing) {
                logger_1.logger.info(`Idempotency hit for key "${dto.idempotencyKey}", returning existing task ${existing.id}`, { correlationId });
                return { task: existing, created: false };
            }
        }
        const task = this.createTask(dto, correlationId);
        return { task, created: true };
    },
    getTask(id) {
        const task = schedule_repository_1.scheduleRepository.findById(id);
        if (!task) {
            throw new errors_1.AppError(errors_1.ErrorCodes.NOT_FOUND, `Task not found: ${id}`, 404);
        }
        return task;
    },
    listTasks(opts) {
        return schedule_repository_1.scheduleRepository.findAll(opts);
    },
    cancelTask(id, correlationId) {
        const task = schedule_repository_1.scheduleRepository.findById(id);
        if (!task) {
            throw new errors_1.AppError(errors_1.ErrorCodes.NOT_FOUND, `Task not found: ${id}`, 404);
        }
        const cancellable = [
            schedule_model_1.TaskStatus.PENDING,
            schedule_model_1.TaskStatus.PAUSED,
            schedule_model_1.TaskStatus.RETRYING,
        ];
        if (!cancellable.includes(task.status)) {
            throw new errors_1.AppError(errors_1.ErrorCodes.TASK_NOT_CANCELLABLE, `Task ${id} cannot be cancelled (current status: ${task.status})`, 409);
        }
        scheduler_service_1.schedulerService.deregister(id);
        schedule_repository_1.scheduleRepository.updateStatus(id, schedule_model_1.TaskStatus.CANCELLED);
        schedule_repository_1.scheduleRepository.addLog(id, "info", "Task cancelled", correlationId);
        logger_1.logger.info(`Task ${id} cancelled`, { correlationId });
        return schedule_repository_1.scheduleRepository.findById(id);
    },
    getTaskWithLogs(id) {
        const task = this.getTask(id);
        const logs = schedule_repository_1.scheduleRepository.getLogs(id);
        return { task, logs };
    },
};
//# sourceMappingURL=schedule.service.js.map