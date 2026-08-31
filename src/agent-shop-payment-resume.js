/* Atinamos Agent Shop — safe restart/resume for unpaid WebMCP requests */
(() => {
  "use strict";

  const RESUME_KEY = "atinamos:webmcp:resume:v1";
  const ACTIVITY_KEY = "atinamos:webmcp:activity:v1";
  const MAX_RECORDS = 12;
  const PAID_PATHS = new Set([
    "/agent/render-check",
    "/agent/buyer-check",
    "/agent/json-repair",
    "/agent/technical-seo-crawl",
  ]);

  const upstreamFetch = window.fetch.bind(window);

  function readResume() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RESUME_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeResume(records) {
    try {
      const entries = Object.entries(records)
        .sort((a, b) => String(b[1]?.updated_at || "").localeCompare(String(a[1]?.updated_at || "")))
        .slice(0, MAX_RECORDS);
      localStorage.setItem(RESUME_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      // Hardened browser contexts may block storage. Normal in-session payment still works.
    }
  }

  function requestIdFrom(init) {
    try {
      return new Headers(init?.headers || undefined).get("X-Atinamos-WebMCP-Request-ID");
    } catch {
      return null;
    }
  }

  function safeBody(init) {
    return typeof init?.body === "string" ? init.body : null;
  }

  function capture(input, init) {
    try {
      const raw = typeof input === "string" ? input : input?.url;
      const url = new URL(raw || location.href, location.href);
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      const requestId = requestIdFrom(init);
      const body = safeBody(init);
      if (url.origin !== location.origin || !PAID_PATHS.has(url.pathname) || method === "GET" || !requestId || body == null) return;

      const records = readResume();
      records[requestId] = {
        request_id: requestId,
        service: url.pathname.replace("/agent/", ""),
        path: url.pathname + url.search,
        method,
        body,
        updated_at: new Date().toISOString(),
      };
      writeResume(records);
    } catch {
      // Capture is best-effort and must never interfere with the real request.
    }
  }

  window.fetch = async function atinamosRestartAwareFetch(input, init) {
    capture(input, init);
    return upstreamFetch(input, init);
  };

  function activityCards() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || localStorage.getItem(ACTIVITY_KEY) || "{}");
      return Array.isArray(saved.cards) ? saved.cards : [];
    } catch {
      return [];
    }
  }

  function freshRequestId() {
    if (globalThis.crypto?.randomUUID) return `wr-${globalThis.crypto.randomUUID()}`;
    return `wr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  async function resumeRequest(record, button) {
    if (!record?.path || !record?.body) return;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Refreshing payment request…";
    try {
      const newRequestId = freshRequestId();
      const response = await window.fetch(record.path, {
        method: record.method || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Atinamos-WebMCP-Request-ID": newRequestId,
        },
        credentials: "same-origin",
        body: record.body,
      });
      if (response.status !== 402) {
        button.textContent = response.ok ? "Request continued" : `Could not resume (HTTP ${response.status})`;
        return;
      }
      const records = readResume();
      delete records[record.request_id];
      writeResume(records);
      button.textContent = "Fresh payment request ready";
    } catch (error) {
      button.textContent = "Resume failed — try again";
      console.warn("[Atinamos WebMCP] Could not resume paid request", error);
    } finally {
      window.setTimeout(() => {
        if (document.contains(button)) {
          button.disabled = false;
          if (button.textContent === "Fresh payment request ready") button.textContent = originalText;
        }
      }, 1200);
    }
  }

  function syncResumeButtons() {
    const panel = document.getElementById("atinamos-agent-activity");
    if (!panel) return;
    const domCards = Array.from(panel.querySelectorAll(".aa-card"));
    const cards = activityCards();
    const records = readResume();

    domCards.forEach((cardEl, index) => {
      const saved = cards[index];
      const requestId = saved?.requestId;
      const existingPay = cardEl.querySelector(".aa-actions .aa-pay:not(.aa-resume-payment)");
      const existingResume = cardEl.querySelector(".aa-resume-payment");
      const record = requestId ? records[requestId] : null;
      const paymentRequired = saved?.status === "safe-stop" || saved?.statusLabel === "Payment required";

      if (!record || !paymentRequired || existingPay) {
        if (existingResume) existingResume.remove();
        return;
      }

      let actions = cardEl.querySelector(".aa-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "aa-actions";
        cardEl.appendChild(actions);
      }

      if (!existingResume) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "aa-pay aa-resume-payment";
        button.textContent = "Resume payment";
        button.title = "Request a fresh x402 challenge for the same service input. No payment is made until you explicitly approve it.";
        button.addEventListener("click", () => resumeRequest(record, button));
        actions.appendChild(button);
      }
    });
  }

  const start = () => {
    syncResumeButtons();
    const observer = new MutationObserver(syncResumeButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(syncResumeButtons, 700);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
