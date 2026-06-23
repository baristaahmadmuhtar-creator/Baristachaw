import {
  formatCurrency,
  getCurrencyForRegion,
  PLAN_CATALOG,
  PLAN_PRICING,
  type BillingDuration,
  type CurrencyCode,
  type PlanPricing,
  type Region,
} from '@baristachaw/shared/planCatalog';
import type { Language } from './i18n';

export const APP_ORIGIN = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://app.baristachaw.com').replace(/\/+$/, '');
export const MARKETING_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://baristachaw.com').replace(/\/+$/, '');
export const RELEASE_VERSION = 'v1.0.2';
export const ANDROID_RELEASE_TAG = RELEASE_VERSION;
export const ANDROID_APK_FILE_NAME = `BaristaChaw-${RELEASE_VERSION}.apk`;
export const DEFAULT_ANDROID_APK_URL = `https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/download/${ANDROID_RELEASE_TAG}/${ANDROID_APK_FILE_NAME}`;
const configuredAndroidApkUrl = String(import.meta.env.VITE_ANDROID_APK_URL || '').trim();
export const APK_URL = /^https:\/\//i.test(configuredAndroidApkUrl) ? configuredAndroidApkUrl : DEFAULT_ANDROID_APK_URL;
export const APK_AVAILABLE = /^https:\/\//i.test(APK_URL);
export const RELEASE_URL = `https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/tag/${ANDROID_RELEASE_TAG}`;
export const SUPPORT_ISSUE_URL = 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/issues/new';

export const APP_LINKS = {
  home: APP_ORIGIN,
  aiBrew: `${APP_ORIGIN}/tools?tab=ai_brew`,
  login: `${APP_ORIGIN}/login`,
  register: `${APP_ORIGIN}/register`,
  upgrade: `${APP_ORIGIN}/upgrade`,
} as const;

export type {
  BillingDuration,
  CurrencyCode,
  PlanPricing,
  Region,
};

/** Map language selection to the corresponding currency (deprecated, use Region) */
export function getCurrencyForLanguage(lang: Language): CurrencyCode {
  switch (lang) {
    case 'id': return 'idr';
    case 'bn': return 'bnd';
    case 'en': return 'usd';
    default: return 'usd';
  }
}

/** Format a currency amount for the active language */
export function formatCurrencyByLang(amount: number, lang: Language): string {
  return formatCurrency(amount, getCurrencyForLanguage(lang));
}

export { formatCurrency, getCurrencyForRegion, PLAN_CATALOG };

export const PRICING: Record<'plus' | 'starter' | 'pro', PlanPricing> = {
  plus: PLAN_PRICING.starter,
  starter: PLAN_PRICING.starter,
  pro: PLAN_PRICING.pro,
};
