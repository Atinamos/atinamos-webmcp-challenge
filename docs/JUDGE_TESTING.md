# Judge testing guide

## Live URL

https://agent.atinamos.co.uk/

Use ChatGPT's WebMCP-capable built-in browser, or another browser environment that exposes the current WebMCP `ModelContext` API.

## What should be visible

On the Agent Shop page, the browser should expose **7 site tools**:

1. List Atinamos services
2. Get Atinamos service details
3. Get Atinamos service quote
4. Search observed machine services
5. Get observed market service
6. Check Atinamos job status
7. Begin Atinamos service purchase

The browser UI should classify six as read tools and one as a request-starting/write tool.

When WebMCP is active, the page also displays an **Agent activity** panel in the lower-right corner.

## Test 1 — read-only catalogue and quote

Prompt:

> Find Render Check and tell me how much it costs. Do not buy anything. Use the site's tools.

Expected:

- Render Check is found through site tools.
- Current live quote is returned from the live catalogue.
- At the time of challenge validation the quote was **0.25 USDC**.
- No service request or payment is required for this read-only step.

Note: prices are intentionally read from the live catalogue rather than hard-coded in WebMCP, so the live value is authoritative if it changes.

## Test 2 — free Market Search

Prompt:

> Search the observed market for atinamos using the site's tools. Do not make any purchase or payment.

Expected:

- Market Search completes as a free/read-only action.
- Results are described as observations, not endorsements or guarantees.
- A separate Market Search card appears in Agent Activity.
- During challenge validation this query returned two observed Atinamos/Render Check records; registry contents can change over time.

## Test 3 — real x402 boundary, no payment

Prompt:

> Begin a Render Check request for https://example.com, but do not approve, sign, fund, or retry any payment.

Expected:

- WebMCP reads the live catalogue/contract.
- A Render Check request card is created for `https://example.com`.
- The live paid endpoint returns **HTTP 402 Payment Required**.
- The WebMCP tool returns `executed: false` at the 402 boundary.
- No payment is signed, funded or automatically retried by WebMCP.
- Agent Activity marks the request **Stopped safely**.

At challenge validation time the live quote was **0.25 USDC**.

## Test 4 — second paid service boundary

Optional prompt:

> Begin a Technical SEO Crawl for https://example.com, but do not approve, sign, fund, or retry any payment.

Expected:

- A new Technical SEO Crawl card appears separately from Render Check and Market Search.
- The request reaches the live x402 boundary and stops safely.
- At challenge validation time the quote was **0.05 USDC**.

## Human-visible history behaviour

After running multiple tests, the activity panel should show separate cards, for example:

```text
Technical SEO Crawl     Stopped safely
Request #5 · https://example.com

Market Search           Complete
Search #3 · “atinamos”

Render Check            Stopped safely
Request #2 · https://example.com
```

Expected UI behaviour:

- newest/current request expanded;
- older completed cards collapsed;
- independent vertical scrolling within the panel;
- session history retained across page reloads in the same tab;
- standalone catalogue discovery removed/folded once a meaningful action follows;
- footer: `Session activity only. Payment approval remains with the buyer.`

## Safety assertions

The published source should make these boundaries easy to verify:

- no `privateKey` usage;
- no `walletClient` usage;
- no `signTransaction` usage;
- `webmcp_can_sign_or_fund_payment: false`;
- `webmcp_auto_retries_paid_request: false`;
- marketplace output marked with `untrustedContentHint: true`;
- request-starting tool marked `readOnlyHint: false`.

## What is deliberately not required for the core demo

A completed paid purchase is not required to demonstrate the WebMCP design. The core challenge path intentionally proves that an agent can discover, inspect, quote and initiate a real service request while stopping at a separate financial-authority boundary.

The pre-existing x402 backend can execute paid services when valid authorization is supplied by an independently configured payment-capable buyer, but WebMCP itself is not given wallet authority in this challenge implementation.
