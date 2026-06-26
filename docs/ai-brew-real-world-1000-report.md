# AI Brew Real-World 1000 Report

Regenerated metadata: 2026-06-26T18:49:21.307Z
Local SHA: 34b82645c7259616c024eda7ed6cf7c13af111dc
Remote main SHA: 34b82645c7259616c024eda7ed6cf7c13af111dc
Branch: codex/beta-launch-qa-refinement
Working tree status at generation: M apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json
 M apps/web/src/features/ai-brew/aeropressCalibration.ts
 M apps/web/src/features/ai-brew/planner.ts
 M apps/web/src/features/ai-brew/siphonPlanner.ts
 M apps/web/src/features/ai-brew/types.ts
 M apps/web/src/features/ai-brew/workflowGuide.ts
 M apps/web/src/pages/AdminManagement.tsx
 M apps/web/src/services/adminApi.ts
 M apps/web/src/services/billing.ts
 M data/catalog/exports/phase1/grinders.search.json
 M docs/ai-brew-method-style-coverage-report.md
 M docs/ai-brew-method-style-final-verdict.md
 M docs/ai-brew-method-style-inventory.md
 M docs/ai-brew-method-style-ui-ux-report.md
 M docs/ai-brew-real-world-1000-report.md
 M scripts/ai-brew-method-style-audit.mjs
 M server-api/admin/proofView.ts
 M server-api/billing/checkout.ts
 M server-api/billing/manualPayments.ts
 M server-api/billing/proof.ts
 M server-api/payment/mayar.ts
 M tests/unit/aiBrewAeroPressBypassMatrix.test.ts
 M tests/unit/aiBrewSwitchSafeRecovery.test.ts
 M tests/unit/billingManualPaymentHandler.test.ts
 M tests/unit/paymentMayar.test.ts
?? apps/web/src/features/ai-brew/methodStyleContracts.ts
?? docs/ai-brew-production-hardening-report.md
?? docs/superpowers/plans/2026-06-27-ai-brew-production-hardening.md
?? tests/unit/aiBrewMethodStyleContracts.test.ts

This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.

---
## Honesty Boundary
This is a curated real-world software/barista reasoning gate. It did not physically brew coffee and it must not be used as sensory certainty. AI Brew creates strong starting recipes and dial-in guidance; physical real brew validation is still required.

This is not physical brew proof or verified current-lot sensory data.

## Bean Coverage
- Panama Hacienda La Esmeralda Geisha Washed style: 32
- Panama Elida Estate Natural Geisha style: 28
- Ethiopia Yirgacheffe Washed Landrace style: 30
- Ethiopia Guji Natural Landrace style: 28
- Kenya AA SL28/SL34 Washed style: 29
- Colombia Pink Bourbon Washed style: 27
- Colombia Thermal Shock Caturra style: 27
- Brazil Natural Yellow Bourbon/Catuai style: 28
- Sumatra Wet-Hulled style: 26
- Costa Rica Honey/Natural style: 27
- Guatemala Washed Bourbon/Caturra style: 28
- Rwanda/Burundi Washed Bourbon style: 27
- Yemen Natural Traditional style: 27
- Colombia Sugarcane Decaf style: 27
- Specialty Robusta/Canephora style: 27
- Espresso roast blend style: 36
- Unknown origin/process/variety: 27
- Indonesia Gayo Washed Ateng/Typica style: 26
- Indonesia Toraja Washed Typica style: 26
- Indonesia Bali Natural/Kintamani style: 26
- India Monsooned Malabar style: 27
- Liberica / Excelsa specialty style: 27
- Indonesia Java Washed Typica style: 26
- Indonesia Papua Wamena Washed Typica style: 26
- Indonesia Bajawa Flores Natural Catimor style: 26
- Indonesia Java Preanger Washed S795 style: 26
- Mexico Chiapas Washed Bourbon style: 26
- Peru Cajamarca Washed Typica style: 26
- Bolivia Caranavi Washed Caturra style: 26
- Uganda Natural SL14/SL28 style: 26
- Nicaragua Maracaturra Washed style: 26
- Honduras Parainema Honey style: 26
- Thailand Doi Chang Washed Catimor style: 26
- Laos Bolaven Washed Catimor style: 26
- Colombia Caturra/Castillo Washed style: 25
- Indonesia Flores Wet-Hulled style: 25
- Indonesia Kerinci Honey Sigararutang style: 25

## Method Coverage
- v60: 286
- hario_switch: 66
- chemex: 25
- kalita_wave: 22
- french_press: 24
- clever_dripper: 63
- aeropress: 24
- origami: 43
- espresso: 29
- cold_brew: 43
- moka_pot: 22
- batch_brew: 23
- siphon: 22
- kono: 21
- melitta: 61
- april: 226

## Grinder Coverage
- 1Zpresso K-Ultra: 91
- Comandante C40 MK4: 85
- KINGrinder K6: 79
- Baratza Encore: 78
- Feima 600N: 74
- Timemore C3: 72
- Timemore C2: 72
- Baratza Encore ESP: 80
- Fellow Ode Brew Grinder Gen 1: 71
- Unknown electric grinder: 76
- Unknown manual grinder: 71
- DF64 espresso/filter hybrid: 76
- Espresso grinder zero-point unknown: 75

## Water Coverage
- Low buffer clarity water: 60
- Third Wave Water / remineralized balanced: 61
- Volvic style bottled water: 64
- Unknown estimated bottled water: 56
- Hard water: 54
- Espresso-safe water: 60
- High buffer alkaline water: 53
- zero-mineral RO / distilled water: 62
- Galon isi ulang / depot water Indonesia style: 53
- Pristine 8.6+ alkaline water Indonesia style: 53
- Aqua bottled water Indonesia style: 54
- Le Minerale bottled water Indonesia style: 53
- Club bottled water Indonesia style: 53
- Ades bottled water Indonesia style: 53
- Amidis demineralized water Indonesia style: 53
- Super O2 low-mineral water Indonesia style: 53
- Equil mineral water Indonesia style: 53
- Cleo low-mineral water Indonesia style: 52

## Target Coverage
- floral_transparent: 131
- fruit_forward: 125
- more_body: 123
- more_acidity: 124
- more_sweetness: 122
- dense_comforting: 125
- balance_clean: 124
- soft_round: 126

## Score Summary
Passed: 1000/1000
Failures: 0
Warnings: 1113
Average score: 98.5
Score distribution: min 92.8; p10 97.1; p50 98.3; p90 100; max 100
Unique coffee input combinations: 1000
Coverage density: 37 bean archetypes, 16 methods, 13 grinders, 18 waters, 8 targets, 5 roast levels.


| Category | Average | Minimum |
|---|---:|---:|
| recipeSafety | 96.2 | 84 |
| methodFit | 99.3 | 92 |
| targetFit | 99.1 | 84 |
| beanFit | 99.4 | 84 |
| roastFit | 99.7 | 92 |
| processFit | 98.5 | 92 |
| varietyFit | 99.7 | 92 |
| waterHonesty | 97.7 | 92 |
| grinderHonesty | 96.8 | 84 |
| temperatureLogic | 100 | 100 |
| grindLogic | 96.8 | 84 |
| extractionTimeLogic | 100 | 100 |
| workflowLanguageSafety | 99.3 | 92 |
| pourFlowLogic | 99.4 | 92 |
| bloomLogic | 99.7 | 92 |
| expectedCupHonesty | 98.9 | 84 |
| warningQuality | 97.3 | 84 |
| mobileCopyQuality | 100 | 100 |
| overclaimRisk | 94.6 | 76 |

## Lowest Scoring Cases
- generated-0993: Yemen Natural Traditional style / Cold Brew / DF64 espresso/filter hybrid / zero-mineral RO / distilled water; score 92.8; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; zero_mineral_remineralize_risk: zero-mineral RO / distilled water is not brew-ready without minerals.; experimental_process_feedback_risk: Yemen Natural Traditional style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.
- generated-0230: Colombia Thermal Shock Caturra style / French Press / Timemore C3 / Galon isi ulang / depot water Indonesia style; score 94.1; water_manual_verification_risk: Galon isi ulang / depot water Indonesia style needs manual TDS/GH/KH verification before high confidence.; experimental_process_feedback_risk: Colombia Thermal Shock Caturra style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.
- generated-0519: Panama Hacienda La Esmeralda Geisha Washed style / Espresso / Espresso grinder zero-point unknown / High buffer alkaline water; score 94.1; fallback_grinder_calibration_risk: Espresso grinder zero-point unknown needs calibration; settings are starting points, not exact burr-zero truth.; espresso_not_recommended_grinder_risk: Espresso grinder zero-point unknown is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; high_buffer_target_risk: High buffer alkaline water can mute acidity, florals, and clarity for this target.
- generated-0520: Panama Elida Estate Natural Geisha style / Batch Brewer / Espresso grinder zero-point unknown / High buffer alkaline water; score 94.1; fallback_grinder_calibration_risk: Espresso grinder zero-point unknown needs calibration; settings are starting points, not exact burr-zero truth.; experimental_process_feedback_risk: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; geisha_body_target_risk: Body/dense target can reduce Geisha floral clarity; use Floral & Transparent or Fruit-Forward for a more classic Geisha cup.; batch_model_validation_risk: Batch brewer flow, basket depth, and spray pattern need model-specific validation.
- generated-0920: Colombia Sugarcane Decaf style / French Press / Comandante C40 MK4 / Pristine 8.6+ alkaline water Indonesia style; score 94.1; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.
- generated-0059: Mexico Chiapas Washed Bourbon style / Espresso / Unknown electric grinder / zero-mineral RO / distilled water; score 94.5; fallback_grinder_calibration_risk: Unknown electric grinder needs calibration; settings are starting points, not exact burr-zero truth.; espresso_not_recommended_grinder_risk: Unknown electric grinder is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; zero_mineral_remineralize_risk: zero-mineral RO / distilled water is not brew-ready without minerals.
- generated-0224: Panama Elida Estate Natural Geisha style / Cold Brew / Timemore C2 / Galon isi ulang / depot water Indonesia style; score 94.5; water_manual_verification_risk: Galon isi ulang / depot water Indonesia style needs manual TDS/GH/KH verification before high confidence.; experimental_process_feedback_risk: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.
- generated-0335: Panama Elida Estate Natural Geisha style / Espresso / Comandante C40 MK4 / Espresso-safe water; score 94.5; espresso_not_recommended_grinder_risk: Comandante C40 is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; experimental_process_feedback_risk: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; geisha_body_target_risk: Body/dense target can reduce Geisha floral clarity; use Floral & Transparent or Fruit-Forward for a more classic Geisha cup.
- generated-0375: Kenya AA SL28/SL34 Washed style / Moka Pot / Feima 600N / Ades bottled water Indonesia style; score 94.5; fallback_grinder_calibration_risk: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N needs calibration; settings are starting points, not exact burr-zero truth.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; moka_stall_bitterness_risk: Moka grind must avoid espresso-powder fineness; stop before sputter to control bitterness.
- generated-0991: Laos Bolaven Washed Catimor style / V60 hot / DF64 espresso/filter hybrid / zero-mineral RO / distilled water; score 94.5; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; zero_mineral_remineralize_risk: zero-mineral RO / distilled water is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.
- generated-0992: Rwanda/Burundi Washed Bourbon style / Clever Dripper / DF64 espresso/filter hybrid / zero-mineral RO / distilled water; score 94.5; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; zero_mineral_remineralize_risk: zero-mineral RO / distilled water is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.
- generated-0151: Ethiopia Yirgacheffe Washed Landrace style / Espresso / KINGrinder K6 / Club bottled water Indonesia style; score 94.9; espresso_not_recommended_grinder_risk: Kingrinder K6 is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.

## Top Failures
No blocking software failure found.

## Top Warnings
- 02-panama-natural-geisha-v60-iced-fruit: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 03-panama-natural-geisha-more-body-mismatch: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; Body/dense target can reduce Geisha floral clarity; use Floral & Transparent or Fruit-Forward for a more classic Geisha cup.
- 05-ethiopia-natural-switch-fruit: Ethiopia Guji Natural Landrace style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 08-colombia-anaerobic-v60-fruit: Colombia Thermal Shock Caturra style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 10-indonesia-wet-hulled-clever-body: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N needs calibration; settings are starting points, not exact burr-zero truth.; Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.
- 14-yemen-natural-v60-dense: Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.; Yemen Natural Traditional style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 18-timemore-c2-espresso-blocked: Timemore C2 is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.
- 19-fellow-ode-espresso-blocked: Fellow Ode Gen 2 is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.
- 20-unknown-grinder-espresso-low-confidence: Unknown electric grinder needs calibration; settings are starting points, not exact burr-zero truth.; Unknown electric grinder is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.
- 21-unknown-bean-v60-baseline: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.; Bean data is incomplete, so this recipe should stay conservative and avoid specific flavor certainty.
- 23-high-buffer-water-floral-warning: High buffer alkaline water can mute acidity, florals, and clarity for this target.
- 24-zero-mineral-water-block: zero-mineral RO / distilled water is not brew-ready without minerals.
- 27-cold-brew-floral-target-warning: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.
- 28-moka-dark-roast: Moka grind must avoid espresso-powder fineness; stop before sputter to control bitterness.
- 29-batch-brewer-medium-roast-blend: Batch brewer flow, basket depth, and spray pattern need model-specific validation.
- 31-switch-02-chamber-safety: Ethiopia Guji Natural Landrace style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 32-switch-03-chamber-safety: Ethiopia Guji Natural Landrace style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 33-mugen-x-switch-profile: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N needs calibration; settings are starting points, not exact burr-zero truth.; Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.
- 40-iced-v60-water-ice-split-correctness: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.
- 41-feima-600n-espresso-hard-warning: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N needs calibration; settings are starting points, not exact burr-zero truth.; Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.

## Top Warning Causes
- fallback_grinder_calibration_risk: 372 cases; examples 10-indonesia-wet-hulled-clever-body, 20-unknown-grinder-espresso-low-confidence, 21-unknown-bean-v60-baseline, 33-mugen-x-switch-profile, 41-feima-600n-espresso-hard-warning
- experimental_process_feedback_risk: 188 cases; examples 02-panama-natural-geisha-v60-iced-fruit, 03-panama-natural-geisha-more-body-mismatch, 05-ethiopia-natural-switch-fruit, 08-colombia-anaerobic-v60-fruit, 14-yemen-natural-v60-dense
- zero_mineral_remineralize_risk: 115 cases; examples 24-zero-mineral-water-block, 53-super-o2-chemex-low-mineral-warning, generated-0056, generated-0057, generated-0058
- water_manual_verification_risk: 109 cases; examples 10-indonesia-wet-hulled-clever-body, 14-yemen-natural-v60-dense, 21-unknown-bean-v60-baseline, 33-mugen-x-switch-profile, 42-galon-depot-v60-manual-water
- high_buffer_target_risk: 61 cases; examples 23-high-buffer-water-floral-warning, 43-pristine-alkaline-geisha-floral-warning, 54-equil-floral-muted-warning, generated-0157, generated-0158
- demineral_direct_filter_experiment_risk: 53 cases; examples 52-amidis-v60-remineralize-required, generated-0183, generated-0184, generated-0185, generated-0186
- low_mineral_filter_clarity_risk: 52 cases; examples generated-0170, generated-0171, generated-0172, generated-0173, generated-0174
- dark_floral_target_risk: 37 cases; examples 44-dark-roast-floral-target-mismatch, generated-0080, generated-0151, generated-0153, generated-0223
- unknown_bean_conservative_risk: 27 cases; examples 21-unknown-bean-v60-baseline, generated-0073, generated-0110, generated-0147, generated-0184
- batch_model_validation_risk: 23 cases; examples 29-batch-brewer-medium-roast-blend, 55-batch-brewer-java-balanced, generated-0060, generated-0106, generated-0152
- espresso_not_recommended_grinder_risk: 23 cases; examples 18-timemore-c2-espresso-blocked, 19-fellow-ode-espresso-blocked, 20-unknown-grinder-espresso-low-confidence, 41-feima-600n-espresso-hard-warning, generated-0059
- moka_stall_bitterness_risk: 22 cases; examples 28-moka-dark-roast, 50-liberica-excelsa-moka-body, generated-0099, generated-0145, generated-0191

## Top Method-Risk Categories
- espresso: avg 96.9; min 94.1; warnings 48; failures 0
- moka_pot: avg 97.5; min 94.5; warnings 45; failures 0
- batch_brew: avg 97.6; min 94.1; warnings 44; failures 0
- cold_brew: avg 98.3; min 92.8; warnings 55; failures 0
- french_press: avg 98.4; min 94.1; warnings 30; failures 0
- clever_dripper: avg 98.5; min 95.4; warnings 76; failures 0
- origami: avg 98.6; min 94.9; warnings 48; failures 0
- v60: avg 98.7; min 94.5; warnings 294; failures 0
- hario_switch: avg 98.7; min 94.9; warnings 70; failures 0
- chemex: avg 98.7; min 97.1; warnings 25; failures 0
- kono: avg 98.7; min 96.6; warnings 22; failures 0
- melitta: avg 98.7; min 96.6; warnings 65; failures 0

## Barista Interpretation
- Premium washed/floral coffees are evaluated for higher temperature, clarity, water-buffer honesty, and target mismatch warnings.
- Natural, anaerobic, decaf, non-arabica, wet-hulled, dark roast, and unknown inputs are scored for conservative confidence and non-overclaim behavior.
- Espresso is judged as a starting-point/dial-in workflow, not a guaranteed shot recipe.
- Cold brew, moka, French Press, batch brewer, and siphon are checked for method-specific language instead of V60 copy leakage.

## What Outputs Were Excellent
- 01-panama-washed-geisha-v60-floral: Panama Hacienda La Esmeralda Geisha Washed style with V60 hot scored 100.
- 02-panama-natural-geisha-v60-iced-fruit: Panama Elida Estate Natural Geisha style with V60 iced scored 99.6.
- 04-ethiopia-washed-v60-acidity: Ethiopia Yirgacheffe Washed Landrace style with V60 hot scored 100.
- 05-ethiopia-natural-switch-fruit: Ethiopia Guji Natural Landrace style with Hario Switch 02 hot scored 99.6.
- 06-kenya-washed-chemex-acidity: Kenya AA SL28/SL34 Washed style with Chemex scored 100.
- 07-colombia-pink-bourbon-kalita-sweetness: Colombia Pink Bourbon Washed style with Kalita / flat-bottom scored 100.
- 08-colombia-anaerobic-v60-fruit: Colombia Thermal Shock Caturra style with V60 hot scored 99.6.
- 09-brazil-natural-french-press-dense: Brazil Natural Yellow Bourbon/Catuai style with French Press scored 100.
- 11-costa-rica-honey-aeropress-sweetness: Costa Rica Honey/Natural style with AeroPress scored 100.
- 12-guatemala-washed-v60-balance: Guatemala Washed Bourbon/Caturra style with V60 hot scored 100.
- 13-rwanda-washed-origami-acidity: Rwanda/Burundi Washed Bourbon style with Origami scored 100.
- 14-yemen-natural-v60-dense: Yemen Natural Traditional style with V60 hot scored 98.3.

## What Outputs Were Questionable
- 20-unknown-grinder-espresso-low-confidence: Espresso roast blend style with Espresso scored 95.8; review warnings/copy before physical validation.
- 21-unknown-bean-v60-baseline: Unknown origin/process/variety with V60 hot scored 95.4; review warnings/copy before physical validation.
- 41-feima-600n-espresso-hard-warning: Espresso roast blend style with Espresso scored 95.8; review warnings/copy before physical validation.
- generated-0059: Mexico Chiapas Washed Bourbon style with Espresso scored 94.5; review warnings/copy before physical validation.
- generated-0060: Peru Cajamarca Washed Typica style with Batch Brewer scored 95.8; review warnings/copy before physical validation.
- generated-0112: Panama Hacienda La Esmeralda Geisha Washed style with Siphon scored 95.8; review warnings/copy before physical validation.
- generated-0113: Panama Elida Estate Natural Geisha style with April / Orea / B75 style flat-bottom scored 95.4; review warnings/copy before physical validation.
- generated-0151: Ethiopia Yirgacheffe Washed Landrace style with Espresso scored 94.9; review warnings/copy before physical validation.
- generated-0186: Panama Hacienda La Esmeralda Geisha Washed style with Clever Dripper scored 95.4; review warnings/copy before physical validation.
- generated-0224: Panama Elida Estate Natural Geisha style with Cold Brew scored 94.5; review warnings/copy before physical validation.
- generated-0230: Colombia Thermal Shock Caturra style with French Press scored 94.1; review warnings/copy before physical validation.
- generated-0243: Indonesia Java Preanger Washed S795 style with Espresso scored 95.8; review warnings/copy before physical validation.

## What Outputs Were Wrong
- No blocking wrong output was found in this software gate.

## Required Example Cases
| # | Scenario | Method | Grinder | Water | Output | Score | Finding |
|---:|---|---|---|---|---|---:|---|
| 1 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Low buffer clarity water | 12g, 195ml, 92.5C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:35 | 100 | Pass; software recipe safe, real brew validation still required |
| 2 | Panama Elida Estate Natural Geisha style -> fruit_forward | V60 iced | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 15g, 210ml, 92C, Starting grind: 19 clicks. Correction range: 17 clicks to 20 clicks. If sour/thin: 17 clicks. If bitter/dry/stalled: 20 clicks., 2:45 | 99.6 | experimental_process_feedback_risk |
| 3 | Panama Elida Estate Natural Geisha style -> more_body | V60 hot | 1Zpresso K-Ultra | Volvic style bottled water | 18g, 280ml, 91.8C, Starting grind: 6.3 numbers. Correction range: 5.5 numbers to 7.1 numbers. If sour/thin: 5.5 numbers. If bitter/dry/stalled: 7.1 numbers., 3:25 | 97.1 | experimental_process_feedback_risk; geisha_body_target_risk |
| 4 | Ethiopia Yirgacheffe Washed Landrace style -> more_acidity | V60 hot | 1Zpresso K-Ultra | Low buffer clarity water | 20g, 325ml, 94C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:10 | 100 | Pass; software recipe safe, real brew validation still required |
| 5 | Ethiopia Guji Natural Landrace style -> fruit_forward | Hario Switch 02 hot | KINGrinder K6 | Third Wave Water / remineralized balanced | 12g, 190ml, 90.5C, Starting grind: 86 clicks. Correction range: 83 clicks to 89 clicks. If sour/thin: 83 clicks. If bitter/dry/stalled: 89 clicks., 2:55 | 99.6 | experimental_process_feedback_risk |
| 6 | Kenya AA SL28/SL34 Washed style -> more_acidity | Chemex | Comandante C40 MK4 | Low buffer clarity water | 20g, 330ml, 94C, Starting grind: 29 clicks. Correction range: 28 clicks to 31 clicks. If sour/thin: 28 clicks. If bitter/dry/stalled: 31 clicks., 4:15 | 100 | Pass; software recipe safe, real brew validation still required |
| 7 | Colombia Pink Bourbon Washed style -> more_sweetness | Kalita / flat-bottom | 1Zpresso K-Ultra | Volvic style bottled water | 18g, 280ml, 93.5C, Starting grind: 3.0 numbers. Correction range: 1.4 numbers to 4.6 numbers. If sour/thin: 1.4 numbers. If bitter/dry/stalled: 4.6 numbers., 4:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 8 | Colombia Thermal Shock Caturra style -> fruit_forward | V60 hot | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 20g, 320ml, 90.9C, Starting grind: 24 clicks. Correction range: 22 clicks to 25 clicks. If sour/thin: 22 clicks. If bitter/dry/stalled: 25 clicks., 2:50 | 99.6 | experimental_process_feedback_risk |
| 9 | Brazil Natural Yellow Bourbon/Catuai style -> dense_comforting | French Press | Baratza Encore | Volvic style bottled water | 30g, 425ml, 90.3C, Starting grind: 29 setting. Correction range: 28 setting to 31 setting. If sour/thin: 28 setting. If bitter/dry/stalled: 31 setting., 8:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 10 | Sumatra Wet-Hulled style -> more_body | Clever Dripper | Feima 600N | Unknown estimated bottled water | 15g, 200ml, 91.4C, Starting grind: setting 5.3. Correction range: setting 5.2 to setting 5.5. If sour/thin: setting 5.2. If bitter/dry/stalled: setting 5.5., 4:40 | 97.1 | fallback_grinder_calibration_risk; water_manual_verification_risk |
| 11 | Costa Rica Honey/Natural style -> more_sweetness | AeroPress | KINGrinder K6 | Third Wave Water / remineralized balanced | 18g, 240ml, 90C, Starting grind: 53 clicks. Correction range: 49 clicks to 57 clicks. If sour/thin: 49 clicks. If bitter/dry/stalled: 57 clicks., 2:20 | 100 | Pass; software recipe safe, real brew validation still required |
| 12 | Guatemala Washed Bourbon/Caturra style -> balance_clean | V60 hot | Timemore C3 | Volvic style bottled water | 20g, 320ml, 90.3C, Starting grind: 17 clicks. Correction range: 16 clicks to 19 clicks. If sour/thin: 16 clicks. If bitter/dry/stalled: 19 clicks., 2:45 | 100 | Pass; software recipe safe, real brew validation still required |
| 13 | Rwanda/Burundi Washed Bourbon style -> more_acidity | Origami | 1Zpresso K-Ultra | Low buffer clarity water | 12g, 195ml, 93C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:10 | 100 | Pass; software recipe safe, real brew validation still required |
| 14 | Yemen Natural Traditional style -> dense_comforting | V60 hot | Comandante C40 MK4 | Unknown estimated bottled water | 15g, 235ml, 90.7C, Starting grind: 23 clicks. Correction range: 22 clicks to 25 clicks. If sour/thin: 22 clicks. If bitter/dry/stalled: 25 clicks., 3:15 | 98.3 | water_manual_verification_risk; experimental_process_feedback_risk |
| 15 | Colombia Sugarcane Decaf style -> soft_round | V60 hot | Timemore C2 | Volvic style bottled water | 18g, 285ml, 90.9C, Starting grind: 21 clicks. Correction range: 19 clicks to 22 clicks. If sour/thin: 19 clicks. If bitter/dry/stalled: 22 clicks., 2:55 | 100 | Pass; software recipe safe, real brew validation still required |
| 16 | Specialty Robusta/Canephora style -> more_body | French Press | Baratza Encore | Hard water | 18g, 255ml, 90C, Starting grind: 29 setting. Correction range: 28 setting to 31 setting. If sour/thin: 28 setting. If bitter/dry/stalled: 31 setting., 8:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 17 | Espresso roast blend style -> soft_round | Espresso | Baratza Encore ESP | Espresso-safe water | 18g, 40ml, 91.9C, Starting grind: 5 settings. Correction range: 3 settings to 7 settings. If sour/thin: 3 settings. If bitter/dry/stalled: 7 settings., 0:36 | 100 | Pass; software recipe safe, real brew validation still required |
| 18 | Espresso roast blend style -> soft_round | Espresso | Timemore C2 | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: 12 clicks. Correction range: 11 clicks to 14 clicks. If sour/thin: 11 clicks. If bitter/dry/stalled: 14 clicks., 0:36 | 97.5 | espresso_not_recommended_grinder_risk |
| 19 | Espresso roast blend style -> soft_round | Espresso | Fellow Ode Brew Grinder Gen 1 | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: 1.0 settings. Correction range: 0.9 settings to 1.1 settings. If sour/thin: 0.9 settings. If bitter/dry/stalled: 1.1 settings., 0:36 | 97.5 | espresso_not_recommended_grinder_risk |
| 20 | Espresso roast blend style -> soft_round | Espresso | Unknown electric grinder | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: manual calibration. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 0:36 | 95.8 | fallback_grinder_calibration_risk; espresso_not_recommended_grinder_risk |
| 21 | Unknown origin/process/variety -> balance_clean | V60 hot | Unknown manual grinder | Unknown estimated bottled water | 12g, 190ml, 90.9C, Starting grind: manual calibration. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 2:55 | 95.4 | fallback_grinder_calibration_risk; water_manual_verification_risk; unknown_bean_conservative_risk |
| 22 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Volvic style bottled water | 15g, 240ml, 92C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:35 | 100 | Pass; software recipe safe, real brew validation still required |
| 23 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | High buffer alkaline water | 18g, 295ml, 92C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:30 | 98.3 | high_buffer_target_risk |
| 24 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | zero-mineral RO / distilled water | 20g, 325ml, 94C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:15 | 98.7 | zero_mineral_remineralize_risk |
| 25 | Kenya AA SL28/SL34 Washed style -> more_acidity | V60 hot | Comandante C40 MK4 | Low buffer clarity water | 12g, 195ml, 94C, Starting grind: 23 clicks. Correction range: 22 clicks to 25 clicks. If sour/thin: 22 clicks. If bitter/dry/stalled: 25 clicks., 2:20 | 100 | Pass; software recipe safe, real brew validation still required |
| 26 | Brazil Natural Yellow Bourbon/Catuai style -> dense_comforting | Cold Brew | Baratza Encore | Volvic style bottled water | 40g, 600ml, 14.3C, Starting grind: 24 settings. Correction range: 22 settings to 26 settings. If sour/thin: 22 settings. If bitter/dry/stalled: 26 settings., 755:00 | 100 | Pass; software recipe safe, real brew validation still required |
| 27 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | Cold Brew | Baratza Encore | Low buffer clarity water | 40g, 600ml, 15.3C, Starting grind: 26 settings. Correction range: 24 settings to 28 settings. If sour/thin: 24 settings. If bitter/dry/stalled: 28 settings., 685:00 | 98.7 | cold_brew_floral_expectation_risk |
| 28 | Espresso roast blend style -> soft_round | Moka Pot | Baratza Encore ESP | Volvic style bottled water | 18g, 180ml, 87.3C, Starting grind: 19 settings. Correction range: 17 settings to 20 settings. If sour/thin: 17 settings. If bitter/dry/stalled: 20 settings., 3:15 | 98.7 | moka_stall_bitterness_risk |
| 29 | Guatemala Washed Bourbon/Caturra style -> balance_clean | Batch Brewer | Baratza Encore | Third Wave Water / remineralized balanced | 40g, 650ml, 93.4C, Starting grind: 24 settings. Correction range: 22 settings to 26 settings. If sour/thin: 22 settings. If bitter/dry/stalled: 26 settings., 5:45 | 98.7 | batch_model_validation_risk |
| 30 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | Siphon | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 15g, 220ml, 91.2C, Starting grind: 18 clicks. Correction range: 16 clicks to 19 clicks. If sour/thin: 16 clicks. If bitter/dry/stalled: 19 clicks., 3:50 | 100 | Pass; software recipe safe, real brew validation still required |
| 31 | Ethiopia Guji Natural Landrace style -> more_sweetness | Hario Switch 02 hot | 1Zpresso K-Ultra | Volvic style bottled water | 20g, 320ml, 91.1C, Starting grind: 5.6 numbers. Correction range: 4.1 numbers to 7.2 numbers. If sour/thin: 4.1 numbers. If bitter/dry/stalled: 7.2 numbers., 3:00 | 99.6 | experimental_process_feedback_risk |
| 32 | Ethiopia Guji Natural Landrace style -> more_sweetness | Hario Switch 03 hot | 1Zpresso K-Ultra | Volvic style bottled water | 25g, 400ml, 90.9C, Starting grind: 5.6 numbers. Correction range: 4.1 numbers to 7.2 numbers. If sour/thin: 4.1 numbers. If bitter/dry/stalled: 7.2 numbers., 3:00 | 99.6 | experimental_process_feedback_risk |
| 33 | Guatemala Washed Bourbon/Caturra style -> balance_clean | MUGEN x Switch | Feima 600N | Unknown estimated bottled water | 12g, 185ml, 90C, Starting grind: setting 5.3. Correction range: setting 5.2 to setting 5.5. If sour/thin: setting 5.2. If bitter/dry/stalled: setting 5.5., 3:40 | 97.1 | fallback_grinder_calibration_risk; water_manual_verification_risk |
| 34 | Kenya AA SL28/SL34 Washed style -> balance_clean | Chemex | Comandante C40 MK4 | Volvic style bottled water | 30g, 500ml, 93.5C, Starting grind: 30 clicks. Correction range: 28 clicks to 31 clicks. If sour/thin: 28 clicks. If bitter/dry/stalled: 31 clicks., 4:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 35 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Low buffer clarity water | 12g, 200ml, 94C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:25 | 100 | Pass; software recipe safe, real brew validation still required |
| 36 | Costa Rica Honey/Natural style -> more_sweetness | AeroPress | KINGrinder K6 | Third Wave Water / remineralized balanced | 20g, 255ml, 90C, Starting grind: 53 clicks. Correction range: 49 clicks to 57 clicks. If sour/thin: 49 clicks. If bitter/dry/stalled: 57 clicks., 2:05 | 100 | Pass; software recipe safe, real brew validation still required |
| 37 | Brazil Natural Yellow Bourbon/Catuai style -> dense_comforting | French Press | Baratza Encore | Hard water | 30g, 430ml, 90C, Starting grind: 29 setting. Correction range: 28 setting to 31 setting. If sour/thin: 28 setting. If bitter/dry/stalled: 31 setting., 8:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 38 | Espresso roast blend style -> soft_round | Espresso | Baratza Encore ESP | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: 5 settings. Correction range: 3 settings to 6 settings. If sour/thin: 3 settings. If bitter/dry/stalled: 6 settings., 0:36 | 100 | Pass; software recipe safe, real brew validation still required |
| 39 | Espresso roast blend style -> dense_comforting | Espresso | Baratza Encore ESP | Espresso-safe water | 18g, 40ml, 91.8C, Starting grind: 5 settings. Correction range: 3 settings to 7 settings. If sour/thin: 3 settings. If bitter/dry/stalled: 7 settings., 0:45 | 100 | Pass; software recipe safe, real brew validation still required |
| 40 | Panama Elida Estate Natural Geisha style -> fruit_forward | V60 iced | 1Zpresso K-Ultra | Third Wave Water / remineralized balanced | 15g, 235ml, 92C, Starting grind: 5.0 numbers. Correction range: 4.4 numbers to 5.7 numbers. If sour/thin: 4.4 numbers. If bitter/dry/stalled: 5.7 numbers., 2:45 | 99.6 | experimental_process_feedback_risk |
| 41 | Espresso roast blend style -> soft_round | Espresso | Feima 600N | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: setting 1.2. Correction range: setting 1.1 to setting 1.3. If sour/thin: setting 1.1. If bitter/dry/stalled: setting 1.3., 0:36 | 95.8 | fallback_grinder_calibration_risk; espresso_not_recommended_grinder_risk |
| 42 | Indonesia Gayo Washed Ateng/Typica style -> balance_clean | V60 hot | Timemore C3 | Galon isi ulang / depot water Indonesia style | 15g, 240ml, 90.8C, Starting grind: 17 clicks. Correction range: 16 clicks to 19 clicks. If sour/thin: 16 clicks. If bitter/dry/stalled: 19 clicks., 2:50 | 98.7 | water_manual_verification_risk |
| 43 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Pristine 8.6+ alkaline water Indonesia style | 18g, 290ml, 92C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:25 | 98.3 | high_buffer_target_risk |
| 44 | Espresso roast blend style -> floral_transparent | V60 hot | Comandante C40 MK4 | Volvic style bottled water | 20g, 330ml, 87.6C, Starting grind: 25 clicks. Correction range: 23 clicks to 26 clicks. If sour/thin: 23 clicks. If bitter/dry/stalled: 26 clicks., 2:00 | 97.5 | dark_floral_target_risk |
| 45 | Panama Hacienda La Esmeralda Geisha Washed style -> dense_comforting | Chemex | Comandante C40 MK4 | Low buffer clarity water | 20g, 330ml, 92.5C, Starting grind: 28 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 5:15 | 97.5 | geisha_body_target_risk |
| 46 | Colombia Thermal Shock Caturra style -> dense_comforting | Hario Switch 03 hot | 1Zpresso K-Ultra | Third Wave Water / remineralized balanced | 22g, 350ml, 89.6C, Starting grind: 6.2 numbers. Correction range: 4.6 numbers to 7.7 numbers. If sour/thin: 4.6 numbers. If bitter/dry/stalled: 7.7 numbers., 3:15 | 99.6 | experimental_process_feedback_risk |
| 47 | Indonesia Toraja Washed Typica style -> more_body | Clever Dripper | Feima 600N | Aqua bottled water Indonesia style | 18g, 240ml, 89.6C, Starting grind: setting 5.3. Correction range: setting 5.2 to setting 5.4. If sour/thin: setting 5.2. If bitter/dry/stalled: setting 5.4., 4:35 | 98.3 | fallback_grinder_calibration_risk |
| 48 | Indonesia Bali Natural/Kintamani style -> fruit_forward | AeroPress | KINGrinder K6 | Le Minerale bottled water Indonesia style | 20g, 270ml, 88C, Starting grind: 62 clicks. Correction range: 58 clicks to 66 clicks. If sour/thin: 58 clicks. If bitter/dry/stalled: 66 clicks., 1:45 | 99.6 | experimental_process_feedback_risk |
| 49 | India Monsooned Malabar style -> dense_comforting | French Press | Baratza Encore | Club bottled water Indonesia style | 30g, 425ml, 90C, Starting grind: 29 setting. Correction range: 28 setting to 31 setting. If sour/thin: 28 setting. If bitter/dry/stalled: 31 setting., 8:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 50 | Liberica / Excelsa specialty style -> more_body | Moka Pot | Baratza Encore ESP | Ades bottled water Indonesia style | 18g, 180ml, 87.6C, Starting grind: 18 settings. Correction range: 16 settings to 20 settings. If sour/thin: 16 settings. If bitter/dry/stalled: 20 settings., 3:45 | 98.7 | moka_stall_bitterness_risk |
| 51 | Espresso roast blend style -> soft_round | Espresso | DF64 espresso/filter hybrid | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: espresso range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 0:36 | 98.3 | fallback_grinder_calibration_risk |
| 52 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Amidis demineralized water Indonesia style | 20g, 325ml, 94C, Starting grind: 7.4 numbers. Correction range: 6.6 numbers to 8.2 numbers. If sour/thin: 6.6 numbers. If bitter/dry/stalled: 8.2 numbers., 2:15 | 99.6 | demineral_direct_filter_experiment_risk |
| 53 | Kenya AA SL28/SL34 Washed style -> more_acidity | Chemex | Comandante C40 MK4 | Super O2 low-mineral water Indonesia style | 20g, 330ml, 94.5C, Starting grind: 29 clicks. Correction range: 28 clicks to 31 clicks. If sour/thin: 28 clicks. If bitter/dry/stalled: 31 clicks., 4:15 | 98.7 | zero_mineral_remineralize_risk |
| 54 | Colombia Pink Bourbon Washed style -> floral_transparent | Origami | 1Zpresso K-Ultra | Equil mineral water Indonesia style | 15g, 245ml, 92C, Starting grind: 7.7 numbers. Correction range: 6.9 numbers to 8.5 numbers. If sour/thin: 6.9 numbers. If bitter/dry/stalled: 8.5 numbers., 2:15 | 98.3 | high_buffer_target_risk |
| 55 | Indonesia Java Washed Typica style -> balance_clean | Batch Brewer | Baratza Encore | Aqua bottled water Indonesia style | 40g, 650ml, 93.2C, Starting grind: 24 settings. Correction range: 22 settings to 26 settings. If sour/thin: 22 settings. If bitter/dry/stalled: 26 settings., 5:30 | 98.7 | batch_model_validation_risk |

## Recommended Fixes
- No planner recipe-math patch is justified by this run. Prioritize physical brew validation, field feedback capture, grinder calibration logs, and continued copy QA.

## Patch Summary
- Added this deterministic real-world 1,000-scenario gate and artifact/report generator.
- Added honest non-perfect scoring for acceptable real-world risks, including fallback grinders, Indonesian water estimates, target mismatches, and method-specific limitations.
- Added method-language safety reporting so espresso, moka, cold brew, French Press, and batch brew cannot silently inherit pour-over wording.
- Hardened the gate so not-recommended espresso grinders must carry a hard warning and low expected-cup confidence.
- Hardened the gate so zero-mineral/manual RO water cannot be treated as brew-ready.
- No AI Brew recipe math is changed by this report generator.

## Retest Results
- Real-world 1000 gate verdict: AI BREW REAL-WORLD SCENARIO STRONG / REAL BREW VALIDATION REQUIRED.

## Remaining Real-World Limits
- No physical brew logs, refractometer readings, grinder zero-point logs, roast-date measurements, or sensory panel notes are included.
- Roastery-style labels in the matrix are archetypes, not verified current-lot lab data.
- Grinder settings remain starting points that require calibration by burr alignment, zero point, dose, and flow.
- Water label data can be incomplete; manual GH/KH/TDS checks remain the best validation path.

## Final Verdict
AI BREW REAL-WORLD SCENARIO STRONG / REAL BREW VALIDATION REQUIRED
