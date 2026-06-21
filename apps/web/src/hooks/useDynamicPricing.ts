import { useState, useEffect } from 'react';
import type { DynamicPlanPrice } from '@baristachaw/shared/src/planCatalog';
import { PRICING, resolvePlanPrice } from '../services/billingConfig';

export type DynamicPricingState = {
  prices: DynamicPlanPrice[];
  isLoading: boolean;
  error: Error | null;
  getPrice: (planCode: 'starter' | 'pro', duration: 'monthly' | 'quarterly' | 'yearly', currency: string) => number;
};

let cachedPrices: DynamicPlanPrice[] | null = null;
let fetchPromise: Promise<DynamicPlanPrice[]> | null = null;

async function fetchDynamicPrices(): Promise<DynamicPlanPrice[]> {
  if (cachedPrices) return cachedPrices;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/billing/pricing')
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch prices');
      cachedPrices = data.prices;
      return cachedPrices || [];
    })
    .catch((err) => {
      console.warn('Dynamic pricing fallback triggered:', err);
      return [];
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useDynamicPricing(): DynamicPricingState {
  const [prices, setPrices] = useState<DynamicPlanPrice[]>(cachedPrices || []);
  const [isLoading, setIsLoading] = useState(!cachedPrices);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedPrices) return;
    
    let isMounted = true;
    fetchDynamicPrices()
      .then((data) => {
        if (isMounted) {
          setPrices(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getPrice = (planCode: 'starter' | 'pro', duration: 'monthly' | 'quarterly' | 'yearly', currency: string) => {
    if (prices.length > 0) {
      const match = prices.find(
        p => p.planCode === planCode && p.duration === duration && p.currency === currency
      );
      if (match) return match.discountPrice ?? match.originalPrice;
    }
    
    // Fallback to hardcoded PRICING if not found in db or db failed
    return resolvePlanPrice(planCode, duration, currency as any);
  };

  return { prices, isLoading, error, getPrice };
}
