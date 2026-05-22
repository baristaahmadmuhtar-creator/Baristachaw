# Android Play Store Production Readiness

Date: 2026-05-22

## Verdict

Status: not ready for public Play Store production release yet.

The mobile code path is substantially hardened and passed local validation, but production release is blocked by runtime environment and database deployment gaps:

- Missing production/runtime secrets: `JWT_SECRET`, `ADMIN_EMAILS`, `SUPABASE_SERVICE_ROLE_KEY`, Supabase public key, and mobile `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Mobile auth is not production-ready until Supabase URL/public key are configured in EAS build env.
- Production Supabase does not expose `public.consume_app_quota`; deploy `supabase/admin_management.sql` and verify with `npm run supabase:quota:verify`.
- `npm audit --omit=dev` still reports moderate Expo SDK 54 transitive issues in `postcss` and `uuid`; npm's advertised fix is a breaking Expo SDK upgrade. Do not force this without SDK migration QA.

## Hardening Applied

- Android permissions are minimized to `CAMERA` and `RECORD_AUDIO`.
- Broad storage/media permissions are explicitly blocked: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, and `READ_MEDIA_AUDIO`.
- WebView third-party cookies are disabled for the parity shell.
- Crash telemetry user scope is reduced to user ID only; email and display name are no longer attached.
- Server, shared, and mobile AI orchestration now include explicit prompt-injection boundaries for user text, attachments, OCR/web content, and conversation memory.
- Regression tests now cover media permission minimization, telemetry PII minimization, WebView cookie policy, and prompt-injection guardrails.
- `npm audit fix` upgraded non-breaking transitive production dependencies, including `protobufjs`, `@protobufjs/utf8`, `ws`, and `brace-expansion`.

## Validation Evidence

- `npm run mobile:lint`: pass.
- `npm run mobile:test`: pass, 9 suites / 40 tests.
- Prompt/security/mobile targeted regression: pass, 61 tests.
- `npm run mobile:doctor`: pass, 18/18 checks.
- `npx expo config --type public`: Android permissions confirm only `CAMERA` and `RECORD_AUDIO`; sensitive media/storage permissions are blocked.
- `npm run test:mobile-parity:e2e`: pass, 28 tests across Mobile Chrome and Mobile Safari.
- `npm run test:ai-brew:real-world-1000`: pass, 1000/1000 scenarios, average score 98.5, verdict `AI BREW REAL-WORLD SCENARIO STRONG / REAL BREW VALIDATION REQUIRED`.
- `npm run launch:doctor`: fail only on production env and mobile auth env; type-check, web build, launch unit contracts, and catalog audits pass.

## Play Store Policy Checks

- Target API: Expo SDK 54 targets Android API 36, which satisfies Google Play's Android 15/API 35+ submission requirement for new apps and updates from 2025-08-31.
- Photo/video access: the app no longer requests broad `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO`; one-time/infrequent media flows should stay on picker/document-picker style access.
- Data Safety and privacy policy: must disclose account data, AI prompts/chat, attachments/images, voice/microphone use, crash telemetry, Supabase/auth data, and third-party processing.
- Account deletion: because account creation/sign-in is supported, Play requires both an in-app deletion path and a web deletion request link.
- Generative AI: chatbot/AI features fall under Google Play AI-generated content policy; keep abuse prevention, refusal behavior, and user feedback/reporting path active.

Official references:

- Google Play target API requirement: https://developer.android.google.cn/google/play/requirements/target-sdk?hl=en
- Google Play photo/video permissions policy: https://support.google.com/googleplay/android-developer/answer/16935362?hl=en-GB
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
- Google Play Data Safety form: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
- Google Play account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- Google Play AI-generated content policy: https://support.google.com/googleplay/android-developer/answer/14094294?hl=en-419
- Expo SDK 54 target SDK table: https://docs.expo.dev/versions/v54.0.0/

## Release Path

1. Configure all missing production and EAS runtime env values.
2. Deploy `supabase/admin_management.sql` to production Supabase.
3. Run `npm run prod:env:check`, `npm run mobile:auth:check`, and `npm run supabase:quota:verify`.
4. Re-run `npm run launch:doctor`.
5. Build Android production AAB with `npm run mobile:eas:build:android-production`.
6. Run internal testing on Android 10, 11, 12, 13, 14, and 15/16 devices or emulators before public rollout.
7. Complete Play Console Data Safety, privacy policy URL, app access/login instructions, account deletion URL, and AI policy disclosures.
