import request from "supertest";
import path from "path";
import os from "os";
import fs from "fs";
import Database from "better-sqlite3";

// ── Set env before any app modules are imported ───────────────────────────────
const testDbPath = path.join(os.tmpdir(), `integration-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.LOG_LEVEL = "silent";

// ── Bootstrap app after env is set ───────────────────────────────────────────
import { initDb, getDb } from "../../src/database/db";
import { createApp } from "../../src/app";
import { schedulerService } from "../../src/services/scheduler.service";

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  initDb();
  app = createApp();
});

afterAll(() => {
  schedulerService.stopAll();
  getDb().close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Health endpoints", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /api/schedules — create task", () => {
  it("creates a form_fill task", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const res = await request(app)
      .post("/api/schedules")
      .send({
        type: "form_fill",
        payload: { template: { name: "" }, data: { name: "Alice" } },
        scheduleAt: future,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe("form_fill");
    expect(res.body.data.status).toBe("pending");
  });

  it("returns 400 for missing scheduleAt/cronExpr", async () => {
    const res = await request(app)
      .post("/api/schedules")
      .send({ type: "form_fill", payload: { template: {}, data: {} } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid payload type", async () => {
    const res = await request(app)
      .post("/api/schedules")
      .send({
        type: "send_email",
        payload: { to: ["not-an-email"], subject: "x", body: "y" },
        scheduleAt: new Date(Date.now() + 60_000).toISOString(),
      });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/schedules/push — idempotency", () => {
  it("returns same task on duplicate key", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const payload = {
      type: "form_fill",
      payload: { template: { x: "" }, data: { x: "1" } },
      scheduleAt: future,
      idempotencyKey: `idem-${Date.now()}`,
    };

    const res1 = await request(app).post("/api/schedules/push").send(payload);
    const res2 = await request(app).post("/api/schedules/push").send(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(200);
    expect(res1.body.data.id).toBe(res2.body.data.id);
    expect(res2.body.created).toBe(false);
  });
});

describe("GET /api/schedules", () => {
  it("returns a paginated list", async () => {
    const res = await request(app).get("/api/schedules");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe("number");
  });

  it("filters by type", async () => {
    const res = await request(app).get("/api/schedules?type=form_fill");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => expect(t.type).toBe("form_fill"));
  });
});

describe("GET /api/schedules/:id", () => {
  let taskId: string;

  beforeAll(async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const res = await request(app)
      .post("/api/schedules")
      .send({
        type: "form_fill",
        payload: { template: { a: "" }, data: { a: "1" } },
        scheduleAt: future,
      });
    taskId = res.body.data.id;
  });

  it("returns task with logs", async () => {
    const res = await request(app).get(`/api/schedules/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/schedules/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/schedules/:id/cancel", () => {
  it("cancels a pending task", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const create = await request(app)
      .post("/api/schedules")
      .send({
        type: "form_fill",
        payload: { template: { a: "" }, data: { a: "1" } },
        scheduleAt: future,
      });

    const id = create.body.data.id;
    const cancel = await request(app).patch(`/api/schedules/${id}/cancel`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe("cancelled");
  });

  it("returns 409 when cancelling an already-cancelled task", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const create = await request(app)
      .post("/api/schedules")
      .send({
        type: "form_fill",
        payload: { template: { a: "" }, data: { a: "1" } },
        scheduleAt: future,
      });

    const id = create.body.data.id;
    await request(app).patch(`/api/schedules/${id}/cancel`);
    const res2 = await request(app).patch(`/api/schedules/${id}/cancel`);
    expect(res2.status).toBe(409);
  });
});

describe("Task execution (smoke test)", () => {
  it("executes a form_fill task and sets status to success", async () => {
    const past = new Date(Date.now() - 100).toISOString();
    const res = await request(app)
      .post("/api/schedules")
      .send({
        type: "form_fill",
        payload: { template: { greeting: "" }, data: { greeting: "Hello!" } },
        scheduleAt: past,
      });

    expect(res.status).toBe(201);
    const id = res.body.data.id;

    // Give the scheduled task time to execute
    await new Promise((r) => setTimeout(r, 500));

    const detail = await request(app).get(`/api/schedules/${id}`);
    expect(detail.body.data.status).toBe("success");
    expect(detail.body.data.result).toBeTruthy();
  });
});
