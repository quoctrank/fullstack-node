"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.childLogger = childLogger;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const { combine, timestamp, json, colorize, printf, errors } = winston_1.default.format;
const devFormat = combine(colorize(), timestamp({ format: "HH:mm:ss" }), errors({ stack: true }), printf(({ level, message, timestamp, correlationId, ...meta }) => {
    const cid = correlationId ? ` [${correlationId}]` : "";
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}${cid}: ${message}${extra}`;
}));
const prodFormat = combine(timestamp(), errors({ stack: true }), json());
exports.logger = winston_1.default.createLogger({
    level: config_1.config.log.level,
    format: config_1.config.nodeEnv === "production" ? prodFormat : devFormat,
    transports: [new winston_1.default.transports.Console()],
});
/** Returns a child logger bound to a specific correlationId */
function childLogger(correlationId) {
    return exports.logger.child({ correlationId });
}
//# sourceMappingURL=logger.js.map