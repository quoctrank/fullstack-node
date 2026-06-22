import fs from "fs";
import path from "path";
import os from "os";
import { readFileHandler } from "../../src/handlers/readFile.handler";
import { HandlerContext } from "../../src/handlers/base.handler";

const ctx: HandlerContext = {
  taskId: "test-id",
  correlationId: "test-cid",
  log: jest.fn(),
};

describe("readFileHandler", () => {
  let tmpFile: string;

  beforeAll(() => {
    tmpFile = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "line1\nline2\nline3\n");
  });

  afterAll(() => {
    fs.unlinkSync(tmpFile);
  });

  it("reads file and returns metadata", async () => {
    const result = await readFileHandler.execute({ filePath: tmpFile }, ctx);
    expect(result.data).toMatchObject({ totalLines: 4, encoding: "utf8" });
    expect((result.data as any).preview).toContain("line1");
  });

  it("throws on missing file", async () => {
    await expect(
      readFileHandler.execute({ filePath: "/nonexistent/path/file.txt" }, ctx),
    ).rejects.toThrow();
  });

  it("throws on invalid payload", async () => {
    await expect(readFileHandler.execute({}, ctx)).rejects.toThrow();
  });
});
