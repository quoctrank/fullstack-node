"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileHandler = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const schedule_model_1 = require("../models/schedule.model");
const errors_1 = require("../utils/errors");
exports.readFileHandler = {
    async execute(payload, ctx) {
        const parsed = schedule_model_1.ReadFilePayloadSchema.safeParse(payload);
        if (!parsed.success) {
            throw new errors_1.AppError(errors_1.ErrorCodes.VALIDATION_ERROR, `Invalid payload: ${parsed.error.message}`);
        }
        const { filePath, encoding, previewLines } = parsed.data;
        ctx.log("info", `Reading file: ${filePath}`);
        let content;
        try {
            content = await promises_1.default.readFile(filePath, encoding);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new errors_1.AppError(errors_1.ErrorCodes.HANDLER_ERROR, `Failed to read file: ${message}`);
        }
        const stats = await promises_1.default.stat(filePath);
        const lines = content.split("\n");
        const preview = lines.slice(0, previewLines).join("\n");
        ctx.log("info", `File read successfully`, {
            size: stats.size,
            totalLines: lines.length,
        });
        return {
            summary: `Read ${lines.length} lines (${stats.size} bytes) from ${path_1.default.basename(filePath)}`,
            data: {
                filePath,
                fileSize: stats.size,
                totalLines: lines.length,
                preview,
                encoding,
            },
        };
    },
};
//# sourceMappingURL=readFile.handler.js.map