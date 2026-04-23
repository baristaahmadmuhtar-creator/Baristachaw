import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { mobileEnv } from '../config/env';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import { uiTokens } from '../theme/tokens';
import type { AuthSession } from '../types';
import { getMobileLocalization } from '../utils/localization';

const EXTERNAL_AUTH_HOSTS = new Set([
  'accounts.google.com',
  'oauth2.googleapis.com',
  'appleid.apple.com',
]);

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
      window.__BARISTACLAW_NATIVE_SHELL__ = { platform: '${platform}', container: 'webview' };
      window.__BARISTACLAW_NATIVE_SESSION__ = ${JSON.stringify(nativeAuthPayload)};
      document.documentElement.setAttribute('data-native-${platform}-shell', '');
      document.documentElement.setAttribute('data-native-auth-bridge', ${nativeAuthPayload ? "'active'" : "'guest'"});
      if (window.__BARISTACLAW_NATIVE_SESSION__ && window.__BARISTACLAW_NATIVE_SESSION__.accessToken) {
        var nativeSession = window.__BARISTACLAW_NATIVE_SESSION__;
        var originalFetch = window.fetch ? window.fetch.bind(window) : null;
        if (originalFetch && !window.__BARISTACLAW_NATIVE_FETCH_PATCHED__) {
          window.__BARISTACLAW_NATIVE_FETCH_PATCHED__ = true;
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
    })();
    true;
  `;
}

function buildWebParityUrl(baseUrl: string, platform: 'ios' | 'android', hostSafeBottom: number) {
  const safeBottom = Math.max(0, Math.min(48, Math.round(hostSafeBottom)));
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('runtime', 'web_parity');
    url.searchParams.set('ui_profile', 'native_shell');
    url.searchParams.set('native_shell', platform);
    url.searchParams.set('host_safe_bottom', String(safeBottom));
    return url.toString();
  } catch {
    const divider = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${divider}runtime=web_parity&ui_profile=native_shell&native_shell=${platform}&host_safe_bottom=${safeBottom}`;
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
};

export function WebParityScreen({
  authSession,
  onParityReady,
  onParityFailure,
  onNativeLogout,
  onNativeAuthExpired,
}: WebParityScreenProps) {
  const insets = useSafeAreaInsets();
  const preferredLanguage = usePreferredMobileLanguage();
  const { language, direction } = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const shellPlatform = Platform.OS === 'android' ? 'android' : 'ios';
  const hostSafeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 0);
  const nativeShellBootstrap = useMemo(
    () => buildNativeShellBootstrap(shellPlatform, authSession),
    [authSession, shellPlatform],
  );
  const parityUrl = useMemo(
    () => buildWebParityUrl(mobileEnv.webAppUrl, shellPlatform, hostSafeBottom),
    [hostSafeBottom, shellPlatform],
  );
  const appOrigin = useMemo(() => {
    try {
      return new URL(mobileEnv.webAppUrl).origin;
    } catch {
      return 'https://baristaclaw.vercel.app';
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
          loading: 'Memuat tampilan paritas web...',
          errorTitle: 'Masalah Tampilan Paritas',
          loadError: 'Aplikasi web gagal dimuat di sesi ini.',
          httpError: 'Aplikasi web mengembalikan respons yang tidak terduga.',
          reload: 'Muat ulang',
          open: 'Buka di browser',
        };
      case 'ar':
        return {
          loading: 'جارٍ تحميل عرض تكافؤ الويب...',
          errorTitle: 'مشكلة في عرض التكافؤ',
          loadError: 'تعذر تحميل تطبيق الويب في هذه الجلسة.',
          httpError: 'أعاد تطبيق الويب استجابة غير متوقعة.',
          reload: 'إعادة التحميل',
          open: 'فتح في المتصفح',
        };
      case 'zh':
        return {
          loading: '正在加载网页对齐视图...',
          errorTitle: '对齐视图错误',
          loadError: '此会话中的网页应用加载失败。',
          httpError: '网页应用返回了异常响应。',
          reload: '重新加载',
          open: '在浏览器中打开',
        };
      case 'ja':
        return {
          loading: 'Webパリティ表示を読み込み中...',
          errorTitle: 'パリティ表示エラー',
          loadError: 'このセッションでWebアプリを読み込めませんでした。',
          httpError: 'Webアプリから予期しない応答が返されました。',
          reload: '再読み込み',
          open: 'ブラウザーで開く',
        };
      case 'ko':
        return {
          loading: '웹 패리티 보기를 불러오는 중...',
          errorTitle: '패리티 보기 오류',
          loadError: '이 세션에서 웹 앱을 불러오지 못했습니다.',
          httpError: '웹 앱이 예상치 못한 응답을 반환했습니다.',
          reload: '다시 불러오기',
          open: '브라우저에서 열기',
        };
      case 'th':
        return {
          loading: 'กำลังโหลดมุมมองเว็บพาริตี้...',
          errorTitle: 'ข้อผิดพลาดของมุมมองพาริตี้',
          loadError: 'แอปเว็บโหลดไม่สำเร็จในเซสชันนี้',
          httpError: 'แอปเว็บส่งการตอบกลับที่ไม่คาดคิด',
          reload: 'โหลดใหม่',
          open: 'เปิดในเบราว์เซอร์',
        };
      case 'vi':
        return {
          loading: 'Đang tải chế độ đồng bộ web...',
          errorTitle: 'Lỗi chế độ đồng bộ',
          loadError: 'Ứng dụng web không tải được trong phiên này.',
          httpError: 'Ứng dụng web trả về phản hồi không mong muốn.',
          reload: 'Tải lại',
          open: 'Mở trong trình duyệt',
        };
      case 'ms':
        return {
          loading: 'Memuat paparan pariti web...',
          errorTitle: 'Ralat paparan pariti',
          loadError: 'Aplikasi web gagal dimuat dalam sesi ini.',
          httpError: 'Aplikasi web memberikan respons yang tidak dijangka.',
          reload: 'Muat semula',
          open: 'Buka dalam pelayar',
        };
      default:
        return {
          loading: 'Loading web parity...',
          errorTitle: 'Parity View Error',
          loadError: 'Web app failed to load in this session.',
          httpError: 'Web app returned an unexpected response.',
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

  const handleReload = () => {
    setError('');
    setLoading(true);
    loadFailed.current = false;
    webRef.current?.reload();
  };

  const markParityReady = useCallback(() => {
    setLoading(false);
    if (loadFailed.current || didReportReady.current) return;
    didReportReady.current = true;
    onParityReady?.();
  }, [onParityReady]);

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
        originWhitelist={['https://*', 'baristaclaw://*']}
        injectedJavaScriptBeforeContentLoaded={nativeShellBootstrap}
        onLoadStart={() => {
          if (!didReportReady.current) {
            setLoading(true);
          }
          setError('');
          loadFailed.current = false;
        }}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 0.85) {
            markParityReady();
          }
        }}
        onLoadEnd={() => {
          markParityReady();
        }}
        onNavigationStateChange={(state) => {
          if (state.url) setCurrentUrl(state.url);
        }}
        onMessage={({ nativeEvent }) => {
          try {
            const payload = JSON.parse(nativeEvent.data || '{}') as { type?: string };
            if (payload.type === 'BARISTA_NATIVE_LOGOUT') onNativeLogout?.();
            if (payload.type === 'BARISTA_NATIVE_AUTH_EXPIRED') onNativeAuthExpired?.();
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
        thirdPartyCookiesEnabled
      />

      {loading && !didReportReady.current ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={uiTokens.colors.accent} />
          <Text style={[styles.loadingText, direction === 'rtl' ? styles.textRight : null]}>{copy.loading}</Text>
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  webview: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 242, 247, 0.76)',
    gap: 10,
  },
  loadingText: {
    color: uiTokens.colors.textSecondary,
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
    borderColor: uiTokens.colors.panelStroke,
    backgroundColor: uiTokens.colors.panelSoft,
    padding: 14,
    gap: 8,
    ...uiTokens.shadow.card,
  },
  errorTitle: {
    color: uiTokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: uiTokens.colors.textSecondary,
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
    backgroundColor: uiTokens.colors.accent,
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
    borderColor: uiTokens.colors.fieldBorder,
    backgroundColor: uiTokens.colors.field,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  secondaryActionText: {
    color: uiTokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
