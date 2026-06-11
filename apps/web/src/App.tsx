import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { AuthEntryModal } from './components/auth/AuthEntryModal';
import { OfflineBanner } from './components/system/OfflineBanner';
import { MaintenanceBanner } from './components/system/MaintenanceBanner';
import { FirstRunOnboarding } from './components/onboarding/FirstRunOnboarding';
import { GlobalProvider } from './context/GlobalState';
import { NavbarProvider, useNavbar } from './context/NavbarContext';
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext';
import { AccountStatusProvider } from './context/AccountStatusContext';
import { MotionConfig } from 'motion/react';
import { subscribeMediaQueryChange } from './utils/mediaQuery';
import { motionDefaultTransition } from './utils/motionPresets';
import { installClientErrorReporting } from './services/errorReporting';

const MOBILE_ROUTE_ORDER = ['/', '/scanner', '/tools', '/collection', '/chat'] as const;
const DESIGN_ROUTE = '/design/native-production-showcase';
const AUTH_ROUTE_PATHS = new Set(['/login', '/masuk', '/signin', '/register', '/signup', '/daftar']);
const SWIPE_MIN_DISTANCE = 84;
const SWIPE_STRONG_DISTANCE = 122;
const SWIPE_MAX_VERTICAL = 68;
const SWIPE_MIN_VELOCITY = 0.3;
const SWIPE_EDGE_OVERRIDE_PX = 32;
const SWIPE_EDGE_OVERRIDE_PERCENT = 0.18;

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Scanner = lazy(() => import('./pages/Scanner').then((module) => ({ default: module.Scanner })));
const Chat = lazy(() => import('./pages/Chat').then((module) => ({ default: module.Chat })));
const Collection = lazy(() => import('./pages/Collection').then((module) => ({ default: module.Collection })));
const BaristaTools = lazy(() => import('./pages/BaristaTools').then((module) => ({ default: module.BaristaTools })));
const AuthScreen = lazy(() => import('./pages/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const NativeProductionShowcase = lazy(() => import('./pages/design/NativeProductionShowcase').then((module) => ({ default: module.NativeProductionShowcase })));
const AdminManagement = lazy(() => import('./pages/AdminManagement').then((module) => ({ default: module.AdminManagement })));

function normalizeRoutePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function RouteLoadingFallback() {
  return (
    <div
      className="route-loading-shell min-h-[var(--app-height)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex min-h-[var(--app-height)] max-w-5xl flex-col justify-center px-6 py-16">
        <div className="route-loading-panel max-w-xl rounded-[2rem] p-6">
          <div className="route-loading-badge inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--auth-accent)]" />
            Baristachaw
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-primary">
            Memuat ruang kerja barista
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-secondary">
            Menyiapkan alat seduh, konteks obrolan, dan status ruang kerja tersimpan.
          </p>
          <div className="mt-8 space-y-3">
            <div className="route-loading-bar h-3 w-40 animate-pulse rounded-full" />
            <div className="route-loading-block h-16 animate-pulse rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="route-loading-block h-24 animate-pulse rounded-2xl" />
              <div className="route-loading-block h-24 animate-pulse rounded-2xl" />
              <div className="route-loading-block h-24 animate-pulse rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizePath(pathname: string): (typeof MOBILE_ROUTE_ORDER)[number] | null {
  const normalized = normalizeRoutePath(pathname);
  if (normalized === '/coffee') return '/tools';
  return MOBILE_ROUTE_ORDER.includes(normalized as (typeof MOBILE_ROUTE_ORDER)[number])
    ? (normalized as (typeof MOBILE_ROUTE_ORDER)[number])
    : null;
}

function isAuthRoutePath(pathname: string): boolean {
  return AUTH_ROUTE_PATHS.has(normalizeRoutePath(pathname));
}

function hasHorizontalScrollableAncestor(target: Element | null) {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const hasScrollableOverflow = (style.overflowX === 'auto' || style.overflowX === 'scroll')
      && node.scrollWidth > node.clientWidth + 4;
    if (hasScrollableOverflow) return true;
    node = node.parentElement;
  }
  return false;
}

function shouldIgnoreSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;
  if (target.closest('input, textarea, select, button, a, label, [role="button"], [contenteditable="true"], video, audio, [data-disable-page-swipe]')) {
    return true;
  }
  return hasHorizontalScrollableAncestor(target);
}

function AppContent() {
  const {
    navHidden,
    desktopRailCollapsed,
    desktopChatNavOpen,
    desktopChatSidebarCollapsed,
  } = useNavbar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthModal();
  const routeLayerRef = useRef<HTMLDivElement | null>(null);
  const currentPathRef = useRef(location.pathname);
  const isDesignRoute = location.pathname === DESIGN_ROUTE;
  const isChatRoute = location.pathname === '/chat';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = isAuthRoutePath(location.pathname);
  const isAuthSurface = isAuthRoute;
  const desktopChatPanelWidth = isChatRoute && desktopChatNavOpen
    ? (
        desktopChatSidebarCollapsed
          ? 'var(--chat-history-width-collapsed)'
          : 'var(--chat-history-width-expanded)'
      )
    : '0px';
  const desktopChatShellOffset = isChatRoute && desktopChatNavOpen
    ? `calc(var(--desktop-rail-current-width, var(--desktop-rail-width-expanded)) + ${desktopChatPanelWidth} + 0.75rem)`
    : 'var(--desktop-rail-current-width, var(--desktop-rail-width-expanded))';
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    const unsubscribe = subscribeMediaQueryChange(media, onChange);
    return unsubscribe;
  }, []);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || isDesktop || isDesignRoute) return;
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;

    let tracking = false;
    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const resetTracking = () => {
      tracking = false;
      pointerId = -1;
      startX = 0;
      startY = 0;
      startTime = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const rect = routeLayer.getBoundingClientRect();
      const edgeOverrideWidth = Math.max(SWIPE_EDGE_OVERRIDE_PX, rect.width * SWIPE_EDGE_OVERRIDE_PERCENT);
      const nearLeftEdge = event.clientX <= rect.left + edgeOverrideWidth;
      const nearRightEdge = event.clientX >= rect.right - edgeOverrideWidth;
      if (shouldIgnoreSwipeTarget(event.target) && !nearLeftEdge && !nearRightEdge) return;
      tracking = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startTime = event.timeStamp;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!tracking || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) + 18) {
        resetTracking();
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!tracking || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const elapsedMs = Math.max(1, event.timeStamp - startTime);
      const velocity = Math.abs(dx) / elapsedMs;
      resetTracking();

      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;
      if (velocity < SWIPE_MIN_VELOCITY && Math.abs(dx) < SWIPE_STRONG_DISTANCE) return;

      const livePath = typeof window !== 'undefined' ? window.location.pathname : currentPathRef.current;
      const currentPath = normalizePath(livePath) || normalizePath(currentPathRef.current);
      if (!currentPath) return;
      const currentIndex = MOBILE_ROUTE_ORDER.indexOf(currentPath);
      if (currentIndex < 0) return;

      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      const nextPath = MOBILE_ROUTE_ORDER[nextIndex];
      if (!nextPath || nextPath === currentPath) return;

      navigate(nextPath);
    };

    const onPointerCancel = () => resetTracking();

    routeLayer.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    return () => {
      routeLayer.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [isDesktop, isDesignRoute, navigate]);

  const normalizedPath = normalizePath(location.pathname);
  const isMobileChatRoute = !isDesktop && normalizedPath === '/chat';
  const routes = (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/tools" element={<BaristaTools />} />
        <Route path="/coffee" element={<BaristaTools />} />
        <Route path="/login" element={<AuthScreen intent="signIn" onLogin={() => navigate('/')} />} />
        <Route path="/masuk" element={<AuthScreen intent="signIn" onLogin={() => navigate('/')} />} />
        <Route path="/signin" element={<AuthScreen intent="signIn" onLogin={() => navigate('/')} />} />
        <Route path="/register" element={<AuthScreen intent="signUp" onLogin={() => navigate('/')} />} />
        <Route path="/signup" element={<AuthScreen intent="signUp" onLogin={() => navigate('/')} />} />
        <Route path="/daftar" element={<AuthScreen intent="signUp" onLogin={() => navigate('/')} />} />
        <Route path="/admin" element={<AdminManagement />} />
        <Route path={DESIGN_ROUTE} element={<NativeProductionShowcase />} />
      </Routes>
    </Suspense>
  );

  if (isDesignRoute) {
    return (
      <div className="app-shell app-shell--design">
        <div ref={routeLayerRef} className="app-route-layer app-route-layer--design">
          {routes}
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      style={{
        // Desktop shell width tracks collapsed/expanded left rail.
        ['--desktop-rail-current-width' as string]: desktopRailCollapsed
          ? 'var(--desktop-rail-width-collapsed)'
          : 'var(--desktop-rail-width-expanded)',
        ['--desktop-chat-panel-current-width' as string]: desktopChatPanelWidth,
        ['--desktop-chat-shell-offset' as string]: desktopChatShellOffset,
      }}
    >
      <OfflineBanner />
      {!isAuthSurface && <MaintenanceBanner />}
      {!isAuthSurface && <DesktopSidebar />}
      <div
        ref={routeLayerRef}
        data-testid="app-route-layer"
        className={`app-route-layer ${isAuthSurface ? '' : 'app-route-layer-desktop'}`}
      >
        {routes}
      </div>
      {!isMobileChatRoute && !isAdminRoute && !isAuthSurface && <BottomNav hidden={navHidden} showAdmin={Boolean(user?.isAdmin)} />}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    return installClientErrorReporting();
  }, []);

  return (
    <Router>
      <GlobalProvider>
        <AuthModalProvider>
          <AccountStatusProvider>
            <NavbarProvider>
              <MotionConfig reducedMotion="user" transition={motionDefaultTransition}>
                <AppContent />
                <FirstRunOnboarding />
              </MotionConfig>
            </NavbarProvider>
          </AccountStatusProvider>
          <AuthEntryModal />
        </AuthModalProvider>
      </GlobalProvider>
    </Router>
  );
}
