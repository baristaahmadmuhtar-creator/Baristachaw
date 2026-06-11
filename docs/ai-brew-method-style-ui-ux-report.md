# AI Brew Method + Style UI/UX Report

Generated: 2026-06-11T01:03:43.853Z
Local SHA: bbc56407b3299abb7b4b352e321554d8cc1e3fb7
Remote main SHA: bbc56407b3299abb7b4b352e321554d8cc1e3fb7
Branch: main
Working tree status at generation: M apps/web/src/features/ai-brew/antiHallucination.ts
 M apps/web/src/features/ai-brew/chemexPlanner.ts
 M apps/web/src/features/ai-brew/cleverPlanner.ts
 M apps/web/src/features/ai-brew/kalitaPlanner.ts
 M apps/web/src/features/ai-brew/planner.ts
 M apps/web/src/features/ai-brew/workflowTutorials.ts
 M docs/ai-brew-method-style-coverage-report.md
 M docs/ai-brew-method-style-final-verdict.md
 M docs/ai-brew-method-style-inventory.md
 M docs/ai-brew-method-style-ui-ux-report.md
 M docs/ai-brew-real-world-1000-report.md
 M tests/unit/aiBrewPlanner.test.ts
?? harden-brewers.cjs
?? run-kalita-body-test.ts
?? run-kalita-test.ts
?? test-script.ts
Artifact directory: `artifacts/ai-brew-audit/method-styles/bbc56407b329`

This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.

## Result Card Coverage

- UI result surfaces checked: 1000
- Guide surfaces checked: 1000
- UI warning count: 116

## Mobile/Workflow Risks

- chemex-auto-more_sweetness-1: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-16: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-18: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-20: guide/detail text may be too dense for mobile
- chemex-auto-fruit_forward-53: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-69: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-70: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-115: guide/detail text may be too dense for mobile
- chemex-auto-fruit_forward-149: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-165: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-210: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-212: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-215: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-260: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_sweetness-305: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-310: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-355: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-400: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-405: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-455: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-496: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_sweetness-497: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-498: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-499: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-500: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-501: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-502: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-503: guide/detail text may be too dense for mobile
- chemex-high_dose_heavy_body-fruit_forward-525: guide/detail text may be too dense for mobile
- chemex-auto-more_sweetness-529: guide/detail text may be too dense for mobile
- chemex-auto-fruit_forward-533: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-544: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_sweetness-545: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-546: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-547: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-548: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-550: guide/detail text may be too dense for mobile
- chemex-high_dose_heavy_body-dense_comforting-575: guide/detail text may be too dense for mobile
- chemex-auto-fruit_forward-581: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-595: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-597: guide/detail text may be too dense for mobile
- chemex-auto-fruit_forward-629: guide/detail text may be too dense for mobile
- chemex-auto-soft_round-630: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-640: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-642: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-643: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-644: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-645: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-646: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-647: guide/detail text may be too dense for mobile
- chemex-iced_chemex-floral_transparent-660: guide/detail text may be too dense for mobile
- chemex-iced_chemex-fruit_forward-661: guide/detail text may be too dense for mobile
- chemex-iced_chemex-dense_comforting-663: guide/detail text may be too dense for mobile
- chemex-high_dose_heavy_body-more_sweetness-665: guide/detail text may be too dense for mobile
- chemex-high_dose_heavy_body-soft_round-670: guide/detail text may be too dense for mobile
- chemex-auto-more_sweetness-673: guide/detail text may be too dense for mobile
- chemex-auto-more_body-675: guide/detail text may be too dense for mobile
- chemex-auto-fruit_forward-677: guide/detail text may be too dense for mobile
- chemex-traditional_three_pour-fruit_forward-685: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_sweetness-689: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-690: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_body-691: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-693: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-694: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-695: guide/detail text may be too dense for mobile
- chemex-iced_chemex-more_sweetness-705: guide/detail text may be too dense for mobile
- chemex-iced_chemex-more_body-707: guide/detail text may be too dense for mobile
- chemex-iced_chemex-floral_transparent-708: guide/detail text may be too dense for mobile
- chemex-iced_chemex-fruit_forward-709: guide/detail text may be too dense for mobile
- chemex-iced_chemex-dense_comforting-711: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-balance_clean-736: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_sweetness-737: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-more_acidity-738: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-floral_transparent-740: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-fruit_forward-741: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-soft_round-742: guide/detail text may be too dense for mobile
- chemex-competition_multi_pulse-dense_comforting-743: guide/detail text may be too dense for mobile
- chemex-iced_chemex-fruit_forward-757: guide/detail text may be too dense for mobile
- chemex-high_dose_heavy_body-fruit_forward-765: guide/detail text may be too dense for mobile
- chemex-auto-more_sweetness-769: guide/detail text may be too dense for mobile

## Remaining UI Risk

- Browser-level visual QA is still required after deployment for every viewport, especially long Pro guide copy.
- Physical barista use in service remains a human validation task.
