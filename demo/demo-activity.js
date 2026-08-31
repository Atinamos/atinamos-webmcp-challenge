/* Local-only human approval bridge for the public runnable harness. */
(() => {
  "use strict";

  const upstreamFetch = window.fetch.bind(window);
  const store = new Map();
  window.__atinamosWebmcpRequestStore = store;

  const stateEl = () => document.getElementById("state");
  const actionsEl = () => document.getElementById("actions");
  const resultEl = () => document.getElementById("result");

  function requestId(init) {
    try {
      return new Headers(init?.headers || undefined).get("X-Atinamos-WebMCP-Request-ID");
    } catch {
      return null;
    }
  }

  function render(record) {
    if (!record) return;
    const state = stateEl();
    const actions = actionsEl();
    const result = resultEl();
    if (!state || !actions || !result) return;

    actions.innerHTML = "";
    result.hidden = true;

    if (record.status === "payment_required") {
      state.className = "warn";
      state.textContent = `Payment approval required for ${record.service}. WebMCP stopped at HTTP 402.`;
      const button = document.createElement("button");
      button.textContent = "Approve local demo continuation";
      button.addEventListener("click", () => approve(record, button));
      actions.appendChild(button);
      return;
    }

    if (record.status === "completed") {
      state.className = "ok";
      state.textContent = "Human demo approval recorded. Service completed with HTTP 200.";
      result.hidden = false;
      result.textContent = JSON.stringify(record.response, null, 2);
      return;
    }

    state.className = "muted";
    state.textContent = record.status || "Waiting";
  }

  async function approve(record, button) {
    button.disabled = true;
    button.textContent = "Running…";
    const response = await upstreamFetch(record.path, {
      method: record.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Atinamos-WebMCP-Request-ID": record.request_id,
        "X-Atinamos-Demo-Approval": "approved",
      },
      credentials: "same-origin",
      body: record.body,
    });
    const payload = await response.json();
    const completed = {
      request_id: record.request_id,
      service: record.service,
      status: response.ok ? "completed" : "failed",
      http_status: response.status,
      payment_status: "demo-approved",
      amount_usdc: 0.005,
      response: payload,
      user_action_required: false,
      updated_at: new Date().toISOString(),
    };
    store.set(record.request_id, completed);
    render(completed);
  }

  window.fetch = async function demoAwareFetch(input, init) {
    const response = await upstreamFetch(input, init);
    try {
      const raw = typeof input === "string" ? input : input?.url;
      const url = new URL(raw || location.href, location.href);
      const id = requestId(init);
      if (url.origin === location.origin && url.pathname === "/agent/json-repair" && id && response.status === 402) {
        const record = {
          request_id: id,
          service: "json-repair",
          status: "payment_required",
          http_status: 402,
          payment_status: "required",
          amount_usdc: 0.005,
          user_action_required: true,
          path: url.pathname,
          method: String(init?.method || "POST").toUpperCase(),
          body: typeof init?.body === "string" ? init.body : "{}",
          updated_at: new Date().toISOString(),
        };
        store.set(id, record);
        render(record);
      }
    } catch {
      // The local activity layer must never change network behaviour.
    }
    return response;
  };
})();
