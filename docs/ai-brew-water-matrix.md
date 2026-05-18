# AI Brew Water Matrix

AI Brew treats water data as a trust signal. Label and public lab data can be incomplete, so the planner must not overstate precision.

## Readiness Policy

| Water case | Score band | AI Brew behavior |
|---|---:|---|
| Verified brew-ready balanced water | 90-100 | Normal recommendation if grinder/bean/method are also strong. |
| Usable water with caution | 75-89 | Show warning for buffer, hardness, or taste impact. |
| Manual verification required | 50-74 | Require user mineral input or keep confidence lower. |
| Not recommended / zero-mineral base | 0-49 | Block brew-ready autofill and ask for remineralization. |

Autofill is stricter than search visibility, but it is not limited to official brand pages. A water brand can appear in the picker while still requiring manual minerals. AI Brew autofills when the entry is official/verified, or when it has complete TDS/GH/KH plus trusted public coffee/community/academic support and repo-local raw evidence. Curated/community-backed autofill stays medium-confidence and must be treated as a starting point.

## Guardrails

- RO or zero-mineral water must not be treated as ready without minerals.
- Estimated brand water must not become a high-confidence fact.
- Curated/community-backed water values can become a medium-confidence autofill preset only when complete, source-supported, and not estimated. Local-only values without trusted public support stay manual-required.
- High-buffer or alkaline water warns about muted acidity/floral expression.
- High TDS or hard water lowers clarity confidence where relevant.
- Espresso water risk includes machine/taste caution.
- Iced brew keeps water behavior separate from measured ice bypass.

## Gate Evidence

- `npm run catalog:audit:waters` audits missing GH/KH/TDS, estimated facts, high-buffer, alkaline, and zero-mineral entries.
- `npm run test:ai-brew` includes planner tests for manual-required and blocked water brands.
- `tests/unit/aiBrewWaterCatalogPolicy.test.ts` verifies that trusted curated water can autofill at medium confidence, source-gap entries stay manual-required, and verified source-backed water can autofill at high confidence.
- Latest local artifact path pattern: `artifacts/ai-brew-audit/water-audit-report.md`.

Known limit: water brands can change source, blend, or label values. Real TDS/GH/KH testing is required for exact cafe deployment.
