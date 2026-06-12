# Baristachaw iOS Web Wrapper Launch

## Runtime contract

- The iOS app is an Expo/React Native shell that launches `WebParityScreen` by default.
- `WebParityScreen` loads `https://app.baristachaw.com?runtime=web_parity&ui_profile=pwa&native_shell=ios`.
- The native tab shell is not used unless `EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED=true`.
- The wrapper hides the native status bar and disables WebView safe-area content inset adjustment.
- Production EAS builds force `EXPO_PUBLIC_MOBILE_UI_MODE=web_parity`.

## App Store build commands

Run from the repository root:

```powershell
npm run mobile:lint
npm run mobile:test
npm run smoke:prod
npm run mobile:eas:build:production
```

Submit after the EAS build is successful:

```powershell
npm run mobile:eas:submit:production
```

## Required production configuration

- Apple Developer Program membership must be active.
- App Store Connect app record must use bundle ID `com.baristachaw.app`.
- EAS must be logged in and able to manage iOS signing credentials.
- Run one interactive EAS credentials setup if remote credentials are not ready:

```powershell
cd apps/mobile
npx eas build --platform ios --profile production
```

- Production web must be live at `https://app.baristachaw.com`.
- Backend auth, AI, scanner, and collection APIs must be live during App Review.
- If account features require sign-in, provide App Review with a demo account or fully-featured demo mode.

## App Review risk gates

Apple's current App Review Guidelines require final, tested builds, live backend services, and full App Review access for account-based features. See Apple's guideline page: https://developer.apple.com/app-store/review/guidelines/

Apple also requires an equivalent privacy-preserving login option when an app uses third-party/social login for a primary account. If the web app exposes Google login in the iOS wrapper, enable and verify Apple login before submitting.

Pure website wrappers can be scrutinized under Minimum Functionality review. Keep native permissions, scanner/camera flows, offline handling, and review notes clear so the app is presented as the Baristachaw mobile client, not just a bookmark.

## Reviewer notes draft

```text
Baristachaw is an AI-powered coffee assistant. The iOS app uses a native Expo shell with WKWebView to deliver the same production Baristachaw experience as the web app, including AI chat, Vision Scan, AI Brew planning, brew tools, and collection workflows.

Production backend:
https://app.baristachaw.com

If sign-in is required for protected features, use the provided demo account or guest/demo flow. Camera and photo permissions are used for Vision Scan and image attachments. Microphone permission is used for voice note transcription.
```
