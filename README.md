# Scheduled Task App

A Node.js application for scheduling, executing, and monitoring background tasks — with a browser UI, REST API, and Swagger docs.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Quick Start (Local)](#quick-start-local)
3. [Running Tests](#running-tests)
4. [Running with Docker](#running-with-docker)
5. [Environment Variables](#environment-variables)
6. [Project Architecture](#project-architecture)
7. [API Reference](#api-reference)
8. [Task Types](#task-types)

---

## Requirements

| Tool              | Minimum version | Notes                                |
| ----------------- | --------------- | ------------------------------------ |
| Node.js           | 22.x            | Built-in `node:sqlite` requires v22+ |
| npm               | 10.x            | Bundled with Node 22                 |
| Docker (optional) | 20.x            | For containerised deployment         |

> **Windows note:** This project has **no native build-tool dependency**. Always install packages with `--ignore-scripts` to skip node-gyp:
>
> ```powershell
> npm install --ignore-scripts
> ```

---

## Quick Start (Local)

### 1. Install dependencies

```powershell
cd fullstack-node\
npm install --ignore-scripts
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env
```

Edit `.env` as needed (see [Environment Variables](#environment-variables)). For a plain local run you can leave everything at the defaults.

### 3. Build

```powershell
npm run build
```

This compiles TypeScript from `src/` to `dist/` and copies SQL migration files into `dist/database/migrations/`.

### 4. Start the server

```powershell
npm start
```

The server starts on **http://localhost:3000**.

| URL                            | Description                |
| ------------------------------ | -------------------------- |
| http://localhost:3000          | Browser UI                 |
| http://localhost:3000/api/docs | Swagger / OpenAPI docs     |
| http://localhost:3000/health   | Health check               |
| http://localhost:3000/ready    | Readiness check (DB probe) |

### Development mode (auto-restart on save)

```powershell
npm run dev
```

Uses `ts-node-dev` — no manual build step needed during development.

---

## Running Tests

### All tests

```powershell
npm test
```

### Unit tests only

```powershell
npm run test:unit
```

### Integration tests only

```powershell
npm run test:integration
```

> Tests use an in-memory SQLite database and run serially (`--runInBand`) to avoid conflicts.

### Test suite overview

| Suite       | File                                     | What it covers                         |
| ----------- | ---------------------------------------- | -------------------------------------- |
| Unit        | `tests/unit/readFile.handler.test.ts`    | `read_file` handler logic              |
| Unit        | `tests/unit/importFiles.handler.test.ts` | CSV/JSON import handler                |
| Unit        | `tests/unit/formFill.handler.test.ts`    | Template merge handler                 |
| Unit        | `tests/unit/sendEmail.handler.test.ts`   | Email handler (mocked transporter)     |
| Integration | `tests/integration/schedule.test.ts`     | Full HTTP API via Supertest (12 tests) |

---

## Running with Docker

### 1. Set environment variables

```powershell
Copy-Item .env.example .env
# Edit .env, especially SMTP_HOST if you want email tasks to work
```

Inside a container `127.0.0.1` refers to the container itself. To reach FakeSMTP on your host:

```
SMTP_HOST=host.docker.internal
SMTP_PORT=25
```

### 2. Build and start

```powershell
# Docker Compose v2 (plugin — no hyphen)
docker compose up --build

# Docker Compose v1 (standalone — with hyphen)
docker-compose up --build
```

Check which version you have: `docker compose version` vs `docker-compose --version`.

### 3. Common commands

| Action                | v2 command                  | v1 command                  |
| --------------------- | --------------------------- | --------------------------- |
| Build + start         | `docker compose up --build` | `docker-compose up --build` |
| Start in background   | `docker compose up -d`      | `docker-compose up -d`      |
| View logs             | `docker compose logs -f`    | `docker-compose logs -f`    |
| Stop                  | `docker compose down`       | `docker-compose down`       |
| Stop + delete volumes | `docker compose down -v`    | `docker-compose down -v`    |

### Persistent volumes

| Volume         | Mount          | Contents                                |
| -------------- | -------------- | --------------------------------------- |
| `db_data`      | `/app/data`    | SQLite database                         |
| `uploads_data` | `/app/uploads` | Uploaded files for `import_files` tasks |

Volumes survive container restarts. Pass `-v` to `down` to delete them.

---

## Environment Variables

Copy `.env.example` to `.env` and adjust the values below.

| Variable              | Default                                 | Description                                          |
| --------------------- | --------------------------------------- | ---------------------------------------------------- |
| `PORT`                | `3000`                                  | HTTP server port                                     |
| `NODE_ENV`            | `development`                           | `development` or `production`                        |
| `DB_PATH`             | `./data/tasks.db`                       | Path to the SQLite database file                     |
| `UPLOADS_DIR`         | `./uploads`                             | Directory for file uploads                           |
| `SMTP_HOST`           | `127.0.0.1` (dev) / _(required)_ (prod) | SMTP server hostname                                 |
| `SMTP_PORT`           | `25` (dev) / `587` (prod)               | SMTP server port                                     |
| `SMTP_SECURE`         | `false`                                 | `true` for TLS on port 465                           |
| `SMTP_USER`           | _(blank)_                               | SMTP auth username                                   |
| `SMTP_PASS`           | _(blank)_                               | SMTP auth password                                   |
| `EMAIL_FROM`          | `Scheduler App <noreply@example.com>`   | Sender address                                       |
| `DEFAULT_MAX_RETRIES` | `3`                                     | Default retry limit per task                         |
| `DEFAULT_TIMEOUT_MS`  | `30000`                                 | Default task execution timeout (ms)                  |
| `RETRY_BASE_DELAY_MS` | `1000`                                  | Base delay for exponential backoff (ms)              |
| `LOG_LEVEL`           | `info`                                  | Winston log level (`debug`, `info`, `warn`, `error`) |

---

## Project Architecture

```
src/
├── server.ts                  # Entry point: DB init, scheduler recovery, HTTP listen
├── app.ts                     # Express factory: middleware, Swagger, routes, CSP
├── config/
│   └── index.ts               # Centralised config from environment variables
├── database/
│   ├── db.ts                  # DatabaseSync init, WAL pragma, migration runner
│   └── migrations/
│       └── 001_create_tasks.sql  # Schema: scheduled_tasks, task_logs, _migrations
├── models/
│   └── schedule.model.ts      # Zod schemas, TaskType/TaskStatus enums, domain types
├── repositories/
│   └── schedule.repository.ts # All SQLite queries (create, find, update, logs)
├── services/
│   ├── schedule.service.ts    # Business logic: create, push (idempotency), list, cancel
│   └── scheduler.service.ts   # In-memory cron/timeout registry, retry engine
├── handlers/
│   ├── base.handler.ts        # TaskHandler interface
│   ├── readFile.handler.ts    # Reads a file, returns preview
│   ├── importFiles.handler.ts # Parses CSV/JSON uploads, reports success/failures
│   ├── formFill.handler.ts    # Deep-merges a JSON template with data
│   └── sendEmail.handler.ts   # Sends email via Nodemailer SMTP
├── api/
│   ├── controllers/
│   │   └── schedule.controller.ts  # HTTP handlers, request/response mapping
│   ├── routes/
│   │   ├── schedule.routes.ts      # POST /, POST /push, GET /, GET /:id, PATCH /:id/cancel
│   │   └── health.routes.ts        # GET /health, GET /ready
│   └── middlewares/
│       ├── correlationId.middleware.ts  # Attaches X-Correlation-ID to every request
│       ├── errorHandler.middleware.ts   # Centralised AppError → HTTP response mapping
│       └── upload.middleware.ts         # Multer disk storage, MIME type allowlist, 50 MB limit
├── types/
│   └── node-sqlite.d.ts       # Type declarations for node:sqlite (DatabaseSync etc.)
└── utils/
    ├── logger.ts              # Winston logger with correlation-ID child loggers
    └── errors.ts              # AppError class and ErrorCodes enum

public/
├── index.html                 # Single-page browser UI (no inline scripts — CSP compliant)
└── app.js                     # All frontend JavaScript (event delegation, fetch API)

tests/
├── helpers/testDb.ts          # In-memory SQLite helper for integration tests
├── unit/                      # Handler unit tests (mocked FS, nodemailer, csv-parse)
└── integration/               # Full API tests via Supertest
```

### Request lifecycle

```
HTTP Request
    │
    ▼
correlationId middleware      — generates/forwards X-Correlation-ID
    │
    ▼
Express router (schedule.routes.ts)
    │
    ▼  (multipart/form-data → multer middleware)
schedule.controller.ts        — parse & validate request body
    │
    ▼
schedule.service.ts           — idempotency check, Zod payload validation, DB write
    │
    ▼
scheduler.service.ts          — register cron job or setTimeout
    │
    ▼  (at scheduled time)
handler (readFile / importFiles / formFill / sendEmail)
    │
    ▼
schedule.repository.ts        — write result / error / logs to SQLite
```

### Scheduler engine

- **One-time tasks** (`scheduleAt`): registered with `setTimeout`, firing once at the target UTC time.
- **Recurring tasks** (`cronExpr`): registered with `node-cron`, firing on the cron schedule indefinitely.
- **Recovery on startup**: any task in `pending` or `retrying` state that is not cancelled is re-registered automatically after a restart.
- **Retry with exponential backoff**: on failure, `retryCount < maxRetries` → delay = `baseDelayMs × 2^retryCount`, then re-execute. After `maxRetries` exhausted, status becomes `failed`.
- **Timeout**: each execution is wrapped in a `Promise.race` against a `setTimeout`. If the handler takes longer than `timeoutMs`, it is treated as a failure and the retry cycle begins.

### Database schema

```sql
scheduled_tasks   — one row per task (status, payload, schedule, retries, result, error)
task_logs         — append-only execution log entries (level, message, meta JSON)
_migrations       — tracks which SQL migration files have been applied
```

SQLite runs in **WAL mode** for better concurrent read performance and crash safety.

### Security

- **Helmet** with explicit CSP: `script-src 'self'`, `script-src-attr 'none'`, `connect-src 'self'`.
- **No inline scripts or event handlers** in the UI — all JS is in the external `public/app.js`.
- **Multer MIME allowlist**: only `text/csv`, `application/json`, `text/plain` accepted for uploads.
- **Non-root Docker user**: the runtime image runs as a dedicated `appuser`.
- **Zod validation** on all incoming request bodies and task payloads.

---

## API Reference

Full interactive docs are available at **http://localhost:3000/api/docs** once the server is running.

| Method  | Path                        | Description                                                        |
| ------- | --------------------------- | ------------------------------------------------------------------ |
| `GET`   | `/health`                   | Liveness check — always returns `200`                              |
| `GET`   | `/ready`                    | Readiness check — probes the DB                                    |
| `POST`  | `/api/schedules`            | Create a task (`application/json` or `multipart/form-data`)        |
| `POST`  | `/api/schedules/push`       | Idempotent upsert — returns existing task if key already used      |
| `GET`   | `/api/schedules`            | List tasks with optional `status`, `type`, `page`, `limit` filters |
| `GET`   | `/api/schedules/:id`        | Get task details + execution logs                                  |
| `PATCH` | `/api/schedules/:id/cancel` | Cancel a pending/paused/retrying task                              |

---

## Task Types

### `read_file`

Reads a file from the server filesystem and returns a preview.

```json
{
  "type": "read_file",
  "scheduleAt": "2026-06-22T10:00:00Z",
  "payload": {
    "filePath": "/absolute/path/to/file.txt",
    "encoding": "utf8",
    "previewLines": 20
  }
}
```

### `import_files`

Processes uploaded CSV or JSON files. Submit as `multipart/form-data` with one or more `files` fields.

```
POST /api/schedules
Content-Type: multipart/form-data

type=import_files
scheduleAt=2026-06-22T10:00:00Z
payload={"format":"csv"}
files=@report.csv
```

### `form_fill`

Deep-merges `data` into `template`, reports which keys were filled and which are missing.

```json
{
  "type": "form_fill",
  "scheduleAt": "2026-06-22T10:00:00Z",
  "payload": {
    "template": { "name": "", "email": "", "age": 0 },
    "data": { "name": "Alice", "email": "alice@example.com" }
  }
}
```

### `send_email`

Sends an email via the configured SMTP server. Requires `SMTP_HOST` to be set.

```json
{
  "type": "send_email",
  "scheduleAt": "2026-06-22T10:00:00Z",
  "payload": {
    "to": ["alice@example.com"],
    "subject": "Hello",
    "body": "This is a scheduled email.",
    "isHtml": false
  }
}
```
