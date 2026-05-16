# AI Brew Real-World Validation Matrix

Software tests prove deterministic safety and guardrails. Real-world validation proves taste performance on actual beans, grinders, water, and technique.

| Validation area | Minimum field protocol | Evidence to capture |
|---|---|---|
| V60 hot/iced | 3 beans, 2 grinders, 2 water profiles, 3 target profiles | Recipe input, output, brew log, taste notes, correction applied. |
| Hario Switch hot/iced | Switch 02 and 03, 12-20 g dose range, valve timing check | Chamber load, valve time, drawdown, cup result. |
| Flat-bottom/Chemex | One flat-bottom and one Chemex with light and medium roast | Flow behavior, stall risk, correction notes. |
| Immersion/pressure | Clever, AeroPress, French Press | Steep, release/press/decant timing and fines/muddiness notes. |
| Espresso | 2 baskets, 2 grinders, real zero point and pressure/yield logs | Dose, yield, time, pressure, puck prep, taste correction. |
| Moka/Siphon/Batch/Cold Brew | One real device per method | Stop condition, operator safety, dilution/serve notes. |
| Water | Balanced, high-buffer, low-mineral/remineralized | TDS/GH/KH measured value and cup difference. |
| Grinder | Exact chart and fallback grinder | Setting, burr/zero point note, correction success. |

Result labels:

- Pass: baseline was usable and one-variable correction improved the cup.
- Needs calibration: recipe was safe but local grinder/water/device needed stronger adjustment.
- Blocked: physical constraint, missing data, or unsafe condition prevented a valid brew.

No public claim should say physical validation is complete unless this matrix has real brew logs attached.
