"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formFillHandler = void 0;
const schedule_model_1 = require("../models/schedule.model");
const errors_1 = require("../utils/errors");
function deepMerge(template, data) {
    const result = { ...template };
    for (const key of Object.keys(data)) {
        if (typeof data[key] === "object" &&
            data[key] !== null &&
            !Array.isArray(data[key]) &&
            typeof template[key] === "object" &&
            template[key] !== null &&
            !Array.isArray(template[key])) {
            result[key] = deepMerge(template[key], data[key]);
        }
        else {
            result[key] = data[key];
        }
    }
    return result;
}
exports.formFillHandler = {
    async execute(payload, ctx) {
        const parsed = schedule_model_1.FormFillPayloadSchema.safeParse(payload);
        if (!parsed.success) {
            throw new errors_1.AppError(errors_1.ErrorCodes.VALIDATION_ERROR, `Invalid payload: ${parsed.error.message}`);
        }
        const { template, data } = parsed.data;
        ctx.log("info", "Filling form template");
        const filled = deepMerge(template, data);
        // Check all template keys are present in output
        const templateKeys = Object.keys(template);
        const missingKeys = templateKeys.filter((k) => !(k in filled));
        if (missingKeys.length > 0) {
            ctx.log("warn", `Some template keys have no values: ${missingKeys.join(", ")}`);
        }
        const filledCount = templateKeys.filter((k) => k in data).length;
        ctx.log("info", `Filled ${filledCount}/${templateKeys.length} template fields`);
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
//# sourceMappingURL=formFill.handler.js.map