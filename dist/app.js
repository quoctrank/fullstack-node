"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./database/db");
const correlationId_middleware_1 = require("./api/middlewares/correlationId.middleware");
const errorHandler_middleware_1 = require("./api/middlewares/errorHandler.middleware");
const schedule_routes_1 = require("./api/routes/schedule.routes");
const health_routes_1 = require("./api/routes/health.routes");
const logger_1 = require("./utils/logger");
const swaggerOptions = {
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
        path_1.default.resolve(process.cwd(), "src/api/routes/**/*.ts").replace(/\\/g, "/"),
        path_1.default.resolve(process.cwd(), "dist/api/routes/**/*.js").replace(/\\/g, "/"),
    ],
};
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)({
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
    }));
    app.use((0, cors_1.default)());
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(correlationId_middleware_1.correlationIdMiddleware);
    // Request logging
    app.use((req, _res, next) => {
        logger_1.logger.info(`${req.method} ${req.path}`, {
            correlationId: req.correlationId,
        });
        next();
    });
    // Swagger docs
    const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
    app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
    app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
    // Routes
    app.use("/health", health_routes_1.healthRouter);
    app.get("/ready", (_req, res) => {
        try {
            (0, db_1.getDb)().prepare("SELECT 1").get();
            res.json({
                status: "ready",
                db: "ok",
                timestamp: new Date().toISOString(),
            });
        }
        catch {
            res.status(503).json({
                status: "not_ready",
                db: "unavailable",
                timestamp: new Date().toISOString(),
            });
        }
    });
    app.use("/api/schedules", schedule_routes_1.scheduleRouter);
    // Static UI (public/)
    app.use(express_1.default.static(path_1.default.resolve("public")));
    // 404
    app.use((_req, res) => {
        res
            .status(404)
            .json({ success: false, code: "NOT_FOUND", message: "Route not found" });
    });
    // Error handler — must be last
    app.use(errorHandler_middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map