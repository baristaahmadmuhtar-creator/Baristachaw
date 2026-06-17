import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  requireAuth,
  sanitizeErrorDetails,
  type AuthContext,
} from '../_shared.js';
import {
  activeOperationalFlags,
  buildRuntimeFeatureFlags,
  mergeFeatureFlagsWithDefaults,
  normalizeFeatureSurface,
  RUNTIME_FEATURE_FLAG_PATCHES,
  type AdminFeatureFlag,
  type FeatureSurface,
} from '../admin/_featureFlags.js';
import { PLAN_CATALOG, PLAN_PRICING, formatCurrency } from '../../packages/shared/src/planCatalog.js';

type AccountStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
export type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
type DataMode = 'supabase' | 'runtime_fallback';
type BillingProvider = 'none' | 'admin' | 'google_play' | 'app_store' | 'stripe' | 'revenuecat' | 'manual' | 'midtrans' | 'xendit';
type BillingStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'refunded';
type BillingMarket = 'indonesia' | 'brunei' | 'global' | 'unknown';
type CheckoutMode = 'disabled' | 'external' | 'stripe_checkout' | 'play_billing' | 'app_store' | 'manual_invoice';

type AccountPlan = {
  code: PlanCode;
  name: string;
  description: string;
  aiDailyLimit: number;
  deepDailyLimit: number;
  scannerDailyLimit: number;
  storageMb: number;
  seats: number;
  supportSlaHours: number;
  features: string[];
  priceMonthlyUsd: number;
  displayPrice: string;
  checkoutMode: CheckoutMode;
};

type AccountBilling = {
  status: BillingStatus;
  provider: BillingProvider;
  market: BillingMarket;
  paymentAction: 'none' | 'checkout' | 'manage' | 'contact_support';
  paymentActionRequired: boolean;
  message: string;
  checkoutUrl?: string;
  manageUrl?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  lastEventAt?: string;
};

type AccountUser = {
  id: string;
  email?: string;
  name: string;
  picture?: string;
  role: string;
  status: AccountStatus;
  planCode: PlanCode;
  planName: string;
  lastSeenAt: string;
};

export type AccountStatusResponse = {
  ok: true;
  requestId: string;
  generatedAt: string;
  dataMode: DataMode;
  user: AccountUser;
  plan: AccountPlan;
  plans: AccountPlan[];
  billing: AccountBilling;
  recommendedUpgrade: {
    planCode: PlanCode;
    planName: string;
    ctaLabel: string;
    reason: string;
    action: AccountBilling['paymentAction'];
  };
  featureFlags: AdminFeatureFlag[];
  maintenance: AdminFeatureFlag[];
  appAccess: {
    status: 'ok' | 'limited' | 'blocked';
    message: string;
  };
  warnings: string[];
  realtime: {
    strategy: 'polling';
    intervalSec: number;
  };
};

type SupabaseConfig = {
  configured: true;
  url: string;
  serviceRoleKey: string;
} | {
  configured: false;
};

const ACCOUNT_RATE_LIMIT = {
  maxRequests: 180,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 30,
  burstWindowMs: 10 * 1000,
} as const;

const ACCOUNT_POLL_INTERVAL_SEC = 60;

function sharedPlan(code: PlanCode) {
  return PLAN_CATALOG.find((plan) => plan.code === code) || PLAN_CATALOG[0];
}

function sharedMonthlyPriceLabel(code: PlanCode): string {
  if (code === 'starter' || code === 'pro') {
    const tier = PLAN_PRICING[code].monthly.discounted;
    return `${formatCurrency(tier.idr, 'idr')} / ${formatCurrency(tier.bnd, 'bnd')} / ${formatCurrency(tier.usd, 'usd')} monthly`;
  }
  if (code === 'team') return `${formatCurrency(sharedPlan('team').priceMonthlyUsd, 'usd')} monthly`;
  if (code === 'enterprise') return 'Custom invoice';
  return 'Free';
}

const PLAN_BLUEPRINTS: AccountPlan[] = [
  {
    code: 'free',
    name: sharedPlan('free').displayName,
    description: sharedPlan('free').description,
    aiDailyLimit: 12,
    deepDailyLimit: 0,
    scannerDailyLimit: 2,
    storageMb: 64,
    seats: 1,
    supportSlaHours: 72,
    features: [...sharedPlan('free').features],
    priceMonthlyUsd: 0,
    displayPrice: sharedMonthlyPriceLabel('free'),
    checkoutMode: 'disabled',
  },
  {
    code: 'starter',
    name: sharedPlan('starter').displayName,
    description: sharedPlan('starter').description,
    aiDailyLimit: 999,
    deepDailyLimit: 0,
    scannerDailyLimit: 12,
    storageMb: 512,
    seats: 1,
    supportSlaHours: 48,
    features: [...sharedPlan('starter').features],
    priceMonthlyUsd: sharedPlan('starter').priceMonthlyUsd,
    displayPrice: sharedMonthlyPriceLabel('starter'),
    checkoutMode: 'manual_invoice',
  },
  {
    code: 'pro',
    name: sharedPlan('pro').displayName,
    description: sharedPlan('pro').description,
    aiDailyLimit: 999,
    deepDailyLimit: 120,
    scannerDailyLimit: 120,
    storageMb: 2048,
    seats: 1,
    supportSlaHours: 24,
    features: [...sharedPlan('pro').features],
    priceMonthlyUsd: sharedPlan('pro').priceMonthlyUsd,
    displayPrice: sharedMonthlyPriceLabel('pro'),
    checkoutMode: 'manual_invoice',
  },
  {
    code: 'team',
    name: sharedPlan('team').displayName,
    description: sharedPlan('team').description,
    aiDailyLimit: 800,
    deepDailyLimit: 160,
    scannerDailyLimit: 240,
    storageMb: 10240,
    seats: 8,
    supportSlaHours: 12,
    features: [...sharedPlan('team').features],
    priceMonthlyUsd: sharedPlan('team').priceMonthlyUsd,
    displayPrice: sharedMonthlyPriceLabel('team'),
    checkoutMode: 'manual_invoice',
  },
  {
    code: 'enterprise',
    name: sharedPlan('enterprise').displayName,
    description: sharedPlan('enterprise').description,
    aiDailyLimit: 5000,
    deepDailyLimit: 1000,
    scannerDailyLimit: 1000,
    storageMb: 102400,
    seats: 50,
    supportSlaHours: 4,
    features: [...sharedPlan('enterprise').features],
    priceMonthlyUsd: 0,
    displayPrice: sharedMonthlyPriceLabel('enterprise'),
    checkoutMode: 'manual_invoice',
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SECRET_KEY');
  if (!url || !serviceRoleKey) return { configured: false };
  return { configured: true, url, serviceRoleKey };
}

async function supabaseRest<T>(config: Extract<SupabaseConfig, { configured: true }>, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${path} returned ${response.status}: ${text.slice(0, 180)}`);
  }
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

function normalizeStatus(value: unknown): AccountStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'trialing' || raw === 'past_due' || raw === 'suspended' || raw === 'deleted') return raw;
  return 'active';
}

function normalizePlanCode(value: unknown): PlanCode {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'starter' || raw === 'pro' || raw === 'team' || raw === 'enterprise') return raw;
  return 'free';
}

function normalizeProvider(value: unknown): string {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'google' || raw === 'apple' || raw === 'email' || raw === 'guest') return raw;
  return 'unknown';
}

function normalizeBillingProvider(value: unknown): BillingProvider {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'admin' || raw === 'google_play' || raw === 'app_store' || raw === 'stripe' || raw === 'revenuecat' || raw === 'manual' || raw === 'midtrans' || raw === 'xendit') return raw;
  return 'none';
}

function normalizeBillingStatus(value: unknown, fallback: BillingStatus = 'none'): BillingStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'active' || raw === 'trialing' || raw === 'past_due' || raw === 'cancelled' || raw === 'expired' || raw === 'refunded') return raw;
  return fallback;
}

function normalizeBillingMarket(value: unknown, country?: string): BillingMarket {
  const raw = normalizeText(value || country).toLowerCase();
  if (raw === 'id' || raw === 'idn' || raw === 'indonesia') return 'indonesia';
  if (raw === 'bn' || raw === 'brn' || raw === 'brunei' || raw === 'brunei darussalam') return 'brunei';
  if (raw === 'global') return 'global';
  return country ? 'global' : 'unknown';
}

function normalizeCheckoutMode(value: unknown, fallback: CheckoutMode): CheckoutMode {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'disabled' || raw === 'external' || raw === 'stripe_checkout' || raw === 'play_billing' || raw === 'app_store' || raw === 'manual_invoice') return raw;
  return fallback;
}

function planByCode(code: PlanCode): AccountPlan {
  return PLAN_BLUEPRINTS.find((plan) => plan.code === code) || PLAN_BLUEPRINTS[0];
}

function planFromSupabase(row: any): AccountPlan {
  const code = normalizePlanCode(row.code || row.plan_code);
  const fallback = planByCode(code);
  return {
    code,
    name: normalizeText(row.name, fallback.name),
    description: normalizeText(row.description, fallback.description),
    aiDailyLimit: Number(row.ai_daily_limit ?? row.aiDailyLimit ?? fallback.aiDailyLimit) || fallback.aiDailyLimit,
    deepDailyLimit: Number(row.deep_daily_limit ?? row.deepDailyLimit ?? fallback.deepDailyLimit) || fallback.deepDailyLimit,
    scannerDailyLimit: Number(row.scanner_daily_limit ?? row.scannerDailyLimit ?? fallback.scannerDailyLimit) || fallback.scannerDailyLimit,
    storageMb: Number(row.storage_mb ?? row.storageMb ?? fallback.storageMb) || fallback.storageMb,
    seats: Number(row.seats ?? fallback.seats) || fallback.seats,
    supportSlaHours: Number(row.support_sla_hours ?? row.supportSlaHours ?? fallback.supportSlaHours) || fallback.supportSlaHours,
    features: Array.isArray(row.features) ? row.features.map((item: unknown) => normalizeText(item)).filter(Boolean) : fallback.features,
    priceMonthlyUsd: Number(row.price_monthly_usd ?? row.priceMonthlyUsd ?? fallback.priceMonthlyUsd) || fallback.priceMonthlyUsd,
    displayPrice: normalizeText(row.display_price || row.displayPrice, fallback.displayPrice),
    checkoutMode: normalizeCheckoutMode(row.checkout_mode || row.checkoutMode, fallback.checkoutMode),
  };
}

function userFromAuth(auth: AuthContext): AccountUser {
  const rawUser = auth.user || {};
  const email = normalizeText(rawUser.email);
  const name = normalizeText(rawUser.name || rawUser.displayName, email ? email.split('@')[0] : 'Baristachaw user');
  const planCode = normalizePlanCode(rawUser.planCode || rawUser.plan_code);
  return {
    id: auth.userId,
    email: email || undefined,
    name,
    picture: normalizeText(rawUser.picture || rawUser.avatarUrl) || undefined,
    role: normalizeText(rawUser.role, 'user'),
    status: 'active',
    planCode,
    planName: planByCode(planCode).name,
    lastSeenAt: nowIso(),
  };
}

function userFromSupabase(row: any, auth: AuthContext): AccountUser {
  const fallback = userFromAuth(auth);
  const planCode = normalizePlanCode(row.plan_code || row.planCode);
  const email = normalizeText(row.email, fallback.email || '');
  return {
    id: normalizeText(row.id || row.user_id, fallback.id),
    email: email || undefined,
    name: normalizeText(row.display_name || row.name, fallback.name),
    picture: normalizeText(row.avatar_url || row.picture) || fallback.picture,
    role: normalizeText(row.role, fallback.role),
    status: normalizeStatus(row.status),
    planCode,
    planName: planByCode(planCode).name,
    lastSeenAt: normalizeText(row.last_seen_at || row.updated_at, nowIso()),
  };
}

function defaultBillingStatus(planCode: PlanCode, status: AccountStatus): BillingStatus {
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due') return 'past_due';
  if (status === 'suspended' || status === 'deleted') return 'none';
  return planCode === 'free' ? 'none' : 'active';
}

function readPublicUrl(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (/^https:\/\//i.test(value)) return value;
  }
  return '';
}

function billingFromRow(row: any, user: AccountUser): AccountBilling {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const rawStatus = normalizeBillingStatus(row?.billing_status ?? metadata.billingStatus, defaultBillingStatus(user.planCode, user.status));
  const provider = normalizeBillingProvider(row?.billing_provider ?? metadata.billingProvider);
  const unverifiedPaidPlan = user.planCode !== 'free'
    && (provider === 'none' || provider === 'admin')
    && rawStatus !== 'past_due'
    && rawStatus !== 'cancelled'
    && rawStatus !== 'expired'
    && rawStatus !== 'refunded';
  const status = unverifiedPaidPlan ? 'trialing' : rawStatus;
  const paymentActionRequired = Boolean(row?.payment_action_required ?? metadata.paymentActionRequired ?? (status === 'past_due')) || unverifiedPaidPlan;
  const manageUrl = readPublicUrl('BILLING_PORTAL_URL', 'STRIPE_CUSTOMER_PORTAL_URL', 'REVENUECAT_CUSTOMER_CENTER_URL');
  const checkoutUrl = readPublicUrl(`BILLING_CHECKOUT_URL_${user.planCode.toUpperCase()}`, `STRIPE_CHECKOUT_URL_${user.planCode.toUpperCase()}`, `REVENUECAT_CHECKOUT_URL_${user.planCode.toUpperCase()}`, 'BILLING_CHECKOUT_URL');
  const paymentAction: AccountBilling['paymentAction'] = paymentActionRequired || status === 'past_due'
    ? unverifiedPaidPlan ? 'contact_support' : 'manage'
    : user.planCode === 'free'
      ? 'checkout'
      : provider === 'manual'
        ? 'contact_support'
        : 'none';
  const message = unverifiedPaidPlan
    ? 'Your paid plan is waiting for admin billing verification. Contact support before relying on paid limits.'
    : status === 'past_due'
    ? 'Your payment needs attention. Update billing to keep paid limits active.'
    : status === 'cancelled' || status === 'expired'
      ? 'Your paid entitlement is no longer active. Choose a plan to restore paid features.'
      : '';

  return {
    status,
    provider,
    market: normalizeBillingMarket(row?.billing_market ?? metadata.billingMarket, row?.country ?? metadata.country),
    paymentAction,
    paymentActionRequired,
    message,
    checkoutUrl: checkoutUrl || undefined,
    manageUrl: manageUrl || undefined,
    currentPeriodStart: normalizeText(row?.billing_period_start ?? row?.current_period_start ?? metadata.billingPeriodStart) || undefined,
    currentPeriodEnd: normalizeText(row?.billing_period_end ?? row?.current_period_end ?? metadata.billingPeriodEnd) || undefined,
    lastEventAt: normalizeText(row?.billing_last_event_at ?? metadata.billingLastEventAt) || undefined,
  };
}

function runtimeBilling(user: AccountUser): AccountBilling {
  const unverifiedPaidPlan = user.planCode !== 'free';
  return {
    status: unverifiedPaidPlan ? 'trialing' : defaultBillingStatus(user.planCode, user.status),
    provider: 'none',
    market: 'unknown',
    paymentAction: user.planCode === 'free' ? 'checkout' : 'contact_support',
    paymentActionRequired: unverifiedPaidPlan,
    message: user.planCode === 'free'
      ? ''
      : 'Your paid plan is waiting for admin billing verification. Contact support before relying on paid limits.',
    checkoutUrl: readPublicUrl('BILLING_CHECKOUT_URL') || undefined,
    manageUrl: readPublicUrl('BILLING_PORTAL_URL') || undefined,
    currentPeriodStart: undefined,
    currentPeriodEnd: undefined,
    lastEventAt: undefined,
  };
}

function userWithEntitlement(row: any, user: AccountUser): AccountUser {
  const planCode = normalizePlanCode(row?.plan_code || row?.planCode);
  const billingStatus = normalizeBillingStatus(row?.status, 'active');
  const nextStatus: AccountStatus = billingStatus === 'past_due'
    ? 'past_due'
    : billingStatus === 'trialing'
      ? 'trialing'
      : user.status === 'suspended' || user.status === 'deleted'
        ? user.status
        : 'active';
  return {
    ...user,
    planCode,
    planName: planByCode(planCode).name,
    status: nextStatus,
  };
}

function billingFromEntitlement(row: any, appUserRow: any, user: AccountUser): AccountBilling {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return billingFromRow({
    ...(appUserRow || {}),
    billing_status: row?.status,
    billing_provider: row?.source,
    billing_market: metadata.market || appUserRow?.billing_market,
    billing_customer_id: row?.external_customer_id,
    billing_subscription_id: row?.external_subscription_id,
    billing_period_start: row?.current_period_start,
    billing_period_end: row?.current_period_end,
    payment_action_required: row?.status === 'past_due' || appUserRow?.payment_action_required,
    metadata: {
      ...(appUserRow?.metadata && typeof appUserRow.metadata === 'object' ? appUserRow.metadata : {}),
      billingStatus: row?.status,
      billingProvider: row?.source,
      billingMarket: metadata.market,
      entitlementSource: 'user_entitlements',
    },
  }, user);
}

function buildRecommendedUpgrade(user: AccountUser, plans: AccountPlan[], billing: AccountBilling): AccountStatusResponse['recommendedUpgrade'] {
  const pro = plans.find((plan) => plan.code === 'pro') || planByCode('pro');
  if (billing.paymentActionRequired || billing.status === 'past_due') {
    const action = billing.paymentAction === 'contact_support' ? 'contact_support' : 'manage';
    return {
      planCode: user.planCode,
      planName: user.planName,
      ctaLabel: action === 'contact_support' ? 'Contact support' : 'Manage billing',
      reason: billing.message || 'Payment action is required to keep paid access active.',
      action,
    };
  }
  if (user.planCode === 'free') {
    return {
      planCode: pro.code,
      planName: pro.name,
      ctaLabel: 'Upgrade plan',
      reason: `${pro.name} unlocks ${pro.aiDailyLimit} AI requests/day and ${pro.deepDailyLimit} Deep requests/day.`,
      action: 'checkout',
    };
  }
  if (user.planCode === 'enterprise') {
    return {
      planCode: user.planCode,
      planName: user.planName,
      ctaLabel: 'Contact support',
      reason: 'Enterprise billing is managed manually by support.',
      action: 'contact_support',
    };
  }
  return {
    planCode: user.planCode,
    planName: user.planName,
    ctaLabel: 'View plan',
    reason: `${user.planName} is active.`,
    action: 'none',
  };
}

function surfaceFromRequest(req: VercelRequest): FeatureSurface {
  const querySurface = normalizeFeatureSurface(req.query.surface);
  if (querySurface) return querySurface;
  const queryPlatform = normalizeFeatureSurface(req.query.platform);
  if (queryPlatform === 'mobile' || queryPlatform === 'pwa' || queryPlatform === 'web') return queryPlatform;
  return 'web';
}

async function upsertSupabaseAccountUser(
  config: Extract<SupabaseConfig, { configured: true }>,
  auth: AuthContext,
  surface: FeatureSurface,
): Promise<void> {
  const rawUser = auth.user || {};
  const row = {
    id: auth.userId,
    email: normalizeText(rawUser.email),
    display_name: normalizeText(rawUser.name || rawUser.displayName),
    avatar_url: normalizeText(rawUser.picture || rawUser.avatarUrl),
    provider: normalizeProvider(rawUser.provider),
    platform: surface === 'admin' || surface === 'global' ? 'web' : surface,
    last_seen_at: nowIso(),
    metadata: {
      tokenSource: auth.tokenSource,
      accountStatusSurface: surface,
    },
  };
  await supabaseRest(config, 'app_users?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([row]),
  });
}

async function loadSupabaseAccount(
  config: Extract<SupabaseConfig, { configured: true }>,
  auth: AuthContext,
  surface: FeatureSurface,
): Promise<{ user: AccountUser; billing: AccountBilling; plans: AccountPlan[]; flags: AdminFeatureFlag[]; warnings: string[] }> {
  const warnings: string[] = [];
  await upsertSupabaseAccountUser(config, auth, surface).catch((error) => {
    warnings.push(`Account profile upsert skipped: ${sanitizeErrorDetails(error, 160)}`);
  });

  const userRows = await supabaseRest<any[]>(config, `app_users?id=eq.${encodeURIComponent(auth.userId)}&select=*&limit=1`);
  const appUserRow = Array.isArray(userRows) && userRows[0] ? userRows[0] : null;
  const baseUser = appUserRow ? userFromSupabase(appUserRow, auth) : userFromAuth(auth);
  const entitlementRows = await supabaseRest<any[]>(
    config,
    `user_entitlements?user_id=eq.${encodeURIComponent(auth.userId)}&status=in.(active,trialing,past_due)&select=*&order=updated_at.desc&limit=1`,
  ).catch((error) => {
    warnings.push(`Entitlement fallback used: ${sanitizeErrorDetails(error, 140)}`);
    return [];
  });
  const entitlement = Array.isArray(entitlementRows) && entitlementRows[0] ? entitlementRows[0] : null;
  const user = entitlement ? userWithEntitlement(entitlement, baseUser) : baseUser;
  const billing = entitlement
    ? billingFromEntitlement(entitlement, appUserRow, user)
    : appUserRow ? billingFromRow(appUserRow, user) : runtimeBilling(user);

  const planRows = await supabaseRest<any[]>(config, 'app_plans?select=*&order=display_order.asc').catch((error) => {
    warnings.push(`Plan catalog fallback used: ${sanitizeErrorDetails(error, 140)}`);
    return [];
  });
  const plans = Array.isArray(planRows) && planRows.length ? planRows.map(planFromSupabase) : PLAN_BLUEPRINTS;

  const flagRows = await supabaseRest<any[]>(config, 'app_feature_flags?select=*&order=key.asc').catch((error) => {
    warnings.push(`Feature flag fallback used: ${sanitizeErrorDetails(error, 140)}`);
    return [];
  });
  const flags = mergeFeatureFlagsWithDefaults(flagRows, RUNTIME_FEATURE_FLAG_PATCHES);

  return { user, billing, plans, flags, warnings };
}

function buildAppAccess(user: AccountUser, billing: AccountBilling, maintenance: AdminFeatureFlag[]): AccountStatusResponse['appAccess'] {
  if (user.status === 'deleted') {
    return {
      status: 'blocked',
      message: 'This account has been marked deleted. Contact support if this is unexpected.',
    };
  }
  if (user.status === 'suspended') {
    return {
      status: 'blocked',
      message: 'This account is temporarily suspended. Contact support for review.',
    };
  }
  if (maintenance.some((flag) => flag.status === 'disabled' && flag.surfaces.includes('global'))) {
    return {
      status: 'blocked',
      message: 'Baristachaw is temporarily unavailable while maintenance is active.',
    };
  }
  if (user.status === 'past_due' || billing.status === 'past_due' || billing.paymentActionRequired || maintenance.length > 0) {
    return {
      status: 'limited',
      message: user.status === 'past_due' || billing.status === 'past_due' || billing.paymentActionRequired
        ? billing.message || 'Your billing status needs attention. Some paid limits may be restricted.'
        : 'Some features are temporarily in maintenance.',
    };
  }
  return { status: 'ok', message: '' };
}

export async function buildAccountStatus(
  requestId: string,
  auth: AuthContext,
  surface: FeatureSurface,
): Promise<AccountStatusResponse> {
  const config = getSupabaseConfig();
  let dataMode: DataMode = 'runtime_fallback';
  let user = userFromAuth(auth);
  let billing = runtimeBilling(user);
  let plans = PLAN_BLUEPRINTS;
  let featureFlags = buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
  const warnings: string[] = [];

  if (config.configured) {
    try {
      const supabaseAccount = await loadSupabaseAccount(config, auth, surface);
      user = supabaseAccount.user;
      billing = supabaseAccount.billing;
      plans = supabaseAccount.plans;
      featureFlags = supabaseAccount.flags;
      warnings.push(...supabaseAccount.warnings);
      dataMode = 'supabase';
    } catch (error) {
      warnings.push(`Supabase account status failed: ${sanitizeErrorDetails(error, 180)}`);
    }
  } else {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not configured; using runtime account status.');
  }

  const plan = plans.find((item) => item.code === user.planCode) || planByCode(user.planCode);
  const normalizedUser = { ...user, planName: plan.name };
  const maintenance = activeOperationalFlags(featureFlags, surface);
  const normalizedBilling = {
    ...billing,
    paymentAction: billing.paymentAction === 'checkout' && !billing.checkoutUrl ? 'checkout' as const : billing.paymentAction,
  };

  return {
    ok: true,
    requestId,
    generatedAt: nowIso(),
    dataMode,
    user: normalizedUser,
    plan,
    plans,
    billing: normalizedBilling,
    recommendedUpgrade: buildRecommendedUpgrade(normalizedUser, plans, normalizedBilling),
    featureFlags,
    maintenance,
    appAccess: buildAppAccess(normalizedUser, normalizedBilling, maintenance),
    warnings,
    realtime: {
      strategy: 'polling',
      intervalSec: ACCOUNT_POLL_INTERVAL_SEC,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/account/status', authResult.auth.userId, ACCOUNT_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Rate limit exceeded',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  try {
    const snapshot = await buildAccountStatus(requestId, authResult.auth, surfaceFromRequest(req));
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Account status failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
