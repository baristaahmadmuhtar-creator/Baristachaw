# AI Brew Language Audit

Date: 2026-06-07

## Final Indonesian Production Pass

The final pass audited resolved Indonesian and English output rather than judging
the canonical source templates alone.

- Reviewed 1,636 localized tutorial outputs across all supported method
  families, styles, actions, and hot/iced modes.
- Centralized Indonesian display copy for all 40 manual brew presets through
  `getManualPresetDisplayCopy`, including labels, summaries, source
  attribution, compatible-device fallback notes, and guardrails.
- Added `validateLocalizedAiBrewCopy` to reject placeholders, encoding damage,
  repeated words, locale leakage, and method-inappropriate vocabulary before
  optional user-facing text is rendered.
- Normalized avoidable terms such as `spout`, `bowl`, `medium-coarse`,
  `fine-medium`, and `bleached paper` into natural Indonesian barista copy.
- Kept brand names, method names, and established coffee terms unchanged where
  translation would make the copy less natural.
- Strengthened the Indonesian AI prompt lock and kept the deterministic
  fallback in the selected locale.
- Preserved English output and added regression scans so Indonesian cleanup
  cannot leak into English mode.

Files added or materially updated in this final pass:

- `apps/web/src/features/ai-brew/manualPresetLocalization.ts`
- `apps/web/src/features/ai-brew/localization.ts`
- `apps/web/src/features/ai-brew/workflowTutorials.ts`
- `apps/web/src/features/ai-brew/AiBrewPanel.tsx`
- `tests/unit/aiBrewManualBrewPresets.test.ts`
- `tests/unit/aiBrewPlannerLocalization.test.ts`
- `tests/unit/aiBrewWorkflowTutorials.test.ts`
- `tests/e2e/tools.spec.ts`
- `package.json`

Final-pass verification completed before release:

- `npm run test:i18n` - 48 pass, 0 fail.
- `npm run test:ai-brew` - 348 pass, 4 skip, 0 fail.
- `npm run test:ai-brew:matrix` - all matrix gates passed.
- `npm run test:ai-brew:real-world-10000` - 10,000 scenarios passed,
  0 failed.
- `npm run test:grind-size:matrix` - 9 pass, 0 fail.
- Focused browser coverage for workflow phases, AeroPress, non-AeroPress
  styles, manual presets, and all selectable non-AeroPress styles passed.
- Indonesian browser result coverage across every method family - 1 pass,
  0 fail.
- `npm run test:e2e:mobile` - 28 pass, 0 fail.
- `npm run test:a11y` - 9 pass, 0 fail.
- `npm run build` - passed with existing non-blocking Vite chunk warnings.
- `npm run release:verify` - passed, including lint/typecheck, unit tests,
  production build, 56 Chromium AI Brew E2E checks, and the mobile AI Brew
  smoke gate.

The software checks do not replace physical sensory validation. Recipe output
remains a production-checked starting point that may require dial-in for the
specific coffee, grinder, water, and equipment.

## Scope

This audit covered the Indonesian and English copy paths that most directly affect AI Brew/Seduh output:

- AI Brew planner localization and dynamic guide text.
- AI Assist and sequence prompt templates.
- Brew guide, compact cue, iced split, AI Coach, and extraction finisher copy.
- Shared web/mobile Indonesian constants touched by the current language pass.
- Admin AI provider copy with visible mixed-language phrasing.

No API route, public schema, or storage shape was changed. Production deployment is handled as a separate release action after local gates and push.

## What Was Fixed

- Strengthened AI Brew prompt language locks so Indonesian output must stay Indonesian and English output must stay English.
- Added explicit no-hallucination instructions for missing bean data, origin, farm, altitude, variety, process, roaster, water status, and grinder source.
- Replaced avoidable Indonesian UI leakage such as `server`, `bed`, `slurry`, `flooding`, `steep`, `press`, and `release` in rendered AI Brew surfaces with natural terms:
  - `wadah saji`
  - `hamparan kopi`
  - `campuran kopi`
  - `air menggenang`
  - `rendam`
  - `tekan`
  - `buka katup`
- Added centralized Indonesian polish for dynamic AI Brew text, so planner notes, warnings, AI Coach notes, and detail cards share the same language cleanup.
- Cleaned iced brew wording so Indonesian instructions separate hot extraction from ice in the serving vessel without sounding like an English template.
- Cleaned selected non-AI-Brew UI copy in web/mobile scanner help and admin provider controls.
- Cleaned AI Brew entry cards in Indonesian: Espresso status now uses `Segera hadir`, Basic/Advanced Brew are localized as `Seduh Dasar` and `Seduh Lanjutan`, and avoidable `baseline` wording is shown as `titik awal`.
- Localized the Indonesian Tools tab label from `Brew` to `Seduh` while keeping English as `Brew`.

## Files Changed

- `apps/web/src/features/ai-brew/prompts.ts`
- `apps/web/src/features/ai-brew/localization.ts`
- `apps/web/src/features/ai-brew/AiBrewPanel.tsx`
- `apps/web/src/features/ai-brew/experience.ts`
- `apps/web/src/features/ai-brew/extractionFinisher.ts`
- `apps/web/src/features/ai-brew/coachNotes.ts`
- `apps/web/src/features/ai-brew/workflowGuide.ts`
- `apps/web/src/features/ai-brew/workflowTutorials.ts`
- `apps/web/src/features/ai-brew/planner.ts`
- `apps/web/src/constants.ts`
- `apps/mobile/src/web-shared/constants.ts`
- `apps/web/src/pages/adminLocalization.ts`
- `tests/unit/aiBrewComposer.test.ts`
- `tests/unit/aiBrewExtractionFinisher.test.ts`
- `tests/unit/aiBrewPromptBudget.test.ts`
- `tests/unit/aiBrewPlannerLocalization.test.ts`
- `tests/unit/aiBrewCompactUxSource.test.ts`
- `docs/AI_BREW_LANGUAGE_AUDIT.md`
- `docs/AI_BREW_QA_CHECKLIST.md`

## Language System Notes

The app already has a broad translation map plus AI Brew-specific localization helpers. This pass did not replace that architecture. Instead, it tightened the highest-risk path: dynamic brew text that is assembled from planner templates, guardrails, and AI sequence overlays.

The key guard is now `localizeAiBrewDynamicText`, which applies deterministic Indonesian terminology cleanup after exact phrase localization. This is intentionally conservative: it does not invent missing coffee facts and does not rewrite numeric recipe logic.

## AI Brew Domain Logic Improved

- Missing bean data is now treated as incomplete/manual/estimated rather than verified.
- Prompt templates now instruct the model to produce one language, avoid mixed-language fallback, and avoid invented provenance.
- Iced brew instructions now keep the hot-water target separate from ice dilution.
- AI Coach/Extraction Finisher output is normalized for Indonesian brew terminology before rendering.
- Hario Switch watch copy keeps the method name visible while using natural Indonesian setup wording.
- French Press method brief coverage now accepts localized Indonesian terms for rendaman, tekan, and tuang pisah.
- Taste-feedback correction copy now uses Indonesian `waktu rendam`, `aliran`, `akhir rasa`, and `ekstraksi` instead of raw `steep`, `flow`, `finish`, or `shot`.
- AI Coach detail copy now normalizes `service pattern`, `stop cue`, `shot`, `yield`, `workflow`, `decant`, `pulse`, and related method-control terms into natural Indonesian output.
- Espresso workflow guide copy now uses Indonesian `Mulai ekstraksi`, `Hasil`, and `Waktu ekstraksi` instead of `shot`, `yield`, or `Output` in Indonesian guide surfaces.
- Workflow tutorial detail resolver now cleans additional Indonesian output terms such as `yield`, `shot`, `grind`, `bed`, `carafe`, `mouthfeel`, and `pulse`.

## Known Limitations

- Source files still contain English canonical planner/tutorial strings because the planner stores many method templates in English and localizes them at render time. The release risk is the resolved UI output, which is covered by tests.
- This was a software and localization audit, not physical cupping or sensory panel validation.
- Non-ID/non-EN locales were not rewritten in this pass.

## Tests Run

- `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/aiBrewPlannerLocalization.test.ts tests/unit/aiBrewPromptBudget.test.ts`
- `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/translationCopyQuality.test.ts tests/unit/indonesianLocalization.test.ts tests/unit/defaultEnglishLanguage.test.ts`
- `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/aiBrewWorkflowTutorials.test.ts tests/unit/aiBrewPlannerLocalization.test.ts tests/unit/aiBrewPromptBudget.test.ts`
- Final tutorial/detail targeted rerun after polish:
  - `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/aiBrewWorkflowTutorials.test.ts tests/unit/aiBrewPlannerLocalization.test.ts tests/unit/aiBrewComposer.test.ts tests/unit/aiBrewPromptBudget.test.ts` - 83 pass, 0 fail.
  - `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/aiBrewWorkflowGuide.test.ts tests/unit/aiBrewPlannerLocalization.test.ts tests/unit/aiBrewWorkflowTutorials.test.ts tests/unit/aiBrewComposer.test.ts` - 79 pass, 0 fail.
- Final reviewer targeted rerun:
  - `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/aiBrewCompactUxSource.test.ts tests/unit/aiBrewPlannerLocalization.test.ts tests/unit/aiBrewPromptBudget.test.ts` - 26 pass, 0 fail.
  - `node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test --test-isolation=none tests/unit/aiBrewComposer.test.ts tests/unit/aiBrewPlanner.test.ts` - 204 pass, 0 fail.
- `npm run test:ai-brew` - 324 pass, 4 skip, 0 fail.
- `npm run check` - TypeScript/lint and production build passed. Build kept the existing Vite chunk-size/dynamic-import warnings.
- `npm run smoke:local` - 21 pass, 0 fail.
- Focused Playwright AI Brew E2E - 6 pass, 0 fail:
  - `npx playwright test tests/e2e/tools.spec.ts --project=chromium -g "AeroPress styles|non-AeroPress style|all non-AeroPress selectable styles|workflow-specific phases|manual preset|latest edited inputs"`
- Browser smoke from the language audit pass, in-app browser:
  - `/tools?tab=ai_brew&language=id` rendered nonblank, used Indonesian AI Brew copy, and a safe `Seduh Dasar` interaction showed Indonesian auth-gate copy.
  - `/tools?tab=ai_brew&language=en` rendered nonblank and did not show Indonesian mode labels.
- Fresh Playwright smoke:
  - ID/EN auth modal rendered in the correct language with no fresh console/page errors.

## Static Search QA

- Search patterns for `You bisa`, `kamu can`, `recipe ini`, `method ini`, `Create Resep`, `Buat Recipe`, `kopi kamu will`, `missing translation`, and `lorem` found no user-facing mixed-language copy. Remaining hits are this QA checklist or anti-placeholder guards in `aiComposer.ts`.
- Search for raw `U+00C2` encoding artifacts found no remaining hits in app, tests, or docs.
- Search patterns for `AI akan`, `Recipe ini`, `Method ini`, `Create recipe`, `Buat resep`, `coming soon`, and `TODO` found only English locale copy, a prompt-injection test string, internal TODO storage identifiers, or intentional roadmap/Coming Soon English strings outside Indonesian AI Brew state.
- Focused AI Brew entry-card search confirmed remaining `Coming Soon`, `Espresso Brew`, `Basic Brew`, and `Advanced Brew` strings are in the English copy branch only.

## Remaining Risks

- Static search can still find English regex/source terms in internal canonical normalizers; resolved UI output should be judged through localization tests and browser checks.
- A fresh unauthenticated browser shows the auth modal before AI Brew. Full generation from a fresh browser remains covered by local API smoke and existing Playwright QA login flows rather than this lightweight language smoke.
