import { Request, Response, NextFunction } from "express";
import { scheduleService } from "../../services/schedule.service";
import {
  CreateTaskSchema,
  TaskType,
  ImportFilesPayload,
} from "../../models/schedule.model";
import { AppError, ErrorCodes } from "../../utils/errors";

export const scheduleController = {
  /**
   * POST /api/schedules
   * Create a new scheduled task. For import_files, multipart/form-data with files field.
   */
  async createTask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = req.body;

      // For import_files tasks, inject multer file info into payload
      if (body.type === TaskType.IMPORT_FILES && req.files) {
        const files = (req.files as Express.Multer.File[]).map((f) => ({
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
        } catch {
          /* leave as-is */
        }
      }

      const dto = CreateTaskSchema.parse(body);
      const task = scheduleService.createTask(dto, req.correlationId);

      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/schedules/push
   * Push a task from an external system (idempotent by idempotencyKey).
   */
  async pushTask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = req.body;
      if (typeof body.payload === "string") {
        try {
          body.payload = JSON.parse(body.payload);
        } catch {
          /* leave as-is */
        }
      }

      const dto = CreateTaskSchema.parse(body);
      const { task, created } = scheduleService.pushTask(
        dto,
        req.correlationId,
      );

      res
        .status(created ? 201 : 200)
        .json({ success: true, created, data: task });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/schedules
   */
  async listTasks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { status, type, page, limit } = req.query;
      const result = scheduleService.listTasks({
        status: status as any,
        type: type as any,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/schedules/:id
   */
  async getTask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { task, logs } = scheduleService.getTaskWithLogs(req.params.id);
      res.json({ success: true, data: task, logs });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/schedules/:id/cancel
   */
  async cancelTask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const task = scheduleService.cancelTask(req.params.id, req.correlationId);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },
};
