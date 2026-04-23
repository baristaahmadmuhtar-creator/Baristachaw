import type { ExpoConfig, ConfigContext } from 'expo/config';

const DEFAULT_API_BASE_URL = 'https://baristaclaw.vercel.app';
const DEFAULT_WEB_APP_URL = 'https://baristaclaw.vercel.app';
const DEFAULT_SCHEME = 'baristaclaw';
const DEFAULT_BUNDLE_ID = 'com.baristaclaw.app';
const DEFAULT_ANDROID_PACKAGE = 'com.baristaclaw.mobile';

function isLocalHttpUrl(value: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value.trim());
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_WEB_APP_URL;
  const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME || DEFAULT_SCHEME;
  const mobileUiMode = process.env.EXPO_PUBLIC_MOBILE_UI_MODE || 'native';
  const webParityTimeoutMs = process.env.EXPO_PUBLIC_WEB_PARITY_TIMEOUT_MS || '6000';
  const webParityFallbackEnabled = process.env.EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED || 'false';
  const enableGuestMode = process.env.EXPO_PUBLIC_ENABLE_GUEST_MODE || 'true';
  const enableAppleSignIn = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGNIN || 'false';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  const release = process.env.EXPO_PUBLIC_RELEASE || 'mobile-local';
  const allowLocalHttp = isLocalHttpUrl(apiBaseUrl) || isLocalHttpUrl(webAppUrl);

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
    name: 'BaristaClaw',
    slug: 'baristaclaw-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: appScheme,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1d1d1f',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: DEFAULT_BUNDLE_ID,
      infoPlist: {
        NSCameraUsageDescription: 'BaristaClaw uses the camera for live Vision Scan and photo attachments.',
        NSPhotoLibraryUsageDescription: 'BaristaClaw uses your photo library to pick coffee photos and videos for analysis.',
        NSMicrophoneUsageDescription: 'BaristaClaw uses the microphone for voice note transcription in chat.',
        NSAppTransportSecurity: atsPolicy,
        ITSAppUsesNonExemptEncryption: false,
        UIRequiresFullScreen: true,
        UIStatusBarHidden: true,
        UIViewControllerBasedStatusBarAppearance: false,
      },
    },
    android: {
      package: DEFAULT_ANDROID_PACKAGE,
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
          ],
        },
      ],
      adaptiveIcon: {
        backgroundColor: '#1d1d1f',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-splash-screen',
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
