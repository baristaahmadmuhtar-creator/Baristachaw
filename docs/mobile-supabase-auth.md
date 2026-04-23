# Mobile Supabase Auth Runbook

This runbook covers the Android MVP auth flow. The MVP strategy is a native APK shell with the production web parity UI as the primary surface.

## MVP UI Strategy

- `web_parity` is the permanent default for Android MVP.
- The app is still a native Android app/APK, not a PWA.
- Native screens stay in the repo as an opt-in fallback and future refinement path only.
- Do not switch the default back to `native` until the native UI reaches parity with the web experience.

## Runtime Flow

1. The Expo mobile app signs in with Supabase Auth.
2. For Google, the app opens a secure browser session and receives the `baristaclaw://auth` deep link.
3. The app stores the Supabase session in Expo SecureStore through chunked secure storage.
4. The app sends the Supabase access token to `/api/auth/mobile/supabase/exchange`.
5. The API verifies the token against Supabase Auth and returns the BaristaClaw API JWT used by existing mobile features.

## Supabase Project Setup

1. Enable Email Auth in Supabase Auth providers.
2. Enable Google Auth in Supabase Auth providers.
3. Add the Android native redirect URL to Supabase Auth URL Configuration:

```text
baristaclaw://auth
```

4. Keep the hosted app URL as an additional redirect URL if web/PWA auth still uses it:

```text
https://baristaclaw.vercel.app/**
```

5. Configure the Google provider with the OAuth client credentials created for the Supabase project callback URL.

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
- Confirm Google sign-in returns to the app and `/api/auth/me` succeeds.
- Confirm logout clears both Supabase local session and BaristaClaw API session.

## References

- Supabase Expo React Native auth: https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
- Supabase Expo React Native setup: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Expo WebBrowser AuthSession: https://docs.expo.dev/versions/latest/sdk/webbrowser/
