# AI Brew Production Gate

AI Brew is the guarded recipe intelligence layer for BaristaClaw. It produces a strong starting recipe, brew guide, expected cup profile, and one-variable dial-in loop from method, grinder, water, roast, process, variety, and target profile.

## Source Of Truth

| Area | Primary files | Gate |
|---|---|---|
| Planner and recipe envelope | `apps/web/src/features/ai-brew/planner.ts` | `npm run test:ai-brew` |
| Workflow guide | `apps/web/src/features/ai-brew/workflowGuide.ts` | `npm run test:ai-brew:matrix` |
| Grinder logic | `apps/web/src/features/ai-brew/grindPlanner.ts` | `npm run test:ai-brew:deep` |
| Water logic | `apps/web/src/features/ai-brew/waterPlanner.ts` | `npm run catalog:audit` |
| Bean/process/variety risk | `apps/web/src/features/ai-brew/beanPlanner.ts` | `npm run test:ai-brew` |
| Expected cup and confidence | `apps/web/src/features/ai-brew/cupProfile.ts` | `npm run test:ai-brew` |
| UI and localization | `apps/web/src/features/ai-brew/AiBrewPanel.tsx`, `localization.ts` | `npm run test:mobile-parity` |

## Release Checklist

- Recipe math stays inside method bounds: no NaN, no negative ml/time, sane ratio and temperature.
- Iced plans keep hot water and ice separate; pours through the bed sum to hot water only.
- Hario Switch plans validate closed chamber load, valve timing, and blocked/caution/safe state.
- Non-pour-over methods do not receive V60 language or pour maps.
- Espresso, moka, siphon, batch, cold brew, AeroPress, and French Press keep method-specific stop conditions.
- Grinder fallbacks require calibration and cannot upgrade confidence by themselves.
- Zero-mineral, estimated, or high-buffer water lowers confidence or blocks auto-brew when needed.
- Experimental, decaf, non-arabica, drying-only, dark roast, and unknown beans keep honest warnings.
- Indonesian mode localizes critical guide, warning, and result copy.
- Public copy says starting recipe plus dial-in, not guaranteed taste.

## Required Commands

```bash
npm run catalog:audit
npm run test:ai-brew
npm run test:ai-brew:switch
npm run test:ai-brew:matrix
npm run test:ai-brew:stress -- --mode=standard
npm run test:ai-brew:deep
npm run test:ai-brew:report
npm run build
npm run release:verify
npm run test:mobile-parity
```

Physical brew validation is a separate field process. Software gates prove safety, determinism, localization, and guardrails; they do not prove every bean will taste ideal on every grinder and water source.
