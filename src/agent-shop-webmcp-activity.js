/* Atinamos Agent Shop — WebMCP human-visible request history */
(() => {
  "use strict";
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext || window.__atinamosWebmcpActivityInstalled) return;
  window.__atinamosWebmcpActivityInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const MAX_CARDS = 12;
  const SESSION_KEY = "atinamos:webmcp:activity:v1";
  const SERVICE_NAMES = {
    "render-check": "Render Check",
    "buyer-check": "Buyer Check",
    "json-repair": "JSON Validate / Repair",
    "technical-seo-crawl": "Technical SEO Crawl",
  };

  function restoreState() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return { cards: [], sequence: 0, expanded: true };
      const saved = JSON.parse(raw);
      const cards = Array.isArray(saved.cards) ? saved.cards.slice(0, MAX_CARDS) : [];
      const sequence = Number.isInteger(saved.sequence) ? saved.sequence : cards.reduce((max, card) => Math.max(max, Number(card.id) || 0), 0);
      cards.forEach((card, index) => {
        card.open = index === 0;
        card.steps = Array.isArray(card.steps) ? card.steps : [];
      });
      return { cards, sequence, expanded: saved.expanded !== false };
    } catch {
      return { cards: [], sequence: 0, expanded: true };
    }
  }

  const state = restoreState();

  function saveState() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        sequence: state.sequence,
        expanded: state.expanded,
        cards: state.cards.slice(0, MAX_CARDS).map((card) => ({
          id: card.id,
          key: card.key,
          title: card.title,
          meta: card.meta,
          status: card.status,
          statusLabel: card.statusLabel,
          open: card.open,
          steps: card.steps,
        })),
      }));
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
      // The activity panel remains fully functional in memory.
    }
  }

  function ensurePanel() {
    let panel = document.getElementById("atinamos-agent-activity");
    if (panel) return panel;
    const style = document.createElement("style");
    style.dataset.atinamosAgentActivity = "true";
    style.textContent = `
      #atinamos-agent-activity{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(410px,calc(100vw - 36px));max-height:min(640px,calc(100vh - 36px));color:#eef4ff;background:rgba(9,18,39,.97);border:1px solid rgba(122,162,255,.35);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.28);font:13px/1.4 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;backdrop-filter:blur(10px)}
      #atinamos-agent-activity>.aa-head{appearance:none;width:100%;border:0;background:transparent;color:inherit;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;text-align:left;font:inherit}
      #atinamos-agent-activity .aa-title{display:flex;align-items:center;gap:8px;font-weight:700}.aa-dot{width:8px;height:8px;border-radius:999px;background:#42e68b;box-shadow:0 0 0 4px rgba(66,230,139,.12)}
      #atinamos-agent-activity .aa-subtitle{color:#9fb1d1;font-size:12px;white-space:nowrap}.aa-body{border-top:1px solid rgba(122,162,255,.18);padding:10px 8px 12px 10px;overflow-y:auto;overflow-x:hidden;max-height:min(550px,calc(100vh - 105px));scrollbar-gutter:stable}#atinamos-agent-activity[data-expanded="false"] .aa-body{display:none}
      #atinamos-agent-activity .aa-body::-webkit-scrollbar{width:9px}#atinamos-agent-activity .aa-body::-webkit-scrollbar-track{background:rgba(255,255,255,.03);border-radius:999px}#atinamos-agent-activity .aa-body::-webkit-scrollbar-thumb{background:rgba(159,177,209,.4);border-radius:999px;border:2px solid transparent;background-clip:padding-box}
      .aa-empty{color:#9fb1d1;padding:4px}.aa-card{border:1px solid rgba(122,162,255,.24);border-radius:11px;background:rgba(255,255,255,.028);margin:0 2px 10px 0;overflow:hidden}.aa-card:last-child{margin-bottom:0}
      .aa-card-head{width:100%;border:0;background:rgba(122,162,255,.06);color:inherit;padding:9px 10px;display:flex;justify-content:space-between;gap:10px;text-align:left;cursor:pointer;font:inherit}.aa-card-title{font-weight:700}.aa-card-meta{color:#9fb1d1;font-size:11px;margin-top:2px}.aa-card-status{font-size:11px;color:#9fb1d1;white-space:nowrap}.aa-card[data-status="safe-stop"] .aa-card-status{color:#ffd166}.aa-card[data-status="success"] .aa-card-status{color:#42e68b}.aa-card[data-status="error"] .aa-card-status{color:#ff7d86}
      .aa-steps{padding:5px 10px 8px}.aa-card[data-open="false"] .aa-steps{display:none}.aa-step{display:grid;grid-template-columns:17px 1fr;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06)}.aa-step:last-child{border-bottom:0}.aa-icon{color:#7aa2ff;font-weight:700}.aa-step[data-kind="safe-stop"] .aa-icon{color:#ffd166}.aa-step[data-kind="success"] .aa-icon{color:#42e68b}.aa-step[data-kind="error"] .aa-icon{color:#ff7d86}.aa-label{font-weight:620}.aa-detail{color:#9fb1d1;font-size:11px;margin-top:1px}.aa-footer{margin:8px 4px 0;color:#7f92b4;font-size:11px}
    `;
    document.head.appendChild(style);
    panel = document.createElement("aside");
    panel.id = "atinamos-agent-activity";
    panel.dataset.expanded = String(state.expanded);
    panel.setAttribute("aria-label", "AI agent activity");
    panel.innerHTML = `<button class="aa-head" type="button" aria-expanded="${String(state.expanded)}"><span class="aa-title"><span class="aa-dot"></span>Agent activity</span><span class="aa-subtitle">${state.expanded ? "WebMCP active ▾" : "WebMCP active ▴"}</span></button><div class="aa-body" aria-live="polite"><div class="aa-cards"><div class="aa-empty">Ready for ChatGPT site-tool activity.</div></div><div class="aa-footer">Session activity only. Payment approval remains with the buyer.</div></div>`;
    panel.querySelector(".aa-head").addEventListener("click", () => {
      state.expanded = !state.expanded;
      panel.dataset.expanded = String(state.expanded);
      panel.querySelector(".aa-head").setAttribute("aria-expanded", String(state.expanded));
      panel.querySelector(".aa-subtitle").textContent = state.expanded ? "WebMCP active ▾" : "WebMCP active ▴";
      saveState();
    });
    document.body.appendChild(panel);
    return panel;
  }

  function render() {
    const container = ensurePanel().querySelector(".aa-cards");
    if (!state.cards.length) {
      container.innerHTML = '<div class="aa-empty">Ready for ChatGPT site-tool activity.</div>';
      saveState();
      return;
    }
    container.replaceChildren(...state.cards.map((card) => {
      const el = document.createElement("section");
      el.className = "aa-card";
      el.dataset.status = card.status;
      el.dataset.open = String(card.open);
      const head = document.createElement("button");
      head.className = "aa-card-head";
      head.type = "button";
      const left = document.createElement("span");
      const title = document.createElement("div");
      title.className = "aa-card-title";
      title.textContent = card.title;
      const meta = document.createElement("div");
      meta.className = "aa-card-meta";
      meta.textContent = card.meta;
      left.append(title, meta);
      const status = document.createElement("span");
      status.className = "aa-card-status";
      status.textContent = card.statusLabel;
      head.append(left, status);
      head.addEventListener("click", () => { card.open = !card.open; render(); });
      const steps = document.createElement("div");
      steps.className = "aa-steps";
      card.steps.forEach((step) => {
        const row = document.createElement("div");
        row.className = "aa-step";
        row.dataset.kind = step.kind;
        const icon = document.createElement("div");
        icon.className = "aa-icon";
        icon.textContent = step.kind === "success" ? "✓" : step.kind === "safe-stop" ? "■" : step.kind === "error" ? "!" : "→";
        const copy = document.createElement("div");
        const label = document.createElement("div");
        label.className = "aa-label";
        label.textContent = step.label;
        copy.appendChild(label);
        if (step.detail) {
          const detail = document.createElement("div");
          detail.className = "aa-detail";
          detail.textContent = step.detail;
          copy.appendChild(detail);
        }
        row.append(icon, copy);
        steps.appendChild(row);
      });
      el.append(head, steps);
      return el;
    }));
    saveState();
  }

  function nextRef(prefix) {
    state.sequence += 1;
    return { id: state.sequence, label: `${prefix} #${state.sequence}` };
  }

  function newCard(title, meta, prefix = "Request", key = null) {
    state.cards.forEach((card) => { card.open = false; });
    const ref = nextRef(prefix);
    const card = { id: ref.id, key: key || `${prefix.toLowerCase()}-${ref.id}`, title, meta: `${ref.label}${meta ? ` · ${meta}` : ""}`, status: "activity", statusLabel: "In progress", open: true, steps: [] };
    state.cards.unshift(card);
    state.cards = state.cards.slice(0, MAX_CARDS);
    render();
    return card;
  }

  function findCard(key) { return state.cards.find((card) => card.key === key) || null; }

  function addStep(card, label, detail = "", kind = "activity") {
    if (card.steps.some((step) => step.label === label && step.detail === detail)) return;
    card.steps.push({ label, detail, kind });
    if (kind === "safe-stop") { card.status = "safe-stop"; card.statusLabel = "Stopped safely"; }
    else if (kind === "error") { card.status = "error"; card.statusLabel = "Error"; }
    else if (kind === "success") { card.status = "success"; card.statusLabel = "Complete"; }
    render();
  }

  function bodyObject(init) {
    try { return init && typeof init.body === "string" ? JSON.parse(init.body) : null; }
    catch { return null; }
  }
  function targetFromBody(body) {
    if (!body || typeof body !== "object") return "";
    return String(body.url || body.target_url || body.website_url || body.domain || "").trim();
  }
  function requestInfo(input, init) {
    const raw = typeof input === "string" ? input : input && input.url ? input.url : "";
    return {
      url: new URL(raw || location.href, location.href),
      method: String((init && init.method) || (input && input.method) || "GET").toUpperCase(),
      body: bodyObject(init),
    };
  }

  function discoveryCard() {
    return findCard("discovery") || newCard("Service discovery", "Live Agent Shop catalogue", "Lookup", "discovery");
  }

  function absorbDiscoveryInto(card) {
    const discovery = findCard("discovery");
    if (!discovery || discovery === card) return;
    discovery.steps.forEach((step) => {
      if (!card.steps.some((existing) => existing.label === step.label)) card.steps.push(step);
    });
    state.cards = state.cards.filter((item) => item !== discovery);
  }

  function meaningfulCard(title, meta, prefix = "Request", key = null) {
    const card = newCard(title, meta, prefix, key);
    absorbDiscoveryInto(card);
    return card;
  }

  function serviceCard(url, body) {
    const slug = url.pathname.replace("/agent/", "");
    const name = SERVICE_NAMES[slug] || slug || "Agent Shop service";
    const target = targetFromBody(body);
    return meaningfulCard(name, target || slug, "Request");
  }

  async function marketCount(response) {
    try {
      const payload = await response.clone().json();
      const list = [payload.results, payload.services, payload.items, payload.matches].find(Array.isArray);
      if (list) return list.length;
      if (Number.isInteger(payload.count)) return payload.count;
      if (Number.isInteger(payload.total)) return payload.total;
    } catch {}
    return null;
  }

  window.fetch = async function atinamosActivityFetch(input, init) {
    const { url, method, body } = requestInfo(input, init);
    const sameOrigin = url.origin === location.origin;
    let card = null;
    let kind = "";
    if (sameOrigin) {
      const path = url.pathname;
      if (path === "/v1/catalog") {
        card = discoveryCard();
        addStep(card, "Catalogue checked", "Current services, contracts and prices requested.");
        kind = "catalog";
      } else if (path === "/agent/market/search") {
        const query = url.searchParams.get("q") || "Observed machine services";
        card = meaningfulCard("Market Search", `“${query}”`, "Search");
        addStep(card, "Searching observed market", query);
        kind = "market";
      } else if (path.startsWith("/agent/market/service/")) {
        const id = path.split("/").pop() || "service";
        card = meaningfulCard("Observed market service", `ID ${id}`, "Lookup");
        addStep(card, "Reading observed market service", "Registry observation; not an endorsement.");
        kind = "market-detail";
      } else if (path.startsWith("/agent/jobs/")) {
        const id = path.split("/").pop() || "job";
        card = meaningfulCard("Job status", id, "Job", `job-${id}`);
        addStep(card, "Checking service job", id);
        kind = "job";
      } else if (method !== "GET" && path.startsWith("/agent/")) {
        card = serviceCard(url, body);
        addStep(card, "Service request started", card.meta.split(" · ").slice(1).join(" · ") || path);
        kind = "service";
      }
    }

    try {
      const response = await originalFetch(input, init);
      if (card) {
        if (response.status === 402) {
          addStep(card, "Payment required — stopped safely", "HTTP 402 received. No payment was signed, funded or retried by WebMCP.", "safe-stop");
        } else if (!response.ok) {
          addStep(card, "Site-tool request returned an error", `HTTP ${response.status}.`, "error");
        } else if (kind === "catalog") {
          addStep(card, "Catalogue received", "Service information is ready for agent selection or quoting.", "success");
        } else if (kind === "market") {
          const count = await marketCount(response);
          const detail = count === null ? "Observed results returned to the agent." : `${count} observed service${count === 1 ? "" : "s"} returned. Registry observations are not endorsements.`;
          addStep(card, "Market search complete", detail, "success");
        } else if (kind === "market-detail") {
          addStep(card, "Observed service received", "Registry observation returned to the agent; not an endorsement.", "success");
        } else if (kind === "job") {
          addStep(card, "Job status received", "Current state/result returned to the agent.", "success");
        } else if (kind === "service") {
          addStep(card, "Service response received", `HTTP ${response.status}.`, "success");
        }
      }
      return response;
    } catch (error) {
      if (card) addStep(card, "Site-tool request failed", error instanceof Error ? error.message : "Network request failed.", "error");
      throw error;
    }
  };

  ensurePanel();
  render();
})();
