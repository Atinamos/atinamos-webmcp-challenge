/* Atinamos Agent Shop — human result page */
const params = new URLSearchParams(location.search);
const requestId = String(params.get("request_id") || "").trim();
const titleEl = document.getElementById("title");
const summaryEl = document.getElementById("summary");
const statusEl = document.getElementById("status");
const serviceEl = document.getElementById("service");
const paymentEl = document.getElementById("payment");
const requestEl = document.getElementById("request");
const outputEl = document.getElementById("output");
const refreshEl = document.getElementById("refresh");
const downloadEl = document.getElementById("download");
const closeEl = document.getElementById("close");
let currentPayload = null;
let currentRecord = null;

function sourceStore() {
  try { return window.opener && window.opener.__atinamosWebmcpRequestStore; }
  catch { return null; }
}

function readRecord() {
  const store = sourceStore();
  return store && typeof store.get === "function" ? store.get(requestId) : null;
}

function pretty(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = kind ? `status ${kind}` : "status";
}

function statusUrl(record) {
  const response = record && record.response;
  if (response && typeof response === "object" && response.status_url) return String(response.status_url);
  if (record && record.job_id) return `/agent/jobs/${encodeURIComponent(record.job_id)}`;
  return null;
}

async function refresh() {
  if (!requestId) {
    setStatus("Invalid request", "error");
    summaryEl.textContent = "No request_id was supplied.";
    outputEl.textContent = "Return to the Agent Shop and open the result from Agent Activity.";
    return;
  }

  const record = readRecord();
  if (!record) {
    setStatus("Session unavailable", "warn");
    requestEl.textContent = requestId;
    summaryEl.textContent = "This result page is session-bound. Keep the Agent Shop page open and use its View result / View progress button.";
    outputEl.textContent = "The originating Agent Shop session is not available to this page.";
    return;
  }

  currentRecord = record;
  requestEl.textContent = record.request_id || requestId;
  serviceEl.textContent = record.service || "—";
  paymentEl.textContent = record.payment_status === "settled" ? `${record.amount_usdc ?? ""} USDC settled`.trim() : (record.payment_status || "—");
  titleEl.textContent = record.service ? `${record.service} result` : "Service result";

  let payload = record.response;
  const pollUrl = statusUrl(record);
  if (pollUrl && (["queued", "running"].includes(String(record.status)) || record.job_id)) {
    try {
      const response = await fetch(pollUrl, { headers: { Accept: "application/json" }, credentials: "same-origin" });
      payload = await response.json();
    } catch {
      summaryEl.textContent = "The service is still in progress, but the latest job status could not be retrieved.";
    }
  }

  currentPayload = payload;
  const payloadStatus = payload && typeof payload === "object" ? String(payload.status || "") : "";
  const status = payloadStatus || String(record.status || "unknown");
  if (["completed", "repaired", "success", "ok"].includes(status)) {
    setStatus("Complete", "ok");
    summaryEl.textContent = "The service completed successfully. This page is the human-readable view of the structured result available to the agent.";
  } else if (["failed", "error"].includes(status)) {
    setStatus("Failed", "error");
    summaryEl.textContent = "The service did not complete successfully. Failure details and any returned evidence are shown below.";
  } else if (["queued", "running"].includes(status)) {
    setStatus(status === "queued" ? "Queued" : "Running", "warn");
    summaryEl.textContent = "The service is still running. Refresh this page to retrieve the latest status.";
  } else {
    setStatus(status || "Result available");
    summaryEl.textContent = "Structured service information is shown below.";
  }

  outputEl.textContent = pretty(payload ?? { status: record.status, message: "No structured body was returned." });
  downloadEl.disabled = payload == null;
}

refreshEl.addEventListener("click", refresh);
downloadEl.addEventListener("click", () => {
  if (currentPayload == null) return;
  const blob = new Blob([JSON.stringify(currentPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atinamos-${(currentRecord && currentRecord.service) || "result"}-${requestId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
closeEl.addEventListener("click", () => window.close());
refresh();
