import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { mobileEnv } from '../config/env';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import { uiTokens } from '../theme/tokens';
import type { AuthSession } from '../types';
import { getMobileLocalization } from '../utils/localization';
import { AppLoadingScreen } from '../components/AppLoadingScreen';

const EXTERNAL_AUTH_HOSTS = new Set([
  'accounts.google.com',
  'oauth2.googleapis.com',
  'appleid.apple.com',
]);

const WEB_PARITY_NATIVE_THEMES = {
  light: {
    bgBase: '#F2F2F7',
    textPrimary: '#000000',
    textSecondary: '#3C3C43',
    accent: '#1D4ED8',
    overlay: '#F2F2F7',
    panel: 'rgba(255, 255, 255, 0.92)',
    panelBorder: 'rgba(15, 23, 42, 0.10)',
    field: 'rgba(255, 255, 255, 0.78)',
    fieldBorder: 'rgba(15, 23, 42, 0.12)',
  },
  dark: {
    bgBase: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#EBEBF5',
    accent: '#60A5FA',
    overlay: '#000000',
    panel: 'rgba(28, 28, 30, 0.94)',
    panelBorder: 'rgba(148, 163, 184, 0.16)',
    field: 'rgba(44, 44, 46, 0.88)',
    fieldBorder: 'rgba(148, 163, 184, 0.18)',
  },
} as const;

function buildNativeShellBootstrap(platform: 'ios' | 'android', authSession?: AuthSession | null) {
  const nativeAuthPayload = authSession
    ? {
        accessToken: authSession.accessToken,
        expiresAt: authSession.expiresAt,
        user: authSession.user,
        provider: authSession.provider || authSession.user.provider || 'google',
      }
    : null;

  return `
    (function () {
      window.__BARISTACHAW_NATIVE_SHELL__ = { platform: '${platform}', container: 'webview' };
      window.__BARISTACHAW_NATIVE_SESSION__ = ${JSON.stringify(nativeAuthPayload)};
      window.__BARISTACHAW_NATIVE_THEME__ = 'system';
      document.documentElement.setAttribute('data-native-${platform}-shell', '');
      document.documentElement.setAttribute('data-native-auth-bridge', ${nativeAuthPayload ? "'active'" : "'browse-only'"});
      try {
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var bg = prefersDark ? '#000000' : '#F2F2F7';
        document.documentElement.style.backgroundColor = bg;
        document.documentElement.style.colorScheme = prefersDark ? 'dark' : 'light';
        var applyBodyBg = function () {
          if (document.body) {
            document.body.style.backgroundColor = bg;
            document.body.style.colorScheme = prefersDark ? 'dark' : 'light';
          }
        };
        applyBodyBg();
        document.addEventListener('DOMContentLoaded', applyBodyBg, { once: true });
      } catch (error) {}
      if (window.__BARISTACHAW_NATIVE_SESSION__ && window.__BARISTACHAW_NATIVE_SESSION__.accessToken) {
        var nativeSession = window.__BARISTACHAW_NATIVE_SESSION__;
        var originalFetch = window.fetch ? window.fetch.bind(window) : null;
        if (originalFetch && !window.__BARISTACHAW_NATIVE_FETCH_PATCHED__) {
          window.__BARISTACHAW_NATIVE_FETCH_PATCHED__ = true;
          window.fetch = function (input, init) {
            var requestUrl = '';
            try {
              requestUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
              var parsed = new URL(requestUrl || '/', window.location.href);
              var sameOriginApi = parsed.origin === window.location.origin && parsed.pathname.indexOf('/api/') === 0;
              if (sameOriginApi) {
                var nextInit = Object.assign({}, init || {});
                var headers = new Headers(nextInit.headers || (input && input.headers) || {});
                if (!headers.has('Authorization')) {
                  headers.set('Authorization', 'Bearer ' + nativeSession.accessToken);
                }
                nextInit.headers = headers;
                return originalFetch(input, nextInit).then(function (response) {
                  if (parsed.pathname === '/api/auth/logout' && response && response.ok) {
                    try {
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'BARISTA_NATIVE_LOGOUT' }));
                    } catch (error) {}
                  }
                  if (parsed.pathname === '/api/auth/me' && response && response.status === 401) {
                    try {
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'BARISTA_NATIVE_AUTH_EXPIRED' }));
                    } catch (error) {}
                  }
                  return response;
                });
              }
            } catch (error) {}
            return originalFetch(input, init);
          };
        }
      }
      try {
        var notifyNativeReady = function () {
          try {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'BARISTA_WEB_APP_READY' }));
          } catch (error) {}
        };
        window.__BARISTACHAW_NOTIFY_NATIVE_READY__ = notifyNativeReady;
        window.addEventListener('barista:web-app-ready', notifyNativeReady);
        window.dispatchEvent(new Event('barista:native-session-ready'));
      } catch (error) {}
    })();
    true;
  `;
}

function buildWebParityUrl(baseUrl: string, platform: 'ios' | 'android', hostSafeBottom: number, language: string) {
  const safeBottom = Math.max(0, Math.min(120, Math.round(hostSafeBottom)));
  const languageParam = encodeURIComponent(language);
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('runtime', 'web_parity');
    url.searchParams.set('ui_profile', 'native_shell');
    url.searchParams.set('native_shell', platform);
    url.searchParams.set('host_safe_bottom', String(safeBottom));
    url.searchParams.set('theme', 'system');
    url.searchParams.set('language', language);
    return url.toString();
  } catch {
    const divider = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${divider}runtime=web_parity&ui_profile=native_shell&native_shell=${platform}&host_safe_bottom=${safeBottom}&theme=system&language=${languageParam}`;
  }
}

function isAllowedInAppUrl(candidate: string, appOrigin: string) {
  if (!candidate || candidate === 'about:blank') return true;
  try {
    const url = new URL(candidate);
    if (url.protocol === 'about:' || url.protocol === 'data:' || url.protocol === 'blob:') return true;
    if (url.origin === appOrigin) return true;
  } catch {
    return false;
  }
  return false;
}

function isExternalAuthUrl(candidate: string) {
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && EXTERNAL_AUTH_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

type WebParityScreenProps = {
  authSession?: AuthSession | null;
  onParityReady?: () => void;
  onParityFailure?: (reason: 'error' | 'http_error' | 'load_error') => void;
  onNativeLogout?: () => void;
  onNativeAuthExpired?: () => void;
  onNativeAuthRequest?: (provider: 'google' | 'facebook') => Promise<AuthSession>;
};

export function WebParityScreen({
  authSession,
  onParityReady,
  onParityFailure,
  onNativeLogout,
  onNativeAuthExpired,
  onNativeAuthRequest,
}: WebParityScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = WEB_PARITY_NATIVE_THEMES[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(theme), [theme]);
  const preferredLanguage = usePreferredMobileLanguage();
  const { language, direction } = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const shellPlatform = Platform.OS === 'android' ? 'android' : 'ios';
  const hostSafeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 0);
  const nativeShellBootstrap = useMemo(
    () => buildNativeShellBootstrap(shellPlatform, authSession),
    [authSession, shellPlatform],
  );
  const parityUrl = useMemo(
    () => buildWebParityUrl(mobileEnv.webAppUrl, shellPlatform, hostSafeBottom, language),
    [hostSafeBottom, language, shellPlatform],
  );
  const appOrigin = useMemo(() => {
    try {
      return new URL(mobileEnv.webAppUrl).origin;
    } catch {
      return 'https://app.baristachaw.com';
    }
  }, []);
  const webRef = useRef<WebView>(null);
  const didReportReady = useRef(false);
  const loadFailed = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUrl, setCurrentUrl] = useState(parityUrl);
  const copy = useMemo(() => {
    switch (language) {
      case 'id':
        return {
          loading: 'Membuka Baristachaw...',
          errorTitle: 'Aplikasi belum bisa dibuka',
          loadError: 'Baristachaw belum berhasil dimuat di sesi ini.',
          httpError: 'Baristachaw mengembalikan respons yang tidak terduga.',
          reload: 'Muat ulang',
          open: 'Buka di browser',
        };
      default:
        return {
          loading: 'Opening Baristachaw...',
          errorTitle: 'App could not open',
          loadError: 'Baristachaw could not load in this session.',
          httpError: 'Baristachaw returned an unexpected response.',
          reload: 'Reload',
          open: 'Open in browser',
        };
    }
  }, [language]);

  useEffect(() => {
    setCurrentUrl(parityUrl);
    didReportReady.current = false;
    loadFailed.current = false;
    setLoading(true);
  }, [parityUrl]);

  useEffect(() => {
    if (!loading || didReportReady.current || loadFailed.current) return;

    const timeout = setTimeout(() => {
      if (didReportReady.current || loadFailed.current) return;
      loadFailed.current = true;
      setLoading(false);
      setError(copy.loadError);
      onParityFailure?.('load_error');
    }, mobileEnv.webParityTimeoutMs);

    return () => clearTimeout(timeout);
  }, [copy.loadError, loading, onParityFailure, parityUrl]);

  const handleReload = () => {
    setError('');
    setLoading(true);
    didReportReady.current = false;
    loadFailed.current = false;
    webRef.current?.reload();
  };

  const markParityReady = useCallback(() => {
    setLoading(false);
    if (loadFailed.current || didReportReady.current) return;
    didReportReady.current = true;
    onParityReady?.();
  }, [onParityReady]);

  const dispatchWebAuthMessage = useCallback((payload: Record<string, unknown>) => {
    webRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} }));
      true;
    `);
  }, []);

  const handleNativeAuthRequest = useCallback((provider: unknown) => {
    if (provider !== 'google' && provider !== 'facebook') {
      dispatchWebAuthMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Unsupported sign-in provider.' });
      return;
    }
    if (!onNativeAuthRequest) {
      dispatchWebAuthMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Native sign-in is not available in this build.' });
      return;
    }

    void (async () => {
      try {
        const nextSession = await onNativeAuthRequest(provider);
        const bootstrap = buildNativeShellBootstrap(shellPlatform, nextSession);
        webRef.current?.injectJavaScript(`
          ${bootstrap}
          window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify({
            type: 'OAUTH_AUTH_SUCCESS',
            user: nextSession.user,
          })} }));
          true;
        `);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign-in failed.';
        dispatchWebAuthMessage({ type: 'OAUTH_AUTH_ERROR', error: message });
      }
    })();
  }, [dispatchWebAuthMessage, onNativeAuthRequest, shellPlatform]);

  const openExternalBrowser = useCallback(async (url: string, options?: { reloadOnReturn?: boolean }) => {
    setLoading(false);
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
      });
    } finally {
      if (options?.reloadOnReturn) {
        setLoading(true);
        webRef.current?.reload();
      }
    }
  }, []);

  const openInBrowser = async () => {
    await WebBrowser.openBrowserAsync(currentUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      showTitle: true,
    });
  };

  return (
    <View style={styles.page}>
      <WebView
        ref={webRef}
        source={{ uri: parityUrl }}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
        originWhitelist={['https://*', 'baristachaw://*', 'baristaclaw://*']}
        injectedJavaScriptBeforeContentLoaded={nativeShellBootstrap}
        injectedJavaScript={nativeShellBootstrap}
        onLoadStart={() => {
          if (!didReportReady.current) {
            setLoading(true);
          }
          setError('');
          loadFailed.current = false;
        }}
        onLoadProgress={({ nativeEvent }) => {
          void nativeEvent.progress;
        }}
        onLoadEnd={() => undefined}
        onNavigationStateChange={(state) => {
          if (state.url) setCurrentUrl(state.url);
        }}
        onMessage={({ nativeEvent }) => {
          try {
            const payload = JSON.parse(nativeEvent.data || '{}') as { type?: string; provider?: unknown };
            if (payload.type === 'BARISTA_WEB_APP_READY') markParityReady();
            if (payload.type === 'BARISTA_NATIVE_LOGOUT') onNativeLogout?.();
            if (payload.type === 'BARISTA_NATIVE_AUTH_EXPIRED') onNativeAuthExpired?.();
            if (payload.type === 'BARISTA_NATIVE_AUTH_REQUEST') handleNativeAuthRequest(payload.provider);
          } catch {
            // Ignore unknown WebView messages.
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (isExternalAuthUrl(request.url)) {
            void openExternalBrowser(request.url, { reloadOnReturn: true });
            return false;
          }
          if (isAllowedInAppUrl(request.url, appOrigin)) return true;
          void openExternalBrowser(request.url);
          return false;
        }}
        onError={() => {
          loadFailed.current = true;
          setLoading(false);
          setError(copy.loadError);
          onParityFailure?.('error');
        }}
        onHttpError={() => {
          loadFailed.current = true;
          setLoading(false);
          setError(copy.httpError);
          onParityFailure?.('http_error');
        }}
        onContentProcessDidTerminate={() => {
          loadFailed.current = true;
          setLoading(false);
          setError(copy.loadError);
          onParityFailure?.('load_error');
        }}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={false}
      />

      {loading && !didReportReady.current ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <AppLoadingScreen
            text={copy.loading}
            backgroundColor={theme.overlay}
            textColor={theme.textSecondary}
            accentColor={theme.accent}
          />
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorSheet, { bottom: insets.bottom + 16 }]}>
          <Text style={[styles.errorTitle, direction === 'rtl' ? styles.textRight : null]}>{copy.errorTitle}</Text>
          <Text style={[styles.errorText, direction === 'rtl' ? styles.textRight : null]}>{error}</Text>
          <View style={[styles.actionRow, direction === 'rtl' ? styles.actionRowRtl : null]}>
            <Pressable style={styles.actionButton} onPress={handleReload}>
              <Text style={styles.actionText}>{copy.reload}</Text>
            </Pressable>
            <Pressable style={styles.secondaryActionButton} onPress={() => void openInBrowser()}>
              <Text style={styles.secondaryActionText}>{copy.open}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: (typeof WEB_PARITY_NATIVE_THEMES)['light' | 'dark']) {
  return StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bgBase,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.bgBase,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: theme.bgBase,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.overlay,
    gap: 10,
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  textRight: {
    textAlign: 'right',
  },
  errorSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.panelBorder,
    backgroundColor: theme.panel,
    padding: 14,
    gap: 8,
    ...uiTokens.shadow.card,
  },
  errorTitle: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRowRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    borderRadius: uiTokens.radius.button,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    borderRadius: uiTokens.radius.button,
    borderWidth: 1,
    borderColor: theme.fieldBorder,
    backgroundColor: theme.field,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  secondaryActionText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  });
}
