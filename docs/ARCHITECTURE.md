# Architecture and trust boundaries

## Overview

Atinamos Agent Shop uses WebMCP as a browser-native interface over an existing public machine-service surface.

```text
Human + ChatGPT browser
        |
        v
agent.atinamos.co.uk
(normal storefront)
        |
        +-- progressive WebMCP loader
        |       |
        |       +-- Agent Activity display layer
        |       +-- WebMCP site tool registrations
        |
        v
same-origin public interfaces
        |
        +-- /v1/catalog
        +-- /agent/market/search
        +-- /agent/market/service/{id}
        +-- /agent/jobs/{job_id}
        +-- /agent/<paid-service>
                 |
                 v
           HTTP 402 / x402
                 |
                 v
        buyer-controlled payer
                 |
                 v
          service execution
                 |
                 v
        result / job / evidence
```

## Progressive enhancement

The normal human storefront works without WebMCP.

The loader checks:

```js
const modelContext = document.modelContext || navigator.modelContext;
```

If a compatible browser does not expose `registerTool`, the WebMCP bundles are not loaded and the existing human page remains the normal experience.

## Tool contract source

The WebMCP layer intentionally reads `/v1/catalog` rather than duplicating current service prices, routes and input contracts in a second browser-only catalogue.

That reduces drift between:

- the human storefront;
- HTTP/OpenAPI users;
- external MCP users;
- WebMCP users.

## Payment authority boundary

The request-starting tool can send a service request far enough to receive the live x402 payment requirement.

It cannot:

- hold a private key;
- create wallet authority;
- sign a transaction;
- fund a payment;
- approve a payment on the buyer's behalf;
- automatically retry the request with payment.

A successful paid service response would require payment authorization to have been supplied independently by the surrounding buyer/client.

This separation is deliberate: **browser tool access is not financial authority**.

## Human-visible activity layer

The Agent Activity panel is observational. It wraps browser `fetch` to display meaningful same-origin WebMCP activity while returning the original request/response behaviour unchanged.

It groups activity into cards such as:

- service request;
- Market Search;
- observed-service lookup;
- job-status check.

Catalogue discovery is provisional. If the agent proceeds to a meaningful action, catalogue steps are folded into that card instead of being left as separate visual noise.

The newest card remains expanded, older cards can be collapsed, and up to 12 cards are kept in `sessionStorage` for the current browser tab/session.

The display stores only its visible session history. It is not a payment or security audit log and contains no wallet capability.

## Untrusted external content

Market Search and observed market-service records can contain text harvested or supplied by third parties. Their WebMCP annotations include `untrustedContentHint: true`.

The Agent Shop describes these records as observations, not endorsements, safety claims or availability guarantees.

## Existing interfaces remain parallel

WebMCP does not replace the existing interfaces:

- normal HTML storefront;
- public HTTP/OpenAPI routes;
- external MCP at `/mcp`;
- x402 payment routes;
- machine catalogue/discovery metadata.

It adds a site-native tool surface specifically for browser agents.
