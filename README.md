# Atinamos Agent Shop — WebMCP Challenge

**Live app:** https://agent.atinamos.co.uk/  
**Challenge:** OpenAI WebMCP Challenge 2026  
**Status:** live WebMCP implementation running on the existing Atinamos Agent Shop

Atinamos Agent Shop is an existing machine-service storefront extended during the OpenAI WebMCP Challenge so browser agents can discover and operate its public services directly from the same page a human sees.

The challenge work adds browser-native WebMCP tools, explicit read/write annotations, a bounded x402 purchase-initiation boundary, and a human-visible Agent Activity history that shows what the agent is doing without giving WebMCP payment authority.

## What the live demo proves

In ChatGPT's built-in browser, `agent.atinamos.co.uk` currently exposes seven site tools:

| WebMCP tool | Effect | Purpose |
|---|---|---|
| `list_services` | Read-only | Read the live service catalogue, prices and contracts. |
| `get_service_details` | Read-only | Read one exact service contract by slug. |
| `get_quote` | Read-only | Read the current price and payment boundary without starting work. |
| `search_market` | Read-only, untrusted output | Search machine services observed by Atinamos across external sources. |
| `get_market_service` | Read-only, untrusted output | Read one observed external service record. |
| `check_purchase_status` | Read-only | Poll an existing asynchronous Atinamos job/result. |
| `begin_service_purchase` | Request-starting | Submit bounded service input and obtain the live x402 requirement or a service response. It cannot sign, fund, approve or automatically retry a payment. |

A live test of Render Check for `https://example.com` reaches **HTTP 402 Payment Required**, reports the quoted **0.25 USDC**, and stops with execution not started. WebMCP does not sign, fund or retry the payment.

A free Market Search for `atinamos` also completes through WebMCP and returns registry observations while preserving the distinction that observations are not endorsements.

## Human + agent experience

When WebMCP is available, the normal storefront progressively adds an **Agent Activity** panel. It groups each meaningful action into its own request/search card, for example:

- `Technical SEO Crawl — Request #5 — Stopped safely`
- `Market Search — Search #3 — Complete`
- `Render Check — Request #2 — Stopped safely`

The current card is expanded, older cards collapse, the panel has its own scroll history, and session history survives page reloads within the browser tab. Catalogue lookups are folded into the meaningful request rather than shown as separate noise.

The footer deliberately states:

> Session activity only. Payment approval remains with the buyer.

## Why WebMCP fits this product

Before WebMCP, an AI browsing the storefront could read HTML, use the existing external MCP, or call documented HTTP endpoints if separately configured. WebMCP lets the website itself expose deterministic tools directly to a browser agent on the same human-facing page.

The agent no longer needs to infer a service contract from visual cards or guess which button represents a machine action. The page can tell it exactly:

- which services are live;
- what each service costs;
- which inputs are required;
- which output/fulfilment mode to expect;
- which third-party text should be treated as untrusted;
- where the financial-authority boundary begins.

## Existing product vs challenge work

This is an extension to an existing application, not a greenfield service created for the challenge.

### Pre-existing before the WebMCP Challenge

The Atinamos Agent Shop already had:

- a human storefront;
- `/v1/catalog` machine-readable service catalogue;
- OpenAPI;
- external MCP at `/mcp`;
- x402-protected paid service routes;
- asynchronous job polling;
- free observed-service Market Search;
- `llms.txt` / machine-discovery metadata;
- service execution/evidence infrastructure;
- live Render Check, Buyer Check, JSON Validate / Repair and Technical SEO Crawl services.

The challenge extension was branched from the existing Agent Shop base commit `edb2a7e87a7f68d2fb6c1eebdd6b7121d8e1e70c` in the private production repository. Dated challenge work began after the challenge opened and is documented in the challenge history.

### Added for the WebMCP Challenge

- browser-native `document.modelContext.registerTool(...)` integration;
- seven live site tools;
- explicit read-only / request-starting / untrusted-content annotations;
- safe x402 purchase initiation that stops at HTTP 402 unless payment authority is supplied independently;
- human-visible Agent Activity cards;
- per-request/search grouping and safe-stop states;
- scrollable session history persisted in `sessionStorage`;
- progressive enhancement so ordinary browsers keep the existing storefront;
- regression tests and JavaScript syntax checks for the challenge layer.

See [`docs/CHALLENGE_HISTORY.md`](docs/CHALLENGE_HISTORY.md) for the before/after record.

## Architecture

```text
                         HUMAN
                           |
                           v
                +---------------------+
                | Atinamos Agent Shop |
                | normal HTML UI      |
                +----------+----------+
                           |
             same page / same origin
                           |
                           v
                +---------------------+
                | WebMCP site tools   |
                | browser-native      |
                +----------+----------+
                           |
             reads same public contract
                           |
                           v
                +---------------------+
                | /v1/catalog         |
                | public service APIs |
                +----------+----------+
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
   External MCP       HTTP/OpenAPI       x402 paid
      /mcp              endpoints         routes
                                             |
                                             v
                                    payment requirement
                                             |
                                             v
                                   buyer-controlled payer
                                             |
                                             v
                                      service execution
                                             |
                                             v
                                     job/result/evidence
```

WebMCP is an additional browser-native interface. It does not replace the existing storefront, external MCP, HTTP API or x402 interface.

## Repository layout

```text
src/
  agent-shop-webmcp.js           # WebMCP tool registrations
  agent-shop-webmcp-activity.js  # human-visible activity history
integration/
  webmcp_site_tools.py           # reference progressive loader/asset delivery integration
tests/
  test_public_source.py          # public-source regression checks
docs/
  ARCHITECTURE.md
  CHALLENGE_HISTORY.md
  JUDGE_TESTING.md
.github/workflows/
  ci.yml
LICENSE
```

The production service backend remains a pre-existing hosted dependency and is not republished here. This repository contains the complete WebMCP challenge extension and the integration/test material needed to understand and reproduce that extension against the public Agent Shop interfaces. No production secrets, wallet keys, private evidence data or unrelated internal code are included.

## Quick review

The two files judges should inspect first are:

- [`src/agent-shop-webmcp.js`](src/agent-shop-webmcp.js) — actual `registerTool(...)` definitions and x402 safety boundary.
- [`src/agent-shop-webmcp-activity.js`](src/agent-shop-webmcp-activity.js) — human-visible request/search history.

## Live judge test

Open https://agent.atinamos.co.uk/ in ChatGPT's WebMCP-capable browser and try:

> Find Render Check and tell me how much it costs. Do not buy anything. Use the site's tools.

Then:

> Begin a Render Check request for https://example.com, but do not approve, sign, fund, or retry any payment.

Expected result: a live **HTTP 402 Payment Required** response, **0.25 USDC** quote, execution not started, and the Agent Activity card marked **Stopped safely**.

For a complete free action:

> Search the observed market for atinamos using the site's tools.

See [`docs/JUDGE_TESTING.md`](docs/JUDGE_TESTING.md) for the full test sequence.

## Security boundary

WebMCP itself is not a wallet.

The challenge implementation intentionally contains no private key, wallet client or transaction-signing path. `begin_service_purchase` can reach the x402 payment requirement, but it cannot approve, fund, sign, or automatically retry the payment. Financial authority remains with the buyer/user and any independently configured payment-capable client.

Third-party marketplace/registry text is marked as untrusted content. A quote or HTTP 402 is not treated as proof that a service executed.

## Licence

The WebMCP challenge extension in this repository is released under the MIT License. See [`LICENSE`](LICENSE).
