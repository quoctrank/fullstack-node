import fs from "fs/promises";
import path from "path";
import { TaskHandler, HandlerContext, HandlerResult } from "./base.handler";
import {
  ReadFilePayload,
  ReadFilePayloadSchema,
} from "../models/schedule.model";
import { AppError, ErrorCodes } from "../utils/errors";

export const readFileHandler: TaskHandler = {
  async execute(payload: unknown, ctx: HandlerContext): Promise<HandlerResult> {
    const parsed = ReadFilePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid payload: ${parsed.error.message}`,
      );
    }

    const { filePath, encoding, previewLines } = parsed.data;
    ctx.log("info", `Reading file: ${filePath}`);

    let content: string;
    try {
      content = await fs.readFile(filePath, encoding as BufferEncoding);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ErrorCodes.HANDLER_ERROR,
        `Failed to read file: ${message}`,
      );
    }

    const stats = await fs.stat(filePath);
    const lines = content.split("\n");
    const preview = lines.slice(0, previewLines).join("\n");

    ctx.log("info", `File read successfully`, {
      size: stats.size,
      totalLines: lines.length,
    });

    return {
      summary: `Read ${lines.length} lines (${stats.size} bytes) from ${path.basename(filePath)}`,
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
