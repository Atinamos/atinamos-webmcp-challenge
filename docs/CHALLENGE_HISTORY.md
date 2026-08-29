# Challenge history — existing product vs WebMCP extension

This document exists so reviewers can distinguish the pre-existing Atinamos Agent Shop from work added for the OpenAI WebMCP Challenge.

## Pre-existing application

The Atinamos Agent Shop existed before the challenge. The WebMCP extension was started from the existing private production branch at commit:

`edb2a7e87a7f68d2fb6c1eebdd6b7121d8e1e70c`

Before WebMCP work began, the application already provided:

- the human storefront at `https://agent.atinamos.co.uk/`;
- live Render Check, Buyer Check, JSON Validate / Repair and Technical SEO Crawl services;
- the `/v1/catalog` machine-readable catalogue;
- OpenAPI;
- external MCP at `/mcp`;
- x402-protected paid routes;
- asynchronous job polling;
- free observed-service Market Search;
- machine-discovery metadata such as `llms.txt`;
- service execution/evidence infrastructure.

Those pre-existing capabilities are hosted dependencies of the challenge extension and are not claimed as challenge-period inventions.

## Challenge-period WebMCP work

The WebMCP implementation was developed on 29 August 2026 in a sequence of isolated branches and pull requests before being merged into the live Agent Shop branch.

### Initial WebMCP integration

Challenge work introduced:

- progressive detection of `document.modelContext` (with compatibility fallback);
- browser-delivered WebMCP JavaScript;
- seven `registerTool(...)` site tools;
- explicit read-only and untrusted-content annotations;
- a request-starting purchase tool that deliberately does not sign, fund, approve or automatically retry an x402 payment;
- regression tests and JavaScript syntax checks.

The initial live merge was deployed as Agent Shop merge commit `e841cba` (short form), after the WebMCP regression suite passed.

### Human-visible Agent Activity

The next challenge-period extension added a human-visible panel so a person watching the page can see what the browser agent is doing.

The sequence of challenge refinements included:

- `a700fb0` — initial Agent Activity panel;
- `3d8d2eb` — separate request/search cards rather than one flat event stream;
- `c1c9fae` — scrollable request history, request/search references and cleaner grouping;
- `fd5f22b` — session history persistence across page reloads using `sessionStorage`;
- `9c5e711` — provisional catalogue discovery folded into the next meaningful action;
- `0a70817` — final footer copy: `Session activity only. Payment approval remains with the buyer.`

Each production change was regression-tested before merge.

## Live validation performed

The live site was opened in ChatGPT's built-in WebMCP-capable browser after deployment.

Observed live behaviour:

1. ChatGPT detected **7 site tools**: 6 read tools and 1 request-starting/write tool.
2. ChatGPT used the live site tools to read the service catalogue and current prices.
3. ChatGPT used Market Search for `atinamos`; the action completed without payment and was shown in its own activity card.
4. ChatGPT initiated Render Check for `https://example.com`.
5. The live endpoint returned **HTTP 402 Payment Required** at **0.25 USDC**.
6. ChatGPT stopped at the payment boundary as instructed.
7. No payment was approved, signed, funded or automatically retried by WebMCP.
8. The Agent Activity panel displayed the request as **Stopped safely**.
9. Technical SEO Crawl was also tested to the same safe 402 boundary.

## Public challenge repository

This repository is a challenge-safe publication of the WebMCP extension. The broader production repository remains private because it contains unrelated implementation and operational material that is not required to review the WebMCP challenge work.

Published here:

- WebMCP site-tool registrations;
- Agent Activity implementation;
- progressive loader reference integration;
- public regression checks;
- architecture and judge test instructions;
- challenge history and licensing.

Not published here:

- production credentials or environment values;
- wallet/private-key material;
- private evidence data;
- unrelated internal worker/operations code;
- unrelated pre-existing product source.

The live public APIs and storefront are the pre-existing hosted dependencies against which this extension operates.
