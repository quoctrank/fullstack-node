import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.correlationId ?? "unknown";

  if (err instanceof AppError) {
    logger.warn(`[${correlationId}] AppError: ${err.code} - ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      correlationId,
    });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn(`[${correlationId}] Validation error`, { issues: err.issues });
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
      errors: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      correlationId,
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error(`[${correlationId}] Unhandled error`, { err });
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message,
    correlationId,
  });
}
