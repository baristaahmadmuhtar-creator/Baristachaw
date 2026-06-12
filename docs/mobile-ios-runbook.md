# Mobile iOS Runbook (Parity Track, Local-Free)

Current local compatibility baseline:
- macOS 12.7.6 + Xcode 14.2
- Expo SDK 54 + React Native 0.81.5

## 1. Local Prerequisites

1. Move Xcode to `/Applications/Xcode.app`.
2. Set active developer path:
   ```bash
   sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer
   ```
3. Complete first launch setup:
   ```bash
   sudo xcodebuild -runFirstLaunch
   ```
4. Install required tooling:
   ```bash
   brew install watchman cocoapods
   ```
5. Verify toolchain:
   ```bash
   sw_vers
   xcodebuild -version
   xcrun simctl list devices
   pod --version
   watchman --version
   ```

## 2. Environment Setup

### Backend (`.env.local`)

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
APP_URL=https://app.baristachaw.com
MOBILE_APP_SCHEME=baristachaw
MOBILE_AUTH_GRANT_TTL_SEC=120
APPLE_BUNDLE_ID=com.baristachaw.app
```

### Mobile (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_BASE_URL=https://app.baristachaw.com
EXPO_PUBLIC_APP_SCHEME=baristachaw
EXPO_PUBLIC_MOBILE_UI_MODE=web_parity
EXPO_PUBLIC_WEB_PARITY_TIMEOUT_MS=6000
EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED=true
EXPO_PUBLIC_ENABLE_GUEST_MODE=false
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_RELEASE=local-free
```

## 3. Install and Gates

From repo root:

```bash
npm install
npm run check
npm run mobile:lint
npm run mobile:test
```

## 4. Start Dev Client

```bash
npm run mobile:start
```

This starts in Expo Go mode by default.

For custom dev-client mode:

```bash
npm run mobile:start:dev-client
```

## 5. Generate Native iOS Project

```bash
npx expo prebuild --platform ios --project-dir apps/mobile
```

## 6. Build and Install (Local-Free)

1. Open `apps/mobile/ios/*.xcworkspace` in Xcode.
2. Set Apple Team in Signing & Capabilities.
3. Use unique bundle ID if required by free provisioning.
4. Select simulator/device compatible with your local Xcode runtime.
5. Run with `Cmd + R`.

## 7. OAuth Flow (Mobile)

1. Google flow: app requests `/api/auth/mobile/start`.
2. Browser opens Google consent.
3. Google redirects to `/api/auth/mobile/callback`.
4. Callback redirects to `baristachaw://auth?grant=...`.
5. App exchanges grant at `/api/auth/mobile/exchange`.
6. Apple flow (optional): enabled only when `EXPO_PUBLIC_ENABLE_APPLE_SIGNIN=true`; otherwise shown as maintenance state.
7. App stores `accessToken` in `expo-secure-store`.

## 8. Stability and Telemetry

- Mobile app initializes Sentry when `EXPO_PUBLIC_SENTRY_DSN` is provided.
- Error handling uses typed envelope (`status`, `errorCode`, `retryable`, `details`, `requestId`).
- API client has timeout + bounded retry policy for transient failures.

## 9. Local Constraints and Cutover

- macOS 12.7.6 + Xcode 14.2 can run iOS 16.2 simulators, but cannot directly target iOS 18.3.2 physical devices.
- Local-free signing is temporary and must be renewed periodically.
- Before App Store submission, move final build/signing to modern Xcode host and rerun all gates.

## 10. TestFlight Pipeline (EAS)

From repo root:

```bash
npm run mobile:doctor
npm run mobile:eas:build:preview
npm run mobile:eas:submit:preview
```

Profiles are configured in `apps/mobile/eas.json`:
- `development`
- `preview` (TestFlight)
- `production`

## 11. Troubleshooting

- `xcodebuild requires Xcode`: active path still points to CommandLineTools.
- `pod: command not found`: install CocoaPods via Homebrew.
- Expo Go cannot open this project on iOS:
  - Expo Go on iOS supports only recent Expo SDK generations.
  - If SDK 49 is rejected by current Expo Go, run dev-client mode instead or upgrade Expo SDK before relying on Expo Go.
- OAuth callback not returning to app:
  - ensure `MOBILE_APP_SCHEME` backend and `EXPO_PUBLIC_APP_SCHEME` mobile match.
  - verify scheme exists in app config + native plist.
- API `401` after login:
  - verify `Authorization: Bearer <token>` sent.
  - verify `JWT_SECRET` and auth envs are present in runtime.
- Metro monorepo mismatch:
  - keep root metro pinned for SDK compatibility.
