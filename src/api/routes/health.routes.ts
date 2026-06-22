import { Router, Request, Response } from "express";
import { getDb } from "../../database/db";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
healthRouter.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * @openapi
 * /ready:
 *   get:
 *     summary: Readiness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service not ready
 */
healthRouter.get("/ready", (_req: Request, res: Response) => {
  try {
    getDb().prepare("SELECT 1").get();
    res.json({
      status: "ready",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res
      .status(503)
      .json({
        status: "not_ready",
        db: "unavailable",
        timestamp: new Date().toISOString(),
      });
  }
});
