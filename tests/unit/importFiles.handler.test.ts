import fs from "fs";
import path from "path";
import os from "os";
import { importFilesHandler } from "../../src/handlers/importFiles.handler";
import { HandlerContext } from "../../src/handlers/base.handler";

const ctx: HandlerContext = {
  taskId: "test-id",
  correlationId: "test-cid",
  log: jest.fn(),
};

describe("importFilesHandler", () => {
  let csvFile: string;
  let jsonFile: string;

  beforeAll(() => {
    csvFile = path.join(os.tmpdir(), `test-${Date.now()}.csv`);
    jsonFile = path.join(os.tmpdir(), `test-${Date.now()}.json`);
    fs.writeFileSync(csvFile, "name,age\nAlice,30\nBob,25\n");
    fs.writeFileSync(jsonFile, JSON.stringify([{ id: 1 }, { id: 2 }]));
  });

  afterAll(() => {
    // Files are deleted by handler, but cleanup just in case
    for (const f of [csvFile, jsonFile]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  });

  it("parses CSV and JSON files", async () => {
    const result = await importFilesHandler.execute(
      {
        files: [
          {
            originalName: "data.csv",
            storedPath: csvFile,
            mimeType: "text/csv",
          },
          {
            originalName: "data.json",
            storedPath: jsonFile,
            mimeType: "application/json",
          },
        ],
        format: "auto",
      },
      ctx,
    );

    const data = result.data as any;
    expect(data.total).toBe(2);
    expect(data.success).toBe(2);
    expect(data.failed).toBe(0);
    const csvResult = data.files.find(
      (f: any) => f.originalName === "data.csv",
    );
    expect(csvResult.rows).toBe(2);
    const jsonResult = data.files.find(
      (f: any) => f.originalName === "data.json",
    );
    expect(jsonResult.rows).toBe(2);
  });

  it("reports failure for invalid file path", async () => {
    const result = await importFilesHandler.execute(
      {
        files: [
          {
            originalName: "missing.csv",
            storedPath: "/nonexistent/file.csv",
            mimeType: "text/csv",
          },
        ],
      },
      ctx,
    );
    const data = result.data as any;
    expect(data.failed).toBe(1);
  });
});
