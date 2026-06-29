# Mayar Integration Notes

Status: checkout scaffold implemented, webhook entitlement is not production-ready.

Official docs inspected on 2026-06-29:

- Developer entrypoint: https://dev.mayar.id/
- Docs index: https://docs.mayar.id/llms.txt
- API introduction: https://docs.mayar.id/api-reference/introduction.md
- Create Invoice: https://docs.mayar.id/api-reference/invoice/create.md
- Create Single Payment Request: https://docs.mayar.id/api-reference/reqpayment/create.md
- Webhook: https://docs.mayar.id/integration/webhook.md
- Register URL Hook: https://docs.mayar.id/api-reference/webhook/registerurlhook.md
- MCP setup: https://docs.mayar.id/integration/MCP.md

## Confirmed Official API Details

- Production invoice endpoint: `https://api.mayar.id/hl/v1/invoice/create`
- Sandbox invoice endpoint: `https://api.mayar.club/hl/v1/invoice/create`
- Authentication: `Authorization: Bearer <MAYAR_API_KEY>`
- Invoice request fields: `name`, `email`, `mobile`, `redirectUrl`, `description`, `expiredAt`, `items`, `extraData`
- Invoice item fields: `quantity`, `rate`, `description`
- Response fields used by Baristachaw: `data.id`, `data.transactionId`, `data.link`, `data.expiredAt`, `data.extraData`
- Webhook registration endpoint: `POST https://api.mayar.id/hl/v1/webhook/register`
- Sandbox webhook registration endpoint: `POST https://api.mayar.club/hl/v1/webhook/register`
- Webhook setup is also available from Mayar dashboard Integration -> Webhook.
- Documented webhook events include `payment.received` and `payment.reminder`.

## Implemented In Repo

- `server-api/billing/providers/mayar.ts`
  - Safe config reader.
  - Official invoice checkout request builder.
  - Secret-redacted readiness object.
  - Conservative status mapping.
  - Webhook signature verification returns fail-closed until official signature docs exist.
- `server-api/billing/checkout.ts`
  - Mayar checkout can be selected by request/env when `MAYAR_API_KEY` and required customer fields are present.
  - Missing mobile/email/config falls back to existing manual invoice flow.
- `server-api/billing/mayarWebhook.ts`
  - Endpoint exists and returns fail-closed `501` because signature verification is not documented.
- Admin billing readiness now lists `mayar` and surfaces Mayar blockers without exposing secrets.

## Env Contract

Internal Baristachaw env names:

- `MAYAR_API_KEY`
- `MAYAR_WEBHOOK_SECRET`
- `MAYAR_ENV=sandbox|production`
- `MAYAR_BASE_URL`
- `MAYAR_SUCCESS_URL`
- `MAYAR_CANCEL_URL`
- `MAYAR_WEBHOOK_PATH=/api/billing/mayar-webhook`
- `MAYAR_CHECKOUT_ENABLED=false`
- Optional provider selector: `BILLING_CHECKOUT_PROVIDER=mayar`

Do not expose any `MAYAR_*` secret through `VITE_` or `EXPO_PUBLIC_` env names.

## Launch Verdict

Mayar checkout is scaffolded for MVP testing. Mayar payment is not ready for automatic production entitlement until official webhook signature verification is documented and implemented.
