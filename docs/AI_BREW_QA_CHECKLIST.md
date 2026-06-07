# AI Brew QA Checklist

Date: 2026-06-07

## Final Indonesian Production Gate

- [x] 1,636 resolved tutorial combinations scanned for Indonesian naturalness,
  duplicate words, placeholders, and method vocabulary.
- [x] All 40 manual brew presets have centralized Indonesian display copy.
- [x] Indonesian preset labels, summaries, attribution, fallback notes, and
  guardrails do not depend on ad hoc UI replacements.
- [x] `spout`, `bowl`, `medium-coarse`, `fine-medium`, and `bleached paper`
  are normalized into natural Indonesian where they appear in user-facing
  output.
- [x] Optional dynamic copy is validated before render and receives a
  same-locale safe fallback when invalid.
- [x] English regression checks remain active.
- [x] Browser coverage includes every method family plus high-risk styles and
  manual presets.
- [x] Bean-confidence, process, roast phrasing, and numeric water-style
  metadata are localized before rendering in Indonesian mode.

Fresh local evidence from 2026-06-07:

- `npm run test:i18n`: 49 pass, 0 fail.
- `npm run test:ai-brew`: 348 pass, 4 skip, 0 fail.
- `npm run test:ai-brew:matrix`: passed.
- `npm run test:ai-brew:real-world-10000`: 10,000 pass, 0 fail.
- `npm run test:grind-size:matrix`: 9 pass, 0 fail.
- Focused Playwright AI Brew and preset checks: passed.
- Playwright all non-AeroPress selectable styles: passed.
- Playwright Indonesian result surfaces across every method family: passed.
- `npm run test:e2e:mobile`: 28 pass, 0 fail.
- `npm run test:a11y`: 9 pass, 0 fail.
- `npm run build`: passed; existing Vite size/import warnings remain
  non-blocking.
- `npm run release:verify`: passed, including lint/typecheck, unit, build,
  56 Chromium AI Brew E2E checks, and mobile AI Brew smoke.

GitHub Release Gate CI, production deployment, and production smoke are
recorded separately after the new commit is pushed. Physical sensory
validation remains `PENDING HUMAN BREW TEST`.

## Language Checklist

- Indonesian mode uses natural Indonesian barista copy.
- English mode uses natural professional English copy.
- No UI state should mix Indonesian and English unless the section is intentionally bilingual.
- Indonesian output should avoid raw English terms such as `server`, `bed`, `slurry`, `paper`, `drawdown`, `release`, `steep`, and `press` when a natural Indonesian equivalent is clearer.
- English output should not contain Indonesian UI words such as `seduh`, `tuang`, `sajikan`, `katup`, `bubuk`, or `air panas`.
- AI prompts must explicitly lock the selected locale.
- Missing bean data must be labeled as incomplete/manual/estimated, not verified.

## AI Brew Method Checklist

- V60 and other pour-over guides explain pouring, agitation, flow, bed movement, and drawdown without espresso or cold brew leakage.
- Hario Switch guides explain valve state, closed/open phase, chamber load, release, and iced split clearly.
- AeroPress guides separate standard, inverted, bypass, no-bypass, bright clean, and sweet body behavior.
- French Press guides focus on immersion, crust/settle, slow press, decant, filtration, and sediment/lipid guardrails.
- Moka Pot guides avoid bloom, spiral, final pour, V60, and filter-bed language.
- Cold Brew guides distinguish long cold/room-temperature extraction from iced pour-over.
- Batch Brew guides describe machine flow, basket geometry, pre-wet, batch mixing, and holding.
- Espresso remains method-aware and does not describe V60-style agitation.

## Data Confidence Checklist

- Verified data is only shown when the app has a trusted source.
- Manual input remains labeled as manual input.
- Unknown farm, producer, altitude, variety, process, tasting notes, or roaster data must not be invented.
- Suspicious or incomplete data should produce a gentle review/incomplete-data note.
- Grinder and water recommendations stay calibrated starting points, not absolute truth.

## Regression Checklist

- Changing target profile, roast, dripper, grinder, process, variety, water, brew mode, and style should regenerate a fresh plan without reset.
- Result summary, Seduh/Panduan, AI Coach, Detail, compact cues, and saved plan should all reflect the current plan.
- Iced pour-over uses hot water over measured ice; cold brew does not use hot brew logic.
- Validation messages should be user-friendly in both Indonesian and English.
- Prompt output should keep schema/JSON expectations stable where the UI expects structured data.

## Required Local Gates

- Final reviewer targeted tests - passed on 2026-06-04:
  - `aiBrewWorkflowTutorials.test.ts`, `aiBrewPlannerLocalization.test.ts`, `aiBrewComposer.test.ts`, `aiBrewPromptBudget.test.ts`: 83 pass, 0 fail.
  - `aiBrewWorkflowGuide.test.ts`, `aiBrewPlannerLocalization.test.ts`, `aiBrewWorkflowTutorials.test.ts`, `aiBrewComposer.test.ts`: 79 pass, 0 fail.
  - `aiBrewCompactUxSource.test.ts`, `aiBrewPlannerLocalization.test.ts`, `aiBrewPromptBudget.test.ts`: 26 pass, 0 fail.
  - `aiBrewComposer.test.ts`, `aiBrewPlanner.test.ts`: 204 pass, 0 fail.
- `npm run test:ai-brew` - passed on 2026-06-04: 324 pass, 4 skip, 0 fail.
- `npm run check` - passed on 2026-06-04. Vite reported existing non-blocking chunk-size/dynamic-import warnings.
- `npm run smoke:local` - passed on 2026-06-04: 21 pass, 0 fail.
- Browser smoke from the language audit pass:
  - Focused AI Brew Playwright E2E: 6 pass, 0 fail.
  - `/tools?tab=ai_brew&language=id` - rendered nonblank in the in-app browser; safe `Seduh Dasar` interaction stayed Indonesian.
  - `/tools?tab=ai_brew&language=en` - rendered nonblank in the in-app browser; no Indonesian mode labels found.
  - Fresh unauthenticated Playwright browser showed ID/EN auth modal in the correct language with no fresh console/page errors.

## Static Search QA

Run focused searches for:

- `You bisa`
- `kamu can`
- `recipe ini`
- `method ini`
- `Create Resep`
- `Buat Recipe`
- `kopi kamu will`
- `beans belum`
- `missing translation`
- `lorem`

Interpret `undefined`, `TODO`, and `coming soon` carefully. This repo uses `undefined` in code, `TODO` as internal identifiers, and Espresso Coming Soon intentionally.

Latest static search result:

- No mixed-language UI hits for `You bisa`, `kamu can`, `recipe ini`, `method ini`, `Create Resep`, `Buat Recipe`, or `kopi kamu will`.
- No raw `U+00C2` encoding artifact hits remain in app, tests, or docs.
- `lorem` remains only in anti-placeholder detection code.
- `Buat resep` remains only in an AI prompt-injection test string.
- `coming soon` remains in English locale copy and intentional roadmap/disabled-feature copy.
- Internal canonical planner/tutorial strings may still be English in source. Release validation should judge the resolved UI output through `localizeAiBrewDynamicText`, unit tests, and browser checks.

## Production Note

This checklist records local readiness. Production deployment is a separate release action after commit and push; final deployment status should be reported with the release command result.
