import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuthModal } from './AuthModalContext';
import { useRuntimeDisplayMode } from '../hooks/useRuntimeDisplayMode';
import {
  AccountStatusError,
  fetchAccountStatus,
  type AccountFeatureFlag,
  type AccountStatusSnapshot,
  type FeatureSurface,
} from '../services/accountStatus';
import { 
  BILLING_PENDING_STORAGE_KEY, 
  clearBillingPendingMarker, 
  shouldClearBillingPendingMarker 
} from '@baristachaw/shared/billingFlow';

type AccountStatusContextValue = {
  snapshot: AccountStatusSnapshot | null;
  loading: boolean;
  error: AccountStatusError | null;
  surface: FeatureSurface;
  maintenance: AccountFeatureFlag[];
  refreshAccountStatus: () => Promise<void>;
};

const AccountStatusContext = createContext<AccountStatusContextValue | undefined>(undefined);

function detectNativeShell(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return root.hasAttribute('data-native-android-shell')
    || root.hasAttribute('data-native-ios-shell')
    || root.hasAttribute('data-native-shell-profile');
}

function resolveSurface(isPwa: boolean): FeatureSurface {
  if (detectNativeShell()) return 'mobile';
  return isPwa ? 'pwa' : 'web';
}

export function AccountStatusProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authChecking } = useAuthModal();
  const { isPwa } = useRuntimeDisplayMode();
  const [snapshot, setSnapshot] = useState<AccountStatusSnapshot | null>(null);
  const snapshotRef = useRef<AccountStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AccountStatusError | null>(null);
  const surface = resolveSurface(isPwa);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const refreshAccountStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      clearBillingPendingMarker();
      return;
    }
    setLoading(!snapshotRef.current);
    try {
      const next = await fetchAccountStatus(surface);
      setSnapshot(next);
      setError(null);

      // Check if we need to clear the pending marker based on the new snapshot
      let markerRaw: string | null = null;
      try {
        markerRaw = window.localStorage.getItem(BILLING_PENDING_STORAGE_KEY);
      } catch {}
      
      if (markerRaw && shouldClearBillingPendingMarker({
        markerRaw,
        now: Date.now(),
        billing: next.billing,
      })) {
        clearBillingPendingMarker();
      }

    } catch (err) {
      if (err instanceof AccountStatusError) {
        setError(err);
        if (err.status === 401 || err.status === 403) {
          setSnapshot(null);
          clearBillingPendingMarker();
        }
      } else {
        setError(new AccountStatusError('Account status unavailable.', { status: 0 }));
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, surface]);

  useEffect(() => {
    if (authChecking) return;
    void refreshAccountStatus();
  }, [authChecking, refreshAccountStatus]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const intervalSec = snapshot?.realtime.intervalSec || 60;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshAccountStatus();
      }
    }, intervalSec * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshAccountStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, refreshAccountStatus, snapshot?.realtime.intervalSec]);

  const value = useMemo<AccountStatusContextValue>(() => ({
    snapshot,
    loading,
    error,
    surface,
    maintenance: snapshot?.maintenance || [],
    refreshAccountStatus,
  }), [error, loading, refreshAccountStatus, snapshot, surface]);

  return (
    <AccountStatusContext.Provider value={value}>
      {children}
    </AccountStatusContext.Provider>
  );
}

export function useAccountStatus() {
  const context = useContext(AccountStatusContext);
  if (!context) {
    throw new Error('useAccountStatus must be used within AccountStatusProvider');
  }
  return context;
}
