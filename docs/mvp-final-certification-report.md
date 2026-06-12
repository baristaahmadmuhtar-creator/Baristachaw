# BaristaChaw Final MVP Certification

Date: 2026-06-12 (Asia/Brunei)
Repository: `baristaahmadmuhtar-creator/Baristachaw`
Branch: `main`
Base SHA: `93ba05587bf9e4ba8917ac54fd17f94bc6b63b1f`

This report certifies software behavior and barista-reasoned guardrails. It does not certify physical cup quality.

## Summary Verdict

All release-blocking software gates passed. The brewer/style audit passed 1,000/1,000 cases, the source-backed real-world audit passed 1,000/1,000 scenarios, Android API 35 and API 36 emulator QA passed, and signed APK/AAB permission audits found no blocked storage, media, overlay, or broad filesystem permissions.

## Files Changed

- Web UI/runtime: AI Brew fullscreen/footer layout, keyboard viewport metrics, picker positioning, persistent catalog fallback, IndexedDB transaction ordering, access-gate synchronization, Chat mode accessibility, and Home CTA contrast.
- Mobile/Android: production release signing enforcement, dependency-manifest permission removal, release permission audit, and store-safe config.
- QA infrastructure: root `pnpm test`, workspace config, deterministic onboarding cleanup, static-build QA mode, service-worker isolation, mobile/PWA regressions, axe stabilization, and per-route Lighthouse isolation.
- Reports: generated brewer/style inventory, coverage, UI/UX, final verdict, real-world 1,000 report, this certification, and Android checklist.
- `scratch/` remains untracked and untouched.

## Brewer Coverage Table

| Brewer | Planner | Workflow guide | Tutorial ID/EN | Result |
| --- | --- | --- | --- | --- |
| Kalita Wave 155 / 185 | Pass | Pass | Pass | Strong |
| Chemex | Pass | Pass | Pass | Strong |
| Clever Dripper | Pass | Pass | Pass | Strong |
| Bialetti Moka Pot | Pass | Pass | Pass | Strong |
| Toddy Cold Brew | Pass | Pass | Pass | Strong |
| Batch Brewer | Pass | Pass | Pass | Strong |
| Hario Siphon | Pass | Pass | Pass | Strong |
| Origami Dripper S / M | Pass | Pass | Pass | Strong |
| April Brewer | Pass | Pass | Pass | Strong |
| Melitta Aromaboy / 1x2 Trapezoid | Pass | Pass | Pass | Strong |
| Kono Meimon | Pass | Pass | Pass | Strong |

The complete audit covers 16 method families, 99 styles, 1,000 guides, and 1,000 UI result checks.

## Style Coverage Table

| Method family | Styles | Planner/guide/tutorial | Classification |
| --- | ---: | --- | --- |
| AeroPress | 7 | 7/7 | Strong |
| April | 6 | 6/6 | Strong |
| Batch Brewer | 6 | 6/6 | Strong |
| Chemex | 6 | 6/6 | Strong |
| Clever Dripper | 6 | 6/6 | Strong |
| Cold Brew / Toddy | 6 | 6/6 | Strong |
| Espresso | 6 | 6/6 | Strong |
| French Press | 6 | 6/6 | Strong |
| Hario Switch / MUGEN | 7 | 7/7 | Strong |
| Kalita Wave | 6 | 6/6 | Strong |
| Kono | 6 | 6/6 | Strong |
| Melitta | 6 | 6/6 | Strong |
| Moka Pot | 6 | 6/6 | Strong |
| Origami | 6 | 6/6 | Strong |
| Siphon | 6 | 6/6 | Strong |
| V60 | 7 | 7/7 | Strong |

## Hot/Iced Support Table

| Brewer | Hot | Iced/cold | Mechanic validation |
| --- | --- | --- | --- |
| Kalita, Chemex, Origami, April, Melitta, Kono | Yes | Yes | Iced recipes require `hot water + ice = total water` |
| Clever Dripper | Yes | Yes | Iced immersion uses explicit hot-water/ice split |
| Moka Pot | Yes | No | No pseudo-iced brew mode |
| Toddy | No hot shortcut | Dedicated cold | No flash-iced pour-over simulation |
| Batch Brewer | Yes | No | No pseudo-iced brew mode |
| Hario Siphon | Yes | No | No pseudo-iced brew mode |

## Target-Rasa Coverage

All eight targets resolve through audited style selection: `balance_clean`, `more_sweetness`, `more_acidity`, `fruit_forward`, `floral_transparent`, `more_body`, `soft_round`, and `dense_comforting`. Target mismatches are warnings or safe fallback decisions, not fabricated certainty.

## Roast Coverage

`light`, `medium_light`, `medium`, `medium_dark`, and `dark` all affect temperature, grind, agitation, and extraction time. The real-world matrix covered 1,000 roast assignments with 0 failures.

## Warning Count

- Method/style audit: 17 confidence/UI-density warnings.
- Source-backed real-world audit: 1,869 honesty and calibration warnings.
- Total reported warnings: 1,886.
- Warnings are intentionally separate from software failures. The largest categories are real-brew validation pending (1,000), grinder calibration fallback (363), water manual verification (110), and zero-mineral remineralization (110).

## Failure Count

- Method/style audit: 0.
- Source-backed real-world audit: 0.
- Required release gates: 0 unresolved failures.
- Android fatal log/ANR attributable to BaristaChaw on API 35/36: 0.

## Lowest Scoring Scenarios

| Scenario | Method | Score | Main reasons |
| --- | --- | ---: | --- |
| `source-backed-00169` | Cold Brew | 93.3 | Grinder calibration, zero-mineral water, dark-roast floral ceiling, cold-brew floral expectation |
| `source-backed-00677` | French Press | 94.1 | Grinder fallback, dark-roast floral ceiling, French Press clarity |
| `source-backed-00678` | French Press | 94.1 | Grinder fallback, dark-roast floral ceiling, French Press clarity |
| `source-backed-00067` | Cold Brew | 94.5 | Unknown grinder/water and Geisha body-target mismatch |
| `source-backed-00068` | Cold Brew | 94.5 | Unknown grinder/water and Geisha body-target mismatch |

Method/style minimum score was 96; the only finding was potentially dense mobile guide detail, not recipe invalidity.

## Source-Backed Bean Fixture Count

28 source-backed lots from real roaster/reference pages generated 1,000 unique coffee scenarios. Missing origin, process, variety, flavor, or roast fields remain explicitly missing and are not invented.

## Required Gate Results

| Gate | Result |
| --- | --- |
| `pnpm test` | Pass: 713 passed, 4 intentional stress skips; mobile 40/40 |
| `pnpm lint` | Pass |
| `pnpm build` | Pass; chunk-size/import warnings are non-blocking |
| `pnpm mobile:test` | Pass: 40/40 |
| `pnpm mobile:lint` | Pass |
| `pnpm mobile:doctor` | Pass: 18/18 |
| `pnpm test:a11y` | Pass: 12/12 |
| Mobile E2E | Pass: 32/32 |
| Mobile parity | Pass: 10 unit + 28 E2E |
| Chromium full E2E | Pass: 120 runnable, 79 controlled skips |
| Firefox latest-delta E2E | Pass: 25 runnable, 3 viewport-specific skips |
| WebKit latest-delta E2E | Pass: 25 runnable, 3 viewport-specific skips |
| Static service worker | Pass: Chromium, Firefox, WebKit |
| Lighthouse mobile | Pass: Home 0.80, Chat 0.75, Scanner 0.80; accessibility/best practices 1.00 |
| Method/style audit | Pass: 1,000/1,000 |
| Source-backed real-world audit | Pass: 1,000/1,000 |
| `git diff --check` | Pass |

## Android Release Evidence

- Signed APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (95,715,169 bytes).
- Signed AAB: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` (49,201,682 bytes).
- Signer SHA-256: `3781C67814CB199B95AB9CB086FD273E585D83C6DBBB6B856F56D454FECA5AE0`.
- APK SHA-256: `CC4E8434073384B00AE21BBE694CC4D2CA682321CE4A5B890C953E53FFE28526`.
- APK and AAB blocked permission count: 0.
- Retained functional permissions include `CAMERA` and `RECORD_AUDIO`.
- Pixel API 35 and API 36: install, launch, WebView, keyboard/modal, rotation, relaunch, hardware back, deep link, camera prompt, and app-scoped fatal log/ANR checks passed.

## Real Brew Validation Still Required

Software can validate arithmetic, workflow mechanics, vocabulary, confidence, source fidelity, and safety guardrails. Physical extraction, sensory balance, grinder calibration, water chemistry, and final cup quality still require real brew logs.

## Final MVP Verdict

`READY FOR MVP SOFTWARE RELEASE / REAL BREW VALIDATION REQUIRED`
