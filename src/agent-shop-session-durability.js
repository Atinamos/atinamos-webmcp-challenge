/* Atinamos Agent Shop — durable recovery for WebMCP activity/result state */
(() => {
  "use strict";

  const ACTIVITY_KEY = "atinamos:webmcp:activity:v1";
  const REQUEST_KEY = "atinamos:webmcp:request-cache:v1";

  function copySessionToLocal(key) {
    try {
      const value = sessionStorage.getItem(key);
      if (value) localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable in hardened browser contexts.
    }
  }

  function restoreLocalToSession(key) {
    try {
      if (sessionStorage.getItem(key)) return;
      const value = localStorage.getItem(key);
      if (value) sessionStorage.setItem(key, value);
    } catch {
      // Recovery is best-effort. Never reload or block the live WebMCP page.
    }
  }

  function requestCache() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const parsed = JSON.parse(storage.getItem(REQUEST_KEY) || "{}");
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // Try the next storage area.
      }
    }
    return {};
  }

  function fallbackResultUrl(requestId) {
    const record = requestCache()[requestId] || {};
    const params = new URLSearchParams({ request_id: requestId });
    if (record.job_id) params.set("job_id", String(record.job_id));
    if (record.service) params.set("service", String(record.service));
    if (record.payment_status) params.set("payment_status", String(record.payment_status));
    if (record.amount_usdc != null) params.set("amount_usdc", String(record.amount_usdc));
    return `/webmcp-result?${params.toString()}`;
  }

  restoreLocalToSession(ACTIVITY_KEY);
  restoreLocalToSession(REQUEST_KEY);

  function snapshot() {
    copySessionToLocal(ACTIVITY_KEY);
    copySessionToLocal(REQUEST_KEY);
  }

  document.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest(".aa-result-action") : null;
    if (!button) return;
    const requestId = String(button.dataset.requestId || "").trim();
    if (!requestId) return;

    window.setTimeout(() => {
      const viewer = document.getElementById("atinamos-result-viewer");
      if (viewer && viewer.dataset.open === "true") return;
      location.assign(fallbackResultUrl(requestId));
    }, 250);
  }, true);

  snapshot();
  window.addEventListener("pagehide", snapshot);
  window.addEventListener("beforeunload", snapshot);
  window.setInterval(snapshot, 1500);
})();
