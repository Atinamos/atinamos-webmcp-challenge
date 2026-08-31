# Atinamos Agent Shop — WebMCP Challenge

**Live app:** https://agent.atinamos.co.uk/  
**Challenge:** OpenAI WebMCP Challenge 2026  
**Licence:** MIT  
**Local runnable harness:** [`RUN_LOCAL.md`](RUN_LOCAL.md)

Atinamos Agent Shop is an existing machine-service storefront that was meaningfully extended during the WebMCP Challenge so browser agents can discover, quote and request services directly from the same live page a human sees.

The challenge extension demonstrates a complete human+agent commerce loop: WebMCP requests a service and stops at the HTTP 402/x402 boundary; the human explicitly approves payment with a buyer-controlled Base wallet; the existing paid endpoint verifies, settles and executes; then the agent reads the structured result through WebMCP.

WebMCP never holds a wallet key or silently spends funds.

## What was pre-existing

Before the challenge the Agent Shop already had:

- a human storefront;
- `/v1/catalog`;
- REST/OpenAPI;
- an external `/mcp` endpoint;
- x402-protected paid routes;
- job polling and evidence infrastructure;
- Market Search;
- live Render Check, Buyer Check, JSON Validate / Repair and Technical SEO Crawl services.

Those capabilities are not claimed as challenge-period inventions.

See [`docs/CHALLENGE_HISTORY.md`](docs/CHALLENGE_HISTORY.md) for the dated baseline and challenge history.

## What was added during the challenge

- browser-native `document.modelContext.registerTool(...)` integration;
- eight WebMCP site tools;
- explicit read-only, request-starting and untrusted-content annotations;
- request IDs and read-only result/status retrieval;
- Agent Activity shared by the human and browser agent;
- safe HTTP 402 boundary with no WebMCP signing or funding;
- explicit human **Pay with Base** continuation;
- buyer=seller wallet protection;
- reload/restart recovery for safe request state;
- dedicated human result/progress/failure view;
- regression tests and CI;
- an independently runnable public reference harness.

## Live WebMCP tools

| Tool | Effect | Purpose |
|---|---|---|
| `list_services` | Read-only | Read live catalogue, prices and contracts. |
| `get_service_details` | Read-only | Read one exact service contract. |
| `get_quote` | Read-only | Read current price and payment boundary. |
| `search_market` | Read-only, untrusted output | Search observed external machine services. |
| `get_market_service` | Read-only, untrusted output | Read one observed external service record. |
| `check_purchase_status` | Read-only | Poll an asynchronous job/result. |
| `get_request_status` | Read-only | Read request state/result after human action. |
| `begin_service_purchase` | Request-starting | Submit service input and obtain the real HTTP 402/x402 requirement. It cannot sign, fund or approve payment. |

## Proven live paid flow

The JSON Validate / Repair flow was proven in ChatGPT's in-app WebMCP browser:

1. ChatGPT discovered the site's WebMCP tools.
2. It quoted JSON Validate / Repair at **0.005 USDC**.
3. `begin_service_purchase` submitted malformed JSON and received HTTP 402.
4. Agent Activity showed **Payment approval required**.
5. The human clicked **Pay with Base** and connected a buyer-controlled wallet.
6. Coinbase CDP x402 verification and settlement returned HTTP 200.
7. `/agent/json-repair` returned HTTP 200 with deterministic repaired JSON.
8. Agent Activity showed **Payment settled** and **Service completed**.
9. The structured result was available to the agent and the human result page.

The public challenge video shows this live flow.

## Run the project locally

The repository now includes a small public reference Agent Shop under [`demo/`](demo/). It directly serves the published `src/agent-shop-webmcp.js` tool bundle and provides the minimum catalogue/service contracts needed to exercise the challenge interaction independently.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r demo/requirements.txt
python -m uvicorn demo.app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/` in ChatGPT's in-app browser, or Chrome 149+ with WebMCP enabled.

The local harness reproduces:

**WebMCP request → HTTP 402 → WebMCP stops → visible human approval → deterministic service execution → structured result**.

The local human button is deliberately labelled **Approve local demo continuation**. It does **not** pretend to be a blockchain payment. Real Base/x402 verification and settlement require the existing production integration and are demonstrated by the submitted live app and video.

See [`RUN_LOCAL.md`](RUN_LOCAL.md) and [`demo/README.md`](demo/README.md) for exact test prompts and expected behaviour.

## Why WebMCP fits

Before WebMCP, an AI browsing the storefront could read HTML, use the separately configured MCP endpoint, or call documented APIs if it already knew about them.

With WebMCP, the website itself exposes deterministic actions. The agent can discover the current service catalogue, exact price, required inputs and fulfilment contract without inferring them from visual cards.

The human enters only where human authority is appropriate: approving payment and optionally inspecting the result.

## Human / agent authority boundary

```text
browser agent
    |
    | begin_service_purchase
    v
paid service endpoint
    |
    v
HTTP 402 / x402 required
    |
    +---- agent stops and receives request_id
    |
    +---- Agent Activity shows human payment action
                         |
                    HUMAN approval
                         |
                    buyer wallet
                         |
                    verify + settle
                         |
                    service executes
                         |
              +----------+----------+
              |                     |
              v                     v
       structured agent result   human result page
```

Security properties:

- WebMCP is not a wallet.
- No private key or seed phrase is handled by the WebMCP tool bundle.
- `begin_service_purchase` cannot approve, sign, fund or automatically retry payment.
- Human payment requires a visible action and wallet approval.
- Buyer=seller self-payment is blocked before signing.
- A quote or HTTP 402 is never treated as proof of execution.
- Third-party registry text is marked as untrusted.

## Repository layout

```text
src/
  agent-shop-webmcp.js
  agent-shop-webmcp-activity.js
  agent-shop-session-durability.js
  agent-shop-payment-resume.js
  agent-shop-result-actions.js
  agent-shop-result-view.html
  agent-shop-result-view.js
integration/
  webmcp_site_tools.py
demo/
  app.py
  index.html
  demo-activity.js
  requirements.txt
  README.md
tests/
  test_public_source.py
  test_request_persistence.py
  test_demo_harness.py
docs/
  ARCHITECTURE.md
  CHALLENGE_HISTORY.md
  JUDGE_TESTING.md
  HUMAN_PAYMENT_AND_RESULTS.md
.github/workflows/
  ci.yml
RUN_LOCAL.md
LICENSE
```

The broader production backend remains a pre-existing hosted dependency and is not republished wholesale. The public `demo/` harness supplies a runnable reference implementation of the challenge-facing catalogue, HTTP 402 boundary, human authority step and deterministic JSON service so the WebMCP extension can be installed and exercised from this repository without production credentials.

No production secrets, private keys, wallet credentials or unrelated private systems are included.

## Judge test — live app

Open https://agent.atinamos.co.uk/ in ChatGPT's in-app browser.

No-spend quote:

> Use the Atinamos-Agent service quote site tool for json-repair. Return the service name, price and required input.

Paid-boundary test:

> Use the Atinamos-Agent Begin Atinamos service purchase site tool for json-repair with input {"json":"{'name': 'Atinamos', 'price': 0.005,}","mode":"repair"}. Stop when human payment approval is required.

Expected: ChatGPT reaches HTTP 402 and stops. Agent Activity offers the explicit human-controlled **Pay with Base** action. No payment occurs unless the human approves it.

For the full testing sequence see [`docs/JUDGE_TESTING.md`](docs/JUDGE_TESTING.md).

## Licence

The challenge extension and public reference harness in this repository are released under the MIT License. See [`LICENSE`](LICENSE).
