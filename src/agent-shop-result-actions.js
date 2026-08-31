/* Atinamos Agent Shop — simple durable result navigation */
(() => {
  "use strict";

  const ACTIVITY_KEY = "atinamos:webmcp:activity:v1";
  const REQUEST_CACHE_KEY = "atinamos:webmcp:request-cache:v1";
  const MAX_REQUESTS = 20;

  function readJson(storage, key, fallback) {
    try {
      const parsed = JSON.parse(storage.getItem(key) || "");
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeCache(cache) {
    const entries = Object.entries(cache)
      .sort((a, b) => String(b[1]?.updated_at || "").localeCompare(String(a[1]?.updated_at || "")))
      .slice(0, MAX_REQUESTS);
    const value = JSON.stringify(Object.fromEntries(entries));
    try { sessionStorage.setItem(REQUEST_CACHE_KEY, value); } catch {}
    try { localStorage.setItem(REQUEST_CACHE_KEY, value); } catch {}
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

  function cacheRecord(requestId) {
    const id = String(requestId || "").trim();
    if (!id) return null;
    let record = null;
    try {
      const store = window.__atinamosWebmcpRequestStore;
      record = store && typeof store.get === "function" ? store.get(id) : null;
    } catch {}
    const safe = safeRecord(record);
    if (safe) {
      const cache = readJson(sessionStorage, REQUEST_CACHE_KEY, readJson(localStorage, REQUEST_CACHE_KEY, {}));
      cache[id] = safe;
      writeCache(cache);
      return safe;
    }
    const cached = readJson(sessionStorage, REQUEST_CACHE_KEY, readJson(localStorage, REQUEST_CACHE_KEY, {}))[id];
    return safeRecord(cached);
  }

  function cardsState() {
    const saved = readJson(sessionStorage, ACTIVITY_KEY, readJson(localStorage, ACTIVITY_KEY, {}));
    return Array.isArray(saved.cards) ? saved.cards : [];
  }

  function resultLabel(record) {
    if (!record) return null;
    if (record.status === "completed") return "View result";
    if (["queued", "running"].includes(record.status) || record.job_id) return "View progress";
    if (record.status === "failed") return "View failure details";
    return null;
  }

  function resultUrl(requestId, record) {
    const params = new URLSearchParams({ request_id: String(requestId) });
    if (record?.job_id) params.set("job_id", String(record.job_id));
    if (record?.service) params.set("service", String(record.service));
    if (record?.payment_status) params.set("payment_status", String(record.payment_status));
    if (record?.amount_usdc != null) params.set("amount_usdc", String(record.amount_usdc));
    return `/webmcp-result?${params.toString()}`;
  }

  function sync() {
    const panel = document.getElementById("atinamos-agent-activity");
    if (!panel) return;
    const cards = cardsState();
    const domCards = Array.from(panel.querySelectorAll(".aa-card"));

    domCards.forEach((cardEl, index) => {
      const saved = cards[index];
      const requestId = saved?.requestId;
      const existing = cardEl.querySelector(".aa-result-action");
      if (!requestId) {
        if (existing) existing.remove();
        return;
      }
      const record = cacheRecord(requestId);
      const label = resultLabel(record);
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
        actions.appendChild(button);
      }
      button.textContent = label;
      button.onclick = () => {
        const latest = cacheRecord(requestId) || record;
        window.location.assign(resultUrl(requestId, latest));
      };
    });
  }

  const start = () => {
    sync();
    window.setInterval(sync, 1500);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
