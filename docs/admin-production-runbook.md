# Admin Management Production Runbook

This release adds the `/admin` web console, `/api/admin/management` backend route, and `/api/account/status` user-facing status route.

## Required Environment

- `JWT_SECRET`: signs web and mobile API sessions.
- `ADMIN_EMAILS`: comma-separated owner emails allowed to open `/admin`.
- `SUPABASE_URL`: hosted Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for admin tables.
- `GEMINI_API_KEY`: AI provider capacity for protected AI routes.
- Billing provider env before paid launch: `REVENUECAT_API_KEY`, `GOOGLE_PLAY_PACKAGE_NAME`, Apple/App Store Connect env, or Stripe/checkout URL env.
- Optional web checkout links for MVP: `BILLING_CHECKOUT_URL_PRO`, `BILLING_CHECKOUT_URL_STARTER`, `BILLING_CHECKOUT_URL_TEAM`, and `BILLING_PORTAL_URL`.
- Telemetry before Play Store rollout: `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT`, and `SENTRY_USER_CONTEXT_READY=true` only after a real web/PWA/mobile Sentry event shows the Baristachaw user id. Do not send email, payment proof URLs, tokens, or provider payloads as Sentry user context.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to Expo `EXPO_PUBLIC_*` or Vite `VITE_*`.

## Database Setup

1. Open the Supabase SQL editor for production.
2. Run `supabase/admin_management.sql`.
3. Confirm these tables exist:
   - `app_users`
   - `app_plans`
   - `app_usage_daily`
   - `user_entitlements`
   - `app_feature_flags`
   - `admin_audit_events`
4. Confirm RLS is enabled and only `service_role` can manage admin tables.
5. Deploy server env values, then open `/admin` with an email from `ADMIN_EMAILS`.

## Launch Gate

Before Play Store launch, the admin console should show:

- `JWT auth guard`: pass
- `Admin allowlist`: pass
- `Persistent admin database`: pass
- `Audit trail`: pass
- `Maintenance feature flags`: pass
- `AI provider capacity`: pass
- `Billing provider contract`: pass or intentionally deferred for a free-only launch
- `Per-plan enforcement`: pass before paid plan launch
- `Crash and error telemetry`: pass
- `Audit review queue`: pass after all critical admin events have an operator review note

## Operations

- Use the Users tab for status, plan, and role overrides.
- Use the Users tab Billing section for payment status, provider, market, and payment-action overrides. Past-due changes are reflected in `/api/account/status`.
- Use the Plans tab for provider/product/entitlement mapping and billing readiness gaps.
- Use the Maintenance tab before risky deploys to mark web/PWA/mobile features as `maintenance` or `disabled`.
- Use the Audit tab to review every account mutation.
- Use the Database tab after deploys to catch missing env or schema drift.
- Keep owner count minimal. Use `support` or `analyst` roles for non-owner team members.
- During launch week, review `past_due`, `suspended`, and high-risk accounts daily.
- For forgotten-account support, verify identity out of band, update the `app_users` support/recovery fields, then use the auth provider admin flow for login email or password changes. Do not change auth identity by only editing `app_users.email`.

## Web/PWA/Android Parity

- Web and PWA read `/api/account/status` after sign-in and poll it while the app is visible.
- Android parity already injects the native session token into same-origin `/api/*` fetch calls, so it consumes the same account status and maintenance flags as web.
- Native-only screens can call `ApiClient.getAccountStatus()` with the mobile bearer token.
- Maintenance banners are user-facing; admin routes hide the banner because `/admin` has the dedicated Maintenance tab.

## Paid-Launch Quota Wiring

The admin console includes plan management and quota definitions. Core paid AI quota enforcement is wired through `PLAN_ENFORCEMENT_ENABLED` and the Supabase RPC `public.consume_app_quota`.

Before setting `PLAN_ENFORCEMENT_ENABLED=true`, deploy `supabase/admin_management.sql` so `public.consume_app_quota` exists and verify `/api/ai` plus `/api/chat` consume daily quota for:

- `ai_daily_limit`: chat, search, AI Brew, text/attachment actions.
- `deep_daily_limit`: deep chat/deep think, also counted against AI daily usage.
- `scanner_daily_limit`: scanner and latte-art image actions.

Keep `PLAN_QUOTA_STRICT_ENABLED=false` during schema rollout so verified paid users can continue when only the quota RPC is unavailable. Turn it on after the RPC is deployed and monitored.

Use `app_users.plan_code`, `app_users.billing_status`, `app_plans.*_daily_limit`, `user_entitlements`, and `app_usage_daily` as the source of truth.

Remaining post-MVP quota expansions: collection write quotas, image edit cost accounting, speech seconds, and token/cost reconciliation into `app_usage_daily`.

## Supabase and Payment Setup Notes

For Indonesia and Brunei launch prep, keep Google Play Billing and App Store subscriptions as the primary mobile purchase path. Use RevenueCat as the entitlement aggregator if you want one webhook to sync Android and iOS into `user_entitlements`. For web/PWA, Stripe Checkout or static provider checkout links can be wired through `/api/billing/checkout`.

Minimum setup order:

1. Create Supabase project, run `supabase/admin_management.sql`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
2. Set `ADMIN_EMAILS` to the owner/support emails.
3. Create products using the plan product ids in `/admin` Plans: `baristachaw_starter_monthly`, `baristachaw_pro_monthly`, `baristachaw_team_monthly`.
4. Add provider env values, then set `BILLING_LIVE_MODE=true` only after test purchases sync correctly.
5. Keep `Free` and browse-only preview enabled for app review and first-run trust.
