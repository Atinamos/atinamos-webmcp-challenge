/* Atinamos Agent Shop — human result actions + session-safe request persistence */
(() => {
  "use strict";

  const SESSION_KEY = "atinamos:webmcp:activity:v1";
  const REQUEST_CACHE_KEY = "atinamos:webmcp:request-cache:v1";
  const RESULT_URL = "/webmcp-result"; // legacy same-origin fallback; primary UX is the in-page viewer below.
  const MAX_REQUESTS = 20;

  function readRequestCache() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(REQUEST_CACHE_KEY) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  }

  function writeRequestCache(cache) {
    try {
      const entries = Object.entries(cache)
        .sort((a, b) => String(b[1] && b[1].updated_at || "").localeCompare(String(a[1] && a[1].updated_at || "")))
        .slice(0, MAX_REQUESTS);
      sessionStorage.setItem(REQUEST_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      // Hardened browser contexts may block storage; live in-memory behaviour remains available.
    }
  }

  function safeRecord(record) {
    if (!record || typeof record !== "object") return null;
    return {
      request_id: record.request_id || null,
      service: record.service || null,
      status: record.status || null,
      http_status: record.http_status ?? null,
      payment_status: record.payment_status || null,
      amount_usdc: record.amount_usdc ?? null,
      network: record.network || null,
      wallet: record.wallet || null,
      user_action_required: Boolean(record.user_action_required),
      response: record.response ?? null,
      job_id: record.job_id || null,
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  const liveStore = window.__atinamosWebmcpRequestStore;
  const persistentStore = Object.freeze({
    get(requestId) {
      const id = String(requestId || "").trim();
      if (!id) return null;
      let live = null;
      try {
        live = liveStore && typeof liveStore.get === "function" ? liveStore.get(id) : null;
      } catch {
        live = null;
      }
      if (live) {
        const safe = safeRecord(live);
        if (safe) {
          const cache = readRequestCache();
          cache[id] = safe;
          writeRequestCache(cache);
          return safe;
        }
      }
      const cached = readRequestCache()[id];
      return cached ? safeRecord(cached) : null;
    },
  });

  window.__atinamosWebmcpRequestStore = persistentStore;
  window.__atinamosWebmcpPersistentRequestStore = persistentStore;

  function cardsState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
      return Array.isArray(saved.cards) ? saved.cards : [];
    } catch {
      return [];
    }
  }

  function requestView(requestId) {
    return persistentStore.get(requestId);
  }

  function actionLabel(record) {
    if (!record) return null;
    if (record.status === "completed") return "View result";
    if (["queued", "running"].includes(record.status) || record.job_id) return "View progress";
    if (record.status === "failed" || (record.http_status && record.http_status >= 400 && record.response)) return "View failure details";
    return null;
  }

  function pretty(value) {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  function ensureViewer() {
    let viewer = document.getElementById("atinamos-result-viewer");
    if (viewer) return viewer;
    const style = document.createElement("style");
    style.dataset.atinamosResultViewer = "true";
    style.textContent = `
      #atinamos-result-viewer{position:fixed;inset:0;z-index:2147483640;background:rgba(5,10,22,.96);color:#eef4ff;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:none;overflow:auto}
      #atinamos-result-viewer[data-open="true"]{display:block}
      #atinamos-result-viewer .ar-shell{width:min(1100px,calc(100vw - 32px));margin:24px auto;background:#0d1730;border:1px solid rgba(122,162,255,.35);border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.45);overflow:hidden}
      #atinamos-result-viewer .ar-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:18px 20px;border-bottom:1px solid rgba(122,162,255,.2);background:#101d3b}
      #atinamos-result-viewer h2{margin:0;font-size:20px}.ar-sub{color:#9fb1d1;font-size:12px;margin-top:4px}.ar-close{appearance:none;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#eef4ff;border-radius:8px;padding:8px 11px;cursor:pointer;font:inherit}
      #atinamos-result-viewer .ar-body{padding:20px}.ar-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}.ar-meta{background:rgba(255,255,255,.035);border:1px solid rgba(122,162,255,.14);border-radius:10px;padding:10px}.ar-k{color:#8fa4c9;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.ar-v{margin-top:3px;word-break:break-word}.ar-summary{margin:0 0 14px;color:#cbd8ee}.ar-output{margin:0;white-space:pre-wrap;word-break:break-word;background:#070d1d;border:1px solid rgba(122,162,255,.16);border-radius:10px;padding:14px;max-height:55vh;overflow:auto;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.ar-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.ar-button{appearance:none;border:1px solid rgba(122,162,255,.45);background:rgba(122,162,255,.10);color:#eef4ff;border-radius:9px;padding:9px 12px;font:700 12px/1.2 inherit;cursor:pointer}.ar-button:disabled{opacity:.5;cursor:not-allowed}
      @media(max-width:700px){#atinamos-result-viewer .ar-shell{margin:8px auto;width:calc(100vw - 16px)}.ar-grid{grid-template-columns:1fr 1fr}.ar-head,.ar-body{padding:14px}}
    `;
    document.head.appendChild(style);
    viewer = document.createElement("section");
    viewer.id = "atinamos-result-viewer";
    viewer.dataset.open = "false";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Atinamos service result");
    viewer.innerHTML = `
      <div class="ar-shell">
        <div class="ar-head">
          <div><h2 class="ar-title">Service result</h2><div class="ar-sub">Human view of the same structured result available to the agent.</div></div>
          <button type="button" class="ar-close">Close</button>
        </div>
        <div class="ar-body">
          <div class="ar-grid">
            <div class="ar-meta"><div class="ar-k">Service</div><div class="ar-v ar-service">—</div></div>
            <div class="ar-meta"><div class="ar-k">Status</div><div class="ar-v ar-status">—</div></div>
            <div class="ar-meta"><div class="ar-k">Payment</div><div class="ar-v ar-payment">—</div></div>
            <div class="ar-meta"><div class="ar-k">Request</div><div class="ar-v ar-request">—</div></div>
          </div>
          <p class="ar-summary"></p>
          <pre class="ar-output"></pre>
          <div class="ar-actions"><button type="button" class="ar-button ar-refresh">Refresh status</button><button type="button" class="ar-button ar-download">Download JSON</button></div>
        </div>
      </div>`;
    document.body.appendChild(viewer);
    viewer.querySelector(".ar-close").addEventListener("click", () => { viewer.dataset.open = "false"; });
    viewer.addEventListener("click", (event) => { if (event.target === viewer) viewer.dataset.open = "false"; });
    return viewer;
  }

  async function resolvedRecord(record) {
    if (!record || !record.job_id) return { record, payload: record ? record.response : null };
    try {
      const response = await fetch(`/agent/jobs/${encodeURIComponent(record.job_id)}`, { headers: { Accept: "application/json" }, credentials: "same-origin" });
      const payload = await response.json();
      return { record, payload };
    } catch {
      return { record, payload: record.response };
    }
  }

  async function showResult(requestId) {
    const viewer = ensureViewer();
    const baseRecord = requestView(requestId);
    if (!baseRecord) return;
    viewer.dataset.open = "true";
    const { record, payload } = await resolvedRecord(baseRecord);
    const service = record.service || "Service";
    const status = payload && typeof payload === "object" && payload.status ? String(payload.status) : String(record.status || "unknown");
    const payment = record.payment_status === "settled" ? `${record.amount_usdc ?? ""} USDC settled`.trim() : (record.payment_status || "—");
    viewer.querySelector(".ar-title").textContent = `${service} result`;
    viewer.querySelector(".ar-service").textContent = service;
    viewer.querySelector(".ar-status").textContent = status;
    viewer.querySelector(".ar-payment").textContent = payment;
    viewer.querySelector(".ar-request").textContent = requestId;
    viewer.querySelector(".ar-summary").textContent = ["completed", "repaired", "success", "ok"].includes(status) ? "The service completed successfully. The agent can consume this result directly through WebMCP; this viewer is for human inspection and download." : (["queued", "running"].includes(status) ? "The service is still running. Refresh status to retrieve the latest job state." : "Structured service information is shown below.");
    viewer.querySelector(".ar-output").textContent = pretty(payload ?? { status: record.status, message: "No structured body was returned." });
    const refresh = viewer.querySelector(".ar-refresh");
    refresh.disabled = !record.job_id;
    refresh.onclick = () => showResult(requestId);
    const download = viewer.querySelector(".ar-download");
    download.disabled = payload == null;
    download.onclick = () => {
      if (payload == null) return;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `atinamos-${service}-${requestId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    };
  }

  function syncActions() {
    const panel = document.getElementById("atinamos-agent-activity");
    if (!panel) return;
    const cards = Array.from(panel.querySelectorAll(".aa-card"));
    const savedCards = cardsState();
    cards.forEach((cardEl, index) => {
      const saved = savedCards[index];
      const requestId = saved && saved.requestId;
      const existing = cardEl.querySelector(".aa-result-action");
      if (!requestId) {
        if (existing) existing.remove();
        return;
      }
      const record = requestView(requestId);
      const label = actionLabel(record);
      if (!label) {
        if (existing) existing.remove();
        return;
      }
      let actions = cardEl.querySelector(".aa-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "aa-actions";
        cardEl.appendChild(actions);
      }
      let button = existing;
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "aa-pay aa-result-action";
        button.addEventListener("click", () => showResult(requestId));
        actions.appendChild(button);
      }
      button.textContent = label;
      button.dataset.requestId = requestId;
    });
  }

  const observer = new MutationObserver(syncActions);
  const start = () => {
    syncActions();
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(syncActions, 500);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
