import { createApp } from "./app";
import { initDb } from "./database/db";
import { config } from "./config";
import { logger } from "./utils/logger";
import { schedulerService } from "./services/scheduler.service";
import fs from "fs";

async function main() {
  // Ensure upload directory exists
  if (!fs.existsSync(config.uploads.dir)) {
    fs.mkdirSync(config.uploads.dir, { recursive: true });
  }

  // Initialize database
  initDb();

  // Recover tasks that were scheduled before restart
  await schedulerService.recoverOnStartup();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
    logger.info(`API docs: http://localhost:${config.port}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    schedulerService.stopAll();
    server.close(() => {
      logger.info("HTTP server closed");
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
