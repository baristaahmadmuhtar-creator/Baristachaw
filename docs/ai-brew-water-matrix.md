# AI Brew Water Matrix

AI Brew treats water data as a trust signal. Label and public lab data can be incomplete, so the planner must not overstate precision.

## Readiness Policy

| Water case | Score band | AI Brew behavior |
|---|---:|---|
| Verified brew-ready balanced water | 90-100 | Normal recommendation if grinder/bean/method are also strong. |
| Usable water with caution | 75-89 | Show warning for buffer, hardness, or taste impact. |
| Manual verification required | 50-74 | Require user mineral input or keep confidence lower. |
| Not recommended / zero-mineral base | 0-49 | Block brew-ready autofill and ask for remineralization. |

## Guardrails

- RO or zero-mineral water must not be treated as ready without minerals.
- Estimated brand water must not become a high-confidence fact.
- High-buffer or alkaline water warns about muted acidity/floral expression.
- High TDS or hard water lowers clarity confidence where relevant.
- Espresso water risk includes machine/taste caution.
- Iced brew keeps water behavior separate from measured ice bypass.

## Gate Evidence

- `npm run catalog:audit:waters` audits missing GH/KH/TDS, estimated facts, high-buffer, alkaline, and zero-mineral entries.
- `npm run test:ai-brew` includes planner tests for manual-required and blocked water brands.
- Latest local artifact path pattern: `artifacts/ai-brew-audit/water-audit-report.md`.

Known limit: water brands can change source, blend, or label values. Real TDS/GH/KH testing is required for exact cafe deployment.
