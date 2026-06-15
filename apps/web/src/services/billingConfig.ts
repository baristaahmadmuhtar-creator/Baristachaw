import type { Region, CurrencyCode } from '../types';
export type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

export type PriceTier = {
  original: { idr: number; bnd: number; myr: number; sgd: number; usd: number; eur: number; aud: number };
  discounted: { idr: number; bnd: number; myr: number; sgd: number; usd: number; eur: number; aud: number };
  discountPct: number;
  saveLabel: { id: string; en: string; bn: string };
};

export type PlanPricing = Record<BillingDuration, PriceTier>;

export function getCurrencyForRegion(region: Region): CurrencyCode {
  switch (region) {
    case 'id': return 'idr';
    case 'bn': return 'bnd';
    case 'my': return 'myr';
    case 'sg': return 'sgd';
    case 'eu': return 'eur';
    case 'au': return 'aud';
    case 'us': 
    case 'global': 
    default: return 'usd';
  }
}

export const PRICING: Record<'starter' | 'pro', PlanPricing> = {
  starter: {
    monthly: {
      original: { idr: 100_000, bnd: 7.99, myr: 25.99, sgd: 7.99, usd: 5.99, eur: 5.99, aud: 8.99 },
      discounted: { idr: 61_000, bnd: 4.99, myr: 15.99, sgd: 4.99, usd: 3.99, eur: 3.99, aud: 5.99 },
      discountPct: 39,
      saveLabel: { id: 'Diskon 39%', en: '39% Off', bn: 'Diskaun 39%' },
    },
    quarterly: {
      original: { idr: 250_000, bnd: 19.99, myr: 64.99, sgd: 19.99, usd: 14.99, eur: 14.99, aud: 22.99 },
      discounted: { idr: 149_000, bnd: 11.99, myr: 38.99, sgd: 11.99, usd: 8.99, eur: 8.99, aud: 13.99 },
      discountPct: 40,
      saveLabel: { id: 'Hemat 40%', en: 'Save 40%', bn: 'Jimat 40%' },
    },
    yearly: {
      original: { idr: 900_000, bnd: 73.99, myr: 239.99, sgd: 73.99, usd: 54.99, eur: 54.99, aud: 84.99 },
      discounted: { idr: 449_000, bnd: 36.99, myr: 119.99, sgd: 36.99, usd: 27.99, eur: 27.99, aud: 42.99 },
      discountPct: 50,
      saveLabel: { id: 'Hemat 50%', en: 'Save 50%', bn: 'Jimat 50%' },
    },
  },
  pro: {
    monthly: {
      original: { idr: 199_000, bnd: 15.99, myr: 51.99, sgd: 15.99, usd: 11.99, eur: 11.99, aud: 17.99 },
      discounted: { idr: 199_000, bnd: 15.99, myr: 51.99, sgd: 15.99, usd: 11.99, eur: 11.99, aud: 17.99 },
      discountPct: 0,
      saveLabel: { id: '', en: '', bn: '' },
    },
    quarterly: {
      original: { idr: 499_000, bnd: 39.99, myr: 129.99, sgd: 39.99, usd: 29.99, eur: 29.99, aud: 44.99 },
      discounted: { idr: 399_000, bnd: 32.99, myr: 106.99, sgd: 32.99, usd: 23.99, eur: 23.99, aud: 36.99 },
      discountPct: 20,
      saveLabel: { id: 'Hemat 20%', en: 'Save 20%', bn: 'Jimat 20%' },
    },
    yearly: {
      original: { idr: 1_800_000, bnd: 147.99, myr: 479.99, sgd: 147.99, usd: 109.99, eur: 109.99, aud: 169.99 },
      discounted: { idr: 999_000, bnd: 81.99, myr: 265.99, sgd: 81.99, usd: 59.99, eur: 59.99, aud: 89.99 },
      discountPct: 44,
      saveLabel: { id: 'Hemat 44%', en: 'Save 44%', bn: 'Jimat 44%' },
    },
  },
};

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  switch (currency) {
    case 'idr': return `Rp ${amount.toLocaleString('id-ID')}`;
    case 'bnd': return `B$ ${amount.toFixed(2)}`;
    case 'myr': return `RM ${amount.toFixed(2)}`;
    case 'sgd': return `S$ ${amount.toFixed(2)}`;
    case 'eur': return `€${amount.toFixed(2)}`;
    case 'aud': return `A$ ${amount.toFixed(2)}`;
    case 'usd': return `$${amount.toFixed(2)}`;
    default: return `$${amount.toFixed(2)}`;
  }
}
