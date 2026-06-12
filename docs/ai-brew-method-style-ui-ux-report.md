# AI Brew Method + Style UI/UX Report

Generated: 2026-06-12T14:40:06.885Z
Local SHA: e3b6de5bdb8112b11c68d91a788f6e52646071f7
Remote main SHA: e3b6de5bdb8112b11c68d91a788f6e52646071f7
Branch: main
Working tree status at generation: M .env.example
 M README.md
 M apps/mobile/.env.example
 M apps/mobile/app.config.ts
 M apps/mobile/eas.json
 M apps/mobile/src/config/env.ts
 M apps/mobile/src/screens/WebParityScreen.tsx
 M apps/web/package.json
 M apps/web/public/manifest.json
 M docs/admin-launch-action-list.md
 M docs/buku-developer-operator-baristachaw.md
 M docs/ios-web-wrapper-launch.md
 M docs/mobile-ios-runbook.md
 M docs/mobile-supabase-auth.md
 M docs/production-setup-operator-guide.md
 M package-lock.json
 M package.json
 M scripts/run-prod-gate.mjs
 M scripts/smoke-prod.mjs
 M server-api/ai.ts
 M server-api/chat.ts
 M tests/e2e/ai-brew-live-v60.spec.ts
 M tests/unit/aiInternalBaseUrl.test.ts
 M tests/unit/authEmailHandler.test.ts
 M tests/unit/authLogoutHandler.test.ts
 M tests/unit/authShared.test.ts
 M tests/unit/mobileAuthHandler.test.ts
 M tests/unit/mobileWebParityGate.test.ts
 M tests/unit/monitoringErrorHandler.test.ts
 M tests/unit/webAuthCallbackScript.test.ts
 M tests/unit/webAuthHandlers.test.ts
?? apps/landing/
?? docs/domain-migration-status.md
?? docs/superpowers/
?? playwright.landing.config.ts
?? scratch/
?? tests/e2e/landing.spec.ts
?? tests/unit/landingPageContract.test.ts
Artifact directory: `artifacts/ai-brew-audit/method-styles/e3b6de5bdb81`

This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.

## Result Card Coverage

- UI result surfaces checked: 1000
- Guide surfaces checked: 1000
- UI warning count: 17

## Mobile/Workflow Risks

- hario_switch-hybrid_balanced-fruit_forward-77: guide/detail text may be too dense for mobile
- hario_switch-mugen_everyday_hybrid-soft_round-110: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-130: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-133: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-135: guide/detail text may be too dense for mobile
- hario_switch-immersion_heavy_body-floral_transparent-860: guide/detail text may be too dense for mobile
- hario_switch-hybrid_balanced-balance_clean-864: guide/detail text may be too dense for mobile
- hario_switch-hybrid_balanced-more_sweetness-865: guide/detail text may be too dense for mobile
- hario_switch-hybrid_balanced-floral_transparent-868: guide/detail text may be too dense for mobile
- hario_switch-hybrid_balanced-fruit_forward-869: guide/detail text may be too dense for mobile
- hario_switch-hybrid_balanced-soft_round-870: guide/detail text may be too dense for mobile
- hario_switch-hybrid_balanced-dense_comforting-871: guide/detail text may be too dense for mobile
- hario_switch-mugen_everyday_hybrid-fruit_forward-901: guide/detail text may be too dense for mobile
- hario_switch-mugen_everyday_hybrid-soft_round-902: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-920: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-925: guide/detail text may be too dense for mobile
- kalita_wave-competition_fast_four-dense_comforting-975: guide/detail text may be too dense for mobile

## Remaining UI Risk

- Browser-level visual QA is still required after deployment for every viewport, especially long Pro guide copy.
- Physical barista use in service remains a human validation task.
