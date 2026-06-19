# Launch Security Scan Evidence

Last reviewed: 2026-06-19

Scan ID: `044e965_20260619T080617+08`

Scan bundle:

- Markdown report: `C:\tmp\codex-security-scans\Baristachaw\044e965_20260619T080617+08\report.md`
- HTML report: `C:\tmp\codex-security-scans\Baristachaw\044e965_20260619T080617+08\report.html`
- Remediation addendum: `C:\tmp\codex-security-scans\Baristachaw\044e965_20260619T080617+08\artifacts\06_remediation\remediation_addendum.md`

Artifact completion evidence:

- Required scan artifacts missing or empty: `0`
- Work ledger rows: `428`
- Work ledger unclosed rows: `0`
- Raw candidates: `15`
- Deduped candidates: `11`
- Candidate ledgers: `17`
- Candidate ledgers missing discovery, validation, or attack-path receipts: `0`
- Completion validator verdict: `PASS_SCAN_ARTIFACT_COMPLETION`
- Report format validator: `validate_report_format.py` passed for the final markdown report.

Local verification evidence:

- `npm run lint:root` passed.
- Focused security regression suite passed: `62/62` tests.
- `npm run test:pwa` passed.
- `npm run test:load:1000` passed with `1000` accounts and `150` concurrent sessions in mocked provider mode.
- `npm run mobile:lint` passed.
- `npm run mobile:test` passed.
- `npm run mobile:android:permissions` passed.

Production blockers that remain external to this repository:

- `npm run prod:env:check -- --mode=vercel` failed because required production values were empty or missing, including mobile Supabase public env names.
- `npm run prod:env:check -- --mode=runtime` failed because required runtime secrets were not present in the executing environment.
- `npm run supabase:quota:verify` failed with `401 Invalid API key`, so durable Supabase quota RPC behavior is not production-verified.
- `npm audit --omit=dev --audit-level=moderate` still exits non-zero for Expo/React Native transitive tooling advisories documented in `docs/security/dependency-audit-exceptions.md`.

Follow-up verification after Vercel env update claim:

- Root Vercel project link: `baristaclaw`.
- Landing Vercel project link: `baristachaw-landing`.
- `vercel env ls production` for the root project shows server-side production names such as `APP_URL`, `JWT_SECRET`, `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `HEALTHCHECK_TOKEN`.
- The same root production env list still does not show `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `vercel env ls production` for the landing project reports no environment variables. This is acceptable only if the landing build remains static and does not require runtime secrets.
- `npx supabase projects api-keys --project-ref yyargvwxjpzbhbxzjtnx` failed because no Supabase access token/login is available, so the real anon/publishable key cannot be recovered from the CLI in this workspace.

Follow-up action taken:

- Added `EXPO_PUBLIC_SUPABASE_URL` to the root Vercel production project using the public production Supabase URL.
- Re-ran `npm run prod:env:check -- --mode=vercel`; the root project now has `EXPO_PUBLIC_SUPABASE_URL`, but still lacks `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Removed the private workspace dependency from the standalone landing package so the landing Vercel project can install without looking up `@baristachaw/shared` from the npm registry.
- Verified landing locally with `npm run lint:landing` and `npm run build:landing`.
- Deployed landing production with Vercel. Production URL: `https://baristachaw-landing-1llrw5ztt-alphas-projects-9d57a19f.vercel.app`; aliased domain: `https://baristachaw.com`.

Production push policy:

- Do not push this work to `main` for production launch until the production env, Supabase quota RPC, and final launch doctor gates pass with real production credentials.
- Do not treat the dependency exception as a green audit gate. It is a scoped runtime reachability exception until the Expo/React Native upgrade path can be tested.
