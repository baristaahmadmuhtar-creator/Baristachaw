# Mobile Release Checklist (Parity + Stability)

## A. Backend Readiness

- [ ] `JWT_SECRET` set in production.
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set.
- [ ] `APPLE_BUNDLE_ID` set and matches iOS bundle identifier.
- [ ] `APP_URL=https://baristaclaw.vercel.app` set.
- [ ] `MOBILE_APP_SCHEME=baristachaw` set.
- [ ] `MOBILE_AUTH_GRANT_TTL_SEC` set (default 120).

## B. Mobile Config

- [ ] `EXPO_PUBLIC_API_BASE_URL=https://baristaclaw.vercel.app`.
- [ ] `EXPO_PUBLIC_APP_SCHEME=baristachaw`.
- [ ] `EXPO_PUBLIC_WEB_PARITY_TIMEOUT_MS=6000`.
- [ ] `EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED=true`.
- [ ] `EXPO_PUBLIC_ENABLE_GUEST_MODE=true`.
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set (or intentionally empty for local-only).
- [ ] `EXPO_PUBLIC_RELEASE` set for environment labeling.
- [ ] iOS bundle identifier validated.
- [ ] Signing team selected in Xcode.

## C. Quality Gates (Required)

- [ ] `npm run check` passes.
- [ ] `npm run mobile:lint` passes.
- [ ] `npm run mobile:test` passes (no `No tests found`).
- [ ] `npm run mobile:doctor` passes.
- [ ] `docs/mobile-parity-matrix.md` reviewed and all `OPEN` items accepted.

## D. Functional QA Scenarios

- [ ] Expo Go launch via `npm run mobile:start` works for current SDK target.
- [ ] Google sign in opens browser and returns to app.
- [ ] Apple entry shows maintenance state when `EXPO_PUBLIC_ENABLE_APPLE_SIGNIN=false`.
- [ ] Guest mode shows useful content without login.
- [ ] Session persists after relaunch and expires correctly.
- [ ] Logout clears local session.
- [ ] Home search works and save-to-collection works.
- [ ] Chat normal/fast/deep response works.
- [ ] Chat session history, rename, delete, folder move works.
- [ ] Chat attachments (image/video/file/audio) are processed correctly.
- [ ] Chat text-to-speech playback works.
- [ ] Chat image generation works.
- [ ] Scanner auto/ocr/video work from camera, gallery, and files.
- [ ] Scanner live camera capture works in-app.
- [ ] Native share sheet works (Home/Chat/Scanner/Collection).
- [ ] Haptics trigger for timer + scanner + save success.
- [ ] Collection note create/edit/delete/filter/search works.
- [ ] Collection folder CRUD and move-item works.
- [ ] Tools timer/ratio/todo flows work.

## E. Security + Reliability

- [ ] Mobile exchange grant is one-time use.
- [ ] Expired grant rejected.
- [ ] API protected routes accept Bearer token.
- [ ] Error envelopes (`errorCode`, `retryable`, `details`) handled cleanly.
- [ ] Sentry receives runtime errors with release/environment tags.
- [ ] No production secrets inside mobile source code.

## F. Local-Free Track Constraints

- [ ] Team acknowledges free signing validity is limited (typically ~7 days).
- [ ] Team acknowledges macOS 12 + Xcode 14.2 cannot directly deploy to iOS 18.3.2 devices.
- [ ] Cutover plan to modern build host documented before App Store submission.

## G. Submit

- [ ] `npm run mobile:eas:build:preview` succeeds.
- [ ] `npm run mobile:eas:submit:preview` succeeds.
- [ ] Release notes prepared from template.
