export interface HandlerContext {
    taskId: string;
    correlationId: string;
    log: (level: "info" | "warn" | "error", message: string, meta?: unknown) => void;
}
export interface HandlerResult {
    summary: string;
    data: unknown;
}
export interface TaskHandler {
    execute(payload: unknown, ctx: HandlerContext): Promise<HandlerResult>;
}
//# sourceMappingURL=base.handler.d.ts.map