import type { ExpoConfig, ConfigContext } from 'expo/config';

const DEFAULT_API_BASE_URL = 'https://baristaclaw.vercel.app';
const DEFAULT_WEB_APP_URL = 'https://baristaclaw.vercel.app';
const DEFAULT_SCHEME = 'baristachaw';
const LEGACY_SCHEME = 'baristaclaw';
const DEFAULT_BUNDLE_ID = 'com.baristachaw.app';
const DEFAULT_ANDROID_PACKAGE = 'com.baristachaw.mobile';
const LIGHT_SPLASH_BACKGROUND = '#F2F2F7';
const DARK_SPLASH_BACKGROUND = '#000000';

function isLocalHttpUrl(value: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value.trim());
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_WEB_APP_URL;
  const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME || DEFAULT_SCHEME;
  // Keep Android MVP focused on the production web parity UI inside the native shell.
  const mobileUiMode = process.env.EXPO_PUBLIC_MOBILE_UI_MODE || 'web_parity';
  const webParityTimeoutMs = process.env.EXPO_PUBLIC_WEB_PARITY_TIMEOUT_MS || '6000';
  const webParityFallbackEnabled = process.env.EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED || 'false';
  const enableGuestMode = process.env.EXPO_PUBLIC_ENABLE_GUEST_MODE || 'true';
  const enableAppleSignIn = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGNIN || 'false';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  const release = process.env.EXPO_PUBLIC_RELEASE || 'mobile-local';
  const allowLocalHttp = isLocalHttpUrl(apiBaseUrl) || isLocalHttpUrl(webAppUrl);
  const appSchemes = Array.from(new Set([appScheme, LEGACY_SCHEME].filter(Boolean)));

  const atsPolicy: Record<string, unknown> = {
    NSAllowsArbitraryLoads: false,
  };
  if (allowLocalHttp) {
    atsPolicy.NSExceptionDomains = {
      localhost: {
        NSExceptionAllowsInsecureHTTPLoads: true,
      },
      '127.0.0.1': {
        NSExceptionAllowsInsecureHTTPLoads: true,
      },
    };
  }

  return {
    ...config,
    name: 'Baristachaw',
    slug: 'baristachaw-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: appSchemes,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: LIGHT_SPLASH_BACKGROUND,
      dark: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: DARK_SPLASH_BACKGROUND,
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: DEFAULT_BUNDLE_ID,
      scheme: appSchemes,
      infoPlist: {
        NSCameraUsageDescription: 'Baristachaw uses the camera for live Vision Scan and photo attachments.',
        NSPhotoLibraryUsageDescription: 'Baristachaw uses your photo library to pick coffee photos and videos for analysis.',
        NSMicrophoneUsageDescription: 'Baristachaw uses the microphone for voice note transcription in chat.',
        NSAppTransportSecurity: atsPolicy,
        ITSAppUsesNonExemptEncryption: false,
        UIRequiresFullScreen: true,
        UIStatusBarHidden: true,
        UIViewControllerBasedStatusBarAppearance: false,
      },
    },
    android: {
      package: DEFAULT_ANDROID_PACKAGE,
      newArchEnabled: false,
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'READ_MEDIA_AUDIO',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          category: ['BROWSABLE', 'DEFAULT'],
          data: [
            {
              scheme: appScheme,
              host: 'auth',
            },
            {
              scheme: LEGACY_SCHEME,
              host: 'auth',
            },
          ],
        },
      ],
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: LIGHT_SPLASH_BACKGROUND,
        dark: {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: DARK_SPLASH_BACKGROUND,
        },
      },
      adaptiveIcon: {
        backgroundColor: '#07378A',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      './plugins/with-android-monorepo-release-bundle',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: LIGHT_SPLASH_BACKGROUND,
          dark: {
            image: './assets/splash-icon.png',
            backgroundColor: DARK_SPLASH_BACKGROUND,
          },
        },
      ],
      [
        'expo-web-browser',
        {
          experimentalLauncherActivity: true,
        },
      ],
    ],
    extra: {
      apiBaseUrl,
      webAppUrl,
      appScheme,
      androidPackage: DEFAULT_ANDROID_PACKAGE,
      mobileUiMode,
      webParityTimeoutMs,
      webParityFallbackEnabled,
      enableGuestMode,
      enableAppleSignIn,
      supabaseUrl,
      supabasePublishableKey,
      sentryDsn,
      release,
      eas: {
        projectId: 'c985c9b2-f7ca-4ff1-bfa2-e06ef3c182ec',
      },
    },
  };
};
