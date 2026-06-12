# AI Brew Method + Style UI/UX Report

Generated: 2026-06-12T00:57:30.468Z
Local SHA: 93ba05587bf9e4ba8917ac54fd17f94bc6b63b1f
Remote main SHA: 93ba05587bf9e4ba8917ac54fd17f94bc6b63b1f
Branch: main
Working tree status at generation: M apps/mobile/app.config.ts
 M apps/mobile/plugins/with-android-monorepo-release-bundle.js
 M apps/web/src/components/billing/AiAccessGate.tsx
 M apps/web/src/features/ai-brew/AiBrewPanel.tsx
 M apps/web/src/features/ai-brew/storage.ts
 M apps/web/src/hooks/useIOSKeyboardFix.ts
 M apps/web/src/index.css
 M apps/web/src/main.tsx
 M apps/web/src/services/db.ts
 M package.json
 M playwright.config.ts
 M server.ts
 M tests/a11y/routes.spec.ts
 M tests/e2e/ai-brew-overflow.spec.ts
 M tests/e2e/aiBrewHybrid.spec.ts
 M tests/e2e/auth-onboarding.spec.ts
 M tests/e2e/collection.spec.ts
 M tests/e2e/language-default.spec.ts
 M tests/e2e/mobile-web-parity.ai-brew.spec.ts
 M tests/e2e/mobile-web-parity.errors.spec.ts
 M tests/e2e/mobile-web-parity.language.spec.ts
 M tests/e2e/mobile-web-parity.navigation.spec.ts
 M tests/e2e/mobile-web-parity.no-dead-feature.spec.ts
 M tests/e2e/mobile-web-parity.safe-area.spec.ts
 M tests/e2e/mobile-web-parity.storage.spec.ts
 M tests/e2e/mobile.spec.ts
 M tests/e2e/precision-audit.spec.ts
 M tests/e2e/scanner.spec.ts
 M tests/e2e/tools.spec.ts
 M tests/helpers/cleanup.ts
 M tests/unit/mobileWebParityGate.test.ts
?? pnpm-workspace.yaml
?? scratch/
?? scripts/check-android-release-permissions.mjs
?? tests/e2e/onboarding.spec.ts
?? tests/e2e/service-worker.spec.ts
?? tests/unit/androidReleasePermissions.test.ts
Artifact directory: `artifacts/ai-brew-audit/method-styles/93ba05587bf9`

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
