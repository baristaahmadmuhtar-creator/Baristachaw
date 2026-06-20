import { useEffect, useRef, useState, type RefObject } from 'react';

type ViewportMetricsDetail = {
  layoutHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
  visualBottom: number;
  baselineLayoutHeight: number;
  baselineVisualBottom: number;
  keyboardOffset: number;
  keyboardOverlayOffset: number;
  keyboardOpen: boolean;
};

type UseIOSKeyboardFixOptions = {
  composerRef?: RefObject<HTMLElement | null>;
  focusScopeRef?: RefObject<HTMLElement | null>;
  hideNav?: () => void;
  showNav?: () => void;
  navHideWhenKeyboard?: boolean;
  navHideWhenFocusWithin?: boolean;
  enableScrollIntoViewOnFocus?: boolean;
  scrollIntoViewBlock?: ScrollLogicalPosition;
};

const IOS_KEYBOARD_THRESHOLD = 80;
const IOS_KEYBOARD_CLOSE_THRESHOLD = 40;

function readKeyboardOffsetFromCSS() {
  if (typeof window === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--keyboard-offset').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getOrientationKey() {
  if (typeof window === 'undefined') return 'portrait';
  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
}

function shouldUseViewportKeyboardDocking() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator;
  return /iPad|iPhone|iPod/.test(nav.userAgent)
    || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

function computeKeyboardOffsetFromViewport(args: {
  lastOpen: boolean;
  baselineLayoutHeight: number;
  baselineVisualBottom: number;
  orientationKey: string;
}) {
  if (typeof window === 'undefined') {
    return {
      keyboardOffset: 0,
      keyboardOverlayOffset: 0,
      keyboardOpen: false,
      baselineLayoutHeight: args.baselineLayoutHeight,
      baselineVisualBottom: args.baselineVisualBottom,
      orientationKey: args.orientationKey,
    };
  }
  const vv = window.visualViewport;
  const layoutHeight = Math.round(window.innerHeight);
  const visualHeight = Math.round(vv?.height ?? window.innerHeight);
  const visualOffsetTop = Math.round(vv?.offsetTop ?? 0);
  const visualBottom = visualHeight + visualOffsetTop;
  const nextOrientationKey = getOrientationKey();

  let nextBaselineLayoutHeight = args.baselineLayoutHeight;
  let nextBaselineVisualBottom = args.baselineVisualBottom;
  let nextLastOpen = args.lastOpen;

  if (!args.orientationKey || args.orientationKey !== nextOrientationKey) {
    nextBaselineLayoutHeight = layoutHeight;
    nextBaselineVisualBottom = visualBottom;
    nextLastOpen = false;
  }

  if (!nextLastOpen) {
    nextBaselineLayoutHeight = Math.max(nextBaselineLayoutHeight, layoutHeight);
    nextBaselineVisualBottom = Math.max(nextBaselineVisualBottom, visualBottom);
  }

  const rawOffset = Math.max(
    0,
    nextBaselineVisualBottom - visualBottom,
    nextBaselineLayoutHeight - visualBottom,
    layoutHeight - visualBottom
  );
  const keyboardOpen = hasFocusedTextInput() && (
    nextLastOpen
      ? rawOffset > IOS_KEYBOARD_CLOSE_THRESHOLD
      : rawOffset > IOS_KEYBOARD_THRESHOLD
  );
  const keyboardOffset = keyboardOpen ? rawOffset : 0;
  const layoutShrink = Math.max(0, nextBaselineLayoutHeight - layoutHeight);
  const keyboardOverlayOffset = keyboardOpen
    ? Math.max(0, keyboardOffset - layoutShrink)
    : 0;

  if (!keyboardOpen) {
    nextBaselineLayoutHeight = Math.max(nextBaselineLayoutHeight, layoutHeight);
    nextBaselineVisualBottom = Math.max(nextBaselineVisualBottom, visualBottom);
  }

  return {
    keyboardOffset,
    keyboardOverlayOffset,
    keyboardOpen,
    baselineLayoutHeight: nextBaselineLayoutHeight,
    baselineVisualBottom: nextBaselineVisualBottom,
    orientationKey: nextOrientationKey,
  };
}

function isTextInputLike(el: Element | null): el is HTMLElement {
  return !!el && el instanceof HTMLElement && el.matches('input, textarea, [contenteditable="true"]');
}

function hasFocusedTextInput() {
  if (typeof document === 'undefined') return false;
  return isTextInputLike(document.activeElement);
}

export function useIOSKeyboardFix({
  composerRef,
  focusScopeRef,
  hideNav,
  showNav,
  navHideWhenKeyboard = true,
  navHideWhenFocusWithin = false,
  enableScrollIntoViewOnFocus = false,
  scrollIntoViewBlock = 'center',
}: UseIOSKeyboardFixOptions = {}) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [keyboardOverlayOffset, setKeyboardOverlayOffset] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const [focusWithin, setFocusWithin] = useState(false);
  const focusTimerRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const lastKeyboardOpenRef = useRef(false);
  const baselineLayoutRef = useRef(0);
  const baselineVisualBottomRef = useRef(0);
  const orientationKeyRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const enableViewportKeyboardDocking = shouldUseViewportKeyboardDocking();

    const applyMetrics = (detail?: Partial<ViewportMetricsDetail>) => {
      const measuredOffset = Math.max(0, Number(detail?.keyboardOffset ?? 0));
      const measuredOverlayOffset = Math.max(0, Number(detail?.keyboardOverlayOffset ?? measuredOffset));
      const measuredOpen = measuredOffset > 0 || !!detail?.keyboardOpen;
      const offset = enableViewportKeyboardDocking && measuredOpen ? measuredOffset : 0;
      const overlayOffset = enableViewportKeyboardDocking && measuredOpen ? measuredOverlayOffset : 0;
      const open = enableViewportKeyboardDocking && measuredOpen;
      const detailBaselineLayout = Number(detail?.baselineLayoutHeight ?? 0);
      const detailBaselineVisualBottom = Number(detail?.baselineVisualBottom ?? 0);
      const detailVisualBottom = Number(detail?.visualBottom ?? 0);

      if (!open) {
        if (detailBaselineLayout > 0) {
          baselineLayoutRef.current = Math.max(baselineLayoutRef.current, detailBaselineLayout);
        }
        if (detailBaselineVisualBottom > 0) {
          baselineVisualBottomRef.current = Math.max(baselineVisualBottomRef.current, detailBaselineVisualBottom);
        }
        if (detailVisualBottom > 0) {
          baselineVisualBottomRef.current = Math.max(baselineVisualBottomRef.current, detailVisualBottom);
        }
      }

      lastKeyboardOpenRef.current = open;
      setKeyboardOffset(offset);
      setKeyboardOverlayOffset(open ? overlayOffset : 0);
      setIsKeyboardOpen(open);
    };

    let rafId: number | null = null;
    const scheduleFallbackFromViewport = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const fallback = computeKeyboardOffsetFromViewport({
          lastOpen: lastKeyboardOpenRef.current,
          baselineLayoutHeight: baselineLayoutRef.current,
          baselineVisualBottom: baselineVisualBottomRef.current,
          orientationKey: orientationKeyRef.current,
        });
        baselineLayoutRef.current = fallback.baselineLayoutHeight;
        baselineVisualBottomRef.current = fallback.baselineVisualBottom;
        orientationKeyRef.current = fallback.orientationKey;
        applyMetrics({
          keyboardOffset: fallback.keyboardOffset,
          keyboardOverlayOffset: fallback.keyboardOverlayOffset,
          keyboardOpen: fallback.keyboardOpen,
        });
      });
    };

    const onMetrics = (e: Event) => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      const ce = e as CustomEvent<ViewportMetricsDetail>;
      applyMetrics(ce.detail);
    };

    // Initial state: trust CSS var first (global publisher), then viewport fallback.
    const initialFromCSS = readKeyboardOffsetFromCSS();
    applyMetrics({ keyboardOffset: initialFromCSS, keyboardOpen: initialFromCSS > 0 });
    scheduleFallbackFromViewport();

    window.addEventListener('app:viewport-metrics', onMetrics as EventListener);
    window.addEventListener('resize', scheduleFallbackFromViewport, { passive: true });
    window.addEventListener('orientationchange', scheduleFallbackFromViewport, { passive: true });
    window.addEventListener('pageshow', scheduleFallbackFromViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleFallbackFromViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleFallbackFromViewport, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('app:viewport-metrics', onMetrics as EventListener);
      window.removeEventListener('resize', scheduleFallbackFromViewport);
      window.removeEventListener('orientationchange', scheduleFallbackFromViewport);
      window.removeEventListener('pageshow', scheduleFallbackFromViewport);
      window.visualViewport?.removeEventListener('resize', scheduleFallbackFromViewport);
      window.visualViewport?.removeEventListener('scroll', scheduleFallbackFromViewport);
    };
  }, []);

  useEffect(() => {
    const el = composerRef?.current;
    if (!el) return;

    const measure = () => {
      const next = Math.ceil(el.getBoundingClientRect().height) || 0;
      setComposerHeight(next);
      el.style.setProperty('--composer-h', `${next}px`);
    };

    measure();

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', measure, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [composerRef]);

  useEffect(() => {
    const scope = focusScopeRef?.current;
    if (!scope) return;

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (!isTextInputLike(target)) return;
      setFocusWithin(true);

      if (!enableScrollIntoViewOnFocus) return;

      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      const scrollTarget = scope;
      focusTimerRef.current = window.setTimeout(() => {
        scrollTarget.scrollIntoView({
          block: scrollIntoViewBlock,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      }, 100);
    };

    const onFocusOut = () => {
      if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = window.setTimeout(() => {
        const active = document.activeElement as Element | null;
        setFocusWithin(!!active && scope.contains(active) && isTextInputLike(active));
      }, 0);
    };

    scope.addEventListener('focusin', onFocusIn);
    scope.addEventListener('focusout', onFocusOut);
    return () => {
      scope.removeEventListener('focusin', onFocusIn);
      scope.removeEventListener('focusout', onFocusOut);
      if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
      if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    };
  }, [focusScopeRef, enableScrollIntoViewOnFocus, scrollIntoViewBlock]);

  useEffect(() => {
    if (!hideNav || !showNav) return;

    const shouldHide =
      (navHideWhenKeyboard && isKeyboardOpen) ||
      (navHideWhenFocusWithin && focusWithin);

    if (shouldHide) hideNav();
    else showNav();

    return () => showNav();
  }, [
    focusWithin,
    hideNav,
    isKeyboardOpen,
    navHideWhenFocusWithin,
    navHideWhenKeyboard,
    showNav,
  ]);

  // When iOS keyboard is visible, the keyboard already occupies the safe-area region.
  // Adding safe-bottom again creates a visible gap above the keyboard.
  const composerBottom = isKeyboardOpen
    ? `${keyboardOffset}px`
    : 'var(--safe-bottom)';
  const contentPaddingBottom = isKeyboardOpen
    ? `calc(${composerHeight}px + ${keyboardOffset}px + 0.75rem)`
    : `calc(${composerHeight}px + var(--bottom-nav-total-height) + 0.75rem)`;

  return {
    keyboardOffset,
    keyboardOverlayOffset,
    isKeyboardOpen,
    composerHeight,
    focusWithin,
    composerBottom,
    contentPaddingBottom,
  };
}
