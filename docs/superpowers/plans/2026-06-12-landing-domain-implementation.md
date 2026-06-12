# Baristachaw Landing and Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a separate premium marketing landing site and migrate production app, PWA, auth, and mobile WebView configuration to `app.baristachaw.com`.

**Architecture:** Add a standalone React/Vite workspace under `apps/landing` and deploy it as a separate Vercel project. Keep `apps/web` as the app/PWA/API project, centralize production origins, update mobile and auth defaults, and preserve legacy names only for compatibility or historical documentation.

**Tech Stack:** React 19, Vite 6, TypeScript, CSS, Motion, Playwright, Vercel, Expo/React Native WebView.

---

### Task 1: Landing workspace and route contracts

**Files:**
- Create: `apps/landing/package.json`
- Create: `apps/landing/index.html`
- Create: `apps/landing/src/main.tsx`
- Create: `apps/landing/src/App.tsx`
- Create: `apps/landing/src/config.ts`
- Create: `apps/landing/vercel.json`
- Modify: `package.json`
- Test: `tests/unit/landingPageContract.test.ts`

- [ ] Write contract tests for required routes, CTA targets, evidence language, brewer names, and the absence of PWA metadata.
- [ ] Add the workspace build and lint scripts.
- [ ] Implement route-aware rendering and Vercel redirects.
- [ ] Run the contract test and landing build.

### Task 2: Premium visual implementation

**Files:**
- Create: `apps/landing/src/styles.css`
- Create: `apps/landing/src/components/LandingHeader.tsx`
- Create: `apps/landing/src/components/HeroSection.tsx`
- Create: `apps/landing/src/components/MethodSections.tsx`
- Create: `apps/landing/src/components/BrewerGrid.tsx`
- Create: `apps/landing/src/components/FeatureGraphics.tsx`
- Create: `apps/landing/src/components/DownloadSection.tsx`
- Create: `apps/landing/public/assets/hero-brew.jpg`
- Copy: brand icons from `apps/web/public/icons`

- [ ] Define typography, color, spacing, glass, and motion tokens.
- [ ] Build the full-bleed hero and code-native recipe timeline.
- [ ] Build method mechanics, brewer coverage, evidence, pricing, downloads, and final CTA.
- [ ] Add responsive and reduced-motion behavior.
- [ ] Verify desktop and mobile screenshots against the approved concept direction.

### Task 3: Support, waitlist, and legal flows

**Files:**
- Create: `apps/landing/src/components/SupportChatWidget.tsx`
- Create: `apps/landing/src/components/ContactForm.tsx`
- Create: `apps/landing/src/pages/SupportPage.tsx`
- Create: `apps/landing/src/pages/PrivacyPage.tsx`
- Create: `apps/landing/src/pages/TermsPage.tsx`
- Create: `apps/landing/src/pages/DownloadPage.tsx`
- Test: `tests/e2e/landing.spec.ts`

- [ ] Implement keyboard-safe support chat and focus restoration.
- [ ] Implement validated support and waitlist forms with truthful local/email behavior.
- [ ] Add privacy, terms, support, and download pages.
- [ ] Add E2E coverage for navigation, forms, dialogs, and mobile sticky actions.

### Task 4: App origin, PWA, auth, and mobile migration

**Files:**
- Create: `apps/web/src/config/origins.ts`
- Modify: `.env.example`
- Modify: `apps/web/public/manifest.json`
- Modify: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/eas.json`
- Modify: `apps/mobile/.env.example`
- Modify: `apps/mobile/src/config/env.ts`
- Modify: `apps/mobile/src/screens/WebParityScreen.tsx`
- Modify: production scripts and domain-sensitive tests.

- [ ] Change canonical app defaults to `https://app.baristachaw.com`.
- [ ] Set manifest `start_url`, absolute `id`, and app-domain description.
- [ ] Preserve the legacy deep-link scheme only as a migration alias.
- [ ] Update auth/CORS tests to assert the app origin.
- [ ] Verify WebView URL includes `runtime=web_parity&ui_profile=native_shell`.

### Task 5: Production documentation and configuration

**Files:**
- Modify: `README.md`
- Modify: `docs/production-setup-operator-guide.md`
- Modify: `docs/mobile-supabase-auth.md`
- Modify: `docs/ios-web-wrapper-launch.md`
- Create: `docs/domain-migration-status.md`

- [ ] Classify old-name references as current, compatibility, test fixture, or historical.
- [ ] Update current operator instructions and release links.
- [ ] Record DNS, Vercel, auth callback, PWA, Android, and remaining manual status.

### Task 6: Verification and deployment

- [ ] Run landing lint/build/unit/E2E/a11y checks.
- [ ] Run root lint/test/build and mobile checks.
- [ ] Deploy the landing to a separate Vercel project and validate the preview.
- [ ] Attach apex and `www` domains only after the preview passes.
- [ ] Verify app, landing, legal, support, auth, AI Brew, and download URLs.
- [ ] Check the current GitHub Release Gate and resolve any failure before release claims.
- [ ] Commit only intended files, leave `scratch/` untouched, push `main`, and verify remote SHA.
