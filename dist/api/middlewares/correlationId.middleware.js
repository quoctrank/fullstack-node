"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = correlationIdMiddleware;
const uuid_1 = require("uuid");
function correlationIdMiddleware(req, res, next) {
    const existing = req.headers["x-correlation-id"];
    req.correlationId =
        (Array.isArray(existing) ? existing[0] : existing) ?? (0, uuid_1.v4)();
    res.setHeader("x-correlation-id", req.correlationId);
    next();
}
//# sourceMappingURL=correlationId.middleware.js.map