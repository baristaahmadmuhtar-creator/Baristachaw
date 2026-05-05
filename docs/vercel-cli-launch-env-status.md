# Vercel CLI Launch Env Status

Checked with Vercel CLI from the linked project `baristaclaw`.

## Production Env Present

These required server production env names are present according to `vercel env ls`:

- `APP_URL`
- `ALLOWED_ORIGINS`
- `JWT_SECRET`
- `ADMIN_EMAILS`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `DEEPSEEK_API_KEY`
- `MISTRAL_API_KEY`
- `OPENROUTER_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PLAN_ENFORCEMENT_ENABLED`
- `BILLING_LIVE_MODE`

Production deployment inspected and redeployed:

```text
https://baristaclaw.vercel.app
status: Ready
latest deployment: https://baristaclaw-a3wrozajw-alphas-projects-9d57a19f.vercel.app
```

Production smoke without admin token passed public/auth guard checks.

Current launch flags in Vercel Production:

```text
PLAN_ENFORCEMENT_ENABLED=true
BILLING_LIVE_MODE=false
DISABLED_FEATURES=ai_provider_gemini
```

Quota enforcement is active after production Supabase SQL verification. Keep billing live mode off until the matching provider secrets are added.
Gemini is disabled for launch because Google rejected the current keys as leaked or unsupported. Replace/revoke the old Google AI keys before re-enabling it.

Health check hardening:

```text
HEALTHCHECK_TOKEN=set
SENTRY_DSN=pending user DSN from Sentry
```

Deep health checks are now protected by `HEALTHCHECK_TOKEN`. Public smoke still passes, and unauthenticated deep health checks return `403` as expected.
The public health endpoint reports `disabledProviders: GEMINI`, so the disabled Gemini key does not make normal health checks degraded.

## Missing or Not Visible in Vercel

Add these only if you are ready to use the related feature. Do not paste values into chat.

### Strongly Recommended Before Public Launch

```bash
vercel env add SENTRY_DSN production --sensitive
```

### Required if `BILLING_LIVE_MODE=true`

Use one stable internal sync token even if provider-specific webhooks are added later:

```bash
vercel env add BILLING_SYNC_TOKEN production --sensitive
```

Provider webhook secrets, add only for providers you enable:

```bash
vercel env add STRIPE_WEBHOOK_SECRET production --sensitive
vercel env add REVENUECAT_WEBHOOK_SECRET production --sensitive
vercel env add MIDTRANS_WEBHOOK_SECRET production --sensitive
vercel env add XENDIT_WEBHOOK_TOKEN production --sensitive
```

### Required for Hosted Checkout Links

Add the provider-hosted links that the app should open from billing UI:

```bash
vercel env add BILLING_CHECKOUT_URL_STARTER production
vercel env add BILLING_CHECKOUT_URL_PRO production
vercel env add BILLING_CHECKOUT_URL_TEAM production
vercel env add BILLING_PORTAL_URL production
```

If using Stripe hosted links instead:

```bash
vercel env add STRIPE_CHECKOUT_URL_STARTER production
vercel env add STRIPE_CHECKOUT_URL_PRO production
vercel env add STRIPE_CHECKOUT_URL_TEAM production
vercel env add STRIPE_CUSTOMER_PORTAL_URL production
```

## Mobile/EAS Env

These are not proven by `vercel env ls`; they must exist in EAS build env or the mobile build environment:

```text
EXPO_PUBLIC_API_BASE_URL=https://baristaclaw.vercel.app
EXPO_PUBLIC_WEB_APP_URL=https://baristaclaw.vercel.app
EXPO_PUBLIC_APP_SCHEME=baristachaw
EXPO_PUBLIC_MOBILE_UI_MODE=web_parity
EXPO_PUBLIC_SUPABASE_URL=<same production Supabase URL>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<same production publishable key>
EXPO_PUBLIC_SENTRY_DSN=<optional but recommended>
```

## Important Launch Order

1. Run the latest `supabase/admin_management.sql` in production Supabase. This creates `public.consume_app_quota`.
2. `PLAN_ENFORCEMENT_ENABLED=true` is ready after SQL is deployed and `/admin` shows Database as Supabase.
3. Keep `BILLING_LIVE_MODE=false` until `BILLING_SYNC_TOKEN` or provider webhook secret is set.
4. Redeploy production after env changes:

```bash
vercel --prod --yes
```

5. Verify:

```bash
npm run smoke:prod
```

For authenticated AI checks, set `PROD_SMOKE_BEARER_TOKEN` locally before running smoke.
