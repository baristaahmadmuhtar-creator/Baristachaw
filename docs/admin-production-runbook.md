# Admin Management Production Runbook

This release adds the `/admin` web console, `/api/admin/management` backend route, and `/api/account/status` user-facing status route.

## Required Environment

- `JWT_SECRET`: signs web and mobile API sessions.
- `ADMIN_EMAILS`: comma-separated owner emails allowed to open `/admin`.
- `SUPABASE_URL`: hosted Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for admin tables.
- `GEMINI_API_KEY`: AI provider capacity for protected AI routes.
- Billing provider env before paid launch: `REVENUECAT_API_KEY`, `STRIPE_SECRET_KEY`, or Google Play billing integration env.
- Telemetry before Play Store rollout: `SENTRY_DSN` or platform-specific public DSN.

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

## Operations

- Use the Users tab for status, plan, and role overrides.
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

## Remaining Paid-Launch Wiring

The admin console includes plan management and quota definitions. Paid launch still needs quota middleware connected to:

- `/api/ai`
- `/api/chat`
- scanner/image edit routes
- speech/transcription routes

Use `app_users.plan_code`, `app_plans.*_daily_limit`, and `app_usage_daily` as the source of truth.
