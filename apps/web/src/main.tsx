import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureStoredTheme } from './utils/themeStorage';

type ViewportMetricsDetail = {
  layoutHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
  visualBottom: number;
  baselineLayoutHeight: number;
  baselineVisualBottom: number;
  keyboardOffset: number;
  keyboardOpen: boolean;
};

const IOS_KEYBOARD_THRESHOLD = 80;
const IOS_KEYBOARD_CLOSE_THRESHOLD = 40;
const RUNTIME_STORAGE_KEY = 'BARISTA_RUNTIME_MODE';
const RUNTIME_UI_PROFILE_KEY = 'BARISTA_RUNTIME_UI_PROFILE';
const RUNTIME_HOST_SAFE_BOTTOM_KEY = 'BARISTA_RUNTIME_HOST_SAFE_BOTTOM';
const RUNTIME_THEME_MODE_KEY = 'BARISTA_RUNTIME_THEME_MODE';
let lastKeyboardOpenState = false;
let baselineLayoutHeight = 0;
let baselineVisualBottom = 0;
let viewportOrientationKey = '';

function resetViewportBaseline() {
  lastKeyboardOpenState = false;
  baselineLayoutHeight = 0;
  baselineVisualBottom = 0;
  viewportOrientationKey = '';
}

function getViewportOrientationKey() {
  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
}

function hasFocusedEditableTarget() {
  const active = document.activeElement;
  return active instanceof HTMLElement
    && active.matches('input, textarea, select, [contenteditable="true"]');
}

function sessionGet(key: string) {
  try {
    return window.sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function sessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function parseRuntimeHostSafeBottom(raw: string | null) {
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(48, parsed));
}

function readRuntimeFlags() {
  const params = new URLSearchParams(window.location.search);
  const runtimeQuery = params.get('runtime');
  const profileQuery = params.get('ui_profile');
  const hostSafeBottomQuery = params.get('host_safe_bottom');
  const themeModeQuery = params.get('theme');

  if (runtimeQuery) sessionSet(RUNTIME_STORAGE_KEY, runtimeQuery);
  if (profileQuery) sessionSet(RUNTIME_UI_PROFILE_KEY, profileQuery);
  if (hostSafeBottomQuery) sessionSet(RUNTIME_HOST_SAFE_BOTTOM_KEY, hostSafeBottomQuery);
  if (themeModeQuery) sessionSet(RUNTIME_THEME_MODE_KEY, themeModeQuery);

  const runtime = runtimeQuery || sessionGet(RUNTIME_STORAGE_KEY);
  const uiProfile = profileQuery || sessionGet(RUNTIME_UI_PROFILE_KEY);
  const themeMode = themeModeQuery || sessionGet(RUNTIME_THEME_MODE_KEY);
  const hostSafeBottom = parseRuntimeHostSafeBottom(
    hostSafeBottomQuery || sessionGet(RUNTIME_HOST_SAFE_BOTTOM_KEY)
  );

  return {
    isWebParity: runtime === 'web_parity',
    uiProfile,
    hostSafeBottom,
    themeMode,
  };
}

function applyResolvedTheme(preferSystem: boolean) {
  const root = document.documentElement;
  const theme = ensureStoredTheme(localStorage, { preferSystem });
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.style.backgroundColor = theme === 'dark' ? '#000000' : '#F2F2F7';
  root.style.colorScheme = theme;
  if (document.body) {
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#F2F2F7';
    document.body.style.colorScheme = theme;
  }
  const themeMeta = document.getElementById('theme-color-meta');
  if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#F2F2F7');
}

function initializeThemeAndPwa() {
  const root = document.documentElement;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const runtime = readRuntimeFlags();
  const runtimePwaProfile = runtime.isWebParity && runtime.uiProfile === 'pwa';
  const runtimeNativeShellProfile = runtime.isWebParity && runtime.uiProfile === 'native_shell';
  const preferSystemTheme = runtimeNativeShellProfile || runtime.themeMode === 'system';
  const isPwa = !runtimeNativeShellProfile && (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean(nav.standalone)
    || runtimePwaProfile
  );
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  root.removeAttribute('data-web-parity');
  root.style.removeProperty('--host-safe-bottom');

  if (runtime.isWebParity) {
    root.setAttribute('data-web-parity', '');
    root.style.setProperty('--host-safe-bottom', `${runtime.hostSafeBottom}px`);
  }
  if (runtimeNativeShellProfile) root.setAttribute('data-native-shell-profile', '');
  else root.removeAttribute('data-native-shell-profile');
  if (isIos) root.setAttribute('data-ios', '');
  if (isPwa) root.setAttribute('data-pwa', '');
  else root.removeAttribute('data-pwa');
  if (isPwa && isIos) root.setAttribute('data-ios-standalone', '');
  else root.removeAttribute('data-ios-standalone');

  root.dataset.themeMode = preferSystemTheme ? 'system' : 'stored';
  applyResolvedTheme(preferSystemTheme);

  if (preferSystemTheme && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = () => applyResolvedTheme(true);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onThemeChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(onThemeChange);
    }
  }
}

/**
 * Viewport height sync for iOS PWA fullscreen fix.
 *
 * --app-height    = stable layout height (window.innerHeight).
 *                   Used by html/body/#root so the shell never shrinks
 *                   when the iOS keyboard opens.
 *
 * --app-height-visual = live visual-viewport height (shrinks with keyboard).
 *                       Used by chat / composer to dock above the keyboard.
 *
 * Legacy aliases are kept (`--app-vh`, `--app-vh-visual`) to avoid breaking
 * existing inline styles/components that still reference the old names.
 */
function readViewportMetrics(): ViewportMetricsDetail {
  const vv = window.visualViewport;
  const layoutHeight = Math.round(window.innerHeight);
  const visualHeight = Math.round(vv?.height ?? window.innerHeight);
  const visualOffsetTop = Math.round(vv?.offsetTop ?? 0);
  const visualBottom = visualHeight + visualOffsetTop;
  const orientationKey = getViewportOrientationKey();

  if (!viewportOrientationKey || viewportOrientationKey !== orientationKey) {
    viewportOrientationKey = orientationKey;
    baselineLayoutHeight = layoutHeight;
    baselineVisualBottom = visualBottom;
    lastKeyboardOpenState = false;
  }

  if (!lastKeyboardOpenState) {
    baselineLayoutHeight = Math.max(baselineLayoutHeight, layoutHeight);
    baselineVisualBottom = Math.max(baselineVisualBottom, visualBottom);
  }

  const rawKeyboardOffset = Math.max(
    0,
    baselineVisualBottom - visualBottom,
    baselineLayoutHeight - visualBottom,
    layoutHeight - visualBottom
  );
  const focusedEditable = hasFocusedEditableTarget();
  const keyboardOpen = focusedEditable && (
    lastKeyboardOpenState
      ? rawKeyboardOffset > IOS_KEYBOARD_CLOSE_THRESHOLD
      : rawKeyboardOffset > IOS_KEYBOARD_THRESHOLD
  );
  const keyboardOffset = keyboardOpen ? rawKeyboardOffset : 0;
  lastKeyboardOpenState = keyboardOpen;

  if (!keyboardOpen) {
    baselineLayoutHeight = Math.max(baselineLayoutHeight, layoutHeight);
    baselineVisualBottom = Math.max(baselineVisualBottom, visualBottom);
  }

  return {
    layoutHeight,
    visualHeight,
    visualOffsetTop,
    visualBottom,
    baselineLayoutHeight,
    baselineVisualBottom,
    keyboardOffset,
    keyboardOpen,
  };
}

function publishViewportMetrics() {
  const root = document.documentElement;
  const metrics = readViewportMetrics();
  const layoutW = Math.round(window.innerWidth);
  const isPwa = root.hasAttribute('data-pwa');
  const isIosStandalone = root.hasAttribute('data-ios-standalone');
  const fullscreenBaselineHeight = Math.max(
    metrics.layoutHeight,
    metrics.baselineLayoutHeight,
    metrics.baselineVisualBottom
  );
  const effectiveHeight =
    (isIosStandalone || isPwa)
      ? (metrics.keyboardOpen
        ? fullscreenBaselineHeight
        : Math.max(fullscreenBaselineHeight, metrics.visualBottom))
      : metrics.layoutHeight;

  root.style.setProperty('--app-height', `${effectiveHeight}px`);
  root.style.setProperty('--app-vh', `${effectiveHeight}px`);
  root.style.setProperty('--app-vw', `${layoutW}px`);
  root.style.setProperty('--app-height-visual', `${metrics.visualHeight}px`);
  root.style.setProperty('--app-vh-visual', `${metrics.visualHeight}px`);
  root.style.setProperty('--keyboard-offset', `${metrics.keyboardOffset}px`);
  root.dataset.keyboardOpen = metrics.keyboardOpen ? 'true' : 'false';

  window.dispatchEvent(new CustomEvent<ViewportMetricsDetail>('app:viewport-metrics', {
    detail: metrics,
  }));
}

function setupOfflineServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const rawFlag = String(import.meta.env.VITE_ENABLE_OFFLINE_SW || '').trim().toLowerCase();
  const enableOfflineSw = import.meta.env.PROD ? rawFlag !== 'false' : rawFlag === 'true';

  if (!enableOfflineSw) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
    return;
  }

  const register = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

        registration.addEventListener('updatefound', () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;
          nextWorker.addEventListener('statechange', () => {
            if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
              nextWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[sw] registration failed', error);
      });
  };

  let reloadingForServiceWorkerUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (navigator.webdriver) return;
    if (reloadingForServiceWorkerUpdate) return;
    reloadingForServiceWorkerUpdate = true;
    window.location.reload();
  });

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

if (typeof window !== 'undefined') {
  initializeThemeAndPwa();
  setupOfflineServiceWorker();

  let rafId: number | null = null;
  const scheduleViewportSync = () => {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      publishViewportMetrics();
    });
  };
  const scheduleViewportSyncBurst = () => {
    scheduleViewportSync();
    const followUps = [120, 260, 520];
    followUps.forEach((delay) => {
      window.setTimeout(() => {
        scheduleViewportSync();
      }, delay);
    });
  };

  publishViewportMetrics();

  // Layout + keyboard metrics: resize / viewport / resume
  window.addEventListener('resize', scheduleViewportSync, { passive: true });
  window.addEventListener('pageshow', () => {
    if (!hasFocusedEditableTarget()) resetViewportBaseline();
    scheduleViewportSyncBurst();
  }, { passive: true });
  window.addEventListener('focusin', scheduleViewportSyncBurst, { passive: true });
  window.addEventListener('focusout', scheduleViewportSyncBurst, { passive: true });
  window.addEventListener('orientationchange', () => {
    resetViewportBaseline();
    scheduleViewportSyncBurst();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!hasFocusedEditableTarget()) resetViewportBaseline();
      scheduleViewportSyncBurst();
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleViewportSync, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleViewportSync, { passive: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

