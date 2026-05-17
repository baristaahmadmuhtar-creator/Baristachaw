# AI Brew Grinder Matrix

AI Brew and Kalkulator Grind Size share the grinder catalog and recommendation path:

- Catalog source: `apps/web/public/data/ai-brew/grinders.v2026-03.json`
- Method settings: `apps/web/public/data/ai-brew/grinder-settings.v2026-06.json`
- Runtime loader: `apps/web/src/features/ai-brew/catalog.ts`
- Recommendation engine: `apps/web/src/features/ai-brew/grindPlanner.ts`
- Calculator adapter: `apps/web/src/features/barista-tools/grindSizeAdvisor.ts`

## Current Software Coverage

The grinder catalog coverage gate checks:

- visible grinders
- coarse/medium/fine bands
- parsed numeric ranges
- method-specific settings
- all exposed methods
- five roast levels
- all target profiles
- espresso compatibility
- fallback confidence honesty

Artifacts are written to:

```text
artifacts/grinder-catalog-audit/<sha>/
```

Software validation is not physical brew validation. Physical grinder logs are still required before claiming real-world exactness.
