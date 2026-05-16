# AI Brew Grinder Matrix

AI Brew grinder guidance is a calibration aid, not a replacement for burr alignment, zero point, dose, roast age, and real dial-in.

## Confidence Policy

| Grinder source | Confidence behavior | User-facing behavior |
|---|---|---|
| Exact chart with strong source | High or official where catalog evidence supports it | Show setting/range and keep normal confidence if water and bean data are also strong. |
| Curated chart | Medium/high depending evidence | Show setting/range plus calibration note. |
| Method-aware fallback | Medium or lower | Show method band and calibration required. |
| Unknown grinder | Lower confidence | Avoid exact setting claims; guide user to adjust one variable after tasting. |
| Espresso grinder without zero point | Lower confidence | Treat as starting point only; ask for real shot time/yield feedback. |

## Covered Examples

| Grinder group | Current handling |
|---|---|
| 1Zpresso K-Ultra | Catalog reference when chart exists; broad method matrix covered. |
| Comandante C40 | Catalog reference/fallback guarded by method. |
| Timemore C2/C3 | Curated/family ambiguity stays auditable in catalog audit. |
| Kingrinder K6 | Method-aware references and fallback bands tested. |
| DF64 / espresso-capable electric | Espresso guidance remains guarded by dial-in reality. |
| Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Yang-Chia / Fomac / Kova | One platform alias row in picker, exact platform display, and no duplicate unrelated Latina grinder rows. |
| Unknown manual/electric | Fallback only; confidence stays honest. |

## Gate Evidence

- `npm run catalog:audit` checks duplicate/ambiguous grinder families.
- `npm run test:ai-brew:deep` runs the grinder size matrix across visible drippers, all catalog grinders, roast levels, and supported brew modes.
- Latest local artifact path pattern: `artifacts/ai-brew-audit/grind-size-matrix/<sha>/grind-size-matrix.md`.

Known limit: every grinder still needs real calibration because burr wear, zero point, alignment, RPM, and retention change cup result.
