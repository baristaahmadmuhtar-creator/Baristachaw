# AI Brew Method + Style UI/UX Report

Generated: 2026-06-12T12:18:42.623Z
Local SHA: 9c5e3156c5c39fd0479029bf54462e714e0e1875
Remote main SHA: 9c5e3156c5c39fd0479029bf54462e714e0e1875
Branch: main
Working tree status at generation: M apps/mobile/app.config.ts
 M apps/mobile/package.json
 M apps/web/index.html
 M apps/web/public/data/ai-brew/manual-brew-presets.v2026-06.json
 M apps/web/public/favicon.ico
 M apps/web/public/icons/apple-touch-icon.png
 M apps/web/public/icons/favicon-16x16.png
 M apps/web/public/icons/favicon-32x32.png
 M apps/web/public/icons/icon-1024.png
 M apps/web/public/icons/icon-128.png
 M apps/web/public/icons/icon-144.png
 M apps/web/public/icons/icon-152.png
 M apps/web/public/icons/icon-16.png
 M apps/web/public/icons/icon-167.png
 M apps/web/public/icons/icon-180.png
 M apps/web/public/icons/icon-192-maskable.png
 M apps/web/public/icons/icon-192.png
 M apps/web/public/icons/icon-256.png
 M apps/web/public/icons/icon-32.png
 M apps/web/public/icons/icon-384.png
 M apps/web/public/icons/icon-48.png
 M apps/web/public/icons/icon-512-maskable.png
 M apps/web/public/icons/icon-512.png
 M apps/web/public/icons/icon-72.png
 M apps/web/public/icons/icon-96.png
 M apps/web/public/icons/icon-dark-1024.png
 M apps/web/public/icons/icon-dark-512.png
 M apps/web/public/icons/icon-light-1024.png
 M apps/web/public/icons/icon-light-512.png
 M apps/web/public/icons/icon-maskable-1024.png
 M apps/web/public/icons/icon-maskable-128.png
 M apps/web/public/icons/icon-maskable-144.png
 M apps/web/public/icons/icon-maskable-152.png
 M apps/web/public/icons/icon-maskable-16.png
 M apps/web/public/icons/icon-maskable-167.png
 M apps/web/public/icons/icon-maskable-180.png
 M apps/web/public/icons/icon-maskable-192.png
 M apps/web/public/icons/icon-maskable-256.png
 M apps/web/public/icons/icon-maskable-32.png
 M apps/web/public/icons/icon-maskable-384.png
 M apps/web/public/icons/icon-maskable-48.png
 M apps/web/public/icons/icon-maskable-512.png
 M apps/web/public/icons/icon-maskable-72.png
 M apps/web/public/icons/icon-maskable-96.png
 M apps/web/public/icons/icon-mono-1024.png
 M apps/web/public/icons/icon-mono-512.png
 M apps/web/src/components/onboarding/FirstRunOnboarding.tsx
 M apps/web/src/features/ai-brew/AiBrewPanel.tsx
 M apps/web/src/features/ai-brew/antiHallucination.ts
 M apps/web/src/features/ai-brew/catalog.ts
 M apps/web/src/features/ai-brew/cupProfile.ts
 M apps/web/src/features/ai-brew/storage.ts
 M apps/web/src/features/ai-brew/types.ts
 M apps/web/src/services/db.ts
 M docs/ai-brew-method-style-coverage-report.md
 M docs/ai-brew-method-style-final-verdict.md
 M docs/ai-brew-method-style-inventory.md
 M docs/ai-brew-method-style-ui-ux-report.md
 M docs/ai-brew-real-world-1000-report.md
 M docs/mvp-final-certification-report.md
 M package-lock.json
 M package.json
 M tests/e2e/mobile.spec.ts
 M tests/e2e/onboarding.spec.ts
 M tests/e2e/tools.spec.ts
 M tests/unit/aiBrewAnnotationRegression.test.ts
 M tests/unit/aiBrewManualBrewPresets.test.ts
?? apps/web/src/features/ai-brew/realBrewLogs.ts
?? scratch/
?? scripts/ai-brew-99-readiness-score.mjs
?? tests/unit/aiBrewPlanIntegrity.test.ts
?? tests/unit/aiBrewRealBrewLogs.test.ts
Artifact directory: `artifacts/ai-brew-audit/method-styles/9c5e3156c5c3`

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
