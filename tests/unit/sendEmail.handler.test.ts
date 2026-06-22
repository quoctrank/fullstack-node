import { sendEmailHandler } from "../../src/handlers/sendEmail.handler";
import { HandlerContext } from "../../src/handlers/base.handler";
import nodemailer from "nodemailer";

jest.mock("nodemailer");

const ctx: HandlerContext = {
  taskId: "test-id",
  correlationId: "test-cid",
  log: jest.fn(),
};

describe("sendEmailHandler", () => {
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue({
      messageId: "<test@example.com>",
      accepted: ["recipient@example.com"],
      rejected: [],
      envelope: {},
    });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  it("sends email and returns result", async () => {
    const result = await sendEmailHandler.execute(
      {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: "Hello world",
        isHtml: false,
      },
      ctx,
    );

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect((result.data as any).messageId).toBe("<test@example.com>");
    expect((result.data as any).accepted).toContain("recipient@example.com");
  });

  it("throws on SMTP error", async () => {
    sendMailMock.mockRejectedValue(new Error("SMTP connection refused"));
    await expect(
      sendEmailHandler.execute(
        { to: ["a@b.com"], subject: "Hi", body: "Body" },
        ctx,
      ),
    ).rejects.toThrow("Email send failed");
  });

  it("throws on invalid payload", async () => {
    await expect(
      sendEmailHandler.execute(
        { to: ["not-an-email"], subject: "Hi", body: "Body" },
        ctx,
      ),
    ).rejects.toThrow();
  });
});
