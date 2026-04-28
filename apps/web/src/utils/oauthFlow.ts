import { resolveAuthInitError } from './authError';

type OAuthProvider = 'google' | 'facebook';

interface StartServerOAuthLoginOptions {
  endpoint?: string;
  fallbackMessage?: string;
  provider?: OAuthProvider;
}

interface StartServerOAuthLoginResult {
  mode: 'popup' | 'redirect';
  popup: Window | null;
}

function shouldUseRedirectOnly() {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const standaloneByMedia = typeof window.matchMedia === 'function'
    && (window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches);
  const navigatorStandalone = typeof navigator !== 'undefined'
    && Boolean((navigator as { standalone?: boolean }).standalone);
  return standaloneByMedia || navigatorStandalone || isIOS || isSafari;
}

function openWarmupPopup(provider: OAuthProvider) {
  try {
    const popup = window.open('', 'oauth_popup', 'width=600,height=700');
    if (!popup) return null;
    try {
      const lang = typeof document !== 'undefined' ? (document.documentElement.lang || '') : '';
      const isId = /^id(?:-|$)/i.test(lang);
      const providerLabel = provider === 'facebook' ? 'Facebook' : 'Google';
      popup.document.title = isId ? 'Baristachaw Masuk' : 'Baristachaw Sign In';

      const body = popup.document.body;
      body.style.margin = '0';
      body.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      body.style.display = 'grid';
      body.style.placeItems = 'center';
      body.style.minHeight = '100vh';
      body.style.direction = /^ar(?:-|$)/i.test(lang) ? 'rtl' : 'ltr';

      const message = popup.document.createElement('p');
      message.style.opacity = '.72';
      message.style.fontSize = '14px';
      message.textContent = isId
        ? `Membuka masuk ${providerLabel}...`
        : `Opening ${providerLabel} sign-in...`;

      body.replaceChildren(message);
    } catch {
      // Ignore warmup rendering issues; popup navigation still works.
    }
    return popup;
  } catch {
    return null;
  }
}

function buildReturnTo() {
  if (typeof window === 'undefined') return '/';
  const { pathname, search, hash } = window.location;
  if (/^\/(?:login|signin|masuk|register|signup|daftar)\/?$/i.test(pathname || '/')) {
    return '/';
  }
  const next = `${pathname || '/'}${search || ''}${hash || ''}`.trim();
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next || '/';
}

export async function startServerOAuthLogin({
  endpoint = '/api/auth/url',
  fallbackMessage = 'Gagal memulai login OAuth',
  provider = 'google',
}: StartServerOAuthLoginOptions = {}): Promise<StartServerOAuthLoginResult> {
  const popup = shouldUseRedirectOnly() ? null : openWarmupPopup(provider);
  try {
    const returnTo = buildReturnTo();
    const requestUrl = new URL(endpoint, window.location.origin);
    requestUrl.searchParams.set('returnTo', returnTo);
    requestUrl.searchParams.set('provider', provider);

    const response = await fetch(requestUrl.toString(), { credentials: 'same-origin' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.url) {
      throw new Error(resolveAuthInitError(payload, fallbackMessage));
    }

    const authUrl = String(payload.url);
    if (popup && !popup.closed) {
      try {
        popup.location.href = authUrl;
        popup.focus?.();
        return { mode: 'popup', popup };
      } catch {
        // Continue to same-window fallback below.
      }
    }

    window.location.assign(authUrl);
    return { mode: 'redirect', popup: null };
  } catch (error) {
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // noop
      }
    }
    throw error;
  }
}
