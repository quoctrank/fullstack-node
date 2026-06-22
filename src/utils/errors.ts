export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  TASK_ALREADY_CANCELLED: "TASK_ALREADY_CANCELLED",
  TASK_NOT_CANCELLABLE: "TASK_NOT_CANCELLABLE",
  HANDLER_TIMEOUT: "HANDLER_TIMEOUT",
  HANDLER_ERROR: "HANDLER_ERROR",
} as const;
