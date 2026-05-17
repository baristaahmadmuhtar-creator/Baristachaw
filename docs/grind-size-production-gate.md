# Grind Size Production Gate

The Grind Size calculator must use the same AI Brew catalog and grinder recommendation path used by AI Brew.

## Required Behavior

- All visible grinders come from the AI Brew catalog.
- Method compatibility is checked before showing a confident recommendation.
- Espresso-incompatible grinders are blocked or clearly marked as not recommended.
- Roast level affects the recommendation when a numeric range exists.
- The calculator UI does not expose `Target rasa`; it uses the neutral grinder baseline so the tool stays focused on method, grinder, and roast-level grind sizing.
- AI Brew may still use target-profile bias through the shared engine, but that is recipe guidance, not a standalone Grind Size calculator control.
- Fallback grinders show calibration warnings and cannot produce high confidence.
- Ratio calculator behavior must remain unchanged when switching between `Rasio` and `Ukuran Giling`.

## Required Commands

```bash
npm run test:grinder-catalog:coverage
npm run test:grind-size:matrix
npx playwright test tests/e2e/tools.spec.ts --project=chromium -g "grind size calculator"
npx playwright test tests/e2e/tools.spec.ts --project="Mobile Chrome" -g "grind size calculator"
npx playwright test tests/e2e/tools.spec.ts --project="Mobile Safari" -g "grind size calculator"
```

Production-ready means zero blockers, honest confidence, and no selectable unsafe espresso grinder.
