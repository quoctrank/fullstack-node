"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFilesHandler = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("csv-parse/sync");
const schedule_model_1 = require("../models/schedule.model");
const errors_1 = require("../utils/errors");
exports.importFilesHandler = {
    async execute(payload, ctx) {
        const parsed = schedule_model_1.ImportFilesPayloadSchema.safeParse(payload);
        if (!parsed.success) {
            throw new errors_1.AppError(errors_1.ErrorCodes.VALIDATION_ERROR, `Invalid payload: ${parsed.error.message}`);
        }
        const { files, format } = parsed.data;
        ctx.log("info", `Importing ${files.length} files`);
        const results = [];
        let successCount = 0;
        let failCount = 0;
        for (const file of files) {
            try {
                const content = await promises_1.default.readFile(file.storedPath, "utf-8");
                const detectedFormat = resolveFormat(file.originalName, file.mimeType, format);
                let rows = 0;
                if (detectedFormat === "csv") {
                    const records = (0, sync_1.parse)(content, {
                        columns: true,
                        skip_empty_lines: true,
                    });
                    rows = records.length;
                }
                else if (detectedFormat === "json") {
                    const data = JSON.parse(content);
                    rows = Array.isArray(data) ? data.length : 1;
                }
                else {
                    rows = content.split("\n").filter(Boolean).length;
                }
                results.push({
                    originalName: file.originalName,
                    status: "success",
                    rows,
                });
                successCount++;
                ctx.log("info", `Imported ${file.originalName}: ${rows} rows`);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                results.push({
                    originalName: file.originalName,
                    status: "failed",
                    error: message,
                });
                failCount++;
                ctx.log("warn", `Failed to import ${file.originalName}: ${message}`);
            }
            // Clean up uploaded file after processing
            try {
                await promises_1.default.unlink(file.storedPath);
            }
            catch {
                // Best-effort cleanup
            }
        }
        return {
            summary: `Imported ${files.length} files: ${successCount} success, ${failCount} failed`,
            data: {
                total: files.length,
                success: successCount,
                failed: failCount,
                files: results,
            },
        };
    },
};
function resolveFormat(originalName, mimeType, requested) {
    if (requested !== "auto")
        return requested;
    const ext = path_1.default.extname(originalName).toLowerCase();
    if (ext === ".csv" || mimeType === "text/csv")
        return "csv";
    if (ext === ".json" || mimeType === "application/json")
        return "json";
    return "text";
}
//# sourceMappingURL=importFiles.handler.js.map