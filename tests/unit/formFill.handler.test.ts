import { formFillHandler } from "../../src/handlers/formFill.handler";
import { HandlerContext } from "../../src/handlers/base.handler";

const ctx: HandlerContext = {
  taskId: "test-id",
  correlationId: "test-cid",
  log: jest.fn(),
};

describe("formFillHandler", () => {
  it("merges data into template", async () => {
    const result = await formFillHandler.execute(
      {
        template: { name: "", age: 0, address: { city: "", zip: "" } },
        data: { name: "Alice", address: { city: "NY" } },
      },
      ctx,
    );

    expect(result.data).toMatchObject({
      filled: { name: "Alice", age: 0, address: { city: "NY", zip: "" } },
      filledCount: 2,
      totalFields: 3,
    });
  });

  it("reports missing keys", async () => {
    const result = await formFillHandler.execute(
      {
        template: { name: "", email: "" },
        data: { name: "Bob" },
      },
      ctx,
    );
    expect((result.data as any).missingKeys).toEqual([]);
    expect((result.data as any).filled.name).toBe("Bob");
  });

  it("throws on invalid payload", async () => {
    await expect(
      formFillHandler.execute({ bad: "payload" }, ctx),
    ).rejects.toThrow();
  });
});
