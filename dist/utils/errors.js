"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.AppError = void 0;
class AppError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "AppError";
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
exports.ErrorCodes = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    TASK_ALREADY_CANCELLED: "TASK_ALREADY_CANCELLED",
    TASK_NOT_CANCELLABLE: "TASK_NOT_CANCELLABLE",
    HANDLER_TIMEOUT: "HANDLER_TIMEOUT",
    HANDLER_ERROR: "HANDLER_ERROR",
};
//# sourceMappingURL=errors.js.map