const API = "/api/schedules";
const state = {
  page: 1,
  filterStatus: "",
  filterType: "",
  total: 0,
  limit: 20,
};
let autoRefreshHandle = null;

// ── Health ────────────────────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const r = await fetch("/health");
    const ok = r.ok;
    document.getElementById("health-dot").className =
      "health-dot " + (ok ? "healthy" : "unhealthy");
    document.getElementById("health-label").textContent = ok
      ? "Healthy"
      : "Unhealthy";
  } catch {
    document.getElementById("health-dot").className = "health-dot unhealthy";
    document.getElementById("health-label").textContent = "Offline";
  }
}

// ── Load & render tasks ───────────────────────────────────────────────────────
async function loadTasks() {
  const btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  btn.textContent = "↻ Loading…";

  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.filterStatus) params.set("status", state.filterStatus);
  if (state.filterType) params.set("type", state.filterType);

  try {
    const r = await fetch(`${API}?${params}`);
    const json = await r.json();
    state.total = json.total ?? 0;
    renderTasks(json.data ?? []);
    renderPagination();
    scheduleAutoRefresh(json.data ?? []);
  } catch (e) {
    document.getElementById("task-tbody").innerHTML =
      `<tr><td colspan="7"><div class="empty-state"><div class="icon">⚠️</div><strong>Failed to load tasks</strong><p>${esc(e.message)}</p></div></td></tr>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "↻ Refresh";
  }
}

function applyFilters() {
  state.filterStatus = document.getElementById("filter-status").value;
  state.filterType = document.getElementById("filter-type").value;
  state.page = 1;
  loadTasks();
}

function renderTasks(tasks) {
  const tbody = document.getElementById("task-tbody");
  if (!tasks.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">🗂</div><strong>No tasks found</strong><p>Create your first scheduled task using the button above.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = tasks
    .map((t) => {
      const schedule = t.cronExpr
        ? `<code>${esc(t.cronExpr)}</code>`
        : t.scheduleAt
          ? fmtDate(t.scheduleAt)
          : "—";
      const cancellable = ["pending", "paused", "retrying"].includes(t.status);
      return `
      <tr data-task-id="${esc(t.id)}" style="cursor:pointer">
        <td class="id-cell" title="${esc(t.id)}">${t.id.slice(0, 8)}…</td>
        <td><span class="type-tag">${esc(t.type)}</span></td>
        <td><span class="badge ${t.status}">${t.status}</span></td>
        <td style="font-size:12px">${schedule}</td>
        <td style="color:var(--text-muted)">${t.retryCount} / ${t.maxRetries}</td>
        <td style="color:var(--text-muted);font-size:12px">${fmtDate(t.createdAt)}</td>
        <td class="js-action-cell">
          ${cancellable ? `<button class="btn danger sm" data-cancel-id="${esc(t.id)}">Cancel</button>` : ""}
        </td>
      </tr>`;
    })
    .join("");
}

function renderPagination() {
  const totalPages = Math.ceil(state.total / state.limit) || 1;
  const from = Math.min((state.page - 1) * state.limit + 1, state.total);
  const to = Math.min(state.page * state.limit, state.total);
  document.getElementById("pagination").innerHTML = `
    <span>${state.total === 0 ? "No tasks" : `Showing ${from}–${to} of ${state.total}`}</span>
    <div class="page-btns">
      <button class="btn" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>‹ Prev</button>
      <button class="btn" style="min-width:64px;justify-content:center;cursor:default">${state.page} / ${totalPages}</button>
      <button class="btn" data-page="${state.page + 1}" ${state.page >= totalPages ? "disabled" : ""}>Next ›</button>
    </div>`;
}

function goPage(p) {
  state.page = p;
  loadTasks();
}

// ── Auto-refresh when tasks are active ───────────────────────────────────────
function scheduleAutoRefresh(tasks) {
  clearTimeout(autoRefreshHandle);
  const hasActive = tasks.some((t) =>
    ["running", "retrying"].includes(t.status),
  );
  if (hasActive) {
    autoRefreshHandle = setTimeout(() => loadTasks(), 4000);
  }
}

// ── Task Detail ───────────────────────────────────────────────────────────────
async function openDetail(id) {
  document.getElementById("detail-overlay").classList.remove("hidden");
  document.getElementById("detail-body").innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';
  document.getElementById("detail-footer").innerHTML = "";

  try {
    const r = await fetch(`${API}/${id}`);
    const json = await r.json();
    if (!json.success) throw new Error(json.message);
    const t = json.data;
    const logs = json.logs ?? [];
    const cancellable = ["pending", "paused", "retrying"].includes(t.status);

    document.getElementById("detail-body").innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><label>ID</label><code>${esc(t.id)}</code></div>
        <div class="detail-item"><label>Status</label><span class="badge ${t.status}">${t.status}</span></div>
        <div class="detail-item"><label>Type</label><span class="type-tag">${esc(t.type)}</span></div>
        <div class="detail-item"><label>Retries</label>${t.retryCount} / ${t.maxRetries}</div>
        <div class="detail-item"><label>Schedule At</label>${t.scheduleAt ? fmtDate(t.scheduleAt) : "—"}</div>
        <div class="detail-item"><label>Cron</label>${t.cronExpr ? `<code>${esc(t.cronExpr)}</code>` : "—"}</div>
        <div class="detail-item"><label>Executed At</label>${t.executedAt ? fmtDate(t.executedAt) : "—"}</div>
        <div class="detail-item"><label>Timeout</label>${t.timeoutMs} ms</div>
        <div class="detail-item"><label>Created</label>${fmtDate(t.createdAt)}</div>
        <div class="detail-item"><label>Updated</label>${fmtDate(t.updatedAt)}</div>
        ${t.idempotencyKey ? `<div class="detail-item" style="grid-column:span 2"><label>Idempotency Key</label><code>${esc(t.idempotencyKey)}</code></div>` : ""}
        ${t.correlationId ? `<div class="detail-item" style="grid-column:span 2"><label>Correlation ID</label><code>${esc(t.correlationId)}</code></div>` : ""}
      </div>
      ${t.error ? `<div class="error-box"><strong>Error:</strong> ${esc(t.error)}</div>` : ""}
      <div style="margin-bottom:16px">
        <div class="logs-label">Payload</div>
        <div class="json-block">${esc(JSON.stringify(t.payload, null, 2))}</div>
      </div>
      ${
        t.result
          ? `<div style="margin-bottom:16px">
        <div class="logs-label">Result</div>
        <div class="json-block">${esc(JSON.stringify(t.result, null, 2))}</div>
      </div>`
          : ""
      }
      <div>
        <div class="logs-label">Execution Logs (${logs.length})</div>
        ${
          logs.length
            ? `<div class="log-list">${logs
                .map(
                  (l) =>
                    `<div class="log-entry ${l.level}">[${fmtTime(l.createdAt)}] [${l.level.toUpperCase()}] ${esc(l.message)}</div>`,
                )
                .join("")}</div>`
            : '<p class="text-muted" style="font-size:12px;margin-top:4px">No logs yet.</p>'
        }
      </div>`;

    document.getElementById("detail-footer").innerHTML = `
      ${cancellable ? `<button class="btn danger" data-cancel-id="${esc(t.id)}" data-from-detail="true">Cancel Task</button>` : ""}
      <button class="btn" data-close-modal="detail-overlay">Close</button>`;
  } catch (e) {
    document.getElementById("detail-body").innerHTML =
      `<p class="text-muted">Failed to load: ${esc(e.message)}</p>`;
  }
}

// ── Cancel ────────────────────────────────────────────────────────────────────
async function cancelTask(id, fromDetail = false) {
  if (!confirm(`Cancel task ${id.slice(0, 8)}…?`)) return;
  try {
    const r = await fetch(`${API}/${id}/cancel`, { method: "PATCH" });
    const json = await r.json();
    if (!json.success) throw new Error(json.message);
    toast("Task cancelled", "success");
    if (fromDetail) closeModal("detail-overlay");
    loadTasks();
  } catch (e) {
    toast(`Cancel failed: ${esc(e.message)}`, "error");
  }
}

// ── Create Task ───────────────────────────────────────────────────────────────
function openCreateModal() {
  document.getElementById("create-overlay").classList.remove("hidden");
  document.getElementById("c-type").value = "";
  document.getElementById("payload-section").style.display = "none";
  document.getElementById("payload-fields").innerHTML = "";
  document.querySelectorAll('input[name="sched-type"]')[0].checked = true;
  document.getElementById("sched-once").style.display = "";
  document.getElementById("sched-cron").style.display = "none";
  document.getElementById("c-idempotency").value = "";
  document.getElementById("c-max-retries").value = "";
  document.getElementById("c-timeout").value = "";
  const dt = new Date(Date.now() + 5 * 60 * 1000);
  document.getElementById("c-schedule-at").value = toLocalDT(dt);
}

function onTypeChange() {
  const type = document.getElementById("c-type").value;
  const section = document.getElementById("payload-section");
  if (!type) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  document.getElementById("payload-fields").innerHTML =
    buildPayloadFields(type);
}

function buildPayloadFields(type) {
  if (type === "read_file")
    return `
    <div class="form-group">
      <label>File Path <span class="req">*</span></label>
      <input type="text" id="p-filepath" placeholder="/absolute/path/to/file.txt">
    </div>
    <div class="form-row">
      <div class="form-group"><label>Encoding</label>
        <select id="p-encoding"><option value="utf8">utf8</option><option value="ascii">ascii</option><option value="base64">base64</option></select>
      </div>
      <div class="form-group"><label>Preview Lines</label>
        <input type="number" id="p-preview-lines" value="10" min="1" max="1000">
      </div>
    </div>`;

  if (type === "import_files")
    return `
    <div class="form-group">
      <label>Files <span class="req">*</span></label>
      <input type="file" id="p-files" multiple accept=".csv,.json,.txt"
        style="width:100%;border:2px dashed var(--border);border-radius:8px;padding:20px;cursor:pointer;background:#fafafa;font-size:13px">
      <div class="form-hint">Accepted: .csv, .json, .txt</div>
    </div>
    <div class="form-group"><label>Format</label>
      <select id="p-format"><option value="auto">auto-detect</option><option value="csv">CSV</option><option value="json">JSON</option></select>
    </div>`;

  if (type === "form_fill")
    return `
    <div class="form-group">
      <label>Template (JSON) <span class="req">*</span></label>
      <textarea id="p-template" placeholder='{"name":"","email":"","age":0}'></textarea>
    </div>
    <div class="form-group">
      <label>Data (JSON) <span class="req">*</span></label>
      <textarea id="p-data" placeholder='{"name":"Alice","email":"alice@example.com","age":30}'></textarea>
    </div>`;

  if (type === "send_email")
    return `
    <div class="form-group">
      <label>To <span class="req">*</span></label>
      <input type="text" id="p-to" placeholder="alice@example.com, bob@example.com">
      <div class="form-hint">Comma-separated email addresses</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>CC</label><input type="text" id="p-cc" placeholder="Optional"></div>
      <div class="form-group"><label>BCC</label><input type="text" id="p-bcc" placeholder="Optional"></div>
    </div>
    <div class="form-group"><label>Subject <span class="req">*</span></label><input type="text" id="p-subject"></div>
    <div class="form-group">
      <label>Body <span class="req">*</span></label>
      <textarea id="p-body" style="min-height:100px"></textarea>
    </div>
    <div class="form-group">
      <label class="radio-label" style="gap:8px;font-weight:400">
        <input type="checkbox" id="p-ishtml"> Send as HTML
      </label>
    </div>`;
  return "";
}

function onSchedTypeChange() {
  const v = document.querySelector('input[name="sched-type"]:checked').value;
  document.getElementById("sched-once").style.display =
    v === "once" ? "" : "none";
  document.getElementById("sched-cron").style.display =
    v === "cron" ? "" : "none";
}

async function submitCreateTask() {
  const type = document.getElementById("c-type").value;
  if (!type) {
    toast("Please select a task type", "error");
    return;
  }

  const schedType = document.querySelector(
    'input[name="sched-type"]:checked',
  ).value;
  const scheduleAt =
    schedType === "once"
      ? document.getElementById("c-schedule-at").value
      : null;
  const cronExpr =
    schedType === "cron" ? document.getElementById("c-cron-expr").value : null;

  if (schedType === "once" && !scheduleAt) {
    toast("Please set a schedule date/time", "error");
    return;
  }
  if (schedType === "cron" && !cronExpr) {
    toast("Please enter a cron expression", "error");
    return;
  }

  const btn = document.getElementById("create-submit-btn");
  btn.disabled = true;
  btn.textContent = "Creating…";
  try {
    if (type === "import_files") {
      await submitImportFiles(scheduleAt, cronExpr);
    } else {
      await submitJsonTask(type, scheduleAt, cronExpr);
    }
    closeModal("create-overlay");
    loadTasks();
  } catch (e) {
    toast(e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Task";
  }
}

async function submitJsonTask(type, scheduleAt, cronExpr) {
  let payload = {};
  if (type === "read_file") {
    const fp = val("p-filepath");
    if (!fp) throw new Error("File path is required");
    payload = {
      filePath: fp,
      encoding: val("p-encoding") || "utf8",
      previewLines: parseInt(val("p-preview-lines")) || 10,
    };
  } else if (type === "form_fill") {
    const tmpl = val("p-template");
    const data = val("p-data");
    if (!tmpl || !data) throw new Error("Template and data are required");
    try {
      payload = { template: JSON.parse(tmpl), data: JSON.parse(data) };
    } catch {
      throw new Error("Template or data is not valid JSON");
    }
  } else if (type === "send_email") {
    const toRaw = val("p-to");
    if (!toRaw) throw new Error("At least one recipient is required");
    const subject = val("p-subject");
    const body = val("p-body");
    if (!subject || !body) throw new Error("Subject and body are required");
    const splitEmails = (s) =>
      s
        ? s
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : [];
    payload = {
      to: splitEmails(toRaw),
      cc: splitEmails(val("p-cc")),
      bcc: splitEmails(val("p-bcc")),
      subject,
      body,
      isHtml: document.getElementById("p-ishtml")?.checked ?? false,
    };
  }

  const body = { type, payload };
  if (scheduleAt) body.scheduleAt = new Date(scheduleAt).toISOString();
  if (cronExpr) body.cronExpr = cronExpr;
  const ikey = val("c-idempotency");
  if (ikey) body.idempotencyKey = ikey;
  const mr = val("c-max-retries");
  if (mr) body.maxRetries = parseInt(mr);
  const tout = val("c-timeout");
  if (tout) body.timeoutMs = parseInt(tout);

  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!json.success)
    throw new Error(
      json.message || (json.errors ?? []).map((e) => e.message).join("; "),
    );
  toast("Task created!", "success");
}

async function submitImportFiles(scheduleAt, cronExpr) {
  const filesInput = document.getElementById("p-files");
  if (!filesInput?.files?.length)
    throw new Error("At least one file is required");
  const fd = new FormData();
  fd.append("type", "import_files");
  if (scheduleAt) fd.append("scheduleAt", new Date(scheduleAt).toISOString());
  if (cronExpr) fd.append("cronExpr", cronExpr);
  fd.append("payload", JSON.stringify({ format: val("p-format") || "auto" }));
  const ikey = val("c-idempotency");
  if (ikey) fd.append("idempotencyKey", ikey);
  for (const f of filesInput.files) fd.append("files", f);
  const r = await fetch(API, { method: "POST", body: fd });
  const json = await r.json();
  if (!json.success)
    throw new Error(json.message || JSON.stringify(json.errors));
  toast("Import task created!", "success");
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}
function val(id) {
  return document.getElementById(id)?.value?.trim() || "";
}
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function toLocalDT(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toast(msg, type = "success") {
  const c = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Init & event delegation ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Static element listeners
  document
    .getElementById("new-task-btn")
    .addEventListener("click", openCreateModal);
  document.getElementById("refresh-btn").addEventListener("click", loadTasks);
  document
    .getElementById("filter-type")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filter-status")
    .addEventListener("change", applyFilters);
  document.getElementById("c-type").addEventListener("change", onTypeChange);
  document
    .querySelectorAll('input[name="sched-type"]')
    .forEach((r) => r.addEventListener("change", onSchedTypeChange));
  document
    .getElementById("create-submit-btn")
    .addEventListener("click", submitCreateTask);

  // Overlay background click closes modal; modal content stops propagation
  document.querySelectorAll(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
    const modal = overlay.querySelector(".modal");
    if (modal) modal.addEventListener("click", (e) => e.stopPropagation());
  });

  // Global delegation: data-close-modal buttons (static + dynamic)
  // Use capture phase so this still works when modal containers stop bubbling.
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("[data-close-modal]");
      if (btn) closeModal(btn.dataset.closeModal);
    },
    true,
  );

  // Table row clicks and inline cancel buttons
  document.getElementById("task-tbody").addEventListener("click", (e) => {
    const cancelBtn = e.target.closest("[data-cancel-id]");
    if (cancelBtn) {
      e.stopPropagation();
      cancelTask(cancelBtn.dataset.cancelId, false);
      return;
    }
    const row = e.target.closest("[data-task-id]");
    if (row) openDetail(row.dataset.taskId);
  });

  // Pagination
  document.getElementById("pagination").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (btn && !btn.disabled) goPage(Number(btn.dataset.page));
  });

  // Detail footer (dynamic cancel + close)
  document.getElementById("detail-footer").addEventListener("click", (e) => {
    const cancelBtn = e.target.closest("[data-cancel-id]");
    if (cancelBtn) {
      cancelTask(
        cancelBtn.dataset.cancelId,
        cancelBtn.dataset.fromDetail === "true",
      );
      return;
    }
    // close handled by global delegation above
  });

  // Keyboard: Escape closes any open modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".overlay:not(.hidden)")
        .forEach((o) => o.classList.add("hidden"));
    }
  });

  checkHealth();
  loadTasks();
  setInterval(checkHealth, 30000);
});
