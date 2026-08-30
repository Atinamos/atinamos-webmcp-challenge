# Challenge history — existing product vs WebMCP extension

This document distinguishes the pre-existing Atinamos Agent Shop from work added during the OpenAI WebMCP Challenge.

## Pre-existing application

The Agent Shop existed before the challenge. The WebMCP extension started from private production commit:

`edb2a7e87a7f68d2fb6c1eebdd6b7121d8e1e70c`

Before challenge work the application already provided the human storefront, live Render Check / Buyer Check / JSON Validate & Repair / Technical SEO Crawl services, `/v1/catalog`, OpenAPI, external `/mcp`, x402-protected paid routes, job polling, free Market Search, machine-discovery metadata and service evidence infrastructure.

Those capabilities are pre-existing hosted dependencies and are not claimed as challenge-period inventions.

## 29 August 2026 — initial WebMCP extension

Challenge-period work added:

- progressive detection of `document.modelContext`;
- browser-delivered WebMCP site tools;
- explicit read-only / request-starting / untrusted-content annotations;
- safe purchase initiation that reaches the real x402 HTTP 402 boundary without signing/funding payment;
- regression tests and JavaScript syntax checks.

The human-facing **Agent Activity** layer then added grouped request/search cards, scrollable session history, catalogue discovery folded into meaningful requests, and visible safe-stop/payment-boundary status.

Live ChatGPT browser testing proved service discovery, quoting, Market Search and a genuine Render Check 402 boundary.

## 30 August 2026 — human-approved x402 continuation

The challenge extension was meaningfully extended again after the initial safe-stop proof.

A separate browser proof first established that a human-controlled Base smart wallet could satisfy the exact same x402 challenge as an agent buyer. A first attempt correctly failed because buyer and seller were the same wallet (`self_send_not_allowed`). A separate buyer wallet then completed the flow:

- initial `/agent/json-repair` request → HTTP 402;
- Coinbase CDP `/x402/verify` → HTTP 200;
- Coinbase CDP `/x402/settle` → HTTP 200;
- paid `/agent/json-repair` retry → HTTP 200;
- deterministic repaired JSON returned.

The proven mechanism was then integrated into the normal WebMCP Agent Shop experience rather than left as a proof page.

### Added in the integrated human-payment flow

- page-session `request_id` for paid WebMCP requests;
- eighth WebMCP tool, read-only `get_request_status`;
- Agent Activity **Pay with Base** action after genuine HTTP 402;
- explicit human confirmation and buyer-controlled Base wallet signing;
- buyer=seller wallet protection before signing;
- x402 verify/settle/retry using the existing paid endpoint;
- result returned to ChatGPT through the read-only request-status tool;
- no wallet signer or x402 payment client inside the WebMCP tool bundle itself.

### Live ChatGPT validation

The integrated flow was then proven in ChatGPT's built-in WebMCP browser:

1. ChatGPT selected JSON Validate / Repair through site tools.
2. It quoted **0.005 USDC**.
3. It started the request and received the genuine 402/payment requirement plus request ID.
4. Agent Activity displayed **Payment approval required**.
5. The human clicked **Pay with Base** and connected a separate buyer-controlled wallet.
6. Payment verified and settled on Base.
7. Agent Activity displayed **Payment settled** and **Service completed**.
8. ChatGPT read the completed request and returned the repaired JSON.

This proves the challenge's human-agent interaction model without giving the agent custody of payment authority.

## Human result/progress UX

A final challenge-period polish layer keeps Agent Activity focused on awareness, authority and status rather than turning it into a report viewer.

Completed work can offer **View result**, asynchronous work **View progress**, and structured failures **View failure details**. The separate same-origin result page is noindex/session-bound, can follow existing async job status, and provides JSON download.

This page is deliberately optional human UX. Agents continue consuming structured output through WebMCP/API tools and do not scrape the human report page.

## Public challenge repository

This repository publishes the challenge-safe extension while the broader production repository remains private.

Published here:

- eight WebMCP site-tool registrations;
- human-visible Agent Activity and explicit Base payment continuation;
- human result/progress/failure view;
- progressive-loader reference integration;
- public regression checks;
- architecture, testing instructions and dated challenge history;
- MIT licence.

Not published here are production credentials, private keys, private evidence data, unrelated operations code or unrelated pre-existing product source.
