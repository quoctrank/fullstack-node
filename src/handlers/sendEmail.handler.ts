import nodemailer from "nodemailer";
import { TaskHandler, HandlerContext, HandlerResult } from "./base.handler";
import { SendEmailPayloadSchema } from "../models/schedule.model";
import { AppError, ErrorCodes } from "../utils/errors";
import { config } from "../config";

export const sendEmailHandler: TaskHandler = {
  async execute(payload: unknown, ctx: HandlerContext): Promise<HandlerResult> {
    const parsed = SendEmailPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid payload: ${parsed.error.message}`,
      );
    }

    const { to, cc, bcc, subject, body, isHtml } = parsed.data;
    ctx.log("info", `Sending email to ${to.join(", ")}`);

    if (!config.email.host) {
      throw new AppError(
        ErrorCodes.HANDLER_ERROR,
        "Email send failed: SMTP is not configured. Set SMTP_HOST before running send_email tasks.",
      );
    }

    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user
        ? { user: config.email.user, pass: config.email.pass }
        : undefined,
    });

    let info: nodemailer.SentMessageInfo;
    try {
      info = await transporter.sendMail({
        from: config.email.from,
        to: to.join(", "),
        cc: cc?.join(", "),
        bcc: bcc?.join(", "),
        subject,
        [isHtml ? "html" : "text"]: body,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ErrorCodes.HANDLER_ERROR,
        `Email send failed: ${message}`,
      );
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
