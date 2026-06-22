import {
  Task,
  CreateTaskDto,
  CreateTaskSchema,
  TaskStatus,
  TaskType,
  ReadFilePayloadSchema,
  ImportFilesPayloadSchema,
  FormFillPayloadSchema,
  SendEmailPayloadSchema,
} from "../models/schedule.model";
import { scheduleRepository } from "../repositories/schedule.repository";
import { schedulerService } from "./scheduler.service";
import { AppError, ErrorCodes } from "../utils/errors";
import { logger } from "../utils/logger";
import {
  ListTasksOptions,
  ListTasksResult,
} from "../repositories/schedule.repository";
import { ZodError } from "zod";

const payloadValidators: Record<TaskType, (p: unknown) => unknown> = {
  [TaskType.READ_FILE]: (p) => ReadFilePayloadSchema.parse(p),
  [TaskType.IMPORT_FILES]: (p) => ImportFilesPayloadSchema.parse(p),
  [TaskType.FORM_FILL]: (p) => FormFillPayloadSchema.parse(p),
  [TaskType.SEND_EMAIL]: (p) => SendEmailPayloadSchema.parse(p),
};

export const scheduleService = {
  createTask(dto: CreateTaskDto, correlationId: string): Task {
    // Validate type-specific payload
    try {
      dto.payload = payloadValidators[dto.type](dto.payload) as Record<
        string,
        unknown
      >;
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Payload validation failed: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        );
      }
      throw err;
    }

    const task = scheduleRepository.create(dto, correlationId);
    logger.info(`Task created: ${task.id}`, { correlationId, type: task.type });

    schedulerService.register(task);
    return task;
  },

  pushTask(
    dto: CreateTaskDto,
    correlationId: string,
  ): { task: Task; created: boolean } {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = scheduleRepository.findByIdempotencyKey(
        dto.idempotencyKey,
      );
      if (existing) {
        logger.info(
          `Idempotency hit for key "${dto.idempotencyKey}", returning existing task ${existing.id}`,
          { correlationId },
        );
        return { task: existing, created: false };
      }
    }

    const task = this.createTask(dto, correlationId);
    return { task, created: true };
  },

  getTask(id: string): Task {
    const task = scheduleRepository.findById(id);
    if (!task) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Task not found: ${id}`, 404);
    }
    return task;
  },

  listTasks(opts: ListTasksOptions): ListTasksResult {
    return scheduleRepository.findAll(opts);
  },

  cancelTask(id: string, correlationId: string): Task {
    const task = scheduleRepository.findById(id);
    if (!task) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Task not found: ${id}`, 404);
    }

    const cancellable: TaskStatus[] = [
      TaskStatus.PENDING,
      TaskStatus.PAUSED,
      TaskStatus.RETRYING,
    ];
    if (!cancellable.includes(task.status)) {
      throw new AppError(
        ErrorCodes.TASK_NOT_CANCELLABLE,
        `Task ${id} cannot be cancelled (current status: ${task.status})`,
        409,
      );
    }

    schedulerService.deregister(id);
    scheduleRepository.updateStatus(id, TaskStatus.CANCELLED);
    scheduleRepository.addLog(id, "info", "Task cancelled", correlationId);
    logger.info(`Task ${id} cancelled`, { correlationId });

    return scheduleRepository.findById(id)!;
  },

  getTaskWithLogs(id: string) {
    const task = this.getTask(id);
    const logs = scheduleRepository.getLogs(id);
    return { task, logs };
  },
};
