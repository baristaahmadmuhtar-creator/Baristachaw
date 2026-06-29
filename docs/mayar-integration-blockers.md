# Mayar Integration Blockers

Current verdict: MAYAR PAYMENT NOT READY FOR MVP automatic entitlement.

## Blocker 1: Webhook Signature Verification

The inspected official Mayar webhook docs describe POST JSON payloads and event names, but do not document a signature header, signing algorithm, timestamp tolerance, or constant-time verification contract.

Without this, Baristachaw must not grant plan entitlement from Mayar webhook payloads.

Needed from Mayar:

- Signature header name.
- Signing algorithm, for example HMAC SHA-256 if that is what Mayar uses.
- Signed payload format.
- Timestamp/replay protection rules.
- Example valid webhook request.
- Event ID/idempotency recommendation.

## Blocker 2: Production Test Payment Proof

Before live launch, run a real sandbox payment and confirm:

- Mayar checkout link opens.
- Payment returns to `MAYAR_SUCCESS_URL`.
- Webhook arrives at `/api/billing/mayar-webhook`.
- Signature can be verified after official docs are provided.
- Amount/currency/plan metadata matches Baristachaw plan catalog.
- Duplicate webhook retry does not grant entitlement twice.

## Safe Current Behavior

- Checkout can be created server-side if Mayar is selected and required fields exist.
- Existing manual payment fallback remains active.
- Mayar webhook endpoint is fail-closed and returns `mayar_webhook_signature_docs_missing`.
- Admin readiness exposes the blocker.
