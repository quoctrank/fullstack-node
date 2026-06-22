"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRouter = void 0;
const express_1 = require("express");
const schedule_controller_1 = require("../controllers/schedule.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
exports.scheduleRouter = (0, express_1.Router)();
/**
 * @openapi
 * /schedules:
 *   post:
 *     summary: Create a scheduled task
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [import_files]
 *               scheduleAt:
 *                 type: string
 *               cronExpr:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Task created
 *       400:
 *         description: Validation error
 */
exports.scheduleRouter.post("/", upload_middleware_1.upload.array("files", 20), schedule_controller_1.scheduleController.createTask);
/**
 * @openapi
 * /schedules/push:
 *   post:
 *     summary: Push a task from an external system
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       200:
 *         description: Existing task returned (idempotent)
 *       201:
 *         description: Task created
 */
exports.scheduleRouter.post("/push", schedule_controller_1.scheduleController.pushTask);
/**
 * @openapi
 * /schedules:
 *   get:
 *     summary: List tasks
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, success, failed, retrying, cancelled, paused]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [read_file, import_files, form_fill, send_email]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated task list
 */
exports.scheduleRouter.get("/", schedule_controller_1.scheduleController.listTasks);
/**
 * @openapi
 * /schedules/{id}:
 *   get:
 *     summary: Get task details and logs
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details with logs
 *       404:
 *         description: Task not found
 */
exports.scheduleRouter.get("/:id", schedule_controller_1.scheduleController.getTask);
/**
 * @openapi
 * /schedules/{id}/cancel:
 *   patch:
 *     summary: Cancel a task
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task cancelled
 *       409:
 *         description: Task cannot be cancelled
 */
exports.scheduleRouter.patch("/:id/cancel", schedule_controller_1.scheduleController.cancelTask);
//# sourceMappingURL=schedule.routes.js.map