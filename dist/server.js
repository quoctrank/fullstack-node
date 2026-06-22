"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./database/db");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const scheduler_service_1 = require("./services/scheduler.service");
const fs_1 = __importDefault(require("fs"));
async function main() {
    // Ensure upload directory exists
    if (!fs_1.default.existsSync(config_1.config.uploads.dir)) {
        fs_1.default.mkdirSync(config_1.config.uploads.dir, { recursive: true });
    }
    // Initialize database
    (0, db_1.initDb)();
    // Recover tasks that were scheduled before restart
    await scheduler_service_1.schedulerService.recoverOnStartup();
    const app = (0, app_1.createApp)();
    const server = app.listen(config_1.config.port, () => {
        logger_1.logger.info(`Server running on port ${config_1.config.port} [${config_1.config.nodeEnv}]`);
        logger_1.logger.info(`API docs: http://localhost:${config_1.config.port}/api/docs`);
    });
    const shutdown = async (signal) => {
        logger_1.logger.info(`Received ${signal}, shutting down gracefully`);
        scheduler_service_1.schedulerService.stopAll();
        server.close(() => {
            logger_1.logger.info("HTTP server closed");
            process.exit(0);
        });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
main().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map