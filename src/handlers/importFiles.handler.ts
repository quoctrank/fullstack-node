import fs from "fs/promises";
import path from "path";
import { parse as parseCsv } from "csv-parse/sync";
import { TaskHandler, HandlerContext, HandlerResult } from "./base.handler";
import {
  ImportFilesPayload,
  ImportFilesPayloadSchema,
} from "../models/schedule.model";
import { AppError, ErrorCodes } from "../utils/errors";

interface FileResult {
  originalName: string;
  status: "success" | "failed";
  rows?: number;
  error?: string;
}

export const importFilesHandler: TaskHandler = {
  async execute(payload: unknown, ctx: HandlerContext): Promise<HandlerResult> {
    const parsed = ImportFilesPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid payload: ${parsed.error.message}`,
      );
    }

    const { files, format } = parsed.data;
    ctx.log("info", `Importing ${files.length} files`);

    const results: FileResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const content = await fs.readFile(file.storedPath, "utf-8");
        const detectedFormat = resolveFormat(
          file.originalName,
          file.mimeType,
          format,
        );

        let rows = 0;
        if (detectedFormat === "csv") {
          const records = parseCsv(content, {
            columns: true,
            skip_empty_lines: true,
          });
          rows = records.length;
        } else if (detectedFormat === "json") {
          const data = JSON.parse(content);
          rows = Array.isArray(data) ? data.length : 1;
        } else {
          rows = content.split("\n").filter(Boolean).length;
        }

        results.push({
          originalName: file.originalName,
          status: "success",
          rows,
        });
        successCount++;
        ctx.log("info", `Imported ${file.originalName}: ${rows} rows`);
      } catch (err: unknown) {
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
        await fs.unlink(file.storedPath);
      } catch {
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

function resolveFormat(
  originalName: string,
  mimeType: string,
  requested: string,
): string {
  if (requested !== "auto") return requested;
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".csv" || mimeType === "text/csv") return "csv";
  if (ext === ".json" || mimeType === "application/json") return "json";
  return "text";
}
