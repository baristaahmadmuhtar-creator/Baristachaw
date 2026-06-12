# AI Brew Method + Style Coverage Report

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

## Summary

- Methods discovered: 16
- Styles discovered: 99
- Scenarios: 1000
- Passed: 1000
- Failed: 0
- Warnings: 17
- Average score: 99.9
- Final verdict: AI BREW METHOD STYLE COVERAGE STRONG / REAL BREW VALIDATION REQUIRED

## Method Scores

| Method | Cases | Avg | Min | Classification |
| --- | ---: | ---: | ---: | --- |
| aeropress | 56 | 100 | 100 | STRONG |
| april | 48 | 100 | 100 | STRONG |
| batch_brew | 48 | 100 | 100 | STRONG |
| chemex | 96 | 99.8 | 96 | STRONG |
| clever_dripper | 48 | 100 | 100 | STRONG |
| cold_brew | 48 | 100 | 100 | STRONG |
| espresso | 48 | 100 | 100 | STRONG |
| french_press | 48 | 100 | 100 | STRONG |
| hario_switch | 112 | 99.6 | 96 | STRONG |
| kalita_wave | 96 | 100 | 96 | STRONG |
| kono | 48 | 100 | 100 | STRONG |
| melitta | 48 | 100 | 100 | STRONG |
| moka_pot | 48 | 100 | 100 | STRONG |
| origami | 48 | 100 | 100 | STRONG |
| siphon | 48 | 100 | 100 | STRONG |
| v60 | 112 | 100 | 100 | STRONG |

## Lowest Scoring Cases

- hario_switch-hybrid_balanced-fruit_forward-77: 96 (guide/detail text may be too dense for mobile)
- hario_switch-mugen_everyday_hybrid-soft_round-110: 96 (guide/detail text may be too dense for mobile)
- chemex-competition_multi_pulse-more_acidity-130: 96 (guide/detail text may be too dense for mobile)
- chemex-competition_multi_pulse-fruit_forward-133: 96 (guide/detail text may be too dense for mobile)
- chemex-competition_multi_pulse-dense_comforting-135: 96 (guide/detail text may be too dense for mobile)
- hario_switch-immersion_heavy_body-floral_transparent-860: 96 (guide/detail text may be too dense for mobile)
- hario_switch-hybrid_balanced-balance_clean-864: 96 (guide/detail text may be too dense for mobile)
- hario_switch-hybrid_balanced-more_sweetness-865: 96 (guide/detail text may be too dense for mobile)
- hario_switch-hybrid_balanced-floral_transparent-868: 96 (guide/detail text may be too dense for mobile)
- hario_switch-hybrid_balanced-fruit_forward-869: 96 (guide/detail text may be too dense for mobile)
- hario_switch-hybrid_balanced-soft_round-870: 96 (guide/detail text may be too dense for mobile)
- hario_switch-hybrid_balanced-dense_comforting-871: 96 (guide/detail text may be too dense for mobile)
- hario_switch-mugen_everyday_hybrid-fruit_forward-901: 96 (guide/detail text may be too dense for mobile)
- hario_switch-mugen_everyday_hybrid-soft_round-902: 96 (guide/detail text may be too dense for mobile)
- chemex-competition_multi_pulse-balance_clean-920: 96 (guide/detail text may be too dense for mobile)
- chemex-competition_multi_pulse-fruit_forward-925: 96 (guide/detail text may be too dense for mobile)
- kalita_wave-competition_fast_four-dense_comforting-975: 96 (guide/detail text may be too dense for mobile)
- v60-classic_bloom_pulse-balance_clean-0: 100 (no finding)
- v60-classic_bloom_pulse-more_sweetness-1: 100 (no finding)
- v60-classic_bloom_pulse-more_acidity-2: 100 (no finding)
