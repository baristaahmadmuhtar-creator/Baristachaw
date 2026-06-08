# AI Brew Method + Style UI/UX Report

Generated: 2026-06-08T05:41:28.820Z
Local SHA: 9eff039a9b67ccf51894160faddafb22a1250b42
Remote main SHA: 9eff039a9b67ccf51894160faddafb22a1250b42
Branch: main
Working tree status at generation: M apps/web/src/features/ai-brew/aeropressCalibration.ts
 M apps/web/src/features/ai-brew/planner.ts
 M docs/ai-brew-method-style-coverage-report.md
 M docs/ai-brew-method-style-final-verdict.md
 M docs/ai-brew-method-style-inventory.md
 M docs/ai-brew-method-style-ui-ux-report.md
 M docs/ai-brew-real-world-1000-report.md
 M tests/e2e/tools.spec.ts
 M tests/unit/aiBrewPlanner.test.ts
?? apply-narrative-upgrade.cjs
?? check-broken.cjs
?? patch-localization.cjs
Artifact directory: `artifacts/ai-brew-audit/method-styles/9eff039a9b67`

This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.

## Result Card Coverage

- UI result surfaces checked: 1000
- Guide surfaces checked: 1000
- UI warning count: 90

## Mobile/Workflow Risks

- aeropress-bypass-more_acidity-26: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-29: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-31: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-77: guide/detail text may be too dense for mobile
- aeropress-bypass-more_acidity-82: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-83: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-84: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-86: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-133: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-137: guide/detail text may be too dense for mobile
- aeropress-bypass-more_acidity-138: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-139: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-141: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-142: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-143: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-253: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-309: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-361: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-366: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-421: guide/detail text may be too dense for mobile
- aeropress-inverted-soft_round-526: guide/detail text may be too dense for mobile
- aeropress-bypass-balance_clean-528: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-529: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-531: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-532: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-533: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-534: guide/detail text may be too dense for mobile
- aeropress-inverted-more_sweetness-577: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-581: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-587: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-588: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-591: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-637: guide/detail text may be too dense for mobile
- aeropress-inverted-soft_round-638: guide/detail text may be too dense for mobile
- aeropress-inverted-dense_comforting-639: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-641: guide/detail text may be too dense for mobile
- aeropress-bypass-more_acidity-642: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-643: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-644: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-646: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-647: guide/detail text may be too dense for mobile
- aeropress-inverted-more_sweetness-689: guide/detail text may be too dense for mobile
- aeropress-inverted-more_body-691: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-693: guide/detail text may be too dense for mobile
- aeropress-inverted-soft_round-694: guide/detail text may be too dense for mobile
- aeropress-bypass-balance_clean-696: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-697: guide/detail text may be too dense for mobile
- aeropress-bypass-more_acidity-698: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-699: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-701: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-702: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-703: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-749: guide/detail text may be too dense for mobile
- aeropress-bypass-balance_clean-752: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-753: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-756: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-757: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-759: guide/detail text may be too dense for mobile
- aeropress-inverted-more_sweetness-801: guide/detail text may be too dense for mobile
- aeropress-inverted-more_body-803: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-805: guide/detail text may be too dense for mobile
- aeropress-inverted-soft_round-806: guide/detail text may be too dense for mobile
- aeropress-inverted-dense_comforting-807: guide/detail text may be too dense for mobile
- aeropress-bypass-balance_clean-808: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-809: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-811: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-812: guide/detail text may be too dense for mobile
- aeropress-bypass-soft_round-814: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-861: guide/detail text may be too dense for mobile
- aeropress-inverted-soft_round-862: guide/detail text may be too dense for mobile
- aeropress-bypass-balance_clean-864: guide/detail text may be too dense for mobile
- aeropress-bypass-more_acidity-866: guide/detail text may be too dense for mobile
- aeropress-bypass-more_body-867: guide/detail text may be too dense for mobile
- aeropress-bypass-floral_transparent-868: guide/detail text may be too dense for mobile
- aeropress-bypass-fruit_forward-869: guide/detail text may be too dense for mobile
- aeropress-bypass-dense_comforting-871: guide/detail text may be too dense for mobile
- aeropress-inverted-more_sweetness-913: guide/detail text may be too dense for mobile
- aeropress-inverted-fruit_forward-917: guide/detail text may be too dense for mobile
- aeropress-bypass-more_sweetness-921: guide/detail text may be too dense for mobile
- aeropress-bypass-more_acidity-922: guide/detail text may be too dense for mobile

## Remaining UI Risk

- Browser-level visual QA is still required after deployment for every viewport, especially long Pro guide copy.
- Physical barista use in service remains a human validation task.
