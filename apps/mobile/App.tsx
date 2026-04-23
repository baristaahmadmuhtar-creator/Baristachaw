import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PARITY_NAV_META } from '@baristachaw/shared';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { ToolsScreen } from './src/screens/ToolsScreen';
import { WebParityScreen } from './src/screens/WebParityScreen';
import { MobileAuthGate } from './src/screens/MobileAuthGate';
import { OfflineBanner } from './src/components/OfflineBanner';
import { usePreferredMobileLanguage } from './src/hooks/usePreferredMobileLanguage';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { ApiClient } from './src/services/apiClient';
import { clearAuthSession, inspectAuthSession, saveAuthSession } from './src/services/authStore';
import {
  clearSupabaseMobileSession,
  completeSupabaseDeepLink,
  isSupabaseMobileAuthUrl,
  restoreSupabaseMobileSession,
  sendPasswordResetSupabaseEmail,
  startAppleMobileOAuth,
  startEmailSupabaseAuth,
  startGoogleMobileOAuth,
  startGoogleSupabaseOAuth,
  updateSupabasePassword,
} from './src/services/authFlow';
import { quickSaveInsight } from './src/services/mobileStore';
import { isSupabaseAuthConfigured, mobileEnv } from './src/config/env';
import { captureError, captureMessage, initTelemetry, setTelemetryUser, trackEvent } from './src/services/telemetry';
import { uiTokenPalettes, uiTokens } from './src/theme/tokens';
import { getMobileLocalization } from './src/utils/localization';
import type { AuthSession, EmailAuthPayload, MobileQuickSavePayload, PasswordResetPayload, PasswordUpdatePayload } from './src/types';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const Tab = createBottomTabNavigator();

type IoniconName = keyof typeof Ionicons.glyphMap;

type RootMode = 'web_parity' | 'native';

type AuthProvider = 'google' | 'apple' | 'email' | null;

const TAB_ICONS: Record<string, { active: IoniconName; idle: IoniconName }> = {
  Home: { active: 'home', idle: 'home-outline' },
  Chat: { active: 'chatbubble-ellipses', idle: 'chatbubble-ellipses-outline' },
  Scanner: { active: 'scan', idle: 'scan-outline' },
  Collection: { active: 'book', idle: 'book-outline' },
  Tools: { active: 'speedometer', idle: 'speedometer-outline' },
};

function resolveSystemPalette(colorScheme: ReturnType<typeof useColorScheme>) {
  return colorScheme === 'dark'
    ? {
        bgBase: uiTokenPalettes.dark.bgBase,
        accent: uiTokenPalettes.dark.accent,
        textSecondary: '#EBEBF5',
      }
    : {
        bgBase: uiTokenPalettes.light.bgBase,
        accent: uiTokenPalettes.light.accent,
        textSecondary: '#3C3C43',
      };
}

function buildNavigationTheme(colorScheme: ReturnType<typeof useColorScheme>): Theme {
  const palette = colorScheme === 'dark' ? uiTokenPalettes.dark : uiTokenPalettes.light;
  return {
    dark: colorScheme === 'dark',
    colors: {
      primary: palette.accent,
      background: palette.bgBase,
      card: 'transparent',
      text: palette.textPrimary,
      border: palette.panelStroke,
      notification: palette.accent,
    },
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <AppRoot />
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const colorScheme = useColorScheme();
  const systemPalette = useMemo(() => resolveSystemPalette(colorScheme), [colorScheme]);
  const bootToWebParity = mobileEnv.uiMode === 'web_parity'
    || mobileEnv.runtimePolicy === 'native_hard_fail_to_debug_parity';
  const [rootMode, setRootMode] = useState<RootMode>(bootToWebParity ? 'web_parity' : 'native');
  const [surfaceReady, setSurfaceReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter: require('./assets/fonts/Inter.ttf'),
  });
  const assetsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (fontError) {
      captureError(fontError, { phase: 'font_bootstrap' });
    }
  }, [fontError]);

  useEffect(() => {
    if (assetsReady && surfaceReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [assetsReady, surfaceReady]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(systemPalette.bgBase).catch(() => undefined);
  }, [systemPalette.bgBase]);

  const handleParityReady = () => {
    trackEvent('screen_ready', { screen: 'web_parity', runtimePolicy: mobileEnv.runtimePolicy });
    setSurfaceReady(true);
  };

  const handleParityFailure = (reason: 'error' | 'http_error' | 'load_error') => {
    captureMessage('Web parity shell failed.', {
      reason,
      runtimePolicy: mobileEnv.runtimePolicy,
      fallbackEnabled: mobileEnv.webParityFallbackEnabled,
    });
    trackEvent('fallback_triggered', {
      reason,
      runtimePolicy: mobileEnv.runtimePolicy,
      debugParityEnabled: mobileEnv.debugWebParityEnabled,
      fallbackEnabled: mobileEnv.webParityFallbackEnabled,
    });
    setSurfaceReady(true);
    if (mobileEnv.webParityFallbackEnabled) {
      setRootMode('native');
    }
  };

  if (rootMode === 'web_parity') {
    return (
      <WebParityShell
        onBootReady={() => setSurfaceReady(true)}
        onParityReady={handleParityReady}
        onParityFailure={handleParityFailure}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: systemPalette.bgBase }]}>
      <NativeApp onBootReady={() => setSurfaceReady(true)} />
    </View>
  );
}

type WebParityShellProps = {
  onBootReady: () => void;
  onParityReady: () => void;
  onParityFailure: (reason: 'error' | 'http_error' | 'load_error') => void;
};

function WebParityShell({ onBootReady, onParityReady, onParityFailure }: WebParityShellProps) {
  const colorScheme = useColorScheme();
  const systemPalette = useMemo(() => resolveSystemPalette(colorScheme), [colorScheme]);
  const { isOnline } = useNetworkStatus();
  const didReportBootReady = useRef(false);
  const authBusyProviderRef = useRef<AuthProvider>(null);
  const handledAuthUrlsRef = useRef<Set<string>>(new Set());
  const [booting, setBooting] = useState(true);
  const [authBusyProvider, setAuthBusyProvider] = useState<AuthProvider>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const [passwordRecoveryEmail, setPasswordRecoveryEmail] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<AuthSession | null>(null);

  const accessToken = session?.accessToken || null;
  const apiClient = useMemo(() => new ApiClient({ getAccessToken: () => accessToken }), [accessToken]);

  useEffect(() => {
    authBusyProviderRef.current = authBusyProvider;
  }, [authBusyProvider]);

  useEffect(() => {
    void initTelemetry({
      dsn: mobileEnv.sentryDsn,
      environment: mobileEnv.release.includes('prod') ? 'production' : 'local',
      release: `mobile@${mobileEnv.release}`,
    });
  }, []);

  useEffect(() => {
    setTelemetryUser(session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          username: session.user.name,
        }
      : null);
  }, [session?.user]);

  const persistSession = useCallback(async (nextSession: AuthSession, provider: 'google' | 'apple' | 'email') => {
    await saveAuthSession(nextSession);
    setSession(nextSession);
    setAuthError(null);
    setPasswordRecoveryActive(false);
    setPasswordRecoveryEmail(undefined);
    trackEvent('auth_success', { provider, surface: 'web_parity_gate' });
    if (provider === 'google') {
      trackEvent('auth_success_google', { surface: 'web_parity_gate' });
    }
  }, []);

  const clearNativeSession = useCallback(async (reason: string, nextError?: string | null) => {
    await clearSupabaseMobileSession().catch(() => undefined);
    await clearAuthSession().catch(() => undefined);
    setSession(null);
    setAuthError(nextError || null);
    setPasswordRecoveryActive(false);
    setPasswordRecoveryEmail(undefined);
    trackEvent('auth_session_invalidated', { reason, surface: 'web_parity_gate' });
  }, []);

  const verifySession = useCallback(async (targetSession: AuthSession, phase: string): Promise<boolean> => {
    if (!isOnline) return true;
    try {
      const bootstrapClient = new ApiClient({ getAccessToken: () => targetSession.accessToken });
      await bootstrapClient.getAuthMe();
      return true;
    } catch (error) {
      captureError(error, { phase, reason: 'web_parity_session_verify_failed' });
      await clearNativeSession('server_rejected', 'Sesi login berakhir. Silakan masuk lagi.');
      return false;
    }
  }, [clearNativeSession, isOnline]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const storedState = await inspectAuthSession();
        if (cancelled) return;

        if (storedState.status === 'active') {
          setSession(storedState.session);
          setPasswordRecoveryActive(false);
          setPasswordRecoveryEmail(undefined);
          if (isOnline) {
            await verifySession(storedState.session, 'web_parity_bootstrap');
          }
          return;
        }

        if (isOnline && isSupabaseAuthConfigured) {
          try {
            const bootstrapClient = new ApiClient({ getAccessToken: () => null });
            const restoredSession = await restoreSupabaseMobileSession(bootstrapClient);
            if (restoredSession && !cancelled) {
              await saveAuthSession(restoredSession);
              setSession(restoredSession);
              setAuthError(null);
              setPasswordRecoveryActive(false);
              setPasswordRecoveryEmail(undefined);
              trackEvent('auth_session_restored', { provider: restoredSession.provider || 'supabase', surface: 'web_parity_gate' });
              return;
            }
          } catch (error) {
            captureError(error, { phase: 'web_parity_supabase_restore' });
          }
        }

        if (storedState.status === 'expired') {
          await clearAuthSession().catch(() => undefined);
          setAuthError('Sesi sebelumnya berakhir. Masuk lagi untuk melanjutkan.');
        } else if (storedState.status === 'invalid') {
          await clearAuthSession().catch(() => undefined);
          setAuthError('Data login tersimpan direset. Silakan masuk lagi.');
        } else {
          setAuthError(null);
        }
        setSession(null);
      } catch (error) {
        captureError(error, { phase: 'web_parity_auth_bootstrap' });
        setSession(null);
        setAuthError('Gagal menyiapkan login. Coba muat ulang aplikasi.');
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isOnline, verifySession]);

  useEffect(() => {
    if (!booting && !didReportBootReady.current) {
      didReportBootReady.current = true;
      trackEvent('screen_ready', {
        screen: 'web_parity_auth_gate',
        runtimePolicy: mobileEnv.runtimePolicy,
        hasSession: Boolean(session),
      });
      onBootReady();
    }
  }, [booting, onBootReady, session]);

  useEffect(() => {
    if (!isOnline || !session?.accessToken || booting) return;
    let cancelled = false;
    const sync = async () => {
      const ok = await verifySession(session, 'web_parity_foreground_sync');
      if (!cancelled && ok) setAuthError(null);
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [booting, isOnline, session, verifySession]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const msUntilExpiry = session.expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      void clearNativeSession('expired_in_memory', 'Sesi login berakhir. Silakan masuk lagi.');
      return;
    }

    const timeout = setTimeout(() => {
      void clearNativeSession('expired_in_memory', 'Sesi login berakhir. Silakan masuk lagi.');
    }, msUntilExpiry + 250);

    return () => clearTimeout(timeout);
  }, [clearNativeSession, session?.expiresAt]);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;
    let cancelled = false;

    const consumeAuthUrl = async (url: string | null) => {
      if (!url || cancelled || session || !isSupabaseMobileAuthUrl(url)) return;
      if (handledAuthUrlsRef.current.has(url)) return;
      handledAuthUrlsRef.current.add(url);
      if (authBusyProviderRef.current) return;

      if (!isOnline) {
        setAuthError('Tidak ada koneksi internet. Sambungkan lagi untuk masuk.');
        return;
      }

      setAuthBusyProvider('email');
      setAuthError(null);

      try {
        const result = await completeSupabaseDeepLink(apiClient, url);
        if (!result || cancelled) return;
        if (result.kind === 'passwordRecovery') {
          setPasswordRecoveryActive(true);
          setPasswordRecoveryEmail(result.email);
          setSession(null);
          setAuthError(null);
          trackEvent('auth_password_recovery_opened', { surface: 'web_parity_gate' });
          return;
        }
        const provider = result.session.provider === 'google' ? 'google' : 'email';
        await persistSession(result.session, provider);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menyelesaikan login.';
        setAuthError(message);
        captureError(error, { phase: 'web_parity_supabase_deep_link' });
      } finally {
        if (!cancelled) setAuthBusyProvider(null);
      }
    };

    void Linking.getInitialURL().then(consumeAuthUrl).catch((error) => {
      captureError(error, { phase: 'web_parity_supabase_initial_url' });
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void consumeAuthUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [apiClient, isOnline, persistSession, session]);

  const handleGoogleLogin = async () => {
    if (!isOnline) {
      setAuthError('Tidak ada koneksi internet. Sambungkan lagi untuk masuk.');
      return;
    }

    setAuthBusyProvider('google');
    setAuthError(null);
    trackEvent('auth_started', { provider: 'google', surface: 'web_parity_gate' });

    try {
      const nextSession = isSupabaseAuthConfigured
        ? await startGoogleSupabaseOAuth(apiClient)
        : await startGoogleMobileOAuth(apiClient);
      await persistSession(nextSession, 'google');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal masuk dengan Google.';
      setAuthError(message);
      captureError(error, { phase: 'web_parity_login_google' });
      trackEvent('auth_fail_google', { message, surface: 'web_parity_gate' });
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handleEmailAuth = async (payload: EmailAuthPayload) => {
    if (!isSupabaseAuthConfigured) {
      setAuthError('Masuk dengan email belum tersedia di perangkat ini. Gunakan Google untuk melanjutkan.');
      return;
    }
    if (!isOnline) {
      setAuthError('Tidak ada koneksi internet. Sambungkan lagi untuk masuk.');
      return;
    }

    setAuthBusyProvider('email');
    setAuthError(null);
    trackEvent('auth_started', { provider: 'email', mode: payload.mode, surface: 'web_parity_gate' });

    try {
      const result = await startEmailSupabaseAuth(apiClient, payload);
      if (result.status === 'confirmation_required') {
        setAuthError(result.message);
        return;
      }
      await persistSession(result.session, 'email');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal masuk dengan email.';
      setAuthError(message);
      captureError(error, { phase: `web_parity_email_${payload.mode}` });
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handlePasswordReset = async (payload: PasswordResetPayload): Promise<string> => {
    if (!isSupabaseAuthConfigured) {
      const message = 'Pemulihan email belum tersedia di perangkat ini. Gunakan Google untuk melanjutkan.';
      setAuthError(message);
      throw new Error(message);
    }
    if (!isOnline) {
      const message = 'Tidak ada koneksi internet. Sambungkan lagi untuk memulihkan akun.';
      setAuthError(message);
      throw new Error(message);
    }

    setAuthBusyProvider('email');
    setAuthError(null);
    trackEvent('auth_password_reset_requested', { surface: 'web_parity_gate' });

    try {
      const result = await sendPasswordResetSupabaseEmail(payload.email);
      return result.message;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tautan pemulihan belum bisa dikirim.';
      setAuthError(message);
      captureError(error, { phase: 'web_parity_password_reset' });
      throw new Error(message);
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handlePasswordUpdate = async (payload: PasswordUpdatePayload): Promise<void> => {
    if (!passwordRecoveryActive) {
      const message = 'Tautan pemulihan belum aktif. Buka ulang tautan dari email Anda.';
      setAuthError(message);
      throw new Error(message);
    }
    if (!isOnline) {
      const message = 'Tidak ada koneksi internet. Sambungkan lagi untuk menyimpan password.';
      setAuthError(message);
      throw new Error(message);
    }

    setAuthBusyProvider('email');
    setAuthError(null);
    trackEvent('auth_password_update_started', { surface: 'web_parity_gate' });

    try {
      const nextSession = await updateSupabasePassword(apiClient, payload.password);
      await persistSession(nextSession, 'email');
      trackEvent('auth_password_update_succeeded', { surface: 'web_parity_gate' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password baru belum bisa disimpan.';
      setAuthError(message);
      captureError(error, { phase: 'web_parity_password_update' });
      throw new Error(message);
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    if (!mobileEnv.enableAppleSignIn) {
      setAuthError('Apple Sign-In belum diaktifkan pada build ini.');
      return;
    }
    if (!isOnline) {
      setAuthError('Tidak ada koneksi internet. Sambungkan lagi untuk masuk.');
      return;
    }

    setAuthBusyProvider('apple');
    setAuthError(null);
    try {
      const nextSession = await startAppleMobileOAuth(apiClient);
      await persistSession(nextSession, 'apple');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal masuk dengan Apple.';
      setAuthError(message);
      captureError(error, { phase: 'web_parity_login_apple' });
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handleNativeLogout = useCallback(() => {
    void clearNativeSession('web_logout');
  }, [clearNativeSession]);

  const handleNativeAuthExpired = useCallback(() => {
    void clearNativeSession('web_auth_expired', 'Sesi login berakhir. Silakan masuk lagi.');
  }, [clearNativeSession]);

  if (booting) {
    return (
      <View style={[styles.bootingPage, { backgroundColor: systemPalette.bgBase }]}>
        <ActivityIndicator size="large" color={systemPalette.accent} />
        <Text style={[styles.bootingText, { color: systemPalette.textSecondary }]}>Menyiapkan login aman...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <MobileAuthGate
        authBusyProvider={authBusyProvider}
        authError={authError}
        isOnline={isOnline}
        supabaseAuthEnabled={isSupabaseAuthConfigured}
        enableAppleSignIn={mobileEnv.enableAppleSignIn}
        passwordRecoveryActive={passwordRecoveryActive}
        recoveryEmail={passwordRecoveryEmail}
        onLoginGoogle={handleGoogleLogin}
        onEmailAuth={handleEmailAuth}
        onPasswordReset={handlePasswordReset}
        onPasswordUpdate={handlePasswordUpdate}
        onLoginApple={handleAppleLogin}
      />
    );
  }

  return (
    <WebParityScreen
      authSession={session}
      onParityReady={onParityReady}
      onParityFailure={onParityFailure}
      onNativeLogout={handleNativeLogout}
      onNativeAuthExpired={handleNativeAuthExpired}
    />
  );
}

type NativeAppProps = {
  onBootReady: () => void;
};

function NativeApp({ onBootReady }: NativeAppProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { isOnline } = useNetworkStatus();
  const didReportBootReady = useRef(false);
  const authBusyProviderRef = useRef<AuthProvider>(null);
  const handledAuthUrlsRef = useRef<Set<string>>(new Set());
  const [booting, setBooting] = useState(true);
  const [authBusyProvider, setAuthBusyProvider] = useState<AuthProvider>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  const accessToken = session?.accessToken || null;
  const apiClient = useMemo(() => new ApiClient({ getAccessToken: () => accessToken }), [accessToken]);
  const navTheme = useMemo(() => buildNavigationTheme(colorScheme), [colorScheme]);
  const preferredLanguage = usePreferredMobileLanguage(session?.user.id);
  const localeState = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const shellCopy = useMemo(() => {
    if (localeState.language === 'id') {
      return {
        sessionExpired: 'Sesi Anda berakhir. Silakan masuk lagi.',
        previousExpired: 'Sesi sebelumnya berakhir. Masuk lagi untuk memulihkan fitur langsung.',
        storedReset: 'Data masuk yang tersimpan direset. Silakan masuk lagi.',
        offlineSignIn: 'Tidak ada koneksi internet. Sambungkan lagi untuk masuk.',
        signInFailed: 'Gagal masuk.',
        signInFailedApple: 'Gagal masuk dengan Apple.',
        signInFailedEmail: 'Gagal masuk dengan email.',
        signInFailedTitle: 'Masuk gagal',
        appleUnavailable: 'Apple Sign-In belum diaktifkan pada build ini.',
        supabaseUnavailable: 'Masuk dengan email belum tersedia di perangkat ini. Gunakan Google untuk melanjutkan.',
        emailConfirmationTitle: 'Verifikasi email',
        preparing: 'Menyiapkan Baristachaw...',
      };
    }
    if (localeState.language === 'ar') {
      return {
        sessionExpired: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
        previousExpired: 'انتهت جلستك السابقة. سجّل الدخول مرة أخرى لاستعادة الميزات المباشرة.',
        storedReset: 'تمت إعادة تعيين بيانات تسجيل الدخول المحفوظة. يرجى تسجيل الدخول مرة أخرى.',
        offlineSignIn: 'لا يوجد اتصال بالإنترنت. أعد الاتصال لتسجيل الدخول.',
        signInFailed: 'فشل تسجيل الدخول.',
        signInFailedApple: 'فشل تسجيل الدخول باستخدام Apple.',
        signInFailedEmail: 'Email sign-in failed.',
        signInFailedTitle: 'فشل تسجيل الدخول',
        appleUnavailable: 'تسجيل الدخول باستخدام Apple غير مفعّل في هذا الإصدار.',
        supabaseUnavailable: 'Email sign-in is not available on this device yet.',
        emailConfirmationTitle: 'Verify email',
        preparing: 'جارٍ تجهيز Baristachaw...',
      };
    }
    return {
      sessionExpired: 'Your session expired. Please sign in again.',
      previousExpired: 'Your previous session expired. Sign in again to restore live features.',
      storedReset: 'Stored sign-in data was reset. Please sign in again.',
      offlineSignIn: 'No internet connection. Reconnect to sign in.',
      signInFailed: 'Failed to sign in.',
      signInFailedApple: 'Failed to sign in with Apple.',
      signInFailedEmail: 'Failed to sign in with email.',
      signInFailedTitle: 'Sign In Failed',
      appleUnavailable: 'Apple Sign-In is not enabled in this build.',
      supabaseUnavailable: 'Email sign-in is not available on this device yet. Continue with Google.',
      emailConfirmationTitle: 'Verify email',
      preparing: 'Preparing Baristachaw...',
    };
  }, [localeState.language]);

  useEffect(() => {
    authBusyProviderRef.current = authBusyProvider;
  }, [authBusyProvider]);

  useEffect(() => {
    void initTelemetry({
      dsn: mobileEnv.sentryDsn,
      environment: mobileEnv.release.includes('prod') ? 'production' : 'local',
      release: `mobile@${mobileEnv.release}`,
    });
  }, []);

  useEffect(() => {
    setTelemetryUser(session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          username: session.user.name,
        }
      : null);
  }, [session?.user]);

  const invalidateSession = useCallback(async (reason: string, nextError?: string | null) => {
    await clearAuthSession().catch(() => undefined);
    setSession(null);
    setAuthError(nextError || null);
    trackEvent('auth_session_invalidated', { reason });
  }, []);

  const verifySession = useCallback(async (targetSession: AuthSession, phase: string): Promise<boolean> => {
    if (!isOnline) return true;
    try {
      const bootstrapClient = new ApiClient({ getAccessToken: () => targetSession.accessToken });
      await bootstrapClient.getAuthMe();
      return true;
    } catch (error) {
      captureError(error, { phase, reason: 'session_verify_failed' });
      await invalidateSession('server_rejected', shellCopy.sessionExpired);
      return false;
    }
  }, [invalidateSession, isOnline, shellCopy.sessionExpired]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const storedState = await inspectAuthSession();
        if (cancelled) return;

        if (storedState.status === 'active') {
          setSession(storedState.session);
          if (!isOnline) {
            setAuthError(null);
          } else {
            await verifySession(storedState.session, 'bootstrap');
          }
        } else {
          let restoredFromSupabase = false;
          if (isOnline && isSupabaseAuthConfigured) {
            try {
              const bootstrapClient = new ApiClient({ getAccessToken: () => null });
              const restoredSession = await restoreSupabaseMobileSession(bootstrapClient);
              if (restoredSession) {
                await saveAuthSession(restoredSession);
                setSession(restoredSession);
                setAuthError(null);
                restoredFromSupabase = true;
                trackEvent('auth_session_restored', { provider: restoredSession.provider || 'supabase' });
              }
            } catch (error) {
              captureError(error, { phase: 'bootstrap_supabase_restore' });
            }
          }

          if (restoredFromSupabase) return;

          setSession(null);
          if (storedState.status === 'expired') {
            await clearAuthSession().catch(() => undefined);
            setAuthError(shellCopy.previousExpired);
            trackEvent('auth_session_invalidated', { reason: 'expired_before_boot' });
          } else if (storedState.status === 'invalid') {
            await clearAuthSession().catch(() => undefined);
            setAuthError(shellCopy.storedReset);
            trackEvent('auth_session_invalidated', { reason: 'invalid_before_boot' });
          }
        }
      } catch (error) {
        captureError(error, { phase: 'bootstrap' });
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isOnline, shellCopy.previousExpired, shellCopy.storedReset, verifySession]);

  useEffect(() => {
    if (!isOnline) {
      trackEvent('offline_gate_seen', { surface: 'app_shell', hasSession: Boolean(session) });
    }
  }, [isOnline, session]);

  useEffect(() => {
    if (!isOnline || !session?.accessToken || booting) return;
    let cancelled = false;
    const sync = async () => {
      const ok = await verifySession(session, 'foreground_sync');
      if (!cancelled && ok) {
        setAuthError(null);
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [booting, isOnline, session, verifySession]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const msUntilExpiry = session.expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      void invalidateSession('expired_in_memory', shellCopy.sessionExpired);
      return;
    }

    const timeout = setTimeout(() => {
      void invalidateSession('expired_in_memory', shellCopy.sessionExpired);
    }, msUntilExpiry + 250);

    return () => clearTimeout(timeout);
  }, [invalidateSession, session?.expiresAt, shellCopy.sessionExpired]);

  useEffect(() => {
    if (!booting && !didReportBootReady.current) {
      didReportBootReady.current = true;
      trackEvent('screen_ready', {
        screen: 'app_shell',
        runtimePolicy: mobileEnv.runtimePolicy,
        hasSession: Boolean(session),
      });
      onBootReady();
    }
  }, [booting, onBootReady, session]);

  const persistSession = useCallback(async (nextSession: AuthSession, provider: 'google' | 'apple' | 'email') => {
    await saveAuthSession(nextSession);
    setSession(nextSession);
    setAuthError(null);
    trackEvent('auth_success', { provider });
    trackEvent('action_succeeded', { action: 'auth_login', provider });
    if (provider === 'google') {
      trackEvent('auth_success_google', { surface: 'auth' });
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;
    let cancelled = false;

    const consumeAuthUrl = async (url: string | null) => {
      if (!url || cancelled || session || !isSupabaseMobileAuthUrl(url)) return;
      if (handledAuthUrlsRef.current.has(url)) return;
      handledAuthUrlsRef.current.add(url);
      if (authBusyProviderRef.current) return;

      if (!isOnline) {
        setAuthError(shellCopy.offlineSignIn);
        return;
      }

      setAuthBusyProvider('email');
      setAuthError(null);

      try {
        const result = await completeSupabaseDeepLink(apiClient, url);
        if (!result || cancelled) return;
        if (result.kind === 'passwordRecovery') {
          setAuthError('Buka aplikasi dalam mode utama untuk menyimpan password baru.');
          trackEvent('auth_password_recovery_opened', { surface: 'native_fallback' });
          return;
        }
        const provider = result.session.provider === 'google' ? 'google' : 'email';
        await persistSession(result.session, provider);
        trackEvent('auth_session_restored', { provider, source: 'deep_link' });
      } catch (error) {
        const message = error instanceof Error ? error.message : shellCopy.signInFailedEmail;
        setAuthError(message);
        captureError(error, { phase: 'supabase_deep_link' });
        Alert.alert(shellCopy.signInFailedTitle, message);
      } finally {
        if (!cancelled) {
          setAuthBusyProvider(null);
        }
      }
    };

    void Linking.getInitialURL().then(consumeAuthUrl).catch((error) => {
      captureError(error, { phase: 'supabase_initial_url' });
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void consumeAuthUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [
    apiClient,
    isOnline,
    persistSession,
    session,
    shellCopy.offlineSignIn,
    shellCopy.signInFailedEmail,
    shellCopy.signInFailedTitle,
  ]);

  const handleGoogleLogin = async () => {
    if (!isOnline) {
      setAuthError(shellCopy.offlineSignIn);
      trackEvent('offline_gate_seen', { surface: 'auth', provider: 'google' });
      return;
    }

    setAuthBusyProvider('google');
    setAuthError(null);
    trackEvent('auth_started', { provider: 'google' });
    trackEvent('auth_started_google', { surface: 'auth' });

    try {
      const nextSession = isSupabaseAuthConfigured
        ? await startGoogleSupabaseOAuth(apiClient)
        : await startGoogleMobileOAuth(apiClient);
      await persistSession(nextSession, 'google');
    } catch (error) {
      const message = error instanceof Error ? error.message : shellCopy.signInFailed;
      setAuthError(message);
      captureError(error, { phase: 'login_google' });
      trackEvent('auth_fail_google', { message });
      trackEvent('action_failed', { action: 'auth_login', provider: 'google', message });
      Alert.alert(shellCopy.signInFailedTitle, message);
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handleEmailAuth = async (payload: EmailAuthPayload) => {
    if (!isSupabaseAuthConfigured) {
      setAuthError(shellCopy.supabaseUnavailable);
      return;
    }

    if (!isOnline) {
      setAuthError(shellCopy.offlineSignIn);
      trackEvent('offline_gate_seen', { surface: 'auth', provider: 'email' });
      return;
    }

    setAuthBusyProvider('email');
    setAuthError(null);
    trackEvent('auth_started', { provider: 'email', mode: payload.mode });

    try {
      const result = await startEmailSupabaseAuth(apiClient, payload);
      if (result.status === 'confirmation_required') {
        setAuthError(result.message);
        Alert.alert(shellCopy.emailConfirmationTitle, result.message);
        trackEvent('auth_email_confirmation_required', { mode: payload.mode });
        return;
      }

      await persistSession(result.session, 'email');
    } catch (error) {
      const message = error instanceof Error ? error.message : shellCopy.signInFailedEmail;
      setAuthError(message);
      captureError(error, { phase: `login_email_${payload.mode}` });
      trackEvent('action_failed', { action: 'auth_login', provider: 'email', mode: payload.mode, message });
      Alert.alert(shellCopy.signInFailedTitle, message);
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    if (!mobileEnv.enableAppleSignIn) {
      setAuthError(shellCopy.appleUnavailable);
      return;
    }

    if (!isOnline) {
      setAuthError(shellCopy.offlineSignIn);
      trackEvent('offline_gate_seen', { surface: 'auth', provider: 'apple' });
      return;
    }

    setAuthBusyProvider('apple');
    setAuthError(null);
    trackEvent('auth_started', { provider: 'apple' });

    try {
      const nextSession = await startAppleMobileOAuth(apiClient);
      await persistSession(nextSession, 'apple');
    } catch (error) {
      const message = error instanceof Error ? error.message : shellCopy.signInFailedApple;
      setAuthError(message);
      captureError(error, { phase: 'login_apple' });
      trackEvent('action_failed', { action: 'auth_login', provider: 'apple', message });
      Alert.alert(shellCopy.signInFailedTitle, message);
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const handleLogout = async () => {
    try {
      if (session?.accessToken) {
        await apiClient.logout().catch(() => undefined);
      }
    } catch (error) {
      captureError(error, { phase: 'logout' });
      trackEvent('action_failed', { action: 'logout', message: error instanceof Error ? error.message : 'logout_failed' });
    } finally {
      await clearSupabaseMobileSession().catch(() => undefined);
      await clearAuthSession();
      setSession(null);
      setAuthError(null);
      trackEvent('action_succeeded', { action: 'logout' });
    }
  };

  const handleSaveToCollection = async (payload: MobileQuickSavePayload) => {
    await quickSaveInsight(payload);
    trackEvent('action_succeeded', { action: 'quick_save', source: payload.source });
  };

  const authState: 'signed_in' | 'signed_out' | 'session_expired' | 'offline_cached' = session
    ? (isOnline ? 'signed_in' : 'offline_cached')
    : (authError?.toLowerCase().includes('expired') ? 'session_expired' : 'signed_out');

  if (booting) {
    return (
      <View style={[styles.bootingPage, { backgroundColor: navTheme.colors.background }]}>
        <ActivityIndicator size="large" color={navTheme.colors.primary} />
        <Text style={[styles.bootingText, { color: colorScheme === 'dark' ? '#EBEBF5' : '#3C3C43' }]}>
          {shellCopy.preparing}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <View style={styles.shell}>
        {!isOnline ? <OfflineBanner /> : null}

        <Tab.Navigator
          screenOptions={({ route }) => {
            const icon = TAB_ICONS[route.name];
            return {
              headerStyle: styles.header,
              headerShadowVisible: false,
              headerTitleStyle: styles.headerTitle,
              headerTitleAlign: 'left',
              sceneStyle: styles.scene,
              tabBarShowLabel: false,
              tabBarHideOnKeyboard: true,
              tabBarStyle: [
                styles.tabBar,
                {
                  bottom: Math.max(8, insets.bottom > 0 ? 10 : 8),
                  height: 58 + Math.max(12, insets.bottom),
                  paddingBottom: Math.max(8, insets.bottom > 0 ? insets.bottom - 4 : 8),
                  paddingTop: 8,
                },
              ],
              tabBarItemStyle: styles.tabBarItem,
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabIconWrap, focused ? styles.tabIconWrapActive : null]}>
                  <Ionicons
                    name={focused ? icon.active : icon.idle}
                    size={21}
                    color={focused ? uiTokens.colors.navActive : uiTokens.colors.navInactive}
                  />
                </View>
              ),
            };
          }}
        >
          <Tab.Screen name="Home" options={{ title: PARITY_NAV_META.Home.headerTitle }}>
            {() => (
              <HomeScreen
                apiClient={apiClient}
                session={session}
                authBusyProvider={authBusyProvider}
                authError={authError}
                isOnline={isOnline}
                authState={authState}
                guestModeEnabled={mobileEnv.enableGuestMode}
                enableAppleSignIn={mobileEnv.enableAppleSignIn}
                supabaseAuthEnabled={isSupabaseAuthConfigured}
                onLoginGoogle={handleGoogleLogin}
                onEmailAuth={handleEmailAuth}
                onLoginApple={handleAppleLogin}
                onLogout={handleLogout}
                onSaveToCollection={handleSaveToCollection}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Scanner"
            options={{ title: PARITY_NAV_META.Scanner.headerTitle }}
          >
            {() => (
              <ScannerScreen
                apiClient={apiClient}
                session={session}
                isOnline={isOnline}
                guestModeEnabled={mobileEnv.enableGuestMode}
                onSaveToCollection={handleSaveToCollection}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Tools"
            component={ToolsScreen}
            options={{ title: PARITY_NAV_META.Tools.headerTitle }}
          />
          <Tab.Screen
            name="Collection"
            options={{ title: PARITY_NAV_META.Collection.headerTitle }}
          >
            {() => (
              <CollectionScreen
                session={session}
                guestModeEnabled={mobileEnv.enableGuestMode}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Chat"
            options={{
              title: PARITY_NAV_META.Chat.headerTitle,
            }}
          >
            {() => (
              <ChatScreen
                apiClient={apiClient}
                session={session}
                isOnline={isOnline}
                guestModeEnabled={mobileEnv.enableGuestMode}
                onSaveToCollection={handleSaveToCollection}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  shell: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  bootingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: uiTokens.colors.bgBase,
  },
  bootingText: {
    color: uiTokens.colors.textSecondary,
    fontSize: 14,
  },
  header: {
    backgroundColor: 'transparent',
  },
  headerTitle: {
    color: uiTokens.colors.textPrimary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontWeight: '600',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  scene: {
    backgroundColor: 'transparent',
  },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    paddingHorizontal: 6,
    backgroundColor: uiTokens.colors.navSurface,
    borderRadius: uiTokens.radius.dock,
    borderTopWidth: 1,
    borderColor: uiTokens.colors.navBorder,
    ...uiTokens.elevation.dock,
  },
  tabBarItem: {
    marginHorizontal: 2,
    borderRadius: uiTokens.radius.pill,
    paddingTop: 2,
  },
  tabIconWrap: {
    width: 44,
    height: 36,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: uiTokens.colors.navActivePill,
  },
});
