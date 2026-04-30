import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PARITY_NAV_META } from "@baristachaw/shared";
import { motion } from "motion/react";
import clsx from "clsx";
import { useGlobalState } from "../context/GlobalState";
import { subscribeMediaQueryChange } from "../utils/mediaQuery";
import { mobileDockIconTransition, mobileDockPillTransition } from "../utils/motionPresets";
import { BookOpen, Gauge, Home, MessageSquare, ScanLine, ShieldCheck } from "./icons";

interface BottomNavProps {
  hidden?: boolean;
  showAdmin?: boolean;
}

type ViewportMetricsDetail = {
  keyboardOpen: boolean;
  keyboardOffset: number;
};

const NAV_IDLE_HIDE_MS = 2600;
const NAV_SCROLL_HIDE_DELTA = 14;
const NAV_SCROLL_SHOW_DELTA = 10;
const navIconCurrentColor = { '--icon-glyph-color': 'currentColor' } as CSSProperties;

function readKeyboardOpenFromRoot() {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  if (root.dataset.keyboardOpen === 'true') return true;
  const raw = getComputedStyle(root).getPropertyValue('--keyboard-offset').trim();
  const offset = Number.parseFloat(raw);
  return Number.isFinite(offset) && offset > 0;
}

function readPwaFromRoot() {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  return root.hasAttribute('data-pwa') || root.hasAttribute('data-ios-standalone') || root.hasAttribute('data-native-shell-profile');
}

export function BottomNav({ hidden = false, showAdmin = false }: BottomNavProps) {
  const { t } = useGlobalState();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const [isPwaViewport, setIsPwaViewport] = useState(() => readPwaFromRoot());
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : true
  );
  const location = useLocation();
  const hideTimerRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleIdleHide = useCallback(() => {
    if (typeof window === 'undefined' || !isMobileViewport) return;
    if (isPwaViewport) {
      setAutoHidden(false);
      clearHideTimer();
      return;
    }
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (readKeyboardOpenFromRoot()) return;
      setAutoHidden(true);
    }, NAV_IDLE_HIDE_MS);
  }, [clearHideTimer, isMobileViewport, isPwaViewport]);

  const revealNav = useCallback(() => {
    setAutoHidden(false);
    scheduleIdleHide();
  }, [scheduleIdleHide]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setKeyboardOpen(readKeyboardOpenFromRoot());
    setIsPwaViewport(readPwaFromRoot());

    const onMetrics = (event: Event) => {
      const custom = event as CustomEvent<ViewportMetricsDetail>;
      const nextOpen = !!custom.detail?.keyboardOpen || (custom.detail?.keyboardOffset ?? 0) > 0;
      setKeyboardOpen(nextOpen);
      setIsPwaViewport(readPwaFromRoot());
    };

    const onPageShow = () => setIsPwaViewport(readPwaFromRoot());

    window.addEventListener('app:viewport-metrics', onMetrics as EventListener);
    window.addEventListener('pageshow', onPageShow, { passive: true });
    return () => {
      window.removeEventListener('app:viewport-metrics', onMetrics as EventListener);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobileViewport(media.matches);
    onChange();
    const unsubscribe = subscribeMediaQueryChange(media, onChange);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isMobileViewport || isPwaViewport) {
      setAutoHidden(false);
      clearHideTimer();
      return;
    }
    setAutoHidden(false);
    scheduleIdleHide();
    return clearHideTimer;
  }, [isMobileViewport, isPwaViewport, location.pathname, scheduleIdleHide, clearHideTimer]);

  useEffect(() => {
    if (keyboardOpen) {
      setAutoHidden(false);
      clearHideTimer();
      return;
    }
    scheduleIdleHide();
  }, [keyboardOpen, scheduleIdleHide, clearHideTimer]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isMobileViewport || isPwaViewport) return;

    const onGlobalScroll = (event: Event) => {
      if (readKeyboardOpenFromRoot()) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const nextY = target && target !== document.body && target !== document.documentElement
        ? target.scrollTop
        : window.scrollY;
      const delta = nextY - lastScrollYRef.current;
      lastScrollYRef.current = nextY;
      if (Math.abs(delta) < 6) return;
      if (delta > NAV_SCROLL_HIDE_DELTA && nextY > 12) setAutoHidden(true);
      if (delta < -NAV_SCROLL_SHOW_DELTA) setAutoHidden(false);
      scheduleIdleHide();
    };

    const onPointerDown = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      revealNav();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') revealNav();
    };

    document.addEventListener('scroll', onGlobalScroll, true);
    window.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('scroll', onGlobalScroll, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isMobileViewport, isPwaViewport, revealNav, scheduleIdleHide]);

  const effectiveHidden = hidden || keyboardOpen || (isMobileViewport && !isPwaViewport && autoHidden);
  const navTransition = keyboardOpen
    ? 'none'
    : 'transform var(--motion-duration-standard) var(--motion-ease-emphasized), opacity var(--motion-duration-fast) ease-out, visibility 0s linear';
  const navItems = [
    { path: PARITY_NAV_META.Home.path, icon: Home, label: t.home || PARITY_NAV_META.Home.label },
    { path: PARITY_NAV_META.Scanner.path, icon: ScanLine, label: t.scanner || PARITY_NAV_META.Scanner.label },
    { path: PARITY_NAV_META.Tools.path, icon: Gauge, label: t.tools || PARITY_NAV_META.Tools.label },
    { path: PARITY_NAV_META.Collection.path, icon: BookOpen, label: t.collection || PARITY_NAV_META.Collection.label },
    { path: PARITY_NAV_META.Chat.path, icon: MessageSquare, label: t.chat || PARITY_NAV_META.Chat.label },
    ...(showAdmin ? [{ path: '/admin', icon: ShieldCheck, label: 'Admin' }] : []),
  ];

  return (
    <div
      data-testid="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pointer-events-none bottom-nav-fill lg:hidden"
      style={{
        bottom: 'var(--mobile-nav-dock-offset, var(--mobile-nav-floating-gap, 0px))',
        paddingBottom: 0,
        paddingLeft: 'max(8px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(8px, env(safe-area-inset-right, 0px))',
        transform: effectiveHidden ? 'translateY(calc(100% + var(--mobile-nav-dock-offset, 0px) + 8px))' : 'translateY(0)',
        opacity: effectiveHidden ? 0 : 1,
        visibility: effectiveHidden ? 'hidden' : 'visible',
        transition: navTransition,
        willChange: 'transform',
      }}
    >
      <nav
        data-testid="mobile-bottom-nav-surface"
        className="mobile-bottom-nav-surface flex items-center justify-center gap-1 pointer-events-auto w-auto"
        style={{
          width: showAdmin ? 'clamp(326px, 94vw, 420px)' : 'clamp(286px, 90vw, 360px)',
          paddingTop: '0.36rem',
          paddingBottom: '0.36rem',
        }}
      >
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            aria-label={label}
            title={label}
            className={({ isActive }) =>
              clsx(
                "focus-soft motion-pressable relative isolate overflow-hidden flex-1 min-w-[50px] min-h-[48px] rounded-full flex items-center justify-center transition-[transform,color] duration-200 ease-out active:scale-[0.98]",
                isActive ? "text-blue-500 scale-[1.03]" : "text-secondary hover:text-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobile-dock-active-pill"
                    className="mobile-bottom-nav-active-pill"
                    transition={mobileDockPillTransition}
                  />
                )}
                <motion.span
                  className="relative z-[1] flex items-center justify-center"
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={mobileDockIconTransition}
                >
                  <Icon
                    size={isActive ? 22 : 21}
                    strokeWidth={isActive ? 2.55 : 2.2}
                    variant="glyph"
                    tone={isActive ? "blue" : "neutral"}
                    style={navIconCurrentColor}
                  />
                </motion.span>
                <span className="sr-only">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
