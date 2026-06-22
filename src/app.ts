import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { getDb } from "./database/db";
import { correlationIdMiddleware } from "./api/middlewares/correlationId.middleware";
import { errorHandler } from "./api/middlewares/errorHandler.middleware";
import { scheduleRouter } from "./api/routes/schedule.routes";
import { healthRouter } from "./api/routes/health.routes";
import { logger } from "./utils/logger";

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Scheduled Task API",
      version: "1.0.0",
      description: "Node.js Scheduled Task Application",
    },
    servers: [{ url: "/api" }],
  },
  apis: [
    path.resolve(process.cwd(), "src/api/routes/**/*.ts").replace(/\\/g, "/"),
    path.resolve(process.cwd(), "dist/api/routes/**/*.js").replace(/\\/g, "/"),
  ],
};

export function createApp(): Application {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // allow inline <style> in HTML
          connectSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationIdMiddleware);

  // Request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      correlationId: req.correlationId,
    });
    next();
  });

  // Swagger docs
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

  // Routes
  app.use("/health", healthRouter);
  app.get("/ready", (_req, res) => {
    try {
      getDb().prepare("SELECT 1").get();
      res.json({
        status: "ready",
        db: "ok",
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: "not_ready",
        db: "unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  });
  app.use("/api/schedules", scheduleRouter);

  // Static UI (public/)
  app.use(express.static(path.resolve("public")));

  // 404
  app.use((_req, res) => {
    res
      .status(404)
      .json({ success: false, code: "NOT_FOUND", message: "Route not found" });
  });

  // Error handler — must be last
  app.use(errorHandler);

  return app;
}
