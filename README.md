# Baristachaw

Production-focused AI assistant for barista workflows (chat, fast/deep modes, attachments, voice note, scanner).

## Repo Structure

```text
apps/
  web/                 Vite web + PWA app
  mobile/              Expo native app
packages/
  shared/              shared types, parity labels, cross-app helpers
  design-tokens/       shared color, spacing, radius, typography tokens
api/                   serverless handlers used by web/server
server.ts              local Express + Vite dev/prod entry
```

## Requirements

- Node.js 20+
- npm
- Vercel CLI (for deploy workflow)

## Local Setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill required values.
3. Start local app:
   `npm run dev`
4. Start only the web workspace if needed:
   `npm run dev:web`

## Mobile (Expo + iOS)

- Start mobile in Expo Go mode:
  `npm run mobile:start`
- Start mobile dev-client mode:
  `npm run mobile:start:dev-client`
- Run iOS build from workspace:
  `npm run mobile:ios`
- Mobile lint:
  `npm run mobile:lint`
- Mobile setup and release docs:
  - `docs/mobile-ios-runbook.md`
  - `docs/mobile-release-checklist.md`
  - `docs/mobile-parity-matrix.md`

## Quality Gates

- Type-check:
  `npm run lint`
- Build:
  `npm run build`
- Combined check:
  `npm run check`
- Install browser engines for E2E:
  `npm run test:e2e:install`

## UI/E2E Gates

- Cross-browser desktop E2E:
  `npm run test:e2e`
- Mobile emulation E2E:
  `npm run test:e2e:mobile`
- Accessibility gate (axe):
  `npm run test:a11y`
- Performance gate (Lighthouse):
  `npm run test:perf`
- Full local gate:
  `npm run test:gate:local`
- Full production gate (uses `BASE_URL`, `PROD_SMOKE_BEARER_TOKEN`):
  `npm run test:prod:gate`

## Smoke Tests

- Local smoke (expects app reachable on `http://localhost:3000` by default):
  `npm run smoke:local`
- Production smoke (default target `https://baristaclaw.vercel.app`):
  `npm run smoke:prod`
- Override target:
  `BASE_URL=https://your-url.vercel.app npm run smoke:prod`
- Authenticated production smoke (required for fast/normal/deep verification):
  `PROD_SMOKE_BEARER_TOKEN=<jwt> npm run smoke:prod`
- For full `15` samples on both `/api/ai` fast+deep without user rate-limit collision, provide two JWTs:
  `PROD_SMOKE_BEARER_TOKEN=<jwt_user_a>,<jwt_user_b> npm run smoke:prod`
- Override SLA/sample defaults:
  `PROD_SMOKE_SAMPLES=15 PROD_SMOKE_P95_FAST_MS=2000 PROD_SMOKE_P95_NORMAL_MS=4000 PROD_SMOKE_P95_DEEP_MS=8000 PROD_SMOKE_AI_DELAY_MS=2200 npm run smoke:prod`

Notes:
- `fast` and `normal` are hard-gated by latency P95.
- `deep` is quality-first: production smoke validates deep structure/integrity and language adherence, while latency is informational.

### Deep Health Check

- `/api/health?deep=1` requires `x-health-token` header matching `HEALTHCHECK_TOKEN`.
- Example:
  `curl -H "x-health-token: <token>" "https://your-app.vercel.app/api/health?deep=1"`

## Release Verification

- Local release gate:
  `npm run release:verify`
- Include production smoke too:
  `RUN_PROD_SMOKE=1 npm run release:verify`

## Environment Notes

- `GEMINI_API_KEY` and other provider keys support multiple keys separated by commas.
- Do not wrap key values with quotes.
- Use `ALLOWED_ORIGINS` to explicitly control API CORS origins.
- Production gate envs:
  - `PROD_SMOKE_BEARER_TOKEN` (required by `npm run test:prod:gate`)
  - `PROD_SMOKE_SAMPLES` (default `15`)
  - `PROD_SMOKE_P95_FAST_MS` (default `2000`)
  - `PROD_SMOKE_P95_NORMAL_MS` (default `4000`)
  - `PROD_SMOKE_P95_DEEP_MS` (default `8000`, advisory only)
  - `PROD_SMOKE_AI_DELAY_MS` (default `2200`, protects against API burst rate limit)
- AI response orchestration feature flags:
  - `AI_LANGUAGE_ALIGNMENT_ENABLED=1`
  - `AI_EXPECTATION_PROFILE_ENABLED=1`
  - `AI_DEEP_QUALITY_GATE_ENABLED=1`
  - `AI_AMBIGUITY_ASK_FIRST_ENABLED=1`
- Never log or commit real secrets.
- Test auth bypass endpoints are disabled by default. To enable for QA pipelines:
  - `ENABLE_TEST_AUTH_ENDPOINT=1`
  - `TEST_AUTH_TOKEN=<secret>`
  - in production also set `ALLOW_TEST_ENDPOINTS_IN_PROD=1` and `QA_ALLOWED_ORIGINS=https://your-qa-runner-origin` (not recommended)

## Deploy (Vercel)

1. Login:
   `vercel login`
2. Link project (if needed):
   `vercel link`
3. Verify env values:
   `vercel env ls`
4. Deploy preview:
   `vercel`
5. Deploy production:
   `vercel --prod --yes`

## Language/Expectation Contract

- API contract extension (`/api/chat`, `/api/ai`) supports optional:
  - `responseProfile`: `language`, `verbosity`, `format`, `tone`, `ambiguityPolicy`
  - `clientContext`: `platform`, `appLanguage`, `acceptLanguage`
- If omitted, server remains backward compatible and applies default mode behavior.
- Runtime policy:
  - AI follows user message language (not billing amount).
  - AI follows user expectation in the prompt (short/detail/format/tone).
  - For high ambiguity with `ask_first`, AI asks 1-2 clarifying questions first.
  - `deep` enforces quality/integrity checks and one repair pass when needed.
