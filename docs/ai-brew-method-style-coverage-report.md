# AI Brew Method + Style Coverage Report

Generated: 2026-06-16T12:44:39.191Z
Local SHA: a1f3e492da1209a1beefb6e561a071ca69558e96
Remote main SHA: a1f3e492da1209a1beefb6e561a071ca69558e96
Branch: main
Working tree status at generation: M api/[...route].ts
 M api/billing.ts
 M apps/landing/package.json
 M apps/landing/src/App.tsx
 M apps/landing/src/components/DownloadSection.tsx
 M apps/landing/src/components/HeroSection.tsx
 M apps/landing/src/components/SupportChatWidget.tsx
 M apps/landing/src/config.ts
 M apps/landing/src/i18n.ts
 M apps/landing/src/pages/DownloadPage.tsx
 M apps/web/src/components/billing/AiAccessGate.tsx
 M apps/web/src/components/billing/PlanGrowthSurface.tsx
 M apps/web/src/features/ai-brew/AiBrewPanel.tsx
 M apps/web/src/features/ai-brew/aiComposer.ts
 M apps/web/src/features/ai-brew/experience.ts
 M apps/web/src/features/ai-brew/mokaPlanner.ts
 M apps/web/src/features/ai-brew/planner.ts
 M apps/web/src/features/ai-brew/siphonPlanner.ts
 M apps/web/src/features/ai-brew/workflowGuide.ts
 M apps/web/src/features/ai-brew/workflowTutorials.ts
 M apps/web/src/features/barista-tools/brewProfiles.ts
 M apps/web/src/pages/AdminManagement.tsx
 M apps/web/src/pages/Home.tsx
 M apps/web/src/pages/Scanner.tsx
 M apps/web/src/services/adminApi.ts
 M apps/web/src/services/billing.ts
 M apps/web/src/services/billingConfig.ts
 M apps/web/src/services/gemini.ts
 M docs/ai-brew-method-style-coverage-report.md
 M docs/ai-brew-method-style-final-verdict.md
 M docs/ai-brew-method-style-inventory.md
 M docs/ai-brew-method-style-ui-ux-report.md
 M docs/ai-brew-real-world-1000-report.md
 M packages/shared/package.json
 M packages/shared/src/index.ts
 M server-api/account/status.ts
 M server-api/admin/management.ts
 M server-api/billing/checkout.ts
 M server.ts
 M tests/e2e/landing.spec.ts
 M tests/unit/adminManagementHandler.test.ts
 M tests/unit/grindSizeAdvisor.test.ts
 M tests/unit/landingPageContract.test.ts
?? packages/shared/src/planCatalog.ts
?? server-api/billing/manualPayments.ts
?? server-api/billing/proof.ts
?? tests/unit/billingManualPaymentHandler.test.ts
Artifact directory: `artifacts/ai-brew-audit/method-styles/a1f3e492da12`

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
