# Runnable public reference harness

This directory makes the challenge submission independently runnable without exposing the private pre-existing Atinamos production backend or any wallet credentials.

The harness deliberately reuses `../src/agent-shop-webmcp.js`, the same published WebMCP tool bundle used by the live challenge extension.

## What the local harness proves

- WebMCP tools register from the published source.
- The live-style catalogue contract is available at `/v1/catalog`.
- `json-repair` can be quoted and requested through WebMCP.
- The first paid request returns HTTP 402 and stops before execution.
- A visible human-only local approval action is required before continuation.
- After human approval, the deterministic JSON Repair service returns HTTP 200.
- `get_request_status` can read the completed structured result from the page request store.

The local approval button is **not a blockchain payment** and is clearly labelled as a demo continuation. The submitted live URL, `https://agent.atinamos.co.uk/`, is the evidence for the real buyer-controlled Base wallet and x402 verification/settlement flow shown in the challenge video.

## Run locally

Python 3.11+ is recommended.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r demo/requirements.txt
python -m uvicorn demo.app:app --host 127.0.0.1 --port 8000
```

Open:

`http://127.0.0.1:8000/`

Use ChatGPT's in-app browser, or Chrome 149+ with WebMCP enabled at `chrome://flags/#enable-webmcp-testing`.

## Suggested local test

First ask:

> Use this website's Atinamos service quote tool for `json-repair`. Tell me the price and required input. Do not spend anything.

Then ask:

> Use the Atinamos `Begin service purchase` site tool for `json-repair` with input `{"json":"{'name': 'Atinamos', 'price': 0.005,}","mode":"repair"}`. Stop when human approval is required.

Expected behaviour:

1. WebMCP sends the service request.
2. `/agent/json-repair` returns HTTP 402.
3. The agent reports `payment_required` and does not execute the service.
4. The page shows **Approve local demo continuation**.
5. A human clicks that button.
6. The harness retries with an explicit local demo-approval header.
7. The deterministic repair executes and returns HTTP 200.
8. The human sees the structured result and the agent can call `get_request_status` using the request ID.

## Why the harness does not reproduce Coinbase settlement

The production Agent Shop and x402 service backend existed before the challenge. The challenge work is the WebMCP extension and the human/agent authority boundary. Production wallet/payment configuration is intentionally not published.

The public harness therefore reproduces the complete challenge-facing control flow while replacing the external Base settlement with an explicit local approval marker. This keeps the repository runnable and auditable without pretending a simulated payment is a real x402 transaction.
