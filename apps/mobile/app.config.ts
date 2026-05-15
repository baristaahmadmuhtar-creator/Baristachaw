import type { ExpoConfig, ConfigContext } from 'expo/config';

const DEFAULT_API_BASE_URL = 'https://baristaclaw.vercel.app';
const DEFAULT_WEB_APP_URL = 'https://baristaclaw.vercel.app';
const DEFAULT_SCHEME = 'baristachaw';
const LEGACY_SCHEME = 'baristaclaw';
const DEFAULT_BUNDLE_ID = 'com.baristachaw.app';
const DEFAULT_ANDROID_PACKAGE = 'com.baristachaw.mobile';
const LIGHT_SPLASH_BACKGROUND = '#F2F2F7';
const DARK_SPLASH_BACKGROUND = '#000000';
const IOS_APP_ICON = {
  light: './assets/ios-appicon/AppIcon-Light-1024.png',
  dark: './assets/ios-appicon/AppIcon-Dark-1024.png',
  tinted: './assets/ios-appicon/AppIcon-Tinted-Mono-1024.png',
};
const ANDROID_BLOCKED_STORE_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

function isLocalHttpUrl(value: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value.trim());
}

function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
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
  const enableAppleSignIn = readBooleanEnv(process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGNIN, false);
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
    slug: 'baristaclaw-mobile',
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
      icon: IOS_APP_ICON,
      usesAppleSignIn: enableAppleSignIn,
      scheme: appSchemes,
      infoPlist: {
        NSCameraUsageDescription: 'BaristaChaw uses the camera for live Vision Scan and photo attachments.',
        NSPhotoLibraryUsageDescription: 'BaristaChaw uses your photo library to pick coffee photos and videos for analysis.',
        NSMicrophoneUsageDescription: 'BaristaChaw uses the microphone for voice note transcription in chat.',
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
      allowBackup: false,
      blockedPermissions: ANDROID_BLOCKED_STORE_PERMISSIONS,
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
        backgroundColor: '#F5F8FE',
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
