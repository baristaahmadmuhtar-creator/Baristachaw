# Developer Local Setup

This note keeps contributor setup separate from the public product README.

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

- Node.js 24+
- npm 11+
- Vercel CLI for deploy workflow

## Local Setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill required values.
3. Start local app:
   `npm run dev`
4. Start only the web workspace if needed:
   `npm run dev:web`

## Mobile

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
- Accessibility gate:
  `npm run test:a11y`
- Performance gate:
  `npm run test:perf`
- Full local gate:
  `npm run test:gate:local`
- Full production gate:
  `npm run test:prod:gate`

## Smoke Tests

- Local smoke:
  `npm run smoke:local`
- Production smoke:
  `npm run smoke:prod`
- Authenticated production smoke:
  `PROD_SMOKE_BEARER_TOKEN=<jwt> npm run smoke:prod`

## Release Verification

- Local release gate:
  `npm run release:verify`
- Include production smoke too:
  `RUN_PROD_SMOKE=1 npm run release:verify`

## Environment Notes

- `GEMINI_API_KEY` and other provider keys support multiple keys separated by commas.
- Do not wrap key values with quotes.
- Use `ALLOWED_ORIGINS` to explicitly control API CORS origins.
- Never log or commit real secrets.
- Test auth bypass endpoints are disabled by default.

## Deploy

1. Login:
   `vercel login`
2. Link project if needed:
   `vercel link`
3. Verify env values:
   `vercel env ls`
4. Deploy preview:
   `vercel`
5. Deploy production:
   `vercel --prod --yes`
