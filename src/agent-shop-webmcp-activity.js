/* Atinamos Agent Shop — WebMCP human-visible request history + human payment continuation */
(() => {
  "use strict";
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext || window.__atinamosWebmcpActivityInstalled) return;
  window.__atinamosWebmcpActivityInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const MAX_CARDS = 12;
  const SESSION_KEY = "atinamos:webmcp:activity:v1";
  const BASE_CHAIN_ID = 8453;
  const X402_NETWORK_PATTERN = "eip155:*";
  const BASE_ACCOUNT_SCRIPT = "https://unpkg.com/@base-org/account/dist/base-account.min.js";
  const SERVICE_NAMES = {
    "render-check": "Render Check",
    "buyer-check": "Buyer Check",
    "json-repair": "JSON Validate / Repair",
    "technical-seo-crawl": "Technical SEO Crawl",
  };

  const pendingRequests = new Map();
  let baseProvider = null;
  let baseAddress = null;
  let baseSdkPromise = null;
  let x402ModulesPromise = null;

  function safeRequestView(record) {
    if (!record) return null;
    return {
      request_id: record.requestId,
      service: record.service,
      status: record.status,
      http_status: record.httpStatus || null,
      payment_status: record.paymentStatus || null,
      amount_usdc: record.amountUsdc ?? null,
      network: record.network || null,
      wallet: record.wallet || null,
      user_action_required: record.status === "payment_required",
      response: record.response ?? null,
      job_id: record.jobId || null,
      updated_at: record.updatedAt,
    };
  }

  window.__atinamosWebmcpRequestStore = Object.freeze({
    get(requestId) {
      return safeRequestView(pendingRequests.get(String(requestId || "").trim()));
    },
  });

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
        if (card.status === "payment") {
          card.status = "safe-stop";
          card.statusLabel = "Payment required";
          card.paymentRequestId = null;
        }
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
          requestId: card.requestId || null,
        })),
      }));
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
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
      .aa-card-head{width:100%;border:0;background:rgba(122,162,255,.06);color:inherit;padding:9px 10px;display:flex;justify-content:space-between;gap:10px;text-align:left;cursor:pointer;font:inherit}.aa-card-title{font-weight:700}.aa-card-meta{color:#9fb1d1;font-size:11px;margin-top:2px}.aa-card-status{font-size:11px;color:#9fb1d1;white-space:nowrap}.aa-card[data-status="safe-stop"] .aa-card-status,.aa-card[data-status="payment"] .aa-card-status{color:#ffd166}.aa-card[data-status="success"] .aa-card-status{color:#42e68b}.aa-card[data-status="error"] .aa-card-status{color:#ff7d86}
      .aa-steps{padding:5px 10px 8px}.aa-card[data-open="false"] .aa-steps{display:none}.aa-step{display:grid;grid-template-columns:17px 1fr;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06)}.aa-step:last-child{border-bottom:0}.aa-icon{color:#7aa2ff;font-weight:700}.aa-step[data-kind="safe-stop"] .aa-icon,.aa-step[data-kind="payment"] .aa-icon{color:#ffd166}.aa-step[data-kind="success"] .aa-icon{color:#42e68b}.aa-step[data-kind="error"] .aa-icon{color:#ff7d86}.aa-label{font-weight:620}.aa-detail{color:#9fb1d1;font-size:11px;margin-top:1px}.aa-actions{display:flex;gap:8px;padding:0 10px 10px}.aa-pay{appearance:none;border:1px solid rgba(255,209,102,.6);background:rgba(255,209,102,.12);color:#ffe3a1;border-radius:9px;padding:8px 10px;font:700 12px/1.2 inherit;cursor:pointer}.aa-pay:hover{background:rgba(255,209,102,.2)}.aa-pay:disabled{opacity:.55;cursor:wait}.aa-footer{margin:8px 4px 0;color:#7f92b4;font-size:11px}
    `;
    document.head.appendChild(style);
    panel = document.createElement("aside");
    panel.id = "atinamos-agent-activity";
    panel.dataset.expanded = String(state.expanded);
    panel.setAttribute("aria-label", "AI agent activity");
    panel.innerHTML = `<button class="aa-head" type="button" aria-expanded="${String(state.expanded)}"><span class="aa-title"><span class="aa-dot"></span>Agent activity</span><span class="aa-subtitle">${state.expanded ? "WebMCP active ▾" : "WebMCP active ▴"}</span></button><div class="aa-body" aria-live="polite"><div class="aa-cards"><div class="aa-empty">Ready for ChatGPT site-tool activity.</div></div><div class="aa-footer">WebMCP can request paid work, but payment approval stays with the human and their Base wallet.</div></div>`;
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
        icon.textContent = step.kind === "success" ? "✓" : step.kind === "safe-stop" || step.kind === "payment" ? "■" : step.kind === "error" ? "!" : "→";
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
      const pending = card.paymentRequestId ? pendingRequests.get(card.paymentRequestId) : null;
      if (pending && pending.status === "payment_required") {
        const actions = document.createElement("div");
        actions.className = "aa-actions";
        const pay = document.createElement("button");
        pay.type = "button";
        pay.className = "aa-pay";
        pay.textContent = pending.amountUsdc == null ? "Pay with Base" : `Pay ${pending.amountUsdc} USDC with Base`;
        pay.addEventListener("click", async () => {
          pay.disabled = true;
          try { await payAndContinue(pending.requestId, card); }
          finally { if (document.contains(pay)) pay.disabled = false; }
        });
        actions.appendChild(pay);
        el.appendChild(actions);
      }
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
    const card = { id: ref.id, key: key || `${prefix.toLowerCase()}-${ref.id}`, title, meta: `${ref.label}${meta ? ` · ${meta}` : ""}`, status: "activity", statusLabel: "In progress", open: true, steps: [], requestId: null, paymentRequestId: null };
    state.cards.unshift(card);
    state.cards = state.cards.slice(0, MAX_CARDS);
    render();
    return card;
  }

  function findCard(key) { return state.cards.find((card) => card.key === key) || null; }

  function addStep(card, label, detail = "", kind = "activity") {
    if (card.steps.some((step) => step.label === label && step.detail === detail)) return;
    card.steps.push({ label, detail, kind });
    if (kind === "safe-stop") { card.status = "safe-stop"; card.statusLabel = "Payment required"; }
    else if (kind === "payment") { card.status = "payment"; card.statusLabel = "Awaiting approval"; }
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

  function requestHeader(init, name) {
    try {
      const headers = new Headers((init && init.headers) || undefined);
      return headers.get(name);
    } catch {
      return null;
    }
  }

  function requestInfo(input, init) {
    const raw = typeof input === "string" ? input : input && input.url ? input.url : "";
    return {
      url: new URL(raw || location.href, location.href),
      method: String((init && init.method) || (input && input.method) || "GET").toUpperCase(),
      body: bodyObject(init),
      requestId: requestHeader(init, "X-Atinamos-WebMCP-Request-ID"),
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

  function serviceCard(url, body, requestId) {
    const slug = url.pathname.replace("/agent/", "");
    const name = SERVICE_NAMES[slug] || slug || "Agent Shop service";
    const target = targetFromBody(body);
    const card = newCard(name, target || slug, "Request", requestId ? `request-${requestId}` : null);
    card.requestId = requestId || null;
    absorbDiscoveryInto(card);
    return card;
  }

  function decodePaymentRequired(value) {
    if (!value) return null;
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  function paymentSummary(challenge) {
    const accept = challenge && Array.isArray(challenge.accepts) ? challenge.accepts[0] : null;
    if (!accept) return { amountUsdc: null, network: null, payTo: null };
    const rawAmount = Number(accept.amount);
    return {
      amountUsdc: Number.isFinite(rawAmount) ? rawAmount / 1_000_000 : null,
      network: accept.network || null,
      payTo: accept.payTo || null,
    };
  }

  function rememberPaymentRequest({ requestId, url, init, body, challenge, card }) {
    const id = requestId || `wr-ui-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    const slug = url.pathname.replace("/agent/", "");
    const summary = paymentSummary(challenge);
    const record = {
      requestId: id,
      service: slug,
      status: "payment_required",
      httpStatus: 402,
      paymentStatus: "payment_required",
      amountUsdc: summary.amountUsdc,
      network: summary.network,
      payTo: summary.payTo,
      wallet: null,
      response: null,
      jobId: null,
      url: url.pathname + url.search,
      init: {
        method: init && init.method ? init.method : "POST",
        headers: Object.fromEntries(new Headers((init && init.headers) || undefined).entries()),
        credentials: (init && init.credentials) || "same-origin",
        body: init && init.body ? init.body : JSON.stringify(body || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    pendingRequests.set(id, record);
    card.requestId = id;
    card.paymentRequestId = id;
    return record;
  }

  function loadBaseSdk() {
    if (typeof window.createBaseAccountSDK === "function") return Promise.resolve();
    if (baseSdkPromise) return baseSdkPromise;
    baseSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = BASE_ACCOUNT_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Base Account SDK could not be loaded."));
      document.head.appendChild(script);
    });
    return baseSdkPromise;
  }

  async function connectBaseWallet() {
    await loadBaseSdk();
    if (!baseProvider) {
      const sdk = window.createBaseAccountSDK({ appName: "Atinamos Agent Shop", appChainIds: [BASE_CHAIN_ID] });
      baseProvider = sdk.getProvider();
    }
    const accounts = await baseProvider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error("No Base wallet account was returned.");
    baseAddress = String(accounts[0]);
    return baseAddress;
  }

  function stringifyTypedData(value) {
    return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
  }

  function browserSigner() {
    if (!baseProvider || !baseAddress) throw new Error("Connect a Base wallet before paying.");
    return {
      address: baseAddress,
      signTypedData: async (typedData) => {
        const payload = { domain: typedData.domain, types: typedData.types, primaryType: typedData.primaryType, message: typedData.message };
        return baseProvider.request({ method: "eth_signTypedData_v4", params: [baseAddress, stringifyTypedData(payload)] });
      },
    };
  }

  function loadX402Modules() {
    if (!x402ModulesPromise) {
      x402ModulesPromise = Promise.all([
        import("https://esm.sh/@x402/fetch@2.24.0"),
        import("https://esm.sh/@x402/core@2.24.0/client"),
        import("https://esm.sh/@x402/evm@2.24.0/exact/client"),
      ]).then(([fetchModule, coreModule, evmModule]) => ({
        wrapFetchWithPayment: fetchModule.wrapFetchWithPayment,
        x402HTTPClient: fetchModule.x402HTTPClient,
        x402Client: coreModule.x402Client,
        ExactEvmScheme: evmModule.ExactEvmScheme,
      }));
    }
    return x402ModulesPromise;
  }

  async function payAndContinue(requestId, card) {
    const record = pendingRequests.get(requestId);
    if (!record || record.status !== "payment_required") return;
    const amountText = record.amountUsdc == null ? "the requested amount" : `${record.amountUsdc} USDC`;
    const confirmed = window.confirm(`Approve ${amountText} on Base to continue ${SERVICE_NAMES[record.service] || record.service}?`);
    if (!confirmed) {
      addStep(card, "Payment approval cancelled", "No payment was signed or settled.", "safe-stop");
      return;
    }

    try {
      record.status = "payment_connecting";
      record.updatedAt = new Date().toISOString();
      card.status = "payment";
      card.statusLabel = "Opening wallet";
      addStep(card, "Human payment approval opened", "Connecting a buyer-controlled Base wallet.", "payment");
      const wallet = await connectBaseWallet();
      record.wallet = wallet;
      record.updatedAt = new Date().toISOString();
      if (record.payTo && wallet.toLowerCase() === String(record.payTo).toLowerCase()) {
        record.status = "payment_required";
        card.status = "safe-stop";
        card.statusLabel = "Different wallet needed";
        addStep(card, "Buyer and seller wallet match", "Use a different Base wallet to avoid a self-send payment.", "error");
        return;
      }
      addStep(card, "Base wallet connected", `${wallet.slice(0, 8)}…${wallet.slice(-4)}. No payment made yet.`);

      const { wrapFetchWithPayment, x402HTTPClient, x402Client, ExactEvmScheme } = await loadX402Modules();
      const client = new x402Client();
      client.register(X402_NETWORK_PATTERN, new ExactEvmScheme(browserSigner()));
      const fetchWithPayment = wrapFetchWithPayment(originalFetch, client);
      const httpClient = new x402HTTPClient(client);

      record.status = "payment_approval";
      record.updatedAt = new Date().toISOString();
      card.status = "payment";
      card.statusLabel = "Awaiting wallet";
      render();

      const response = await fetchWithPayment(record.url, record.init);
      const result = await httpClient.processResponse(response);
      record.httpStatus = response.status;
      record.paymentStatus = result.paymentStatus || null;
      record.response = result.body;
      record.updatedAt = new Date().toISOString();
      record.jobId = result.body && typeof result.body === "object" ? result.body.job_id || null : null;

      if (response.ok && result.paymentStatus === "settled") {
        record.status = record.jobId ? "queued" : "completed";
        card.paymentRequestId = null;
        addStep(card, "Payment settled", `${amountText} approved by the human-controlled Base wallet.`, "success");
        addStep(card, record.jobId ? "Service accepted" : "Service completed", record.jobId ? `Job ${record.jobId} was created.` : `HTTP ${response.status}; result is available to ChatGPT.`, "success");
      } else {
        record.status = "payment_required";
        card.status = "safe-stop";
        card.statusLabel = "Payment not completed";
        addStep(card, "Payment was not accepted", `HTTP ${response.status}; no successful service result was returned.`, "error");
      }
      render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rejected = /reject|denied|cancel/i.test(message);
      record.status = "payment_required";
      record.updatedAt = new Date().toISOString();
      card.status = "safe-stop";
      card.statusLabel = rejected ? "Approval cancelled" : "Payment error";
      addStep(card, rejected ? "Wallet approval cancelled" : "Payment continuation failed", rejected ? "No payment was settled." : message, rejected ? "safe-stop" : "error");
      render();
    }
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
    const { url, method, body, requestId } = requestInfo(input, init);
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
        card = newCard("Market Search", `“${query}”`, "Search");
        addStep(card, "Searching observed market", query);
        kind = "market";
      } else if (path.startsWith("/agent/market/service/")) {
        const id = path.split("/").pop() || "service";
        card = newCard("Observed market service", `ID ${id}`, "Lookup");
        addStep(card, "Reading observed market service", "Registry observation; not an endorsement.");
        kind = "market-detail";
      } else if (path.startsWith("/agent/jobs/")) {
        const id = path.split("/").pop() || "job";
        card = newCard("Job status", id, "Job", `job-${id}`);
        addStep(card, "Checking service job", id);
        kind = "job";
      } else if (method !== "GET" && path.startsWith("/agent/")) {
        card = serviceCard(url, body, requestId);
        addStep(card, "Service request started", card.meta.split(" · ").slice(1).join(" · ") || path);
        kind = "service";
      }
    }

    try {
      const response = await originalFetch(input, init);
      if (card) {
        if (response.status === 402 && kind === "service") {
          const challenge = decodePaymentRequired(response.headers.get("payment-required"));
          const record = rememberPaymentRequest({ requestId, url, init, body, challenge, card });
          const amountText = record.amountUsdc == null ? "Payment required" : `${record.amountUsdc} USDC on Base`;
          addStep(card, "Payment approval required", `${amountText}. WebMCP stopped; only the human can continue with Pay with Base.`, "safe-stop");
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
