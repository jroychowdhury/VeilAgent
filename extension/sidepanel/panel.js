/* Side panel controller. */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STAGE_ORDER = ["see", "detect", "redact", "access", "reason", "act"];

/* ---------- tabs ---------- */
$$(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.toggle("is-active", t === tab));
    $$(".view").forEach(v => v.classList.toggle("is-active", v.id === "view-" + tab.dataset.view));
    if (tab.dataset.view === "security") refreshAudit();
  });
});

$$(".chip").forEach(chip => {
  chip.addEventListener("click", () => { $("#task").value = chip.textContent; });
});

/* ---------- helpers ---------- */
function resetPipeline() {
  $$(".stage").forEach(s => s.classList.remove("on", "pass", "fail"));
}

function markStage(stage, state) {
  const el = document.querySelector(`.stage[data-stage="${stage}"]`);
  if (!el) return;
  el.classList.remove("on", "pass", "fail");
  el.classList.add(state);
}

function logLine(title, detail, tone = "info") {
  const log = $("#agent-log");
  const first = log.querySelector(".empty");
  if (first) first.remove();
  const entry = document.createElement("div");
  entry.className = "entry " + tone;
  entry.innerHTML = `<b>${title}</b>${detail || ""}`;
  log.prepend(entry);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refreshBadge() {
  const credentials = await window.VeilAuth.get();
  $("#client-badge").textContent = credentials.clientId;
  $("#client-badge").classList.toggle("rogue", credentials.token === window.VeilAuth.IMPOSTOR.token);
  $("#identity-client").textContent = credentials.clientId;
}

/* ---------- privacy view ---------- */
function renderPrivacy({ context, local }) {
  $("#stat-found").textContent = local.summary.total;
  $("#stat-sent").textContent = "0";

  const verdict = $("#privacy-verdict");
  verdict.textContent = local.policy.reason;
  verdict.className = "verdict " + (local.policy.allowed ? "ok" : "stop");

  const pairs = $("#redaction-pairs");
  if (!local.pairs.length) {
    pairs.innerHTML = '<p class="empty">No sensitive values on this page.</p>';
  } else {
    pairs.innerHTML = local.pairs.map(p => `
      <div class="pair">
        <span class="before">${escapeHtml(p.before)}</span>
        <span class="arrow">&rarr;</span>
        <span class="after">${p.after}</span>
        <span class="kind">${p.type} &middot; ${p.source} &middot; confidence ${p.confidence.toFixed(2)}</span>
      </div>`).join("");
  }

  $("#payload").textContent = JSON.stringify(
    {
      url: context.url,
      page_title: context.page_title,
      redactions: context.redactions,
      screenshot_transmitted: context.screenshot_transmitted,
      elements: context.elements.slice(0, 6),
      text_preview: context.text_preview.slice(0, 220) + (context.text_preview.length > 220 ? "..." : "")
    },
    null, 2
  );

  window.VeilDB.log({
    url: context.url,
    redactions: local.summary.total,
    types: Object.keys(local.summary.byType),
    lowestConfidence: local.summary.lowestConfidence,
    transmitted: local.policy.allowed
  }).catch(() => {});
}

function renderScreenshot(vision) {
  const wrap = $("#shot-wrap");
  if (!vision || !vision.redactedDataUrl) {
    wrap.innerHTML = `<p class="empty">${vision ? vision.reason : "Screenshot unavailable."}</p>`;
    return;
  }
  wrap.innerHTML = `
    <img src="${vision.redactedDataUrl}" alt="Screenshot with sensitive regions blacked out">
    <p class="caption">${vision.reason}. The image is held on this device; only the confidence score is sent.</p>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------- agent run ---------- */
async function runAgent() {
  const tab = await activeTab();
  if (!tab || !/^http:\/\/(localhost|127\.0\.0\.1):8000/.test(tab.url || "")) {
    logLine("Wrong page", "Open http://localhost:8000 in this tab first.", "fail");
    return;
  }

  const button = $("#run-agent");
  button.disabled = true;
  resetPipeline();
  $("#agent-log").innerHTML = "";

  await window.VeilAgentLoop.run({
    tabId: tab.id,
    task: $("#task").value.trim(),
    onStage: (stage, detail) => {
      if (stage === "blocked" || stage === "error") {
        STAGE_ORDER.forEach(s => {
          const el = document.querySelector(`.stage[data-stage="${s}"]`);
          if (el && el.classList.contains("on")) el.classList.replace("on", "fail");
        });
        logLine(stage === "error" ? "Error" : "Blocked", detail, "fail");
        return;
      }
      if (stage === "done") { logLine("Done", detail, "pass"); return; }
      const previous = STAGE_ORDER[STAGE_ORDER.indexOf(stage) - 1];
      if (previous) markStage(previous, "pass");
      markStage(stage, "on");
      logLine(stage.toUpperCase(), detail, "info");
      if (stage === "act") markStage("act", "pass");
    },
    onContext: renderPrivacy,
    onScreenshot: renderScreenshot
  });

  button.disabled = false;
  refreshAudit();
}

/* ---------- scan only ---------- */
async function scanOnly() {
  const tab = await activeTab();
  chrome.tabs.sendMessage(tab.id, { type: "VEIL_SCAN" }, async (reply) => {
    if (chrome.runtime.lastError || !reply || !reply.ok) {
      $("#privacy-verdict").textContent = "Open the SecureBank page and reload it, then scan again.";
      $("#privacy-verdict").className = "verdict stop";
      return;
    }
    const context = reply.context;
    const local = context._local;
    delete context._local;
    renderPrivacy({ context, local });

    chrome.runtime.sendMessage({ type: "VEIL_CAPTURE" }, async (shot) => {
      if (shot && shot.ok) {
        const vision = await window.VeilVision.redactScreenshot(shot.dataUrl, local.boxes, local.viewport);
        renderScreenshot(vision);
      }
    });
  });
}

/* ---------- security view ---------- */
async function refreshAudit() {
  const response = await window.VeilAccess.get("/audit/logs?limit=20");
  const note = $("#audit-note");
  const rows = $("#audit-rows");

  if (!response.ok) {
    rows.innerHTML = `<tr><td colspan="4" class="empty">Audit log refused: ${response.status} ${response.body.detail || ""}</td></tr>`;
    note.textContent = "The current token is not accepted. Switch back to the valid token to read the log.";
    return;
  }

  const { summary, access_logs: logs } = response.body;
  $("#stat-allowed").textContent = summary.allowed;
  $("#stat-blocked").textContent = summary.blocked;

  rows.innerHTML = logs.map(l => `
    <tr>
      <td>${l.timestamp.slice(11, 19)}</td>
      <td>${l.client_id}</td>
      <td>${l.endpoint}</td>
      <td class="${l.status}">${l.status}</td>
    </tr>`).join("") || '<tr><td colspan="4" class="empty">No events yet.</td></tr>';

  note.textContent = "Blocked rows are requests the server refused before any reasoning happened.";
}

async function probe(path, method) {
  const response = method === "POST"
    ? await window.VeilAccess.post(path, { task: "probe", context: { url: "/probe", elements: [] } })
    : await window.VeilAccess.get(path);
  $("#audit-note").textContent =
    `${path} responded ${response.status} ${response.ok ? "(allowed)" : "- " + (response.body.detail || "refused")}`;
  refreshAudit();
}

$("#run-agent").addEventListener("click", runAgent);
$("#scan-only").addEventListener("click", scanOnly);
$("#refresh-audit").addEventListener("click", refreshAudit);
$("#probe-agent").addEventListener("click", () => probe("/agent/reason", "POST"));
$("#probe-admin").addEventListener("click", () => probe("/admin/accounts", "GET"));

$("#use-valid").addEventListener("click", async () => {
  await window.VeilAuth.useValid();
  await refreshBadge();
  $("#audit-note").textContent = "Now using the issued VeilAgent token.";
});

$("#use-invalid").addEventListener("click", async () => {
  await window.VeilAuth.useImpostor();
  await refreshBadge();
  $("#audit-note").textContent = "Now impersonating an unknown client. Try the probes above.";
});

refreshBadge();
refreshAudit();
