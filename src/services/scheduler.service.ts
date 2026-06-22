import cron from "node-cron";
import { Task, TaskStatus, TaskType } from "../models/schedule.model";
import { scheduleRepository } from "../repositories/schedule.repository";
import { childLogger, logger } from "../utils/logger";
import { config } from "../config";
import { readFileHandler } from "../handlers/readFile.handler";
import { importFilesHandler } from "../handlers/importFiles.handler";
import { formFillHandler } from "../handlers/formFill.handler";
import { sendEmailHandler } from "../handlers/sendEmail.handler";
import { TaskHandler, HandlerContext } from "../handlers/base.handler";
import { AppError, ErrorCodes } from "../utils/errors";

type ScheduledEntry =
  | { type: "cron"; job: cron.ScheduledTask }
  | { type: "timeout"; handle: NodeJS.Timeout };

const registry = new Map<string, ScheduledEntry>();

const handlers: Record<TaskType, TaskHandler> = {
  [TaskType.READ_FILE]: readFileHandler,
  [TaskType.IMPORT_FILES]: importFilesHandler,
  [TaskType.FORM_FILL]: formFillHandler,
  [TaskType.SEND_EMAIL]: sendEmailHandler,
};

async function executeTask(taskId: string): Promise<void> {
  const task = scheduleRepository.findById(taskId);
  if (!task) {
    logger.warn(`Task ${taskId} not found for execution`);
    return;
  }

  if (
    task.status === TaskStatus.CANCELLED ||
    task.status === TaskStatus.PAUSED
  ) {
    logger.info(`Skipping task ${taskId} — status is ${task.status}`);
    return;
  }

  const correlationId = task.correlationId ?? taskId;
  const log = childLogger(correlationId);

  log.info(
    `Starting task ${taskId} (type=${task.type}, retry=${task.retryCount})`,
  );
  scheduleRepository.updateStatus(taskId, TaskStatus.RUNNING, {
    executed_at: new Date().toISOString(),
  });
  scheduleRepository.addLog(
    taskId,
    "info",
    `Task started (attempt ${task.retryCount + 1})`,
    correlationId,
  );

  const ctx: HandlerContext = {
    taskId,
    correlationId,
    log: (level, message, meta) => {
      scheduleRepository.addLog(taskId, level, message, correlationId, meta);
    },
  };

  try {
    const handler = handlers[task.type];
    if (!handler) {
      throw new AppError(
        ErrorCodes.HANDLER_ERROR,
        `No handler for task type: ${task.type}`,
      );
    }

    const result = await withTimeout(
      handler.execute(task.payload, ctx),
      task.timeoutMs,
    );

    scheduleRepository.updateStatus(taskId, TaskStatus.SUCCESS, {
      result: JSON.stringify(result),
    });
    scheduleRepository.addLog(
      taskId,
      "info",
      `Task succeeded: ${result.summary}`,
      correlationId,
    );
    log.info(`Task ${taskId} succeeded`);

    // For one-time tasks that succeeded, remove from registry
    if (!task.cronExpr) {
      registry.delete(taskId);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error(`Task ${taskId} failed: ${errMsg}`);
    scheduleRepository.addLog(
      taskId,
      "error",
      `Task failed: ${errMsg}`,
      correlationId,
    );

    const currentTask = scheduleRepository.findById(taskId)!;
    const newRetryCount = currentTask.retryCount + 1;

    if (newRetryCount <= currentTask.maxRetries) {
      const delay =
        config.retry.baseDelayMs * Math.pow(2, currentTask.retryCount); // exponential backoff
      scheduleRepository.updateStatus(taskId, TaskStatus.RETRYING, {
        error: errMsg,
        retry_count: newRetryCount,
      });
      scheduleRepository.addLog(
        taskId,
        "warn",
        `Retrying in ${delay}ms (attempt ${newRetryCount}/${currentTask.maxRetries})`,
        correlationId,
      );
      log.warn(`Task ${taskId} retrying in ${delay}ms`);

      const handle = setTimeout(() => executeTask(taskId), delay);
      registry.set(taskId, { type: "timeout", handle });
    } else {
      scheduleRepository.updateStatus(taskId, TaskStatus.FAILED, {
        error: errMsg,
        retry_count: newRetryCount,
      });
      scheduleRepository.addLog(
        taskId,
        "error",
        `Task permanently failed after ${currentTask.maxRetries} retries`,
        correlationId,
      );
      log.error(`Task ${taskId} permanently failed`);
      registry.delete(taskId);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new AppError(
            ErrorCodes.HANDLER_TIMEOUT,
            `Task timed out after ${ms}ms`,
          ),
        ),
      ms,
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export const schedulerService = {
  register(task: Task): void {
    if (registry.has(task.id)) {
      logger.warn(`Task ${task.id} is already registered`);
      return;
    }

    if (task.cronExpr) {
      if (!cron.validate(task.cronExpr)) {
        logger.error(
          `Invalid cron expression for task ${task.id}: ${task.cronExpr}`,
        );
        return;
      }
      const job = cron.schedule(task.cronExpr, () => executeTask(task.id));
      registry.set(task.id, { type: "cron", job });
      logger.info(`Registered cron task ${task.id}: "${task.cronExpr}"`);
    } else if (task.scheduleAt) {
      const delay = new Date(task.scheduleAt).getTime() - Date.now();
      if (delay < 0) {
        logger.warn(
          `Task ${task.id} scheduleAt is in the past, running immediately`,
        );
        void executeTask(task.id);
        return;
      }
      const handle = setTimeout(() => executeTask(task.id), delay);
      registry.set(task.id, { type: "timeout", handle });
      logger.info(`Registered one-time task ${task.id}: runs in ${delay}ms`);
    }
  },

  deregister(taskId: string): void {
    const entry = registry.get(taskId);
    if (!entry) return;

    if (entry.type === "cron") {
      entry.job.stop();
    } else {
      clearTimeout(entry.handle);
    }
    registry.delete(taskId);
    logger.info(`Deregistered task ${taskId}`);
  },

  async recoverOnStartup(): Promise<void> {
    const tasks = scheduleRepository.findRecoverable();
    logger.info(`Recovering ${tasks.length} tasks from DB`);
    for (const task of tasks) {
      this.register(task);
    }
  },

  stopAll(): void {
    for (const [id, entry] of registry.entries()) {
      if (entry.type === "cron") {
        entry.job.stop();
      } else {
        clearTimeout(entry.handle);
      }
    }
    registry.clear();
    logger.info("All scheduled tasks stopped");
  },

  isRegistered(taskId: string): boolean {
    return registry.has(taskId);
  },

  registrySize(): number {
    return registry.size;
  },
};
