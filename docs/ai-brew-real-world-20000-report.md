# AI Brew Real-World 20000 Report

Latest SHA: e0699fc1eb76868545135436e7c616c65595b552
Local branch: main
Origin main: e0699fc1eb76868545135436e7c616c65595b552
Local status: dirty (local validation changes present)
Date: 2026-05-26T06:50:40.281Z
Scenario count: 20000

## Honesty Boundary
This is a curated real-world software/barista reasoning gate. It did not physically brew coffee and it must not be used as sensory certainty. AI Brew creates strong starting recipes and dial-in guidance; physical real brew validation is still required.
This is a source-backed software scenario gate built from real roastery/community coffee seeds and deterministic combinations. It is not 20,000 unique physical coffee lots and not 20,000 physical brews.
This is a 20,000-case software/barista scenario gate, not 20,000 physical brews or verified current-lot sensory data.

## Bean Coverage
- Morph Coffee Aceh Gayo Queen Ketiara: 715
- Otten Coffee Arabica Aceh Gayo Honey Process: 715
- Otten Coffee Gayo Linung Jaya Black Honey: 715
- Otten Coffee Aceh Gayo Anaerob Bener Meriah: 715
- Otten Coffee Aceh Gayo Natural Process: 715
- Common Grounds Wanoja Extended Natural: 715
- Common Grounds Toraja Sulotco: 715
- Common Grounds Jack Of All Trades: 715
- Beanetics Coffee Roasters Ethiopian Yirgacheffe: 714
- Coalition Coffee Roasters Ethiopia Yirgacheffe: 714
- Five Petal Coffee Janson Lot 980 Green Tip Geisha Washed: 714
- Pulpa Specialty Coffee Geisha Washed Finca Hartmann: 714
- Tobo Coffee Roaster Ndiaini SL28 SL34 Washed Kenya: 714
- Uncommon Coffee Kii AA Kenya SL28 SL34 Washed: 714
- LiLo Coffee Roasters Colombia La Parcelita Pink Bourbon Washed: 714
- Basic Barista Pink Bourbon Washed Colombia: 714
- SUMO Coffee Roasters Isano Rwanda Red Bourbon Washed: 714
- Barista och Espresso Masha Burundi Washed Red Bourbon: 714
- Pangea Coffee Co. Unity Costa Rica Catuai Honey Process: 714
- Subtext Coffee Roasters Guatemala Todos Santos Washed Caturra & Bourbon: 714
- Staccato Roasters Brazil Yellow Bourbon Natural: 714
- Indian Coffee Beans Monsooned Malabar reference: 714
- Rabbit Hole Roasters Wadi Mahyad Yemeni Natural Community Lot: 714
- Sandalj Vietnam Washed Kontum 18: 714
- TheBeanGeek Thailand Doi Chang Washed: 714
- Surfbean Coffee Roaster Laos Bolaven Washed: 714
- Frontside Coffee Roasters Decaf Colombia Huila Sugar Cane: 714
- Good Cup Coffee Liberica Barako reference: 714

## Method Coverage
- v60: 2356
- hario_switch: 5884
- chemex: 1176
- origami: 1176
- kono: 1176
- melitta: 1176
- kalita_wave: 1176
- april: 1176
- clever_dripper: 1176
- aeropress: 1176
- french_press: 1176
- cold_brew: 1176

## Grinder Coverage
- 1Zpresso K-Ultra: 1820
- Comandante C40 MK4: 1820
- DF64 espresso/filter hybrid: 1820
- Kingrinder K6: 1820
- Timemore C2: 1820
- Timemore C3: 1820
- Fellow Ode Gen 2: 1820
- Baratza Encore: 1820
- Latina Sumba / Sumbawa: 1814
- Unknown manual grinder: 1813
- Unknown electric grinder: 1813

## Water Coverage
- Volvic style bottled water: 1113
- Third Wave Water / remineralized balanced: 1111
- Low buffer clarity water: 1111
- High buffer alkaline water: 1111
- zero-mineral RO / distilled water: 1111
- Hard water: 1111
- Unknown estimated bottled water: 1111
- Espresso-safe water: 1111
- Aqua bottled water Indonesia style: 1111
- Le Minerale bottled water Indonesia style: 1111
- Ades bottled water Indonesia style: 1111
- Club bottled water Indonesia style: 1111
- Equil mineral water Indonesia style: 1111
- Cleo low-mineral water Indonesia style: 1111
- Amidis demineralized water Indonesia style: 1111
- Super O2 low-mineral water Indonesia style: 1111
- Pristine 8.6+ alkaline water Indonesia style: 1111
- Galon isi ulang / depot water Indonesia style: 1111

## Target Coverage
- balance_clean: 2509
- more_sweetness: 2509
- more_acidity: 2502
- fruit_forward: 2496
- floral_transparent: 2496
- more_body: 2496
- soft_round: 2496
- dense_comforting: 2496

## Score Summary
Passed: 20000/20000
Failures: 0
Warnings: 37121
Average score: 98.7
Score distribution: min 92.4; p10 97.1; p50 98.7; p90 100; max 100
Unique coffee input combinations: 20000
Coverage density: 28 bean archetypes, 12 methods, 11 grinders, 18 waters, 8 targets, 5 roast levels.
Source-backed seed lots: 28

| Category | Average | Minimum |
|---|---:|---:|
| recipeSafety | 96.2 | 84 |
| methodFit | 99.8 | 92 |
| targetFit | 99 | 84 |
| beanFit | 99.5 | 92 |
| roastFit | 99.6 | 92 |
| processFit | 100 | 100 |
| varietyFit | 99.9 | 92 |
| waterHonesty | 97.7 | 92 |
| grinderHonesty | 97.1 | 92 |
| temperatureLogic | 100 | 100 |
| grindLogic | 97.1 | 92 |
| extractionTimeLogic | 100 | 100 |
| workflowLanguageSafety | 99.8 | 92 |
| pourFlowLogic | 99.9 | 92 |
| bloomLogic | 99.8 | 92 |
| expectedCupHonesty | 99 | 84 |
| warningQuality | 97.2 | 84 |
| mobileCopyQuality | 100 | 100 |
| overclaimRisk | 94.8 | 76 |

## Lowest Scoring Cases
- source-backed-07307: Frontside Coffee Roasters Decaf Colombia Huila Sugar Cane / French Press / Unknown manual grinder / Pristine 8.6+ alkaline water Indonesia style; score 92.4; fallback_grinder_calibration_risk: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-07308: Good Cup Coffee Liberica Barako reference / French Press / Unknown manual grinder / Pristine 8.6+ alkaline water Indonesia style; score 92.4; fallback_grinder_calibration_risk: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-10537: Beanetics Coffee Roasters Ethiopian Yirgacheffe / French Press / Unknown manual grinder / High buffer alkaline water; score 92.4; fallback_grinder_calibration_risk: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: High buffer alkaline water can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-10538: Coalition Coffee Roasters Ethiopia Yirgacheffe / French Press / Unknown manual grinder / High buffer alkaline water; score 92.4; fallback_grinder_calibration_risk: Unknown manual grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: High buffer alkaline water can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-10877: Tobo Coffee Roaster Ndiaini SL28 SL34 Washed Kenya / French Press / DF64 espresso/filter hybrid / Pristine 8.6+ alkaline water Indonesia style; score 92.4; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-10878: Uncommon Coffee Kii AA Kenya SL28 SL34 Washed / French Press / DF64 espresso/filter hybrid / Pristine 8.6+ alkaline water Indonesia style; score 92.4; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-04927: Frontside Coffee Roasters Decaf Colombia Huila Sugar Cane / French Press / Unknown electric grinder / Super O2 low-mineral water Indonesia style; score 92.8; fallback_grinder_calibration_risk: Unknown electric grinder needs calibration; settings are starting points, not exact burr-zero truth.; zero_mineral_remineralize_risk: Super O2 low-mineral water Indonesia style is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; french_press_clarity_softening_risk: French Press can soften clarity; decant cleanly and avoid stirring up fines.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-07309: Morph Coffee Aceh Gayo Queen Ketiara / Cold Brew / Unknown electric grinder / Pristine 8.6+ alkaline water Indonesia style; score 92.8; fallback_grinder_calibration_risk: Unknown electric grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-07310: Otten Coffee Arabica Aceh Gayo Honey Process / Cold Brew / Unknown electric grinder / Pristine 8.6+ alkaline water Indonesia style; score 92.8; fallback_grinder_calibration_risk: Unknown electric grinder needs calibration; settings are starting points, not exact burr-zero truth.; high_buffer_target_risk: Pristine 8.6+ alkaline water Indonesia style can mute acidity, florals, and clarity for this target.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00169: Morph Coffee Aceh Gayo Queen Ketiara / Cold Brew / DF64 espresso/filter hybrid / Super O2 low-mineral water Indonesia style; score 93.3; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; zero_mineral_remineralize_risk: Super O2 low-mineral water Indonesia style is not brew-ready without minerals.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-09179: Rabbit Hole Roasters Wadi Mahyad Yemeni Natural Community Lot / Cold Brew / DF64 espresso/filter hybrid / Unknown estimated bottled water; score 93.3; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; water_manual_verification_risk: Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-09180: Sandalj Vietnam Washed Kontum 18 / Cold Brew / DF64 espresso/filter hybrid / Unknown estimated bottled water; score 93.3; fallback_grinder_calibration_risk: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; water_manual_verification_risk: Unknown estimated bottled water needs manual TDS/GH/KH verification before high confidence.; dark_floral_target_risk: Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.; cold_brew_floral_expectation_risk: Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.; real_brew_validation_pending: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.

## Top Failures
No blocking software failure found.

## Top Warnings
- source-backed-00001: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00002: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00003: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00004: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00005: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00006: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00007: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00008: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00009: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00010: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00011: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00012: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00013: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00014: Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00015: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00016: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00017: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00018: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00019: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.
- source-backed-00020: DF64 espresso/filter hybrid needs calibration; settings are starting points, not exact burr-zero truth.; Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.

## Top Warning Causes
- real_brew_validation_pending: 20000 cases; examples source-backed-00001, source-backed-00002, source-backed-00003, source-backed-00004, source-backed-00005
- fallback_grinder_calibration_risk: 7260 cases; examples source-backed-00015, source-backed-00016, source-backed-00017, source-backed-00018, source-backed-00019
- water_manual_verification_risk: 2222 cases; examples source-backed-00067, source-backed-00068, source-backed-00069, source-backed-00070, source-backed-00071
- zero_mineral_remineralize_risk: 2222 cases; examples source-backed-00045, source-backed-00046, source-backed-00047, source-backed-00048, source-backed-00049
- high_buffer_target_risk: 1235 cases; examples source-backed-00034, source-backed-00035, source-backed-00036, source-backed-00037, source-backed-00038
- demineral_direct_filter_experiment_risk: 1111 cases; examples source-backed-00155, source-backed-00156, source-backed-00157, source-backed-00158, source-backed-00159
- low_mineral_filter_clarity_risk: 1111 cases; examples source-backed-00144, source-backed-00145, source-backed-00146, source-backed-00147, source-backed-00148
- dark_floral_target_risk: 999 cases; examples source-backed-00157, source-backed-00158, source-backed-00159, source-backed-00160, source-backed-00161
- geisha_body_target_risk: 359 cases; examples source-backed-00067, source-backed-00068, source-backed-00095, source-backed-00096, source-backed-00179
- cold_brew_floral_expectation_risk: 301 cases; examples source-backed-00033, source-backed-00034, source-backed-00135, source-backed-00136, source-backed-00169
- french_press_clarity_softening_risk: 301 cases; examples source-backed-00031, source-backed-00032, source-backed-00065, source-backed-00133, source-backed-00134

## Top Method-Risk Categories
- french_press: avg 98.3; min 92.4; warnings 2450; failures 0
- cold_brew: avg 98.4; min 92.8; warnings 2457; failures 0
- v60: avg 98.8; min 94.1; warnings 4310; failures 0
- hario_switch: avg 98.8; min 94.1; warnings 10728; failures 0
- chemex: avg 98.8; min 94.1; warnings 2147; failures 0
- origami: avg 98.8; min 94.1; warnings 2149; failures 0
- kono: avg 98.8; min 94.1; warnings 2147; failures 0
- melitta: avg 98.8; min 94.1; warnings 2146; failures 0
- kalita_wave: avg 98.8; min 94.1; warnings 2147; failures 0
- april: avg 98.8; min 94.1; warnings 2149; failures 0
- clever_dripper: avg 98.8; min 94.1; warnings 2148; failures 0
- aeropress: avg 98.8; min 94.1; warnings 2143; failures 0

## Barista Interpretation
- Premium washed/floral coffees are evaluated for higher temperature, clarity, water-buffer honesty, and target mismatch warnings.
- Natural, anaerobic, decaf, non-arabica, wet-hulled, dark roast, and unknown inputs are scored for conservative confidence and non-overclaim behavior.
- Espresso is judged as a starting-point/dial-in workflow, not a guaranteed shot recipe.
- Cold brew, moka, French Press, batch brewer, and siphon are checked for method-specific language instead of V60 copy leakage.

## What Outputs Were Excellent
- source-backed-00001: Morph Coffee Aceh Gayo Queen Ketiara with V60 hot scored 100.
- source-backed-00002: Otten Coffee Arabica Aceh Gayo Honey Process with V60 hot scored 100.
- source-backed-00003: Otten Coffee Gayo Linung Jaya Black Honey with V60 iced scored 100.
- source-backed-00004: Otten Coffee Aceh Gayo Anaerob Bener Meriah with V60 iced scored 100.
- source-backed-00005: Otten Coffee Aceh Gayo Natural Process with Hario Switch 02 hot scored 100.
- source-backed-00006: Common Grounds Wanoja Extended Natural with Hario Switch 02 hot scored 100.
- source-backed-00007: Common Grounds Toraja Sulotco with Hario Switch 02 iced scored 100.
- source-backed-00008: Common Grounds Jack Of All Trades with Hario Switch 02 iced scored 100.
- source-backed-00009: Beanetics Coffee Roasters Ethiopian Yirgacheffe with Hario Switch 03 hot scored 100.
- source-backed-00010: Coalition Coffee Roasters Ethiopia Yirgacheffe with Hario Switch 03 hot scored 100.
- source-backed-00011: Five Petal Coffee Janson Lot 980 Green Tip Geisha Washed with Hario Switch 03 iced scored 100.
- source-backed-00012: Pulpa Specialty Coffee Geisha Washed Finca Hartmann with Hario Switch 03 iced scored 100.

## What Outputs Were Questionable
- source-backed-00067: Five Petal Coffee Janson Lot 980 Green Tip Geisha Washed with Cold Brew scored 94.5; review warnings/copy before physical validation.
- source-backed-00068: Pulpa Specialty Coffee Geisha Washed Finca Hartmann with Cold Brew scored 94.5; review warnings/copy before physical validation.
- source-backed-00095: Five Petal Coffee Janson Lot 980 Green Tip Geisha Washed with Clever Dripper scored 95.8; review warnings/copy before physical validation.
- source-backed-00096: Pulpa Specialty Coffee Geisha Washed Finca Hartmann with Clever Dripper scored 95.8; review warnings/copy before physical validation.
- source-backed-00134: Indian Coffee Beans Monsooned Malabar reference with French Press scored 94.9; review warnings/copy before physical validation.
- source-backed-00135: Rabbit Hole Roasters Wadi Mahyad Yemeni Natural Community Lot with Cold Brew scored 95.4; review warnings/copy before physical validation.
- source-backed-00136: Sandalj Vietnam Washed Kontum 18 with Cold Brew scored 95.4; review warnings/copy before physical validation.
- source-backed-00167: Frontside Coffee Roasters Decaf Colombia Huila Sugar Cane with French Press scored 94.5; review warnings/copy before physical validation.
- source-backed-00168: Good Cup Coffee Liberica Barako reference with French Press scored 94.5; review warnings/copy before physical validation.
- source-backed-00169: Morph Coffee Aceh Gayo Queen Ketiara with Cold Brew scored 93.3; review warnings/copy before physical validation.
- source-backed-00239: LiLo Coffee Roasters Colombia La Parcelita Pink Bourbon Washed with V60 hot scored 95.8; review warnings/copy before physical validation.
- source-backed-00240: Basic Barista Pink Bourbon Washed Colombia with V60 hot scored 95.8; review warnings/copy before physical validation.

## What Outputs Were Wrong
- No blocking wrong output was found in this software gate.

## Required Example Cases
| # | Scenario | Method | Grinder | Water | Output | Score | Finding |
|---:|---|---|---|---|---|---:|---|
| 1 | Morph Coffee Aceh Gayo Queen Ketiara -> balance_clean | V60 hot | 1Zpresso K-Ultra | Volvic style bottled water | 12g, 170ml, 91C, Starting grind: 8.2 numbers. Correction range: 8.0 numbers to 8.4 numbers. If sour/thin: 8.0 numbers. If bitter/dry/stalled: 8.4 numbers., 2:50 | 100 | real_brew_validation_pending |
| 2 | Otten Coffee Arabica Aceh Gayo Honey Process -> balance_clean | V60 hot | 1Zpresso K-Ultra | Volvic style bottled water | 15g, 240ml, 91.7C, Starting grind: 8.5 numbers. Correction range: 8.3 numbers to 8.7 numbers. If sour/thin: 8.3 numbers. If bitter/dry/stalled: 8.7 numbers., 2:55 | 100 | real_brew_validation_pending |
| 3 | Otten Coffee Gayo Linung Jaya Black Honey -> balance_clean | V60 iced | 1Zpresso K-Ultra | Volvic style bottled water | 18g, 250ml, 91.1C, Starting grind: 8.2 numbers. Correction range: 8.0 numbers to 8.4 numbers. If sour/thin: 8.0 numbers. If bitter/dry/stalled: 8.4 numbers., 2:40 | 100 | real_brew_validation_pending |
| 4 | Otten Coffee Aceh Gayo Anaerob Bener Meriah -> balance_clean | V60 iced | 1Zpresso K-Ultra | Volvic style bottled water | 20g, 280ml, 90.6C, Starting grind: 8.6 numbers. Correction range: 8.4 numbers to 8.8 numbers. If sour/thin: 8.4 numbers. If bitter/dry/stalled: 8.8 numbers., 2:35 | 100 | real_brew_validation_pending |
| 5 | Otten Coffee Aceh Gayo Natural Process -> balance_clean | Hario Switch 02 hot | 1Zpresso K-Ultra | Volvic style bottled water | 12g, 185ml, 90.4C, Starting grind: 9.1 numbers. Correction range: 8.9 numbers to 9.3 numbers. If sour/thin: 8.9 numbers. If bitter/dry/stalled: 9.3 numbers., 3:00 | 100 | real_brew_validation_pending |
| 6 | Common Grounds Wanoja Extended Natural -> balance_clean | Hario Switch 02 hot | 1Zpresso K-Ultra | Volvic style bottled water | 15g, 210ml, 91.9C, Starting grind: 8.9 numbers. Correction range: 8.7 numbers to 9.1 numbers. If sour/thin: 8.7 numbers. If bitter/dry/stalled: 9.1 numbers., 2:55 | 100 | real_brew_validation_pending |
| 7 | Common Grounds Toraja Sulotco -> balance_clean | Hario Switch 02 iced | 1Zpresso K-Ultra | Volvic style bottled water | 18g, 250ml, 92.6C, Starting grind: 8.9 numbers. Correction range: 8.7 numbers to 9.1 numbers. If sour/thin: 8.7 numbers. If bitter/dry/stalled: 9.1 numbers., 2:55 | 100 | real_brew_validation_pending |
| 8 | Common Grounds Jack Of All Trades -> balance_clean | Hario Switch 02 iced | Comandante C40 MK4 | Volvic style bottled water | 20g, 280ml, 92.6C, Starting grind: 26 clicks. Correction range: 25 clicks to 28 clicks. If sour/thin: 25 clicks. If bitter/dry/stalled: 28 clicks., 2:55 | 100 | real_brew_validation_pending |
| 9 | Beanetics Coffee Roasters Ethiopian Yirgacheffe -> balance_clean | Hario Switch 03 hot | Comandante C40 MK4 | Volvic style bottled water | 12g, 190ml, 91C, Starting grind: 28 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 2:55 | 100 | real_brew_validation_pending |
| 10 | Coalition Coffee Roasters Ethiopia Yirgacheffe -> balance_clean | Hario Switch 03 hot | Comandante C40 MK4 | Volvic style bottled water | 15g, 235ml, 91.8C, Starting grind: 27 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 3:00 | 100 | real_brew_validation_pending |
| 11 | Five Petal Coffee Janson Lot 980 Green Tip Geisha Washed -> balance_clean | Hario Switch 03 iced | Comandante C40 MK4 | Volvic style bottled water | 18g, 250ml, 92.9C, Starting grind: 27 clicks. Correction range: 25 clicks to 28 clicks. If sour/thin: 25 clicks. If bitter/dry/stalled: 28 clicks., 2:50 | 100 | real_brew_validation_pending |
| 12 | Pulpa Specialty Coffee Geisha Washed Finca Hartmann -> balance_clean | Hario Switch 03 iced | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 20g, 280ml, 92.4C, Starting grind: 27 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 2:40 | 100 | real_brew_validation_pending |
| 13 | Tobo Coffee Roaster Ndiaini SL28 SL34 Washed Kenya -> balance_clean | MUGEN x Switch | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 12g, 185ml, 91C, Starting grind: 28 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 2:50 | 100 | real_brew_validation_pending |
| 14 | Uncommon Coffee Kii AA Kenya SL28 SL34 Washed -> more_sweetness | MUGEN x Switch | Comandante C40 MK4 | Third Wave Water / remineralized balanced | 15g, 230ml, 91.8C, Starting grind: 27 clicks. Correction range: 25 clicks to 28 clicks. If sour/thin: 25 clicks. If bitter/dry/stalled: 28 clicks., 3:05 | 100 | real_brew_validation_pending |
| 15 | LiLo Coffee Roasters Colombia La Parcelita Pink Bourbon Washed -> more_sweetness | Chemex | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 20g, 330ml, 95.3C, Starting grind: coarse filter range, verify burrs. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser., 5:20 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 16 | Basic Barista Pink Bourbon Washed Colombia -> more_sweetness | Chemex | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 30g, 495ml, 93C, Starting grind: coarse filter range, verify burrs. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 4:25 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 17 | SUMO Coffee Roasters Isano Rwanda Red Bourbon Washed -> more_sweetness | Origami | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 12g, 185ml, 93.5C, Starting grind: filter range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 3:05 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 18 | Barista och Espresso Masha Burundi Washed Red Bourbon -> more_sweetness | Origami | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 15g, 235ml, 91.6C, Starting grind: filter range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 2:50 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 19 | Pangea Coffee Co. Unity Costa Rica Catuai Honey Process -> more_sweetness | Kono | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 18g, 270ml, 93C, Starting grind: filter range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 4:30 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 20 | Subtext Coffee Roasters Guatemala Todos Santos Washed Caturra & Bourbon -> more_sweetness | Kono | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 20g, 305ml, 93.6C, Starting grind: filter range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 4:15 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 21 | Staccato Roasters Brazil Yellow Bourbon Natural -> more_sweetness | Melitta | DF64 espresso/filter hybrid | Third Wave Water / remineralized balanced | 12g, 170ml, 92.5C, Starting grind: filter range, dial-in required. If sour/thin: slightly finer. If bitter/dry/stalled: slightly coarser. Bias finer., 3:00 | 98.3 | fallback_grinder_calibration_risk; real_brew_validation_pending |
| 22 | Indian Coffee Beans Monsooned Malabar reference -> more_sweetness | Melitta | Kingrinder K6 | Third Wave Water / remineralized balanced | 15g, 230ml, 91.4C, Starting grind: 101 clicks. Correction range: 97 clicks to 105 clicks. If sour/thin: 97 clicks. If bitter/dry/stalled: 105 clicks., 3:30 | 100 | real_brew_validation_pending |
| 23 | Rabbit Hole Roasters Wadi Mahyad Yemeni Natural Community Lot -> more_sweetness | Kalita / flat-bottom | Kingrinder K6 | Low buffer clarity water | 18g, 280ml, 93C, Starting grind: 100 clicks. Correction range: 96 clicks to 104 clicks. If sour/thin: 96 clicks. If bitter/dry/stalled: 104 clicks., 4:25 | 100 | real_brew_validation_pending |
| 24 | Sandalj Vietnam Washed Kontum 18 -> more_sweetness | Kalita / flat-bottom | Kingrinder K6 | Low buffer clarity water | 20g, 315ml, 92.8C, Starting grind: 109 clicks. Correction range: 105 clicks to 113 clicks. If sour/thin: 105 clicks. If bitter/dry/stalled: 113 clicks., 4:10 | 100 | real_brew_validation_pending |
| 25 | TheBeanGeek Thailand Doi Chang Washed -> more_sweetness | April / Orea / B75 style flat-bottom | Kingrinder K6 | Low buffer clarity water | 12g, 190ml, 91.8C, Starting grind: 105 clicks. Correction range: 101 clicks to 109 clicks. If sour/thin: 101 clicks. If bitter/dry/stalled: 109 clicks., 2:55 | 100 | real_brew_validation_pending |
| 26 | Surfbean Coffee Roaster Laos Bolaven Washed -> more_sweetness | April / Orea / B75 style flat-bottom | Kingrinder K6 | Low buffer clarity water | 15g, 220ml, 91.3C, Starting grind: 104 clicks. Correction range: 100 clicks to 108 clicks. If sour/thin: 100 clicks. If bitter/dry/stalled: 108 clicks., 2:50 | 100 | real_brew_validation_pending |
| 27 | Frontside Coffee Roasters Decaf Colombia Huila Sugar Cane -> more_acidity | Clever Dripper | Kingrinder K6 | Low buffer clarity water | 18g, 280ml, 91.9C, Starting grind: 90 clicks. Correction range: 79 clicks to 101 clicks. If sour/thin: 79 clicks. If bitter/dry/stalled: 101 clicks., 3:20 | 100 | real_brew_validation_pending |
| 28 | Good Cup Coffee Liberica Barako reference -> more_acidity | Clever Dripper | Kingrinder K6 | Low buffer clarity water | 20g, 315ml, 90.6C, Starting grind: 97 clicks. Correction range: 86 clicks to 108 clicks. If sour/thin: 86 clicks. If bitter/dry/stalled: 108 clicks., 3:10 | 100 | real_brew_validation_pending |
| 29 | Morph Coffee Aceh Gayo Queen Ketiara -> more_acidity | AeroPress | Timemore C2 | Low buffer clarity water | 12g, 180ml, 88C, Starting grind: 20 clicks. Correction range: 18 clicks to 23 clicks. If sour/thin: 18 clicks. If bitter/dry/stalled: 23 clicks., 1:15 | 100 | real_brew_validation_pending |
| 30 | Otten Coffee Arabica Aceh Gayo Honey Process -> more_acidity | AeroPress | Timemore C2 | Low buffer clarity water | 15g, 225ml, 90C, Starting grind: 20 clicks. Correction range: 18 clicks to 22 clicks. If sour/thin: 18 clicks. If bitter/dry/stalled: 22 clicks., 1:15 | 100 | real_brew_validation_pending |
| 31 | Otten Coffee Gayo Linung Jaya Black Honey -> more_acidity | French Press | Timemore C2 | Low buffer clarity water | 30g, 455ml, 92.3C, Starting grind: 28 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 3:50 | 98.3 | french_press_clarity_softening_risk; real_brew_validation_pending |
| 32 | Otten Coffee Aceh Gayo Anaerob Bener Meriah -> more_acidity | French Press | Timemore C2 | Low buffer clarity water | 18g, 270ml, 93.7C, Starting grind: 27 clicks. Correction range: 25 clicks to 28 clicks. If sour/thin: 25 clicks. If bitter/dry/stalled: 28 clicks., 4:00 | 98.3 | french_press_clarity_softening_risk; real_brew_validation_pending |
| 33 | Otten Coffee Aceh Gayo Natural Process -> more_acidity | Cold Brew | Timemore C2 | Low buffer clarity water | 40g, 600ml, 14.8C, Starting grind: 28 clicks. Correction range: 26 clicks to 29 clicks. If sour/thin: 26 clicks. If bitter/dry/stalled: 29 clicks., 685:00 | 98.7 | cold_brew_floral_expectation_risk; real_brew_validation_pending |
| 34 | Common Grounds Wanoja Extended Natural -> more_acidity | Cold Brew | Timemore C2 | High buffer alkaline water | 40g, 600ml, 12.5C, Starting grind: 28 clicks. Correction range: 27 clicks to 30 clicks. If sour/thin: 27 clicks. If bitter/dry/stalled: 30 clicks., 685:00 | 97.1 | high_buffer_target_risk; cold_brew_floral_expectation_risk; real_brew_validation_pending |
| 35 | Common Grounds Toraja Sulotco -> more_acidity | V60 hot | Timemore C2 | High buffer alkaline water | 18g, 295ml, 92C, Starting grind: 18 clicks. Correction range: 16 clicks to 19 clicks. If sour/thin: 16 clicks. If bitter/dry/stalled: 19 clicks., 2:25 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 36 | Common Grounds Jack Of All Trades -> more_acidity | V60 hot | Timemore C3 | High buffer alkaline water | 20g, 290ml, 92C, Starting grind: 15 clicks. Correction range: 14 clicks to 17 clicks. If sour/thin: 14 clicks. If bitter/dry/stalled: 17 clicks., 2:25 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 37 | Beanetics Coffee Roasters Ethiopian Yirgacheffe -> more_acidity | V60 iced | Timemore C3 | High buffer alkaline water | 12g, 175ml, 89.4C, Starting grind: 16 clicks. Correction range: 14 clicks to 17 clicks. If sour/thin: 14 clicks. If bitter/dry/stalled: 17 clicks., 2:25 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 38 | Coalition Coffee Roasters Ethiopia Yirgacheffe -> more_acidity | V60 iced | Timemore C3 | High buffer alkaline water | 15g, 220ml, 89.4C, Starting grind: 16 clicks. Correction range: 14 clicks to 17 clicks. If sour/thin: 14 clicks. If bitter/dry/stalled: 17 clicks., 2:25 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 39 | Five Petal Coffee Janson Lot 980 Green Tip Geisha Washed -> more_acidity | Hario Switch 02 hot | Timemore C3 | High buffer alkaline water | 18g, 290ml, 87.6C, Starting grind: 19 clicks. Correction range: 17 clicks to 20 clicks. If sour/thin: 17 clicks. If bitter/dry/stalled: 20 clicks., 2:10 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 40 | Pulpa Specialty Coffee Geisha Washed Finca Hartmann -> fruit_forward | Hario Switch 02 hot | Timemore C3 | High buffer alkaline water | 20g, 315ml, 91C, Starting grind: 18 clicks. Correction range: 17 clicks to 20 clicks. If sour/thin: 17 clicks. If bitter/dry/stalled: 20 clicks., 2:55 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 41 | Tobo Coffee Roaster Ndiaini SL28 SL34 Washed Kenya -> fruit_forward | Hario Switch 02 iced | Timemore C3 | High buffer alkaline water | 12g, 170ml, 92.1C, Starting grind: 18 clicks. Correction range: 16 clicks to 19 clicks. If sour/thin: 16 clicks. If bitter/dry/stalled: 19 clicks., 2:45 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 42 | Uncommon Coffee Kii AA Kenya SL28 SL34 Washed -> fruit_forward | Hario Switch 02 iced | Timemore C3 | High buffer alkaline water | 15g, 210ml, 92C, Starting grind: 18 clicks. Correction range: 16 clicks to 19 clicks. If sour/thin: 16 clicks. If bitter/dry/stalled: 19 clicks., 2:50 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 43 | LiLo Coffee Roasters Colombia La Parcelita Pink Bourbon Washed -> fruit_forward | Hario Switch 03 hot | Fellow Ode Gen 2 | High buffer alkaline water | 18g, 285ml, 89.2C, Starting grind: 7 numbers. Correction range: 6 numbers to 9 numbers. If sour/thin: 6 numbers. If bitter/dry/stalled: 9 numbers., 3:05 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 44 | Basic Barista Pink Bourbon Washed Colombia -> fruit_forward | Hario Switch 03 hot | Fellow Ode Gen 2 | High buffer alkaline water | 20g, 320ml, 89.2C, Starting grind: 7 numbers. Correction range: 6 numbers to 9 numbers. If sour/thin: 6 numbers. If bitter/dry/stalled: 9 numbers., 3:00 | 98.3 | high_buffer_target_risk; real_brew_validation_pending |
| 45 | SUMO Coffee Roasters Isano Rwanda Red Bourbon Washed -> fruit_forward | Hario Switch 03 iced | Fellow Ode Gen 2 | zero-mineral RO / distilled water | 12g, 165ml, 94C, Starting grind: 6 numbers. Correction range: 4 numbers to 7 numbers. If sour/thin: 4 numbers. If bitter/dry/stalled: 7 numbers., 2:50 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 46 | Barista och Espresso Masha Burundi Washed Red Bourbon -> fruit_forward | Hario Switch 03 iced | Fellow Ode Gen 2 | zero-mineral RO / distilled water | 15g, 210ml, 94C, Starting grind: 6 numbers. Correction range: 4 numbers to 7 numbers. If sour/thin: 4 numbers. If bitter/dry/stalled: 7 numbers., 2:50 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 47 | Pangea Coffee Co. Unity Costa Rica Catuai Honey Process -> fruit_forward | MUGEN x Switch | Fellow Ode Gen 2 | zero-mineral RO / distilled water | 18g, 280ml, 91.7C, Starting grind: 7 numbers. Correction range: 5 numbers to 8 numbers. If sour/thin: 5 numbers. If bitter/dry/stalled: 8 numbers., 2:55 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 48 | Subtext Coffee Roasters Guatemala Todos Santos Washed Caturra & Bourbon -> fruit_forward | MUGEN x Switch | Fellow Ode Gen 2 | zero-mineral RO / distilled water | 20g, 310ml, 92.6C, Starting grind: 7 numbers. Correction range: 5 numbers to 8 numbers. If sour/thin: 5 numbers. If bitter/dry/stalled: 8 numbers., 2:55 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 49 | Staccato Roasters Brazil Yellow Bourbon Natural -> fruit_forward | Chemex | Fellow Ode Gen 2 | zero-mineral RO / distilled water | 30g, 495ml, 93C, Starting grind: 10 numbers. Correction range: 8 numbers to 11 numbers. If sour/thin: 8 numbers. If bitter/dry/stalled: 11 numbers., 4:50 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 50 | Indian Coffee Beans Monsooned Malabar reference -> fruit_forward | Chemex | Baratza Encore | zero-mineral RO / distilled water | 20g, 330ml, 94.5C, Starting grind: 35 settings. Correction range: 33 settings to 37 settings. If sour/thin: 33 settings. If bitter/dry/stalled: 37 settings., 4:55 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 51 | Rabbit Hole Roasters Wadi Mahyad Yemeni Natural Community Lot -> fruit_forward | Origami | Baratza Encore | zero-mineral RO / distilled water | 18g, 255ml, 93.7C, Starting grind: 15 settings. Correction range: 13 settings to 16 settings. If sour/thin: 13 settings. If bitter/dry/stalled: 16 settings., 2:45 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 52 | Sandalj Vietnam Washed Kontum 18 -> fruit_forward | Origami | Baratza Encore | zero-mineral RO / distilled water | 20g, 325ml, 89.8C, Starting grind: 15 settings. Correction range: 14 settings to 17 settings. If sour/thin: 14 settings. If bitter/dry/stalled: 17 settings., 2:10 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 53 | TheBeanGeek Thailand Doi Chang Washed -> floral_transparent | Kono | Baratza Encore | zero-mineral RO / distilled water | 12g, 190ml, 91.7C, Starting grind: 15 settings. Correction range: 14 settings to 17 settings. If sour/thin: 14 settings. If bitter/dry/stalled: 17 settings., 3:30 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 54 | Surfbean Coffee Roaster Laos Bolaven Washed -> floral_transparent | Kono | Baratza Encore | zero-mineral RO / distilled water | 15g, 240ml, 91.5C, Starting grind: 15 settings. Correction range: 14 settings to 17 settings. If sour/thin: 14 settings. If bitter/dry/stalled: 17 settings., 3:20 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |
| 55 | Frontside Coffee Roasters Decaf Colombia Huila Sugar Cane -> floral_transparent | Melitta | Baratza Encore | zero-mineral RO / distilled water | 18g, 290ml, 89C, Starting grind: 20 settings. Correction range: 19 settings to 22 settings. If sour/thin: 19 settings. If bitter/dry/stalled: 22 settings., 2:20 | 98.7 | zero_mineral_remineralize_risk; real_brew_validation_pending |

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
