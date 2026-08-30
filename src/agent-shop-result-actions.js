/* Atinamos Agent Shop — human result actions for WebMCP requests */
(() => {
  "use strict";

  const SESSION_KEY = "atinamos:webmcp:activity:v1";
  const RESULT_URL = "/webmcp-result";

  function cardsState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
      return Array.isArray(saved.cards) ? saved.cards : [];
    } catch {
      return [];
    }
  }

  function requestView(requestId) {
    const store = window.__atinamosWebmcpRequestStore;
    return store && typeof store.get === "function" ? store.get(requestId) : null;
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
    window.setInterval(syncActions, 1000);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
