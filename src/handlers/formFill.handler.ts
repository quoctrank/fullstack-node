import { TaskHandler, HandlerContext, HandlerResult } from "./base.handler";
import { FormFillPayloadSchema } from "../models/schedule.model";
import { AppError, ErrorCodes } from "../utils/errors";

function deepMerge(
  template: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...template };
  for (const key of Object.keys(data)) {
    if (
      typeof data[key] === "object" &&
      data[key] !== null &&
      !Array.isArray(data[key]) &&
      typeof template[key] === "object" &&
      template[key] !== null &&
      !Array.isArray(template[key])
    ) {
      result[key] = deepMerge(
        template[key] as Record<string, unknown>,
        data[key] as Record<string, unknown>,
      );
    } else {
      result[key] = data[key];
    }
  }
  return result;
}

export const formFillHandler: TaskHandler = {
  async execute(payload: unknown, ctx: HandlerContext): Promise<HandlerResult> {
    const parsed = FormFillPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid payload: ${parsed.error.message}`,
      );
    }

    const { template, data } = parsed.data;
    ctx.log("info", "Filling form template");

    const filled = deepMerge(
      template as Record<string, unknown>,
      data as Record<string, unknown>,
    );

    // Check all template keys are present in output
    const templateKeys = Object.keys(template);
    const missingKeys = templateKeys.filter((k) => !(k in filled));
    if (missingKeys.length > 0) {
      ctx.log(
        "warn",
        `Some template keys have no values: ${missingKeys.join(", ")}`,
      );
    }

    const filledCount = templateKeys.filter((k) => k in data).length;
    ctx.log(
      "info",
      `Filled ${filledCount}/${templateKeys.length} template fields`,
    );

    return {
      summary: `Filled ${filledCount}/${templateKeys.length} fields`,
      data: {
        filled,
        filledCount,
        totalFields: templateKeys.length,
        missingKeys,
      },
    };
  },
};
