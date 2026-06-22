"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
function requireEnv(key, fallback) {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
exports.config = {
    port: parseInt(process.env.PORT ?? "3000", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    db: {
        path: path_1.default.resolve(process.env.DB_PATH ?? "./data/tasks.db"),
    },
    uploads: {
        dir: path_1.default.resolve(process.env.UPLOADS_DIR ?? "./uploads"),
    },
    email: {
        host: process.env.SMTP_HOST?.trim() ||
            (process.env.NODE_ENV === "production" ? "" : "127.0.0.1"),
        port: parseInt(process.env.SMTP_PORT ??
            (process.env.NODE_ENV === "production" ? "587" : "25"), 10),
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
        from: process.env.EMAIL_FROM ?? "Scheduler App <noreply@example.com>",
    },
    retry: {
        defaultMaxRetries: parseInt(process.env.DEFAULT_MAX_RETRIES ?? "3", 10),
        defaultTimeoutMs: parseInt(process.env.DEFAULT_TIMEOUT_MS ?? "30000", 10),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS ?? "1000", 10),
    },
    log: {
        level: process.env.LOG_LEVEL ?? "info",
    },
};
//# sourceMappingURL=index.js.map