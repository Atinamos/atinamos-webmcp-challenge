/* Atinamos Agent Shop — human result actions + session-safe request persistence */
(() => {
  "use strict";

  const SESSION_KEY = "atinamos:webmcp:activity:v1";
  const REQUEST_CACHE_KEY = "atinamos:webmcp:request-cache:v1";
  const RESULT_URL = "/webmcp-result";
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

  function openResult(requestId) {
    window.open(`${RESULT_URL}?request_id=${encodeURIComponent(requestId)}`, "_blank");
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
        button.addEventListener("click", () => openResult(requestId));
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
