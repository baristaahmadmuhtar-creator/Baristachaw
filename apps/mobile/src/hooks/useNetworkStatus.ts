import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

function toOnlineState(state: Network.NetworkState | null | undefined): boolean {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      try {
        const current = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsOnline(toOnlineState(current));
        }
      } catch {
        if (mounted) {
          setIsOnline(true);
        }
      }
    };

    void sync();
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(toOnlineState(state));
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return { isOnline } as const;
}

