export type Region = 'id' | 'bn' | 'my' | 'sg' | 'us' | 'eu' | 'au' | 'global';
export type CurrencyCode = 'idr' | 'bnd' | 'myr' | 'sgd' | 'usd' | 'eur' | 'aud';
export type BillingDuration = 'monthly' | 'quarterly' | 'yearly';
export type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
export type PaidPlanCode = Exclude<PlanCode, 'free'>;

export type MoneyByCurrency = Record<CurrencyCode, number>;

export type PriceTier = {
  original: MoneyByCurrency;
  discounted: MoneyByCurrency;
  discountPct: number;
  saveLabel: { id: string; en: string; bn: string };
};

export type PlanPricing = Record<BillingDuration, PriceTier>;

export type PlanCatalogEntry = {
  code: PlanCode;
  displayName: string;
  shortName: string;
  badge?: string;
  description: string;
  priceMonthlyUsd: number;
  features: string[];
  aiAccess: 'none' | 'basic' | 'guided' | 'coach' | 'team';
  expensiveModes: Array<'fast' | 'normal' | 'deep'>;
  checkoutEnabled: boolean;
  checkoutMode: 'disabled' | 'manual_invoice' | 'redirect' | 'contact_sales';
  aiLimit: number;
  scannerLimit: number;
  deepLimit: number;
};

export type ManualPaymentStatus =
  | 'pending_review'
  | 'receipt_received'
  | 'verified_paid'
  | 'rejected'
  | 'expired';

export const PLAN_PRICING: Record<'starter' | 'pro', PlanPricing> = {
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
} as const;

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    code: 'free',
    displayName: 'Free',
    shortName: 'Free',
    description: 'Core brew utilities for manual validation and recipe notes.',
    priceMonthlyUsd: 0,
    features: [
      'Brew Timer',
      'Grind Size Calculator',
      'Coffee Ratio Calculator',
      'Recipe Collection & Notes',
      'Basic scanner preview',
    ],
    aiAccess: 'basic',
    expensiveModes: ['fast'],
    checkoutEnabled: false,
    checkoutMode: 'disabled',
    aiLimit: 12,
    scannerLimit: 2,
    deepLimit: 0,
  },
  {
    code: 'starter',
    displayName: 'Barista Starter',
    shortName: 'Starter',
    badge: 'Best for home brewers',
    description: 'Guided AI tools, recipe controls, and manual-payment access for regular brewing.',
    priceMonthlyUsd: PLAN_PRICING.starter.monthly.discounted.usd,
    features: [
      'Everything in Free',
      'AI recipe guidance',
      'Advanced brew logging',
      'Scanner history',
      'Priority manual payment review',
    ],
    aiAccess: 'guided',
    expensiveModes: ['fast', 'normal'],
    checkoutEnabled: true,
    checkoutMode: 'manual_invoice',
    aiLimit: 60,
    scannerLimit: 12,
    deepLimit: 0,
  },
  {
    code: 'pro',
    displayName: 'Barista Pro',
    shortName: 'Pro',
    badge: 'AI Coach',
    description: 'AI Coach, deeper analysis, and paid high-cost AI modes for serious workflows.',
    priceMonthlyUsd: PLAN_PRICING.pro.monthly.discounted.usd,
    features: [
      'Everything in Barista Starter',
      'AI Coach',
      'AI Scan & Coffee Analysis',
      'AI Latte Art Generator',
      'Deep mode with higher credit use',
    ],
    aiAccess: 'coach',
    expensiveModes: ['fast', 'normal', 'deep'],
    checkoutEnabled: true,
    checkoutMode: 'manual_invoice',
    aiLimit: 180,
    scannerLimit: 60,
    deepLimit: 40,
  },
  {
    code: 'team',
    displayName: 'Team',
    shortName: 'Team',
    description: 'Shared review workflow for cafes, trainers, and roasters.',
    priceMonthlyUsd: 29.99,
    features: [
      'Everything in Barista Pro',
      'Team seats',
      'Shared recipe review',
      'Admin billing review',
      'Support-assisted setup',
    ],
    aiAccess: 'team',
    expensiveModes: ['fast', 'normal', 'deep'],
    checkoutEnabled: true,
    checkoutMode: 'manual_invoice',
    aiLimit: 800,
    scannerLimit: 240,
    deepLimit: 160,
  },
  {
    code: 'enterprise',
    displayName: 'Enterprise',
    shortName: 'Enterprise',
    description: 'Custom rollout, controls, and support for larger organizations.',
    priceMonthlyUsd: 0,
    features: [
      'Custom onboarding',
      'Advanced admin controls',
      'Custom payment terms',
      'Dedicated support',
    ],
    aiAccess: 'team',
    expensiveModes: ['fast', 'normal', 'deep'],
    checkoutEnabled: false,
    checkoutMode: 'contact_sales',
    aiLimit: 5000,
    scannerLimit: 1000,
    deepLimit: 1000,
  },
] as const;

export function normalizePlanCode(value: unknown): PlanCode | '' {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return PLAN_CATALOG.some((plan) => plan.code === raw) ? raw as PlanCode : '';
}

export function getPlanByCode(code: PlanCode): PlanCatalogEntry {
  return PLAN_CATALOG.find((plan) => plan.code === code) || PLAN_CATALOG[0];
}

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

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  switch (currency) {
    case 'idr': return `Rp ${amount.toLocaleString('id-ID')}`;
    case 'bnd': return `B$ ${amount.toFixed(2)}`;
    case 'myr': return `RM ${amount.toFixed(2)}`;
    case 'sgd': return `S$ ${amount.toFixed(2)}`;
    case 'eur': return `\u20ac${amount.toFixed(2)}`;
    case 'aud': return `A$ ${amount.toFixed(2)}`;
    case 'usd': return `$${amount.toFixed(2)}`;
    default: return `$${amount.toFixed(2)}`;
  }
}

export function resolvePlanPrice(planCode: 'starter' | 'pro', duration: BillingDuration, currency: CurrencyCode): number {
  return PLAN_PRICING[planCode][duration].discounted[currency];
}

export function resolveTeamPrice(duration: BillingDuration, currency: CurrencyCode): number {
  const monthlyUsd = getPlanByCode('team').priceMonthlyUsd;
  const multiplier = duration === 'yearly' ? 12 : duration === 'quarterly' ? 3 : 1;
  return Number((monthlyUsd * multiplier).toFixed(2));
}
