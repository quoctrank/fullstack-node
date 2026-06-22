"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
function errorHandler(err, req, res, _next) {
    const correlationId = req.correlationId ?? "unknown";
    if (err instanceof errors_1.AppError) {
        logger_1.logger.warn(`[${correlationId}] AppError: ${err.code} - ${err.message}`);
        res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
            correlationId,
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        logger_1.logger.warn(`[${correlationId}] Validation error`, { issues: err.issues });
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
    logger_1.logger.error(`[${correlationId}] Unhandled error`, { err });
    res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message,
        correlationId,
    });
}
//# sourceMappingURL=errorHandler.middleware.js.map