"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../database/db");
exports.healthRouter = (0, express_1.Router)();
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
exports.healthRouter.get("/", (_req, res) => {
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
exports.healthRouter.get("/ready", (_req, res) => {
    try {
        (0, db_1.getDb)().prepare("SELECT 1").get();
        res.json({
            status: "ready",
            db: "ok",
            timestamp: new Date().toISOString(),
        });
    }
    catch {
        res
            .status(503)
            .json({
            status: "not_ready",
            db: "unavailable",
            timestamp: new Date().toISOString(),
        });
    }
});
//# sourceMappingURL=health.routes.js.map