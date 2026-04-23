import { useEffect, useState } from 'react';
import { subscribeMediaQueryChange } from '../utils/mediaQuery';

type RuntimeDisplayMode = {
  isPwa: boolean;
  isIosStandalone: boolean;
  isWebParity: boolean;
};

function detectRuntimeDisplayMode(): RuntimeDisplayMode {
  if (typeof window === 'undefined') {
    return {
      isPwa: false,
      isIosStandalone: false,
      isWebParity: false,
    };
  }

  const runtimeFromQuery = new URLSearchParams(window.location.search).get('runtime');
  const runtimeFromStorage = (() => {
    try {
      return window.sessionStorage.getItem('BARISTA_RUNTIME_MODE') || '';
    } catch {
      return '';
    }
  })();
  const profileFromQuery = new URLSearchParams(window.location.search).get('ui_profile');
  const profileFromStorage = (() => {
    try {
      return window.sessionStorage.getItem('BARISTA_RUNTIME_UI_PROFILE') || '';
    } catch {
      return '';
    }
  })();
  const runtime = runtimeFromQuery || runtimeFromStorage;
  const uiProfile = profileFromQuery || profileFromStorage;
  const isWebParity = runtime === 'web_parity';
  const runtimeAsStandalone = isWebParity && uiProfile === 'pwa';
  const runtimeAsNativeShell = isWebParity && uiProfile === 'native_shell';

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isPwa = runtimeAsNativeShell
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean(nav.standalone)
    || runtimeAsStandalone;
  const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  return {
    isPwa,
    isIosStandalone: isPwa && isIos,
    isWebParity,
  };
}

export function useRuntimeDisplayMode(): RuntimeDisplayMode {
  const [mode, setMode] = useState<RuntimeDisplayMode>(() => detectRuntimeDisplayMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');
    const update = () => setMode(detectRuntimeDisplayMode());
    update();
    const unsubscribeStandalone = subscribeMediaQueryChange(standaloneMedia, update);
    const unsubscribeFullscreen = subscribeMediaQueryChange(fullscreenMedia, update);
    window.addEventListener('pageshow', update, { passive: true });
    window.addEventListener('popstate', update, { passive: true });

    return () => {
      unsubscribeStandalone();
      unsubscribeFullscreen();
      window.removeEventListener('pageshow', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  return mode;
}

