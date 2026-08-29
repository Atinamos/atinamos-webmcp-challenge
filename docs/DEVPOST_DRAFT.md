# Devpost submission draft

## Project name

**Atinamos Agent Shop — Agent-Native Microservices**

## One-line pitch

A normal machine-service storefront that becomes directly operable by AI agents through WebMCP, while preserving explicit service contracts, separate payment authority and human-visible agent activity.

## What we built

Atinamos Agent Shop was an existing service storefront with public machine APIs, external MCP and x402 payment routes. For the WebMCP Challenge we added a browser-native site-tool layer so ChatGPT can discover and use the shop directly from the same page a human sees.

The live page now exposes seven WebMCP tools for service discovery, contract lookup, quoting, observed-market search, job polling and bounded service-request initiation.

We also added a human-visible Agent Activity panel. When ChatGPT acts through WebMCP, the page groups the real browser activity into request/search cards so a person can see which service was selected, which target was used, whether a request completed, and whether it stopped at the payment boundary.

## Why WebMCP improves the experience

Without WebMCP, a browser agent can visually read the storefront but must infer machine actions from the page or be separately configured to use an external API/MCP server.

With WebMCP, the website itself exposes exact tool contracts in context. ChatGPT can ask the live catalogue what exists, read current prices and schemas, distinguish read-only actions from request-starting actions, and treat third-party market text as untrusted.

This reduces ambiguity while keeping the human and agent on the same live page.

## Financial-authority design

The most important design choice is what WebMCP does **not** do.

`begin_service_purchase` can submit valid service input and receive the live x402 HTTP 402 payment requirement, but WebMCP contains no private key, wallet client or signing function. It cannot approve, fund, sign or automatically retry payment.

In the live demo, ChatGPT initiates Render Check for `https://example.com`, receives the real 0.25 USDC x402 requirement, reports `executed: false`, and stops safely.

Browser tool access is therefore separated from financial authority.

## Human + agent result

The Agent Activity panel makes the same action legible to the person watching. A typical session shows separate cards such as:

- Technical SEO Crawl — Stopped safely
- Market Search — Complete
- Render Check — Stopped safely

Each card keeps its own steps and target/query. Older cards collapse, the current card remains expanded, and session history can be scrolled and survives a reload in the same browser tab.

## Existing product vs challenge work

Pre-existing Agent Shop capabilities included the storefront, machine catalogue, external MCP, OpenAPI, x402 routes, paid services, job polling and observed-service Market Search.

Challenge-period work added the browser-native WebMCP layer, seven site tools, WebMCP safety annotations, bounded purchase initiation, progressive loading, the human-visible Agent Activity UI, request-card/session-history behaviour and dedicated regression checks.

See `docs/CHALLENGE_HISTORY.md` for the dated distinction.

## Suggested <3 minute demo

### 0:00–0:25 — ordinary storefront becomes a tool surface

Open `https://agent.atinamos.co.uk/` in ChatGPT's built-in browser. Show the Site tools menu with seven available tools and the Agent Activity panel showing `WebMCP active`.

### 0:25–0:55 — live catalogue/quote

Ask:

> Find Render Check and tell me how much it costs. Do not buy anything. Use the site's tools.

Show ChatGPT using the site tools and reporting the live quote.

### 0:55–1:25 — complete free action

Ask:

> Search the observed market for atinamos using the site's tools. Do not make any purchase or payment.

Show the Market Search card complete and explain that registry observations are not endorsements.

### 1:25–2:15 — real paid endpoint, safe boundary

Ask:

> Begin a Render Check request for https://example.com, but do not approve, sign, fund, or retry any payment.

Show the live HTTP 402 response and ChatGPT's confirmation that execution did not start and no payment was made. Show the Render Check card marked `Stopped safely`.

### 2:15–2:45 — why this matters

Expand/collapse cards in Agent Activity and show that the human can see the same browser-agent actions grouped by request.

Closing message:

> WebMCP makes the storefront directly operable by the agent, but operability is not payment authority. The website exposes exact tools; the buyer still controls the money.

## Live URL

https://agent.atinamos.co.uk/

## Public source

https://github.com/Atinamos/atinamos-webmcp-challenge
