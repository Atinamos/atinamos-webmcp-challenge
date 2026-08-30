# Human-approved payment and human result view

This challenge extension keeps WebMCP agent-first while adding a deliberate human authority step for payment.

## Boundary

`begin_service_purchase` can submit a real service request and receive the live HTTP 402/x402 requirement. The WebMCP tool never signs, funds, approves or automatically retries payment.

When the request reaches 402, the same page's Agent Activity panel can offer **Pay with Base**. That action is human-facing and separate from the WebMCP tool code. A human chooses whether to continue, connects their own Base wallet and approves the wallet request.

If payment verifies and settles, the existing paid service endpoint executes. The result then becomes available to the agent through the read-only `get_request_status` path.

## Proven live test

On 30 August 2026 a JSON Validate / Repair request completed through this flow at 0.005 USDC on Base. Coinbase CDP x402 `/verify` and `/settle` both returned HTTP 200 and the existing JSON Repair endpoint returned HTTP 200 with the repaired JSON.

An earlier buyer=seller test was correctly rejected with `self_send_not_allowed`; the integrated UI now blocks that condition before signing.

## Human result view

Agent Activity is for awareness, approval and status, not for displaying full SEO reports, screenshots or long evidence payloads.

The complementary human flow is therefore:

- **View result** — completed synchronous work;
- **View progress** — queued/running asynchronous work;
- **View failure details** — structured failure information.

The result page is same-origin, noindex and session-bound. It can display the structured response/evidence, poll an existing async `status_url`, and download the returned JSON.

This page is not an agent interface. Agents continue to consume structured output directly through WebMCP and the existing machine APIs. The human result view exists so a person sharing the browser session is not forced to understand request IDs, job APIs or technical prompts.

## Challenge rationale

This separation is intentional:

```text
agent discovers / quotes / requests / consumes result
                         |
                    payment boundary
                         |
                 human approves wallet
                         |
               same service executes
                         |
          +--------------+--------------+
          |                             |
       agent JSON                  human report
```

It demonstrates people and agents using the same web application together while preserving a clear financial-authority boundary.
