# Atinamos Agent Shop — WebMCP Challenge

**Live app:** https://agent.atinamos.co.uk/  
**Challenge:** OpenAI WebMCP Challenge 2026  
**Status:** live WebMCP implementation on the existing Atinamos Agent Shop

Atinamos Agent Shop is an existing machine-service storefront extended during the WebMCP Challenge so browser agents can discover, quote, request and consume services directly from the same live page a human sees.

The challenge extension now demonstrates a complete human+agent commerce loop: WebMCP requests the service and stops at the real x402 payment boundary; the human explicitly approves payment with their own Base wallet; the existing x402 endpoint verifies/settles and executes; then the agent reads the structured result through WebMCP.

## Live WebMCP tools

| Tool | Effect | Purpose |
|---|---|---|
| `list_services` | Read-only | Read live catalogue, prices and contracts. |
| `get_service_details` | Read-only | Read one exact service contract. |
| `get_quote` | Read-only | Read current price and payment boundary without starting work. |
| `search_market` | Read-only, untrusted output | Search external machine services observed by Atinamos. |
| `get_market_service` | Read-only, untrusted output | Read one observed external service record. |
| `check_purchase_status` | Read-only | Poll an asynchronous Atinamos job/result. |
| `get_request_status` | Read-only | Read the page-session result/status after human payment action. |
| `begin_service_purchase` | Request-starting | Submit service input and obtain the real x402 requirement. It cannot sign, fund, approve or automatically retry payment. |

## Proven paid flow

On 30 August 2026 the complete JSON Validate / Repair flow was proven in ChatGPT's built-in WebMCP browser:

1. ChatGPT discovered the site's WebMCP tools.
2. It selected JSON Validate / Repair and quoted **0.005 USDC**.
3. `begin_service_purchase` submitted broken JSON and received the real HTTP 402/x402 requirement.
4. The same webpage's **Agent Activity** panel showed **Payment approval required** and **Pay with Base**.
5. A human connected a separate buyer-controlled Base wallet and explicitly approved the payment.
6. Coinbase CDP x402 verification returned 200 and settlement returned 200.
7. The existing `/agent/json-repair` endpoint returned HTTP 200 with a deterministic repaired result.
8. Agent Activity showed **Payment settled** and **Service completed**.
9. ChatGPT read the completed request through the read-only status path and returned the repaired JSON.

WebMCP never held a wallet key or silently spent funds.

## Human + agent experience

The ordinary storefront progressively adds an **Agent Activity** panel only in a WebMCP-capable browser. It shows service discovery, request start, payment boundary, human wallet approval, settlement and completion.

The activity panel is intentionally not a report viewer. After work completes it can offer a human **View result**, **View progress**, or **View failure details** action that opens a separate same-origin, noindex result page with structured evidence and JSON download.

That result page is optional human UX. **Agents do not scrape or depend on it.** They consume the structured result directly through `get_request_status`, `check_purchase_status`, and the existing machine APIs.

```text
ChatGPT / browser agent
        |
        | WebMCP begin_service_purchase
        v
real Atinamos paid endpoint
        |
        v
HTTP 402 / x402 requirement
        |
        +----> agent receives payment_required + request_id
        |
        +----> Agent Activity: Pay with Base
                         |
                    HUMAN approval
                         |
                    Base wallet signer
                         |
                    x402 paid retry
                         |
                 verify + settle + execute
                         |
            +------------+-------------+
            |                          |
            v                          v
  get_request_status()          View result/progress
  structured agent result       human report/download
```

## Why WebMCP fits

Before WebMCP an AI browsing the storefront could read HTML, use the separate external MCP, or call documented APIs if independently configured. WebMCP lets the website itself expose deterministic actions directly to the browser agent on the same page.

The agent no longer needs to infer service contracts from visual cards. The site tells it exactly which services exist, what they cost, which inputs they require, what fulfilment to expect, which third-party text is untrusted, and where financial authority begins.

The human enters only where human authority is appropriate: approving payment and optionally inspecting the result.

## Existing product vs challenge work

### Pre-existing

Before the challenge the Agent Shop already had its human storefront, `/v1/catalog`, OpenAPI, external `/mcp`, x402 paid routes, job polling, free Market Search, machine-discovery metadata, evidence infrastructure, and live Render Check, Buyer Check, JSON Validate / Repair and Technical SEO Crawl services.

### Added during the challenge

- browser-native `document.modelContext.registerTool(...)` integration;
- eight live site tools;
- explicit read-only/request-starting/untrusted-content annotations;
- page-session request IDs and read-only result retrieval;
- Agent Activity history shared by human and agent;
- safe HTTP 402 boundary with no WebMCP signing;
- explicit human **Pay with Base** continuation using a buyer-controlled wallet;
- buyer=seller self-send protection;
- human result/progress/failure view with JSON download while preserving agent-first structured output;
- progressive enhancement, regression tests and CI.

See [`docs/CHALLENGE_HISTORY.md`](docs/CHALLENGE_HISTORY.md) for the dated before/after record.

## Repository layout

```text
src/
  agent-shop-webmcp.js
  agent-shop-webmcp-activity.js
  agent-shop-result-actions.js
  agent-shop-result-view.html
  agent-shop-result-view.js
integration/
  webmcp_site_tools.py
tests/
  test_public_source.py
docs/
  ARCHITECTURE.md
  CHALLENGE_HISTORY.md
  JUDGE_TESTING.md
  HUMAN_PAYMENT_AND_RESULTS.md
.github/workflows/
  ci.yml
LICENSE
```

The production backend remains a pre-existing hosted dependency and is not republished wholesale. This repository contains the challenge extension and integration/test material needed to understand and reproduce the WebMCP layer against the public Agent Shop interfaces. It contains no production secrets, private keys, wallet credentials or unrelated private systems.

## Judge test

Open https://agent.atinamos.co.uk/ in ChatGPT's in-app WebMCP browser and ask:

> Using this website's tools, repair this JSON: `{foo: 'bar', active: true,}`. Tell me the price first. If payment is required, start the request but do not make or approve payment yourself.

Expected: ChatGPT quotes **0.005 USDC**, WebMCP reaches HTTP 402, and Agent Activity offers the human-controlled **Pay with Base** continuation. After a human approves payment, ask ChatGPT to check the request status and give the result. It should receive the repaired JSON through the read-only site tool.

For a no-spend test:

> Find Render Check and tell me how much it costs. Do not buy anything. Use the site's tools.

See [`docs/JUDGE_TESTING.md`](docs/JUDGE_TESTING.md) for the full test sequence.

## Security boundary

- WebMCP itself is not a wallet.
- No private key or seed phrase is handled by the site.
- `begin_service_purchase` cannot approve, sign, fund or automatically retry payment.
- Human payment requires a visible action and wallet approval.
- Buyer=seller wallet is blocked before signing.
- A quote or 402 is never treated as proof of execution.
- Third-party registry text is marked as untrusted.
- Human result pages are session-bound and optional; machine consumers use structured tools/APIs.

## Licence

The WebMCP challenge extension in this repository is released under the MIT License. See [`LICENSE`](LICENSE).
