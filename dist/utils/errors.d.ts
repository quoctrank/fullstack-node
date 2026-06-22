export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, message: string, statusCode?: number);
}
export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly TASK_ALREADY_CANCELLED: "TASK_ALREADY_CANCELLED";
    readonly TASK_NOT_CANCELLABLE: "TASK_NOT_CANCELLABLE";
    readonly HANDLER_TIMEOUT: "HANDLER_TIMEOUT";
    readonly HANDLER_ERROR: "HANDLER_ERROR";
};
//# sourceMappingURL=errors.d.ts.map