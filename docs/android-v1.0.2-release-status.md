# Baristachaw Android v1.0.2 Release Status

Date: 2026-06-12 (Asia/Brunei)

## Summary verdict

`NEEDS REFINEMENT BEFORE MVP`

The v1.0.2 Android artifacts are built, signed, and statically validated. The software, AI Brew, landing, accessibility, and mobile browser gates pass. Production certification is still blocked by the API 35/36 emulator rerun and unauthenticated Cloudflare DNS changes.

## Artifact evidence

- Package: `com.baristachaw.mobile`
- Version: `1.0.2`
- Version code: `3`
- Signer SHA-256: `3781C67814CB199B95AB9CB086FD273E585D83C6DBBB6B856F56D454FECA5AE0`
- APK SHA-256: `8E8619A2ED3D1B6481A0EE90C1AFFCBF160D83D41F7FD1F285FE9AE3F073E3AF`
- AAB SHA-256: `4FEF2CBD93541213A627AC81006FD9C6D0154EB3124A166006D18B7649D4A297`
- Blocked permission count: 0
- Baked app origin: `https://app.baristachaw.com`
- Old baked origin present: no

## Gate results

- Unit: 729 pass, 4 intentional stress skips
- Mobile unit: 40/40
- Landing E2E and axe: 10/10 local and 10/10 Vercel production
- App accessibility: 12/12
- Mobile E2E: 32/32
- Mobile parity: 10/10 unit and 28/28 E2E
- Expo Doctor: 18/18
- Method/style audit: 1,000/1,000, 17 warnings, 0 failures
- Source-backed audit: 1,000/1,000, 1,869 warnings, 0 failures
- Android release permission audit: pass

## Remaining blockers

1. Re-run install, launch, WebView, keyboard/modal, rotation, hardware back, deep link, relaunch, and fatal logcat checks on fresh API 35 and API 36 AVDs. Local system-image installation was blocked by disk quota.
2. Add the Vercel-provided DNS-only records for `baristachaw.com` and `www.baristachaw.com` in an authenticated Cloudflare session.
3. Verify Supabase and OAuth provider redirect allowlists outside the repository.

## Real brew validation

Recipe arithmetic and workflow guardrails are software-validated. Physical extraction and final sensory cup quality still require real brew logs.
