# Mobile Supabase Auth Runbook

This runbook covers the Android launch auth flow. The strategy is a native APK shell with the production web parity UI as the primary surface.

## Android UI Strategy

- `web_parity` is the permanent default for the Android launch build.
- The app is still a native Android app/APK, not a PWA.
- Native screens stay in the repo as an opt-in fallback and future refinement path only.
- Do not switch the default back to `native` until the native UI reaches parity with the web experience.

## Runtime Flow

1. The Expo mobile app signs in with Supabase Auth.
2. For Google, the app opens a secure browser session and receives the `baristaclaw://auth` deep link.
3. The app stores the Supabase session in Expo SecureStore through chunked secure storage.
4. The app sends the Supabase access token to `/api/auth/mobile/supabase/exchange`.
5. The API verifies the token against Supabase Auth and returns the BaristaClaw API JWT used by existing mobile features.
6. For password recovery, Supabase returns to `baristaclaw://auth` with a recovery callback, the app asks for a new password, then exchanges the refreshed Supabase session for a BaristaClaw API session.

## Supabase Project Setup

1. Enable Email Auth in Supabase Auth providers.
2. Enable Google Auth in Supabase Auth providers.
3. Enable password recovery emails in Supabase Auth email templates.
4. Add the Android native redirect URL to Supabase Auth URL Configuration:

```text
baristaclaw://auth
```

5. Keep the hosted app URL as an additional redirect URL if web auth still uses it:

```text
https://baristaclaw.vercel.app/**
```

6. Configure the Google provider with the OAuth client credentials created for the Supabase project callback URL.
7. Confirm the recovery email link opens `baristaclaw://auth` on Android. The user should land on the "Buat password baru" screen, not the webview.

## Mobile Environment

Set these in `apps/mobile/.env` or the EAS build environment:

```text
EXPO_PUBLIC_MOBILE_UI_MODE=web_parity
EXPO_PUBLIC_APP_SCHEME=baristaclaw
EXPO_PUBLIC_API_BASE_URL=https://baristaclaw.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

## API Environment

Set these in Vercel or the server runtime:

```text
JWT_SECRET=long-random-production-secret
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

`SUPABASE_ANON_KEY` is accepted as a fallback for older projects, but use the publishable key name for new configuration.

## Production Checks

- Build Android native, not PWA, with `EXPO_PUBLIC_MOBILE_UI_MODE=web_parity`.
- Confirm the installed Android app opens the web parity UI without a browser address bar.
- Confirm `baristaclaw://auth` opens the installed app on Android.
- Confirm email sign-up either creates a session or shows the email confirmation message.
- Confirm the reset-password email opens the installed Android app and accepts a new password.
- Confirm "Bantuan akun" explains that BaristaClaw uses Google/email identity and does not expose username lookup.
- Confirm Google sign-in returns to the app and `/api/auth/me` succeeds.
- Confirm logout clears both Supabase local session and BaristaClaw API session.

## References

- Supabase Expo React Native auth: https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
- Supabase Expo React Native setup: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Expo WebBrowser AuthSession: https://docs.expo.dev/versions/latest/sdk/webbrowser/
