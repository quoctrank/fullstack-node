"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const schedule_model_1 = require("../models/schedule.model");
const schedule_repository_1 = require("../repositories/schedule.repository");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const readFile_handler_1 = require("../handlers/readFile.handler");
const importFiles_handler_1 = require("../handlers/importFiles.handler");
const formFill_handler_1 = require("../handlers/formFill.handler");
const sendEmail_handler_1 = require("../handlers/sendEmail.handler");
const errors_1 = require("../utils/errors");
const registry = new Map();
const handlers = {
    [schedule_model_1.TaskType.READ_FILE]: readFile_handler_1.readFileHandler,
    [schedule_model_1.TaskType.IMPORT_FILES]: importFiles_handler_1.importFilesHandler,
    [schedule_model_1.TaskType.FORM_FILL]: formFill_handler_1.formFillHandler,
    [schedule_model_1.TaskType.SEND_EMAIL]: sendEmail_handler_1.sendEmailHandler,
};
async function executeTask(taskId) {
    const task = schedule_repository_1.scheduleRepository.findById(taskId);
    if (!task) {
        logger_1.logger.warn(`Task ${taskId} not found for execution`);
        return;
    }
    if (task.status === schedule_model_1.TaskStatus.CANCELLED ||
        task.status === schedule_model_1.TaskStatus.PAUSED) {
        logger_1.logger.info(`Skipping task ${taskId} — status is ${task.status}`);
        return;
    }
    const correlationId = task.correlationId ?? taskId;
    const log = (0, logger_1.childLogger)(correlationId);
    log.info(`Starting task ${taskId} (type=${task.type}, retry=${task.retryCount})`);
    schedule_repository_1.scheduleRepository.updateStatus(taskId, schedule_model_1.TaskStatus.RUNNING, {
        executed_at: new Date().toISOString(),
    });
    schedule_repository_1.scheduleRepository.addLog(taskId, "info", `Task started (attempt ${task.retryCount + 1})`, correlationId);
    const ctx = {
        taskId,
        correlationId,
        log: (level, message, meta) => {
            schedule_repository_1.scheduleRepository.addLog(taskId, level, message, correlationId, meta);
        },
    };
    try {
        const handler = handlers[task.type];
        if (!handler) {
            throw new errors_1.AppError(errors_1.ErrorCodes.HANDLER_ERROR, `No handler for task type: ${task.type}`);
        }
        const result = await withTimeout(handler.execute(task.payload, ctx), task.timeoutMs);
        schedule_repository_1.scheduleRepository.updateStatus(taskId, schedule_model_1.TaskStatus.SUCCESS, {
            result: JSON.stringify(result),
        });
        schedule_repository_1.scheduleRepository.addLog(taskId, "info", `Task succeeded: ${result.summary}`, correlationId);
        log.info(`Task ${taskId} succeeded`);
        // For one-time tasks that succeeded, remove from registry
        if (!task.cronExpr) {
            registry.delete(taskId);
        }
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log.error(`Task ${taskId} failed: ${errMsg}`);
        schedule_repository_1.scheduleRepository.addLog(taskId, "error", `Task failed: ${errMsg}`, correlationId);
        const currentTask = schedule_repository_1.scheduleRepository.findById(taskId);
        const newRetryCount = currentTask.retryCount + 1;
        if (newRetryCount <= currentTask.maxRetries) {
            const delay = config_1.config.retry.baseDelayMs * Math.pow(2, currentTask.retryCount); // exponential backoff
            schedule_repository_1.scheduleRepository.updateStatus(taskId, schedule_model_1.TaskStatus.RETRYING, {
                error: errMsg,
                retry_count: newRetryCount,
            });
            schedule_repository_1.scheduleRepository.addLog(taskId, "warn", `Retrying in ${delay}ms (attempt ${newRetryCount}/${currentTask.maxRetries})`, correlationId);
            log.warn(`Task ${taskId} retrying in ${delay}ms`);
            const handle = setTimeout(() => executeTask(taskId), delay);
            registry.set(taskId, { type: "timeout", handle });
        }
        else {
            schedule_repository_1.scheduleRepository.updateStatus(taskId, schedule_model_1.TaskStatus.FAILED, {
                error: errMsg,
                retry_count: newRetryCount,
            });
            schedule_repository_1.scheduleRepository.addLog(taskId, "error", `Task permanently failed after ${currentTask.maxRetries} retries`, correlationId);
            log.error(`Task ${taskId} permanently failed`);
            registry.delete(taskId);
        }
    }
}
function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new errors_1.AppError(errors_1.ErrorCodes.HANDLER_TIMEOUT, `Task timed out after ${ms}ms`)), ms);
        promise.then((val) => {
            clearTimeout(timer);
            resolve(val);
        }, (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
exports.schedulerService = {
    register(task) {
        if (registry.has(task.id)) {
            logger_1.logger.warn(`Task ${task.id} is already registered`);
            return;
        }
        if (task.cronExpr) {
            if (!node_cron_1.default.validate(task.cronExpr)) {
                logger_1.logger.error(`Invalid cron expression for task ${task.id}: ${task.cronExpr}`);
                return;
            }
            const job = node_cron_1.default.schedule(task.cronExpr, () => executeTask(task.id));
            registry.set(task.id, { type: "cron", job });
            logger_1.logger.info(`Registered cron task ${task.id}: "${task.cronExpr}"`);
        }
        else if (task.scheduleAt) {
            const delay = new Date(task.scheduleAt).getTime() - Date.now();
            if (delay < 0) {
                logger_1.logger.warn(`Task ${task.id} scheduleAt is in the past, running immediately`);
                void executeTask(task.id);
                return;
            }
            const handle = setTimeout(() => executeTask(task.id), delay);
            registry.set(task.id, { type: "timeout", handle });
            logger_1.logger.info(`Registered one-time task ${task.id}: runs in ${delay}ms`);
        }
    },
    deregister(taskId) {
        const entry = registry.get(taskId);
        if (!entry)
            return;
        if (entry.type === "cron") {
            entry.job.stop();
        }
        else {
            clearTimeout(entry.handle);
        }
        registry.delete(taskId);
        logger_1.logger.info(`Deregistered task ${taskId}`);
    },
    async recoverOnStartup() {
        const tasks = schedule_repository_1.scheduleRepository.findRecoverable();
        logger_1.logger.info(`Recovering ${tasks.length} tasks from DB`);
        for (const task of tasks) {
            this.register(task);
        }
    },
    stopAll() {
        for (const [id, entry] of registry.entries()) {
            if (entry.type === "cron") {
                entry.job.stop();
            }
            else {
                clearTimeout(entry.handle);
            }
        }
        registry.clear();
        logger_1.logger.info("All scheduled tasks stopped");
    },
    isRegistered(taskId) {
        return registry.has(taskId);
    },
    registrySize() {
        return registry.size;
    },
};
//# sourceMappingURL=scheduler.service.js.map