# Mayar Payment Runbook

Current status: checkout scaffold only. Do not enable live Mayar entitlement until webhook signature verification is implemented.

## Sandbox Checkout Test

1. Set server env:
   - `MAYAR_API_KEY`
   - `MAYAR_ENV=sandbox`
   - `MAYAR_SUCCESS_URL=https://app.baristachaw.com/billing/success`
   - `MAYAR_CANCEL_URL=https://app.baristachaw.com/billing/cancel`
   - `MAYAR_CHECKOUT_ENABLED=true` or `BILLING_CHECKOUT_PROVIDER=mayar`
2. Ensure the authenticated user has an email and mobile number available to checkout.
3. Start checkout from app billing UI.
4. Confirm `/api/billing/checkout` returns `provider: mayar`, `mode: redirect`, and `checkoutUrl`.
5. Open the checkout URL and complete sandbox payment.

## Webhook

Configure Mayar dashboard webhook URL:

```text
https://app.baristachaw.com/api/billing/mayar-webhook
```

Current endpoint returns fail-closed because official signature verification docs are missing. This is intentional.

## Rollback

Set:

```text
MAYAR_CHECKOUT_ENABLED=false
BILLING_CHECKOUT_PROVIDER=
```

Manual invoice fallback remains available if `MANUAL_PAYMENT_ENABLED=true`.
