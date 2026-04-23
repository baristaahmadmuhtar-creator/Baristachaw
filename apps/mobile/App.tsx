import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import { ActivityIndicator, Alert, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PARITY_NAV_META } from '@baristaclaw/shared';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { ToolsScreen } from './src/screens/ToolsScreen';
import { WebParityScreen } from './src/screens/WebParityScreen';
import { OfflineBanner } from './src/components/OfflineBanner';
import { usePreferredMobileLanguage } from './src/hooks/usePreferredMobileLanguage';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { ApiClient } from './src/services/apiClient';
import { clearAuthSession, inspectAuthSession, saveAuthSession } from './src/services/authStore';
import { startAppleMobileOAuth, startGoogleMobileOAuth } from './src/services/authFlow';
import { quickSaveInsight } from './src/services/mobileStore';
import { mobileEnv } from './src/config/env';
import { captureError, captureMessage, initTelemetry, setTelemetryUser, trackEvent } from './src/services/telemetry';
import { uiTokenPalettes, uiTokens } from './src/theme/tokens';
import { getMobileLocalization } from './src/utils/localization';
import type { AuthSession, MobileQuickSavePayload } from './src/types';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const Tab = createBottomTabNavigator();

type IoniconName = keyof typeof Ionicons.glyphMap;

type RootMode = 'web_parity' | 'native';

type AuthProvider = 'google' | 'apple' | null;

const TAB_ICONS: Record<string, { active: IoniconName; idle: IoniconName }> = {
  Home: { active: 'home', idle: 'home-outline' },
  Chat: { active: 'chatbubble-ellipses', idle: 'chatbubble-ellipses-outline' },
  Scanner: { active: 'scan', idle: 'scan-outline' },
  Collection: { active: 'book', idle: 'book-outline' },
  Tools: { active: 'speedometer', idle: 'speedometer-outline' },
};

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
    return <WebParityScreen onParityReady={handleParityReady} onParityFailure={handleParityFailure} />;
  }

  return (
    <View style={styles.root}>
      <NativeApp onBootReady={() => setSurfaceReady(true)} />
    </View>
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
        signInFailedTitle: 'Masuk gagal',
        appleUnavailable: 'Apple Sign-In belum diaktifkan pada build ini.',
        preparing: 'Menyiapkan BaristaClaw...',
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
        signInFailedTitle: 'فشل تسجيل الدخول',
        appleUnavailable: 'تسجيل الدخول باستخدام Apple غير مفعّل في هذا الإصدار.',
        preparing: 'جارٍ تجهيز BaristaClaw...',
      };
    }
    return {
      sessionExpired: 'Your session expired. Please sign in again.',
      previousExpired: 'Your previous session expired. Sign in again to restore live features.',
      storedReset: 'Stored sign-in data was reset. Please sign in again.',
      offlineSignIn: 'No internet connection. Reconnect to sign in.',
      signInFailed: 'Failed to sign in.',
      signInFailedApple: 'Failed to sign in with Apple.',
      signInFailedTitle: 'Sign In Failed',
      appleUnavailable: 'Apple Sign-In is not enabled in this build.',
      preparing: 'Preparing BaristaClaw...',
    };
  }, [localeState.language]);

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

  const persistSession = async (nextSession: AuthSession, provider: 'google' | 'apple') => {
    await saveAuthSession(nextSession);
    setSession(nextSession);
    setAuthError(null);
    trackEvent('auth_success', { provider });
    trackEvent('action_succeeded', { action: 'auth_login', provider });
    if (provider === 'google') {
      trackEvent('auth_success_google', { surface: 'auth' });
    }
  };

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
      const nextSession = await startGoogleMobileOAuth(apiClient);
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
      <View style={styles.bootingPage}>
        <ActivityIndicator size="large" color={uiTokens.colors.accent} />
        <Text style={styles.bootingText}>{shellCopy.preparing}</Text>
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
                onLoginGoogle={handleGoogleLogin}
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
