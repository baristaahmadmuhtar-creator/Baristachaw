# AI Brew Stress Test History

AI Brew has software stress coverage for broad realistic combinations. These are deterministic software gates, not physical brew trials.

## Current Stress Gates

| Gate | Command | Coverage |
|---|---|---|
| Global 10,000 matrix | `npm run test:ai-brew:stress -- --mode=standard` | Visible drippers, 8 target profiles, 25 bean cases, 4 water profiles, trusted grinders, hot/iced fallback behavior. |
| Iced 100,000 guide stress | `npm run test:ai-brew:deep` | Visible drippers, iced-supported drippers, 8 targets, 5 roast levels, broad process/variety catalog, water cases, guide text, bloom, pour map, timer semantics. |
| Hot 500,000 matrix | `npm run test:ai-brew:hot500k` | Hot-only planner validation across visible drippers, global bean/process/variety catalog, roast levels, water cases, grinders, targets, confidence honesty, and method guide leakage checks. |
| Iced 500,000 matrix | `npm run test:ai-brew:iced500k` | Iced planner validation across supported and unsupported iced requests, hot-water/ice split, pour sum, guide language, fallback honesty, and taste correction guardrails. |
| Hot + iced 1,000,000 aggregate | `npm run test:ai-brew:1m` | Runs 500K hot plus 500K iced in one process, writes aggregate score, failures, recommendations, and improvement prompt artifacts. |
| Grinder size matrix | `npm run test:ai-brew:deep` | Visible drippers, all catalog grinders, roast levels, supported brew modes, exact/catalog/fallback grinder bands. |
| Report listing | `npm run test:ai-brew:report` | Prints latest local artifact paths for audit review. |

## Latest Known Artifact Shapes

- `artifacts/ai-brew-audit/full-method-audit/<sha>/full-method-audit.md`
- `artifacts/ai-brew-audit/global-10k-stress/<sha>/global-10k-stress-summary.json`
- `artifacts/ai-brew-audit/iced-100k-guide-stress/<sha>/iced-100k-guide-stress-summary.json`
- `artifacts/ai-brew-audit/hot-500k-stress/<sha>/summary.json`
- `artifacts/ai-brew-audit/iced-500k-stress/<sha>/summary.json`
- `artifacts/ai-brew-audit/hot-iced-1m-stress/<sha>/summary.json`
- `artifacts/ai-brew-audit/grind-size-matrix/<sha>/grind-size-matrix-summary.json`

## Scaling To Larger Runs

The existing generator pattern can be expanded to larger theoretical samples by adding more seeds, process/variety slices, grinders, water cases, and target profiles. Run large samples in CI or a dedicated machine, write failures to JSON, and keep browser e2e separate from CPU-only planner stress tests.

Physical brew validation remains separate. A software pass means the recipe envelope, guide, language, and guardrails held for the sampled inputs.
