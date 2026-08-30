# Judge testing guide

## Live URL

https://agent.atinamos.co.uk/

Use ChatGPT's WebMCP-capable built-in browser, or another browser environment that exposes the current WebMCP `ModelContext` API.

## What should be visible

The Agent Shop exposes **8 site tools**:

1. List Atinamos services
2. Get Atinamos service details
3. Get Atinamos service quote
4. Search observed machine services
5. Get observed market service
6. Check Atinamos job status
7. Get human-approved purchase request status
8. Begin Atinamos service purchase

Seven are read-only/read tools; `begin_service_purchase` is request-starting. WebMCP itself has no wallet signer.

When WebMCP is active, the page also displays an **Agent activity** panel in the lower-right corner.

## Test 1 — read-only catalogue and quote

Prompt:

> Find Render Check and tell me how much it costs. Do not buy anything. Use the site's tools.

Expected: Render Check is found through site tools, its current live quote is returned, and no request/payment starts. At challenge validation time the quote was **0.25 USDC**.

## Test 2 — free Market Search

Prompt:

> Search the observed market for atinamos using the site's tools. Do not make any purchase or payment.

Expected: Market Search completes as a free/read-only action, registry text is described as observation rather than endorsement, and the activity panel records the search.

## Test 3 — real x402 boundary with no agent payment

Prompt:

> Begin a Render Check request for https://example.com, but do not approve or make any payment yourself.

Expected:

- the live endpoint returns **HTTP 402 Payment Required**;
- WebMCP returns `executed: false` plus a page-session `request_id`;
- no payment is signed/funded/retried by WebMCP;
- Agent Activity shows **Payment approval required** and a human-only **Pay with Base** continuation.

## Test 4 — complete paid human+agent loop

Recommended challenge demo prompt:

> Using this website's tools, repair this JSON: `{foo: 'bar', active: true,}`. Tell me the price first. If payment is required, start the request but do not make or approve payment yourself.

Expected:

1. ChatGPT selects JSON Validate / Repair and quotes **0.005 USDC**.
2. `begin_service_purchase` reaches the genuine HTTP 402/x402 requirement and returns a `request_id`.
3. Agent Activity shows **Payment approval required**.
4. A human chooses **Pay with Base**, connects a buyer-controlled Base wallet and explicitly approves the wallet request.
5. WebMCP itself still does not sign; the human-facing continuation performs the x402 retry.
6. On successful verification/settlement, Agent Activity shows **Payment settled** and **Service completed**.
7. Ask ChatGPT:

> The payment has been approved. Check the request status and give me the result.

8. ChatGPT uses the read-only request-status tool and returns the repaired structured JSON.

This exact flow was proven live on 30 August 2026. Coinbase CDP x402 `/verify` and `/settle` both returned HTTP 200 and `/agent/json-repair` returned HTTP 200.

## Human result/progress view

After completion the activity card can offer **View result**. Asynchronous work can offer **View progress**, and structured failures can offer **View failure details**.

Those actions open a separate same-origin, noindex, session-bound page with the human-readable structured response/evidence and JSON download. This is optional human UX. Agents do not need to parse this page; they consume results through WebMCP/API tools.

## Safety assertions

The published source should make these boundaries easy to verify:

- no private key or seed phrase handling;
- `agent-shop-webmcp.js` has no wallet signing/payment client;
- `webmcp_can_sign_or_fund_payment: false`;
- `webmcp_auto_retries_paid_request: false`;
- payment requires explicit human action and wallet approval;
- buyer=seller wallet is blocked before signing;
- marketplace output uses `untrustedContentHint: true`;
- request-starting tool uses `readOnlyHint: false`;
- `get_request_status` is read-only.

## Human-visible history

The activity panel groups catalogue lookup, request start, payment boundary, human approval, settlement and execution into a coherent request card. It is a status/authority surface, not a replacement for service reports.

The latest request is expanded, older cards collapse, the panel scrolls independently and page-session history is retained within the tab.
