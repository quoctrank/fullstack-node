"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailHandler = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const schedule_model_1 = require("../models/schedule.model");
const errors_1 = require("../utils/errors");
const config_1 = require("../config");
exports.sendEmailHandler = {
    async execute(payload, ctx) {
        const parsed = schedule_model_1.SendEmailPayloadSchema.safeParse(payload);
        if (!parsed.success) {
            throw new errors_1.AppError(errors_1.ErrorCodes.VALIDATION_ERROR, `Invalid payload: ${parsed.error.message}`);
        }
        const { to, cc, bcc, subject, body, isHtml } = parsed.data;
        ctx.log("info", `Sending email to ${to.join(", ")}`);
        if (!config_1.config.email.host) {
            throw new errors_1.AppError(errors_1.ErrorCodes.HANDLER_ERROR, "Email send failed: SMTP is not configured. Set SMTP_HOST before running send_email tasks.");
        }
        const transporter = nodemailer_1.default.createTransport({
            host: config_1.config.email.host,
            port: config_1.config.email.port,
            secure: config_1.config.email.secure,
            auth: config_1.config.email.user
                ? { user: config_1.config.email.user, pass: config_1.config.email.pass }
                : undefined,
        });
        let info;
        try {
            info = await transporter.sendMail({
                from: config_1.config.email.from,
                to: to.join(", "),
                cc: cc?.join(", "),
                bcc: bcc?.join(", "),
                subject,
                [isHtml ? "html" : "text"]: body,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new errors_1.AppError(errors_1.ErrorCodes.HANDLER_ERROR, `Email send failed: ${message}`);
        }
        ctx.log("info", "Email sent successfully", {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        });
        return {
            summary: `Email sent to ${to.length} recipient(s)`,
            data: {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                envelope: info.envelope,
            },
        };
    },
};
//# sourceMappingURL=sendEmail.handler.js.map