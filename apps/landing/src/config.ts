import type { Language } from './i18n';

export const APP_ORIGIN = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://app.baristachaw.com').replace(/\/+$/, '');
export const MARKETING_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://baristachaw.com').replace(/\/+$/, '');
export const RELEASE_VERSION = 'v1.0.2';
export const APK_URL = import.meta.env.VITE_ANDROID_APK_URL
  || 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/download/v1.0.2/BaristaChaw-v1.0.2.apk';
export const RELEASE_URL = 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/tag/v1.0.2';
export const SUPPORT_ISSUE_URL = 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/issues/new';

export const APP_LINKS = {
  home: APP_ORIGIN,
  aiBrew: `${APP_ORIGIN}/tools?tab=ai_brew`,
  login: `${APP_ORIGIN}/login`,
  register: `${APP_ORIGIN}/register`,
  upgrade: `${APP_ORIGIN}/upgrade`,
} as const;

export type CurrencyCode = 'idr' | 'bnd' | 'usd';
export type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

export type PriceTier = {
  original: { idr: number; bnd: number; usd: number };
  discounted: { idr: number; bnd: number; usd: number };
  discountPct: number;
  saveLabel: { id: string; en: string; bn: string };
};

export type PlanPricing = Record<BillingDuration, PriceTier>;

/** Map language selection to the corresponding currency */
export function getCurrencyForLanguage(lang: Language): CurrencyCode {
  switch (lang) {
    case 'id': return 'idr';
    case 'bn': return 'bnd';
    case 'en': return 'usd';
  }
}

/** Format a currency amount for the active language */
export function formatCurrencyByLang(amount: number, lang: Language): string {
  return formatCurrency(amount, getCurrencyForLanguage(lang));
}

export const PRICING: Record<'plus' | 'pro', PlanPricing> = {
  plus: {
    monthly: {
      original: { idr: 100_000, bnd: 7.99, usd: 5.99 },
      discounted: { idr: 61_000, bnd: 4.99, usd: 3.99 },
      discountPct: 39,
      saveLabel: { id: 'Diskon 39%', en: '39% Off', bn: 'Diskaun 39%' },
    },
    quarterly: {
      original: { idr: 250_000, bnd: 19.99, usd: 14.99 },
      discounted: { idr: 149_000, bnd: 11.99, usd: 8.99 },
      discountPct: 40,
      saveLabel: { id: 'Hemat 40%', en: 'Save 40%', bn: 'Jimat 40%' },
    },
    yearly: {
      original: { idr: 900_000, bnd: 73.99, usd: 54.99 },
      discounted: { idr: 449_000, bnd: 36.99, usd: 27.99 },
      discountPct: 50,
      saveLabel: { id: 'Hemat 50%', en: 'Save 50%', bn: 'Jimat 50%' },
    },
  },
  pro: {
    monthly: {
      original: { idr: 199_000, bnd: 15.99, usd: 11.99 },
      discounted: { idr: 199_000, bnd: 15.99, usd: 11.99 },
      discountPct: 0,
      saveLabel: { id: '', en: '', bn: '' },
    },
    quarterly: {
      original: { idr: 499_000, bnd: 39.99, usd: 29.99 },
      discounted: { idr: 399_000, bnd: 32.99, usd: 23.99 },
      discountPct: 20,
      saveLabel: { id: 'Hemat 20%', en: 'Save 20%', bn: 'Jimat 20%' },
    },
    yearly: {
      original: { idr: 1_800_000, bnd: 147.99, usd: 109.99 },
      discounted: { idr: 999_000, bnd: 81.99, usd: 59.99 },
      discountPct: 44,
      saveLabel: { id: 'Hemat 44%', en: 'Save 44%', bn: 'Jimat 44%' },
    },
  },
};

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  switch (currency) {
    case 'idr': return `Rp ${amount.toLocaleString('id-ID')}`;
    case 'bnd': return `B$ ${amount.toFixed(2)}`;
    case 'usd': return `$${amount.toFixed(2)}`;
  }
}
