# AI Brew Real-World 10000 Report

Latest SHA: 04b7e6a95066f84b9e490e20c6917f408aeb3812
Local branch: main
Origin main: 04b7e6a95066f84b9e490e20c6917f408aeb3812
Local status: dirty (local validation changes present)
Date: 2026-05-24T06:33:27.829Z
Scenario count: 10000

## Honesty Boundary
This is a curated real-world software/barista reasoning gate. It did not physically brew coffee and it must not be used as sensory certainty. AI Brew creates strong starting recipes and dial-in guidance; physical real brew validation is still required.

This is a 10,000-case software/barista scenario gate, not 10,000 physical brews or verified current-lot sensory data.

## Bean Coverage
- Panama Hacienda La Esmeralda Geisha Washed style: 275
- Panama Elida Estate Natural Geisha style: 272
- Ethiopia Yirgacheffe Washed Landrace style: 274
- Ethiopia Guji Natural Landrace style: 272
- Kenya AA SL28/SL34 Washed style: 273
- Colombia Pink Bourbon Washed style: 271
- Colombia Thermal Shock Caturra style: 271
- Brazil Natural Yellow Bourbon/Catuai style: 272
- Sumatra Wet-Hulled style: 269
- Costa Rica Honey/Natural style: 271
- Guatemala Washed Bourbon/Caturra style: 271
- Rwanda/Burundi Washed Bourbon style: 270
- Yemen Natural Traditional style: 270
- Colombia Sugarcane Decaf style: 270
- Specialty Robusta/Canephora style: 270
- Espresso roast blend style: 279
- Unknown origin/process/variety: 270
- Indonesia Gayo Washed Ateng/Typica style: 269
- Indonesia Toraja Washed Typica style: 269
- Indonesia Bali Natural/Kintamani style: 269
- India Monsooned Malabar style: 270
- Liberica / Excelsa specialty style: 270
- Indonesia Java Washed Typica style: 269
- Indonesia Papua Wamena Washed Typica style: 269
- Indonesia Bajawa Flores Natural Catimor style: 269
- Indonesia Java Preanger Washed S795 style: 269
- Mexico Chiapas Washed Bourbon style: 269
- Peru Cajamarca Washed Typica style: 269
- Bolivia Caranavi Washed Caturra style: 269
- Uganda Natural SL14/SL28 style: 269
- Nicaragua Maracaturra Washed style: 269
- Honduras Parainema Honey style: 269
- Thailand Doi Chang Washed Catimor style: 269
- Laos Bolaven Washed Catimor style: 269
- Colombia Caturra/Castillo Washed style: 269
- Indonesia Flores Wet-Hulled style: 268
- Indonesia Kerinci Honey Sigararutang style: 268

## Method Coverage
- v60: 2892
- hario_switch: 668
- chemex: 225
- kalita_wave: 222
- french_press: 225
- clever_dripper: 665
- aeropress: 224
- origami: 444
- espresso: 229
- cold_brew: 223
- moka_pot: 223
- batch_brew: 223
- siphon: 222
- april: 2431
- melitta: 663
- kono: 221

## Grinder Coverage
- 1Zpresso K-Ultra: 781
- Comandante C40 MK4: 775
- Kingrinder K6: 769
- Baratza Encore: 773
- Latina Sumba / Sumbawa: 769
- Timemore C3: 767
- Timemore C2: 767
- Baratza Encore ESP: 770
- Fellow Ode Gen 2: 766
- Unknown electric grinder: 766
- Unknown manual grinder: 766
- DF64 espresso/filter hybrid: 766
- Espresso grinder zero-point unknown: 765

## Water Coverage
- Low buffer clarity water: 554
- Third Wave Water / remineralized balanced: 555
- Volvic style bottled water: 558
- Unknown estimated bottled water: 563
- Hard water: 561
- Espresso-safe water: 567
- High buffer alkaline water: 547
- zero-mineral RO / distilled water: 557
- Galon isi ulang / depot water Indonesia style: 547
- Pristine 8.6+ alkaline water Indonesia style: 547
- Aqua bottled water Indonesia style: 561
- Le Minerale bottled water Indonesia style: 560
- Club bottled water Indonesia style: 560
- Ades bottled water Indonesia style: 560
- Amidis demineralized water Indonesia style: 547
- Super O2 low-mineral water Indonesia style: 547
- Equil mineral water Indonesia style: 560
- Cleo low-mineral water Indonesia style: 549

## Target Coverage
- floral_transparent: 1256
- fruit_forward: 1250
- more_body: 1248
- more_acidity: 1249
- more_sweetness: 1247
- dense_comforting: 1250
- balance_clean: 1249
- soft_round: 1251

## Score Summary
Passed: 10000/10000
Failures: 0
Warnings: 11187
Average score: 98.5
Score distribution: min 91.6; p10 97.1; p50 98.3; p90 100; max 100
Unique coffee input combinations: 10000
Coverage density: 37 bean archetypes, 16 methods, 13 grinders, 18 waters, 8 targets, 5 roast levels.


| Category | Average | Minimum |
|---|---:|---:|
| recipeSafety | 96 | 84 |
| methodFit | 99.4 | 92 |
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
| workflowLanguageSafety | 99.4 | 92 |
| pourFlowLogic | 99.4 | 92 |
| bloomLogic | 99.8 | 92 |
| expectedCupHonesty | 98.9 | 84 |
| warningQuality | 97.3 | 84 |
| mobileCopyQuality | 100 | 100 |
| overclaimRisk | 94.5 | 76 |

## Lowest Scoring Cases
- generated-7920: Panama Elida Estate Natural Geisha style / Espresso / Unknown manual grinder / Super O2 low-mineral water Indonesia style; score 91.6; fallback_grinder_calibration_risk: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; espresso_not_recommended_grinder_risk: Unknown manual grinder is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; zero_mineral_remineralize_risk: Super O2 low-mineral water Indonesia style is not brew-ready without minerals.; experimental_process_feedback_risk: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; geisha_body_target_risk: Body/dense target can reduce Geisha floral clarity; use Floral & Transparent or Fruit-Forward for a more classic Geisha cup.
- generated-3105: India Monsooned Malabar style / Espresso / Latina Sumba / Sumbawa / zero-mineral RO / distilled water; score 92; fallback_grinder_calibration_risk: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N needs calibration; settings are starting points, not exact burr-zero truth.; espresso_not_recommended_grinder_risk: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; zero_mineral_remineralize_risk: zero-mineral RO / distilled water is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.
- generated-6615: Laos Bolaven Washed Catimor style / Espresso / Latina Sumba / Sumbawa / zero-mineral RO / distilled water; score 92; fallback_grinder_calibration_risk: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N needs calibration; settings are starting points, not exact burr-zero truth.; espresso_not_recommended_grinder_risk: Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; zero_mineral_remineralize_risk: zero-mineral RO / distilled water is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.
- generated-5773: Panama Hacienda La Esmeralda Geisha Washed style / French Press / Unknown manual grinder / Equil mineral water Indonesia style; score 92.4; fallback_grinder_calibration_risk: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Equil mineral water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.
- generated-1383: Indonesia Toraja Washed Typica style / Batch Brewer / DF64 espresso/filter hybrid / Pristine 8.6+ alkaline water Indonesia style; score 92.8; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; batch_model_validation_risk: Batch brewer flow, basket depth, and spray pattern need model-specific validation.
- generated-2553: Espresso roast blend style / Batch Brewer / DF64 espresso/filter hybrid / Pristine 8.6+ alkaline water Indonesia style; score 92.8; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; batch_model_validation_risk: Batch brewer flow, basket depth, and spray pattern need model-specific validation.
- generated-7233: Indonesia Kerinci Honey Sigararutang style / Batch Brewer / DF64 espresso/filter hybrid / Pristine 8.6+ alkaline water Indonesia style; score 92.8; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; batch_model_validation_risk: Batch brewer flow, basket depth, and spray pattern need model-specific validation.
- generated-8509: Unknown origin/process/variety / Melitta / Unknown electric grinder / Unknown estimated bottled water; score 92.8; fallback_grinder_calibration_risk: Unknown electric grinder needs calibration; settings are starting points, not exact burr-zero truth.; water_manual_verification_risk: Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.; unknown_bean_conservative_risk: Bean data is incomplete, so this recipe should stay conservative and avoid specific flavor certainty.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.
- generated-8512: Panama Elida Estate Natural Geisha style / Moka Pot / Espresso grinder zero-point unknown / Unknown estimated bottled water; score 92.8; fallback_grinder_calibration_risk: Espresso grinder zero-point unknown needs calibration; settings are starting points, not exact burr-zero truth.; water_manual_verification_risk: Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.; experimental_process_feedback_risk: Panama Elida Estate Natural Geisha style can become winey/heavy if extraction is pushed too far; real taste feedback matters.; geisha_body_target_risk: Body/dense target can reduce Geisha floral clarity; use Floral & Transparent or Fruit-Forward for a more classic Geisha cup.; moka_stall_bitterness_risk: Moka grind must avoid espresso-powder fineness; stop before sputter to control bitterness.
- generated-9360: Unknown origin/process/variety / Espresso / Espresso grinder zero-point unknown / Galon isi ulang / depot water Indonesia style; score 92.8; fallback_grinder_calibration_risk: Espresso grinder zero-point unknown needs calibration; settings are starting points, not exact burr-zero truth.; espresso_not_recommended_grinder_risk: Espresso grinder zero-point unknown is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; water_manual_verification_risk: Galon isi ulang / depot water Indonesia style needs manual TDS/GH/KH verification before high confidence.; unknown_bean_conservative_risk: Bean data is incomplete, so this recipe should stay conservative and avoid specific flavor certainty.
- generated-2077: Kenya AA SL28/SL34 Washed style / Moka Pot / Espresso grinder zero-point unknown / Super O2 low-mineral water Indonesia style; score 93.3; fallback_grinder_calibration_risk: Espresso grinder zero-point unknown needs calibration; settings are starting points, not exact burr-zero truth.; zero_mineral_remineralize_risk: Super O2 low-mineral water Indonesia style is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; moka_stall_bitterness_risk: Moka grind must avoid espresso-powder fineness; stop before sputter to control bitterness.
- generated-2385: Indonesia Flores Wet-Hulled style / Espresso / Baratza Encore / High buffer alkaline water; score 93.3; espresso_not_recommended_grinder_risk: Baratza Encore is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.; high_buffer_target_risk: High buffer alkaline water can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.

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
- fallback_grinder_calibration_risk: 3832 cases; examples 10-indonesia-wet-hulled-clever-body, 20-unknown-grinder-espresso-low-confidence, 21-unknown-bean-v60-baseline, 33-mugen-x-switch-profile, 41-feima-600n-espresso-hard-warning
- experimental_process_feedback_risk: 1892 cases; examples 02-panama-natural-geisha-v60-iced-fruit, 03-panama-natural-geisha-more-body-mismatch, 05-ethiopia-natural-switch-fruit, 08-colombia-anaerobic-v60-fruit, 14-yemen-natural-v60-dense
- water_manual_verification_risk: 1110 cases; examples 10-indonesia-wet-hulled-clever-body, 14-yemen-natural-v60-dense, 21-unknown-bean-v60-baseline, 33-mugen-x-switch-profile, 42-galon-depot-v60-manual-water
- zero_mineral_remineralize_risk: 1104 cases; examples 24-zero-mineral-water-block, 53-super-o2-chemex-low-mineral-warning, generated-0056, generated-0057, generated-0058
- high_buffer_target_risk: 622 cases; examples 23-high-buffer-water-floral-warning, 43-pristine-alkaline-geisha-floral-warning, 54-equil-floral-muted-warning, generated-0157, generated-0158
- low_mineral_filter_clarity_risk: 549 cases; examples generated-0170, generated-0171, generated-0172, generated-0173, generated-0174
- demineral_direct_filter_experiment_risk: 547 cases; examples 52-amidis-v60-remineralize-required, generated-0183, generated-0184, generated-0185, generated-0186
- dark_floral_target_risk: 375 cases; examples 44-dark-roast-floral-target-mismatch, generated-0080, generated-0151, generated-0153, generated-0223
- unknown_bean_conservative_risk: 270 cases; examples 21-unknown-bean-v60-baseline, generated-0073, generated-0110, generated-0147, generated-0184
- batch_model_validation_risk: 223 cases; examples 29-batch-brewer-medium-roast-blend, 55-batch-brewer-java-balanced, generated-0078, generated-0123, generated-0168
- moka_stall_bitterness_risk: 223 cases; examples 28-moka-dark-roast, 50-liberica-excelsa-moka-body, generated-0097, generated-0142, generated-0187
- espresso_not_recommended_grinder_risk: 191 cases; examples 18-timemore-c2-espresso-blocked, 19-fellow-ode-espresso-blocked, 20-unknown-grinder-espresso-low-confidence, 41-feima-600n-espresso-hard-warning, generated-0090

## Top Method-Risk Categories
- espresso: avg 96.5; min 91.6; warnings 438; failures 0
- moka_pot: avg 97.3; min 92.8; warnings 462; failures 0
- batch_brew: avg 97.4; min 92.8; warnings 451; failures 0
- french_press: avg 98.3; min 92.4; warnings 279; failures 0
- cold_brew: avg 98.4; min 93.7; warnings 282; failures 0
- chemex: avg 98.6; min 94.5; warnings 236; failures 0
- clever_dripper: avg 98.6; min 94.1; warnings 707; failures 0
- aeropress: avg 98.6; min 94.1; warnings 248; failures 0
- origami: avg 98.6; min 94.1; warnings 475; failures 0
- v60: avg 98.7; min 93.7; warnings 3068; failures 0
- hario_switch: avg 98.7; min 93.7; warnings 696; failures 0
- kalita_wave: avg 98.7; min 94.1; warnings 224; failures 0

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
- generated-0090: Indonesia Bali Natural/Kintamani style with Espresso scored 95.8; review warnings/copy before physical validation.
- generated-0112: Panama Hacienda La Esmeralda Geisha Washed style with Hario Switch 02 hot scored 95.8; review warnings/copy before physical validation.
- generated-0113: Panama Elida Estate Natural Geisha style with V60 hot scored 95.4; review warnings/copy before physical validation.
- generated-0180: Colombia Sugarcane Decaf style with Espresso scored 95.4; review warnings/copy before physical validation.
- generated-0186: Panama Hacienda La Esmeralda Geisha Washed style with Clever Dripper scored 95.4; review warnings/copy before physical validation.
- generated-0224: Panama Elida Estate Natural Geisha style with Clever Dripper scored 95.8; review warnings/copy before physical validation.
- generated-0225: Ethiopia Yirgacheffe Washed Landrace style with Espresso scored 93.7; review warnings/copy before physical validation.
- generated-0230: Colombia Thermal Shock Caturra style with April / Orea / B75 style flat-bottom scored 95.8; review warnings/copy before physical validation.
- generated-0258: Unknown origin/process/variety with Batch Brewer scored 95.4; review warnings/copy before physical validation.

## What Outputs Were Wrong
- No blocking wrong output was found in this software gate.

## Required Example Cases
| # | Scenario | Method | Grinder | Water | Output | Score | Finding |
|---:|---|---|---|---|---|---:|---|
| 1 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Low buffer clarity water | 12g, 195ml, 92.5C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:35 | 100 | Pass; software recipe safe, real brew validation still required |
| 2 | Panama Elida Estate Natural Geisha style -> fruit_forward | V60 iced | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 15g, 210ml, 92C, Starting grind: 23 clicks. Correction range: 21 clicks to 24 clicks. If sour/thin: 21 clicks. If bitter/dry/stalled: 24 clicks., 2:45 | 99.6 | experimental_process_feedback_risk |
| 3 | Panama Elida Estate Natural Geisha style -> more_body | V60 hot | 1Zpresso K-Ultra | Volvic style bottled water | 18g, 280ml, 91.8C, Starting grind: 8.3 numbers. Correction range: 8.1 numbers to 8.5 numbers. If sour/thin: 8.1 numbers. If bitter/dry/stalled: 8.5 numbers., 3:25 | 97.1 | experimental_process_feedback_risk; geisha_body_target_risk |
| 4 | Ethiopia Yirgacheffe Washed Landrace style -> more_acidity | V60 hot | 1Zpresso K-Ultra | Low buffer clarity water | 20g, 325ml, 94C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:10 | 100 | Pass; software recipe safe, real brew validation still required |
| 5 | Ethiopia Guji Natural Landrace style -> fruit_forward | Hario Switch 02 hot | Kingrinder K6 | Third Wave Water / remineralized balanced | 12g, 190ml, 90.5C, Starting grind: 107 clicks. Correction range: 103 clicks to 111 clicks. If sour/thin: 103 clicks. If bitter/dry/stalled: 111 clicks., 2:55 | 99.6 | experimental_process_feedback_risk |
| 6 | Kenya AA SL28/SL34 Washed style -> more_acidity | Chemex | Comandante C40 MK4 | Low buffer clarity water | 20g, 330ml, 94C, Starting grind: 30 clicks. Correction range: 28 clicks to 32 clicks. If sour/thin: 28 clicks. If bitter/dry/stalled: 32 clicks., 4:15 | 100 | Pass; software recipe safe, real brew validation still required |
| 7 | Colombia Pink Bourbon Washed style -> more_sweetness | Kalita / flat-bottom | 1Zpresso K-Ultra | Volvic style bottled water | 18g, 280ml, 93.6C, Starting grind: 8.8 numbers. Correction range: 8.6 numbers to 9.0 numbers. If sour/thin: 8.6 numbers. If bitter/dry/stalled: 9.0 numbers., 4:35 | 100 | Pass; software recipe safe, real brew validation still required |
| 8 | Colombia Thermal Shock Caturra style -> fruit_forward | V60 hot | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 20g, 320ml, 90.9C, Starting grind: 26 clicks. Correction range: 24 clicks to 27 clicks. If sour/thin: 24 clicks. If bitter/dry/stalled: 27 clicks., 2:50 | 99.6 | experimental_process_feedback_risk |
| 9 | Brazil Natural Yellow Bourbon/Catuai style -> dense_comforting | French Press | Baratza Encore | Volvic style bottled water | 30g, 440ml, 92.7C, Starting grind: 37 settings. Correction range: 35 settings to 39 settings. If sour/thin: 35 settings. If bitter/dry/stalled: 39 settings., 5:50 | 100 | Pass; software recipe safe, real brew validation still required |
| 10 | Sumatra Wet-Hulled style -> more_body | Clever Dripper | Latina Sumba / Sumbawa | Unknown estimated bottled water | 15g, 230ml, 91.4C, Starting grind: setting 9. Correction range: setting 8 to setting 11. If sour/thin: setting 8. If bitter/dry/stalled: setting 11., 4:40 | 97.1 | fallback_grinder_calibration_risk; water_manual_verification_risk |
| 11 | Costa Rica Honey/Natural style -> more_sweetness | AeroPress | Kingrinder K6 | Third Wave Water / remineralized balanced | 18g, 235ml, 90C, Starting grind: 74 clicks. Correction range: 63 clicks to 85 clicks. If sour/thin: 63 clicks. If bitter/dry/stalled: 85 clicks., 2:50 | 100 | Pass; software recipe safe, real brew validation still required |
| 12 | Guatemala Washed Bourbon/Caturra style -> balance_clean | V60 hot | Timemore C3 | Volvic style bottled water | 20g, 320ml, 90.3C, Starting grind: 16 clicks. Correction range: 15 clicks to 18 clicks. If sour/thin: 15 clicks. If bitter/dry/stalled: 18 clicks., 2:45 | 100 | Pass; software recipe safe, real brew validation still required |
| 13 | Rwanda/Burundi Washed Bourbon style -> more_acidity | Origami | 1Zpresso K-Ultra | Low buffer clarity water | 12g, 195ml, 93C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:10 | 100 | Pass; software recipe safe, real brew validation still required |
| 14 | Yemen Natural Traditional style -> dense_comforting | V60 hot | Comandante C40 MK4 | Unknown estimated bottled water | 15g, 235ml, 90.7C, Starting grind: 25 clicks. Correction range: 24 clicks to 27 clicks. If sour/thin: 24 clicks. If bitter/dry/stalled: 27 clicks., 3:15 | 98.3 | water_manual_verification_risk; experimental_process_feedback_risk |
| 15 | Colombia Sugarcane Decaf style -> soft_round | V60 hot | Timemore C2 | Volvic style bottled water | 18g, 290ml, 90.9C, Starting grind: 18 clicks. Correction range: 17 clicks to 20 clicks. If sour/thin: 17 clicks. If bitter/dry/stalled: 20 clicks., 2:55 | 100 | Pass; software recipe safe, real brew validation still required |
| 16 | Specialty Robusta/Canephora style -> more_body | French Press | Baratza Encore | Hard water | 18g, 265ml, 91.4C, Starting grind: 38 settings. Correction range: 36 settings to 40 settings. If sour/thin: 36 settings. If bitter/dry/stalled: 40 settings., 6:00 | 100 | Pass; software recipe safe, real brew validation still required |
| 17 | Espresso roast blend style -> soft_round | Espresso | Baratza Encore ESP | Espresso-safe water | 18g, 40ml, 91.9C, Starting grind: 7 settings. Correction range: 4 settings to 9 settings. If sour/thin: 4 settings. If bitter/dry/stalled: 9 settings., 0:36 | 100 | Pass; software recipe safe, real brew validation still required |
| 18 | Espresso roast blend style -> soft_round | Espresso | Timemore C2 | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: 6 clicks. Correction range: 4 clicks to 8 clicks. If sour/thin: 4 clicks. If bitter/dry/stalled: 8 clicks., 0:36 | 97.5 | espresso_not_recommended_grinder_risk |
| 19 | Espresso roast blend style -> soft_round | Espresso | Fellow Ode Gen 2 | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: 3 numbers. Correction range: 1 numbers to 4 numbers. If sour/thin: 1 numbers. If bitter/dry/stalled: 4 numbers., 0:36 | 97.5 | espresso_not_recommended_grinder_risk |
| 20 | Espresso roast blend style -> soft_round | Espresso | Unknown electric grinder | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: manual calibration. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 0:36 | 95.8 | fallback_grinder_calibration_risk; espresso_not_recommended_grinder_risk |
| 21 | Unknown origin/process/variety -> balance_clean | V60 hot | Unknown manual grinder | Unknown estimated bottled water | 12g, 190ml, 90.9C, Starting grind: manual calibration. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 2:55 | 95.4 | fallback_grinder_calibration_risk; water_manual_verification_risk; unknown_bean_conservative_risk |
| 22 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Volvic style bottled water | 15g, 240ml, 92.1C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:35 | 100 | Pass; software recipe safe, real brew validation still required |
| 23 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | High buffer alkaline water | 18g, 295ml, 92C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:30 | 98.3 | high_buffer_target_risk |
| 24 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | zero-mineral RO / distilled water | 20g, 325ml, 94C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:15 | 98.7 | zero_mineral_remineralize_risk |
| 25 | Kenya AA SL28/SL34 Washed style -> more_acidity | V60 hot | Comandante C40 MK4 | Low buffer clarity water | 12g, 195ml, 94C, Starting grind: 25 clicks. Correction range: 24 clicks to 27 clicks. If sour/thin: 24 clicks. If bitter/dry/stalled: 27 clicks., 2:20 | 100 | Pass; software recipe safe, real brew validation still required |
| 26 | Brazil Natural Yellow Bourbon/Catuai style -> dense_comforting | Cold Brew | Baratza Encore | Volvic style bottled water | 40g, 600ml, 14.3C, Starting grind: 37 settings. Correction range: 35 settings to 39 settings. If sour/thin: 35 settings. If bitter/dry/stalled: 39 settings., 755:00 | 100 | Pass; software recipe safe, real brew validation still required |
| 27 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | Cold Brew | Baratza Encore | Low buffer clarity water | 40g, 600ml, 15.3C, Starting grind: 35 settings. Correction range: 33 settings to 37 settings. If sour/thin: 33 settings. If bitter/dry/stalled: 37 settings., 685:00 | 98.7 | cold_brew_floral_expectation_risk |
| 28 | Espresso roast blend style -> soft_round | Moka Pot | Baratza Encore ESP | Volvic style bottled water | 18g, 180ml, 89.4C, Starting grind: 7 settings. Correction range: 4 settings to 9 settings. If sour/thin: 4 settings. If bitter/dry/stalled: 9 settings., 3:15 | 98.7 | moka_stall_bitterness_risk |
| 29 | Guatemala Washed Bourbon/Caturra style -> balance_clean | Batch Brewer | Baratza Encore | Third Wave Water / remineralized balanced | 40g, 650ml, 93.6C, Starting grind: 19 settings. Correction range: 17 settings to 22 settings. If sour/thin: 17 settings. If bitter/dry/stalled: 22 settings., 5:45 | 98.7 | batch_model_validation_risk |
| 30 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | Siphon | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 15g, 225ml, 91.9C, Starting grind: 27 clicks. Correction range: 24 clicks to 31 clicks. If sour/thin: 24 clicks. If bitter/dry/stalled: 31 clicks., 3:50 | 100 | Pass; software recipe safe, real brew validation still required |
| 31 | Ethiopia Guji Natural Landrace style -> more_sweetness | Hario Switch 02 hot | 1Zpresso K-Ultra | Volvic style bottled water | 20g, 320ml, 91.1C, Starting grind: 9.1 numbers. Correction range: 8.9 numbers to 9.3 numbers. If sour/thin: 8.9 numbers. If bitter/dry/stalled: 9.3 numbers., 3:00 | 99.6 | experimental_process_feedback_risk |
| 32 | Ethiopia Guji Natural Landrace style -> more_sweetness | Hario Switch 03 hot | 1Zpresso K-Ultra | Volvic style bottled water | 25g, 400ml, 90.9C, Starting grind: 9.1 numbers. Correction range: 8.9 numbers to 9.3 numbers. If sour/thin: 8.9 numbers. If bitter/dry/stalled: 9.3 numbers., 3:00 | 99.6 | experimental_process_feedback_risk |
| 33 | Guatemala Washed Bourbon/Caturra style -> balance_clean | MUGEN x Switch | Latina Sumba / Sumbawa | Unknown estimated bottled water | 12g, 185ml, 90C, Starting grind: setting 9. Correction range: setting 8 to setting 11. If sour/thin: setting 8. If bitter/dry/stalled: setting 11., 2:55 | 97.1 | fallback_grinder_calibration_risk; water_manual_verification_risk |
| 34 | Kenya AA SL28/SL34 Washed style -> balance_clean | Chemex | Comandante C40 MK4 | Volvic style bottled water | 30g, 500ml, 94C, Starting grind: 31 clicks. Correction range: 29 clicks to 33 clicks. If sour/thin: 29 clicks. If bitter/dry/stalled: 33 clicks., 4:30 | 100 | Pass; software recipe safe, real brew validation still required |
| 35 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Low buffer clarity water | 12g, 200ml, 94C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:25 | 100 | Pass; software recipe safe, real brew validation still required |
| 36 | Costa Rica Honey/Natural style -> more_sweetness | AeroPress | Kingrinder K6 | Third Wave Water / remineralized balanced | 20g, 250ml, 90C, Starting grind: 74 clicks. Correction range: 63 clicks to 85 clicks. If sour/thin: 63 clicks. If bitter/dry/stalled: 85 clicks., 2:05 | 100 | Pass; software recipe safe, real brew validation still required |
| 37 | Brazil Natural Yellow Bourbon/Catuai style -> dense_comforting | French Press | Baratza Encore | Hard water | 30g, 445ml, 90.8C, Starting grind: 38 settings. Correction range: 36 settings to 40 settings. If sour/thin: 36 settings. If bitter/dry/stalled: 40 settings., 5:45 | 100 | Pass; software recipe safe, real brew validation still required |
| 38 | Espresso roast blend style -> soft_round | Espresso | Baratza Encore ESP | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: 6 settings. Correction range: 3 settings to 8 settings. If sour/thin: 3 settings. If bitter/dry/stalled: 8 settings., 0:36 | 100 | Pass; software recipe safe, real brew validation still required |
| 39 | Espresso roast blend style -> dense_comforting | Espresso | Baratza Encore ESP | Espresso-safe water | 18g, 40ml, 91.8C, Starting grind: 7 settings. Correction range: 4 settings to 9 settings. If sour/thin: 4 settings. If bitter/dry/stalled: 9 settings., 0:45 | 100 | Pass; software recipe safe, real brew validation still required |
| 40 | Panama Elida Estate Natural Geisha style -> fruit_forward | V60 iced | 1Zpresso K-Ultra | Third Wave Water / remineralized balanced | 15g, 235ml, 92C, Starting grind: 8.1 numbers. Correction range: 7.9 numbers to 8.3 numbers. If sour/thin: 7.9 numbers. If bitter/dry/stalled: 8.3 numbers., 2:45 | 99.6 | experimental_process_feedback_risk |
| 41 | Espresso roast blend style -> soft_round | Espresso | Latina Sumba / Sumbawa | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: setting 4. Correction range: setting 2 to setting 5. If sour/thin: setting 2. If bitter/dry/stalled: setting 5., 0:36 | 95.8 | fallback_grinder_calibration_risk; espresso_not_recommended_grinder_risk |
| 42 | Indonesia Gayo Washed Ateng/Typica style -> balance_clean | V60 hot | Timemore C3 | Galon isi ulang / depot water Indonesia style | 15g, 240ml, 90.8C, Starting grind: 16 clicks. Correction range: 15 clicks to 18 clicks. If sour/thin: 15 clicks. If bitter/dry/stalled: 18 clicks., 2:50 | 98.7 | water_manual_verification_risk |
| 43 | Panama Hacienda La Esmeralda Geisha Washed style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Pristine 8.6+ alkaline water Indonesia style | 18g, 290ml, 92.8C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:25 | 98.3 | high_buffer_target_risk |
| 44 | Espresso roast blend style -> floral_transparent | V60 hot | Comandante C40 MK4 | Volvic style bottled water | 20g, 330ml, 87.6C, Starting grind: 27 clicks. Correction range: 25 clicks to 28 clicks. If sour/thin: 25 clicks. If bitter/dry/stalled: 28 clicks., 2:00 | 97.5 | dark_floral_target_risk |
| 45 | Panama Hacienda La Esmeralda Geisha Washed style -> dense_comforting | Chemex | Comandante C40 MK4 | Low buffer clarity water | 20g, 330ml, 93C, Starting grind: 28 clicks. Correction range: 26 clicks to 30 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 30 clicks., 5:15 | 97.5 | geisha_body_target_risk |
| 46 | Colombia Thermal Shock Caturra style -> dense_comforting | Hario Switch 03 hot | 1Zpresso K-Ultra | Third Wave Water / remineralized balanced | 22g, 350ml, 89.6C, Starting grind: 9.2 numbers. Correction range: 9.0 numbers to 9.4 numbers. If sour/thin: 9.0 numbers. If bitter/dry/stalled: 9.4 numbers., 3:15 | 99.6 | experimental_process_feedback_risk |
| 47 | Indonesia Toraja Washed Typica style -> more_body | Clever Dripper | Latina Sumba / Sumbawa | Aqua bottled water Indonesia style | 18g, 275ml, 91.1C, Starting grind: setting 9. Correction range: setting 7 to setting 10. If sour/thin: setting 7. If bitter/dry/stalled: setting 10., 4:35 | 98.3 | fallback_grinder_calibration_risk |
| 48 | Indonesia Bali Natural/Kintamani style -> fruit_forward | AeroPress | Kingrinder K6 | Le Minerale bottled water Indonesia style | 20g, 285ml, 88C, Starting grind: 97 clicks. Correction range: 86 clicks to 108 clicks. If sour/thin: 86 clicks. If bitter/dry/stalled: 108 clicks., 1:15 | 99.6 | experimental_process_feedback_risk |
| 49 | India Monsooned Malabar style -> dense_comforting | French Press | Baratza Encore | Club bottled water Indonesia style | 30g, 440ml, 92C, Starting grind: 38 settings. Correction range: 36 settings to 40 settings. If sour/thin: 36 settings. If bitter/dry/stalled: 40 settings., 5:50 | 100 | Pass; software recipe safe, real brew validation still required |
| 50 | Liberica / Excelsa specialty style -> more_body | Moka Pot | Baratza Encore ESP | Ades bottled water Indonesia style | 18g, 180ml, 90.2C, Starting grind: 6 settings. Correction range: 3 settings to 8 settings. If sour/thin: 3 settings. If bitter/dry/stalled: 8 settings., 3:45 | 98.7 | moka_stall_bitterness_risk |
| 51 | Espresso roast blend style -> soft_round | Espresso | DF64 espresso/filter hybrid | Espresso-safe water | 18g, 40ml, 92.6C, Starting grind: espresso range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 0:36 | 98.3 | fallback_grinder_calibration_risk |
| 52 | Ethiopia Yirgacheffe Washed Landrace style -> floral_transparent | V60 hot | 1Zpresso K-Ultra | Amidis demineralized water Indonesia style | 20g, 325ml, 94C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:15 | 99.6 | demineral_direct_filter_experiment_risk |
| 53 | Kenya AA SL28/SL34 Washed style -> more_acidity | Chemex | Comandante C40 MK4 | Super O2 low-mineral water Indonesia style | 20g, 330ml, 94C, Starting grind: 30 clicks. Correction range: 28 clicks to 32 clicks. If sour/thin: 28 clicks. If bitter/dry/stalled: 32 clicks., 4:15 | 98.7 | zero_mineral_remineralize_risk |
| 54 | Colombia Pink Bourbon Washed style -> floral_transparent | Origami | 1Zpresso K-Ultra | Equil mineral water Indonesia style | 15g, 245ml, 92C, Starting grind: 8.6 numbers. Correction range: 8.4 numbers to 8.8 numbers. If sour/thin: 8.4 numbers. If bitter/dry/stalled: 8.8 numbers., 2:15 | 98.3 | high_buffer_target_risk |
| 55 | Indonesia Java Washed Typica style -> balance_clean | Batch Brewer | Baratza Encore | Aqua bottled water Indonesia style | 40g, 650ml, 93.4C, Starting grind: 19 settings. Correction range: 17 settings to 22 settings. If sour/thin: 17 settings. If bitter/dry/stalled: 22 settings., 5:30 | 98.7 | batch_model_validation_risk |

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
