# Mobile Release Checklist

Verified locally on 2026-06-12 for the Android WebView parity shell and mobile/PWA web surfaces.

## Release Configuration

- [x] Production mobile mode is `web_parity`.
- [x] Production fallback to the incomplete native feature surface is disabled.
- [x] Guest mode is disabled; browse-only preview remains available.
- [x] Android package remains `com.baristachaw.mobile`.
- [x] Existing release keystore/alias is preserved.
- [x] Release signer SHA-256 is `3781C67814CB199B95AB9CB086FD273E585D83C6DBBB6B856F56D454FECA5AE0`.
- [x] `allowBackup=false`.

## Android Permissions

- [x] `CAMERA` retained.
- [x] `RECORD_AUDIO` retained.
- [x] `READ_EXTERNAL_STORAGE` blocked.
- [x] `WRITE_EXTERNAL_STORAGE` blocked.
- [x] `READ_MEDIA_IMAGES` blocked.
- [x] `READ_MEDIA_VIDEO` blocked.
- [x] `READ_MEDIA_AUDIO` blocked.
- [x] `MANAGE_EXTERNAL_STORAGE` blocked.
- [x] `SYSTEM_ALERT_WINDOW` blocked.
- [x] APK permission audit passes.
- [x] AAB permission audit passes.

## Artifacts

- [x] Signed release APK built: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- [x] Signed release AAB built: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
- [x] APK installs and launches on Pixel API 35.
- [x] APK installs and launches on Pixel API 36.
- [x] No BaristaChaw fatal exception or ANR found in app-scoped log review.

## Android Emulator QA

- [x] Onboarding and web-parity shell launch.
- [x] WebView route navigation.
- [x] AI Brew modal and search keyboard visibility.
- [x] Overlay-keyboard and `adjustResize` behavior.
- [x] Portrait/landscape/portrait recovery.
- [x] Hardware back behavior.
- [x] Relaunch/session restoration.
- [x] Deep link routing.
- [x] Camera permission prompt.
- [x] Modal focus and footer remain above keyboard.

## Mobile/PWA QA

- [x] Quick and Advanced AI Brew footer closes the viewport without a page strip.
- [x] Picker search/category list remains usable with keyboard open.
- [x] Keyboard overlay offset resets after close and orientation change.
- [x] Safe area and bottom navigation recover after rotation.
- [x] Mobile Chrome E2E passes.
- [x] Mobile Safari E2E passes.
- [x] PWA/native-shell mobile parity passes.
- [x] Saved AI Brew recipe survives reload and appears in Collection.
- [x] Service worker registration passes on Chromium, Firefox, and WebKit.
- [x] Light and dark AI Brew result checks pass.
- [x] Serious/critical axe violations: 0.

## Required Commands

- [x] `pnpm test`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `pnpm mobile:test`
- [x] `pnpm mobile:lint`
- [x] `pnpm mobile:doctor`
- [x] `pnpm test:a11y`
- [x] `pnpm test:e2e:mobile`
- [x] `pnpm test:mobile-parity`
- [x] `pnpm mobile:android:permissions`
- [x] APK permission audit
- [x] `pnpm test:perf`
- [x] `git diff --check`

## External Release Actions

These are outside this certification scope and remain unchecked:

- [ ] Upload AAB to Play Console internal testing.
- [ ] Complete Play Console Data Safety and store listing.
- [ ] Deploy the PWA build.
- [ ] Run production OAuth/payment smoke with production secrets.
- [ ] Collect physical real-brew validation logs.

## Verdict

`READY FOR MVP SOFTWARE RELEASE / REAL BREW VALIDATION REQUIRED`
