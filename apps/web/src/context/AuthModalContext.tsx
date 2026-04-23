import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { saveUserName, setAuthMode } from '../services/gemini';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { startServerOAuthLogin } from '../utils/oauthFlow';
import { DEFAULT_LANGUAGE, getTranslations, isSupportedLanguage } from '../constants';
import type { Language } from '../types';

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
};

type NativeShellSession = {
  accessToken?: string;
  expiresAt?: number;
  user?: AuthUser | null;
};

declare global {
  interface Window {
    __BARISTACHAW_NATIVE_SESSION__?: NativeShellSession | null;
  }
}

type OpenAuthModalOptions = {
  source?: string;
};

type StoredOauthCallbackResult = {
  type?: 'success' | 'error';
  user?: AuthUser | null;
  error?: string;
  savedAt?: number;
};

type AuthModalContextValue = {
  isOpen: boolean;
  source: string;
  user: AuthUser | null;
  isAuthenticated: boolean;
  authChecking: boolean;
  authBusy: boolean;
  authError: string | null;
  isOffline: boolean;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  clearAuthError: () => void;
  refreshAuthState: (options?: { silent?: boolean; retryDelaysMs?: number[] }) => Promise<boolean>;
  startGoogleAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);
const AUTH_REFRESH_TIMEOUT_MS = 8_000;
const AUTH_BOOTSTRAP_RETRY_DELAYS_MS = [250, 800, 1_600] as const;
const AUTH_POPUP_CLOSE_RETRY_DELAYS_MS = [200, 600, 1_200] as const;
const OAUTH_CALLBACK_RESULT_KEY = 'BARISTA_OAUTH_CALLBACK_RESULT_V1';

function readStoredOauthCallbackResult(): StoredOauthCallbackResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(OAUTH_CALLBACK_RESULT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(OAUTH_CALLBACK_RESULT_KEY);
    const parsed = JSON.parse(raw) as StoredOauthCallbackResult;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function readNativeShellSession(): NativeShellSession | null {
  if (typeof window === 'undefined') return null;
  const session = window.__BARISTACHAW_NATIVE_SESSION__;
  if (!session?.accessToken || !session.user?.id) return null;
  const expiresAt = Number(session.expiresAt || 0);
  if (expiresAt > 0 && expiresAt <= Date.now()) return null;
  return session;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState('general');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshControllerRef = useRef<AbortController | null>(null);
  const refreshRequestIdRef = useRef(0);
  const oauthPopupRef = useRef<Window | null>(null);
  const oauthPopupMonitorRef = useRef<number | null>(null);
  const oauthResultHandledRef = useRef(false);
  const { isOffline } = useNetworkStatus();

  const getLocalizedCopy = useCallback(() => {
    let language: Language = DEFAULT_LANGUAGE;
    try {
      const documentLanguage = document.documentElement.lang;
      if (isSupportedLanguage(documentLanguage)) {
        language = documentLanguage;
      } else {
        const stored = localStorage.getItem('BARISTA_LANGUAGE');
        if (isSupportedLanguage(stored)) language = stored;
      }
    } catch {
      language = DEFAULT_LANGUAGE;
    }
    return getTranslations(language);
  }, []);

  const clearOauthPopupMonitor = useCallback((options?: { closePopup?: boolean }) => {
    if (oauthPopupMonitorRef.current !== null) {
      window.clearInterval(oauthPopupMonitorRef.current);
      oauthPopupMonitorRef.current = null;
    }

    const popup = oauthPopupRef.current;
    oauthPopupRef.current = null;

    if (options?.closePopup && popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // noop
      }
    }
  }, []);

  const isAuthenticated = !!user;

  const applyNativeShellSession = useCallback((session = readNativeShellSession()) => {
    if (!session?.user) return false;
    const nextUser = session.user;
    setUser(nextUser);
    if (nextUser.name) saveUserName(nextUser.name);
    setAuthMode('server');
    setAuthError(null);
    setIsOpen(false);
    return true;
  }, []);

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    if (readNativeShellSession()) return;
    setSource(options?.source || 'general');
    setAuthError(null);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(false);
    setIsOpen(false);
  }, [clearOauthPopupMonitor]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      refreshControllerRef.current?.abort();
      refreshControllerRef.current = null;
      clearOauthPopupMonitor({ closePopup: true });
    };
  }, [clearOauthPopupMonitor]);

  const refreshAuthState = useCallback(async (options?: { silent?: boolean; retryDelaysMs?: number[] }) => {
    const silent = !!options?.silent;
    const retryDelaysMs = Array.isArray(options?.retryDelaysMs) ? options!.retryDelaysMs : [];
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    let authenticated = false;
    const nativeSession = readNativeShellSession();
    if (nativeSession) {
      applyNativeShellSession(nativeSession);
      authenticated = true;
    }

    if (!silent && isMountedRef.current) setAuthChecking(true);
    try {
      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) return false;
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, retryDelaysMs[attempt - 1]));
          if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) return false;
        }

        refreshControllerRef.current?.abort();
        const controller = new AbortController();
        refreshControllerRef.current = controller;
        const timeoutId = window.setTimeout(() => controller.abort(), AUTH_REFRESH_TIMEOUT_MS);

        try {
          const response = await fetch(nativeSession ? '/api/auth/me' : '/api/auth/me?soft=1', { credentials: 'same-origin', signal: controller.signal });
          const payload = await response.json().catch(() => null);
          const isCurrentRequest =
            isMountedRef.current &&
            requestId === refreshRequestIdRef.current &&
            !controller.signal.aborted;
          if (!isCurrentRequest) return false;
          if (response.ok && payload?.user) {
            const nextUser: AuthUser = payload.user;
            setUser(nextUser);
            if (nextUser.name) saveUserName(nextUser.name);
            setAuthMode('server');
            authenticated = true;
            return true;
          }

          if (attempt === retryDelaysMs.length && !nativeSession) {
            setUser(null);
          }
        } catch {
          if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) return false;
          if (!controller.signal.aborted && !isOffline && attempt === retryDelaysMs.length && !nativeSession) {
            setUser(null);
          }
        } finally {
          window.clearTimeout(timeoutId);
          if (refreshControllerRef.current === controller) {
            refreshControllerRef.current = null;
          }
        }
      }
    } finally {
      if (!silent && isMountedRef.current && requestId === refreshRequestIdRef.current) {
        setAuthChecking(false);
      }
    }
    return authenticated;
  }, [applyNativeShellSession, isOffline]);

  useEffect(() => {
    void refreshAuthState({ retryDelaysMs: [...AUTH_BOOTSTRAP_RETRY_DELAYS_MS] });
  }, [getLocalizedCopy, refreshAuthState]);

  useEffect(() => {
    const stored = readStoredOauthCallbackResult();
    if (!stored?.type) return;

    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(false);

    if (stored.type === 'success') {
      const nextUser = stored.user || null;
      if (nextUser) {
        setUser(nextUser);
        if (nextUser.name) saveUserName(nextUser.name);
        setAuthMode('server');
      } else {
        void refreshAuthState({ silent: true, retryDelaysMs: [...AUTH_POPUP_CLOSE_RETRY_DELAYS_MS] });
      }
      setAuthError(null);
      setIsOpen(false);
      return;
    }

    const copy = getLocalizedCopy();
    setUser(null);
    setAuthError(String(stored.error || copy.connectionFailed || copy.error));
    setIsOpen(true);
  }, [clearOauthPopupMonitor, getLocalizedCopy, refreshAuthState]);

  const startOauthPopupMonitor = useCallback(() => {
    clearOauthPopupMonitor();
    oauthPopupMonitorRef.current = window.setInterval(() => {
      const popup = oauthPopupRef.current;
      if (!popup) {
        clearOauthPopupMonitor();
        return;
      }
      if (!popup.closed) return;

      clearOauthPopupMonitor();
      if (oauthResultHandledRef.current) return;

      void (async () => {
        const authenticated = await refreshAuthState({
          silent: true,
          retryDelaysMs: [...AUTH_POPUP_CLOSE_RETRY_DELAYS_MS],
        });
        if (!isMountedRef.current || oauthResultHandledRef.current) return;

        oauthResultHandledRef.current = true;
        setAuthBusy(false);
        if (authenticated) {
          setAuthError(null);
          setIsOpen(false);
          return;
        }

        const copy = getLocalizedCopy();
        setAuthError(copy.authModalCancelled || 'Sign-in was cancelled.');
        setIsOpen(true);
      })();
    }, 400);
  }, [clearOauthPopupMonitor, getLocalizedCopy, refreshAuthState]);

  useEffect(() => {
    const expectedOrigin = window.location.origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;
      if (event.data?.type !== 'OAUTH_AUTH_SUCCESS' && event.data?.type !== 'OAUTH_AUTH_ERROR') return;

      oauthResultHandledRef.current = true;
      clearOauthPopupMonitor({ closePopup: true });

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const nextUser = (event.data?.user || null) as AuthUser | null;
        if (nextUser) {
          setUser(nextUser);
          if (nextUser.name) saveUserName(nextUser.name);
          setAuthMode('server');
        } else {
          void refreshAuthState({ silent: true });
        }
        setAuthBusy(false);
        setAuthError(null);
        setIsOpen(false);
      }

      if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAuthBusy(false);
        const copy = getLocalizedCopy();
        setAuthError(String(event.data?.error || copy.connectionFailed || copy.error));
        setUser(null);
        setIsOpen(true);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [clearOauthPopupMonitor, getLocalizedCopy, refreshAuthState]);

  useEffect(() => {
    const onWindowFocus = () => {
      if (oauthResultHandledRef.current) return;
      if (!oauthPopupRef.current) return;
      void refreshAuthState({ silent: true, retryDelaysMs: [...AUTH_POPUP_CLOSE_RETRY_DELAYS_MS] });
    };

    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, [refreshAuthState]);

  const startGoogleAuth = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    oauthResultHandledRef.current = false;

    if (isOffline) {
      oauthResultHandledRef.current = true;
      setAuthBusy(false);
      const copy = getLocalizedCopy();
      setAuthError(copy.authModalOffline || copy.connectionFailed || copy.error);
      return;
    }

    try {
      const copy = getLocalizedCopy();
      const { mode, popup } = await startServerOAuthLogin({ fallbackMessage: copy.connectionFailed || copy.error });
      if (mode === 'popup') {
        oauthPopupRef.current = popup;
        startOauthPopupMonitor();
      }
    } catch (error) {
      oauthResultHandledRef.current = true;
      clearOauthPopupMonitor({ closePopup: true });
      const copy = getLocalizedCopy();
      const message = error instanceof Error ? error.message : (copy.connectionFailed || copy.error);
      setAuthError(message);
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline, startOauthPopupMonitor]);

  const logout = useCallback(async () => {
    oauthResultHandledRef.current = true;
    refreshRequestIdRef.current += 1;
    refreshControllerRef.current?.abort();
    refreshControllerRef.current = null;
    clearOauthPopupMonitor({ closePopup: true });
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setUser(null);
      setAuthChecking(false);
      setAuthError(null);
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor]);

  const value = useMemo<AuthModalContextValue>(() => ({
    isOpen,
    source,
    user,
    isAuthenticated,
    authChecking,
    authBusy,
    authError,
    isOffline,
    openAuthModal,
    closeAuthModal,
    clearAuthError,
    refreshAuthState,
    startGoogleAuth,
    logout,
  }), [
    authBusy,
    authChecking,
    authError,
    closeAuthModal,
    clearAuthError,
    isAuthenticated,
    isOffline,
    isOpen,
    openAuthModal,
    refreshAuthState,
    source,
    startGoogleAuth,
    logout,
    user,
  ]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}





