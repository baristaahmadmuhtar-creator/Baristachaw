import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  sanitizeErrorDetails,
} from '../_shared.js';
import { requireAdmin, type AdminAccess } from './_access.js';
import {
  buildRuntimeFeatureFlags,
  FEATURE_FLAG_STATUSES,
  FEATURE_FLAG_SURFACES,
  mergeFeatureFlagsWithDefaults,
  normalizeFeatureFlagKey,
  RUNTIME_FEATURE_FLAG_PATCHES,
  type AdminFeatureFlag,
  type FeatureFlagPatch,
  type FeatureFlagStatus,
  type FeatureSurface,
} from './_featureFlags.js';
import {
  resolveAiProviderAdminSnapshot,
  type AiProviderAdminSnapshot,
  type AiUsageRangeInput,
} from '../_aiProviderControl.js';
import { PLAN_CATALOG, PLAN_PRICING, formatCurrency } from '../../packages/shared/src/planCatalog.js';
import {
  listPersistedManualPaymentRequests,
  listManualPaymentRequests,
  readManualPaymentInstructions,
  updatePersistedManualPaymentStatus,
  updateManualPaymentStatus,
  type ManualPaymentAction,
  type ManualPaymentRequest,
} from '../billing/manualPayments.js';

type AdminRole = 'owner' | 'admin' | 'support' | 'analyst' | 'user';
type AccountStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
type AccountRecoveryStatus = 'none' | 'requested' | 'verified' | 'resolved' | 'rejected';
type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
type CheckStatus = 'pass' | 'warn' | 'fail';
type DataMode = 'supabase' | 'runtime_fallback';
type BillingProvider = 'none' | 'admin' | 'google_play' | 'app_store' | 'stripe' | 'revenuecat' | 'manual' | 'midtrans' | 'xendit';
type BillingStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'refunded';
type BillingMarket = 'indonesia' | 'brunei' | 'global' | 'unknown';
type CheckoutMode = 'disabled' | 'external' | 'stripe_checkout' | 'play_billing' | 'app_store' | 'manual_invoice';
type CatalogKind = 'water' | 'dripper' | 'grinder';
type CatalogReviewStatus = 'queued' | 'approved' | 'published' | 'rejected' | 'needs_source';

type AdminPlan = {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  aiDailyLimit: number;
  deepDailyLimit: number;
  scannerDailyLimit: number;
  storageMb: number;
  seats: number;
  supportSlaHours: number;
  features: string[];
  recommended?: boolean;
  activeUsers: number;
  billingProvider: BillingProvider;
  billingProductId: string;
  billingPriceId: string;
  revenuecatEntitlementId: string;
  market: BillingMarket;
  displayPrice: string;
  checkoutMode: CheckoutMode;
  paymentMethods: string[];
};

type AdminCatalogRequest = {
  id: string;
  kind: CatalogKind;
  entityId: string;
  title: string;
  reviewStatus: CatalogReviewStatus;
  sourceUrl: string;
  operatorNote: string;
  payloadPreview: string;
  createdAt: string;
};

type AdminRecipeLibraryItem = {
  id: string;
  userId: string;
  title: string;
  source: 'ai_brew' | 'collection' | 'import' | 'unknown';
  itemType: 'brew_journal' | 'recipe' | 'ai_canvas' | 'unknown';
  brewMode?: 'hot' | 'iced';
  methodFamily?: string;
  coffeeName?: string;
  dripperName?: string;
  feedbackRating?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  summary: string;
};

type AdminRecipeLibrarySummary = {
  ready: boolean;
  totalItems: number;
  aiBrewCount: number;
  collectionCount: number;
  feedbackCount: number;
  recentItems: AdminRecipeLibraryItem[];
  tables: string[];
  gaps: string[];
};

type AdminUserBilling = {
  status: BillingStatus;
  provider: BillingProvider;
  market: BillingMarket;
  source: BillingProvider;
  customerId: string;
  subscriptionId: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  lastEventAt?: string;
  paymentActionRequired: boolean;
  recommendedAction: string;
};

type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  username: string;
  picture?: string;
  provider: 'google' | 'apple' | 'email' | 'guest' | 'unknown';
  role: AdminRole;
  status: AccountStatus;
  planCode: PlanCode;
  planName: string;
  createdAt: string;
  lastSeenAt: string;
  locale?: string;
  platform?: 'web' | 'pwa' | 'mobile' | 'unknown';
  country?: string;
  usage: {
    aiRequestsToday: number;
    deepRequestsToday: number;
    scannerRunsToday: number;
    collectionWritesToday: number;
    totalTokensToday: number;
  };
  riskScore: number;
  flags: string[];
  notes?: string;
  supportNote?: string;
  accountRecoveryStatus: AccountRecoveryStatus;
  supportLockedUntil?: string;
  lastRecoveryRequestAt?: string;
  passwordResetRequired?: boolean;
  billing: AdminUserBilling;
  isSample?: boolean;
};

type AdminAuditEvent = {
  id: string;
  actor: string;
  target: string;
  action: string;
  createdAt: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

type AdminAiBrewFallbackEvent = {
  id: string;
  createdAt: string;
  kind: 'optimizer_rejected' | 'optimizer_no_change' | 'sequence_fallback' | 'unknown';
  source: 'admin_audit_events' | 'runtime_audit';
  detail: string;
};

type AdminAiBrewFallbackTrendBucket = {
  date: string;
  totalEvents: number;
  optimizerRejected: number;
  optimizerNoChange: number;
  sequenceFallback: number;
  fallbackRatePct: number;
  status: CheckStatus;
};

type AdminAiBrewFallbackSnapshot = {
  source: 'admin_audit_events' | 'runtime_audit';
  totalEvents: number;
  optimizerRejected: number;
  optimizerNoChange: number;
  sequenceFallback: number;
  fallbackRatePct: number;
  thresholdPct: number;
  status: CheckStatus;
  trend: AdminAiBrewFallbackTrendBucket[];
  recentEvents: AdminAiBrewFallbackEvent[];
};

type AdminSystemCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  owner: 'Security' | 'Data' | 'Billing' | 'Operations' | 'Mobile' | 'AI' | 'Backend';
  detail: string;
  nextAction?: string;
};

type LaunchChecklistItem = {
  id: string;
  label: string;
  status: CheckStatus;
  due: 'now' | 'this_week' | 'post_launch';
  owner: 'Admin' | 'Backend' | 'Mobile' | 'Growth' | 'Support';
  action: string;
};

type AdminSnapshot = {
  ok: true;
  requestId: string;
  generatedAt: string;
  dataMode: DataMode;
  dataFreshnessSec: number;
  degraded: boolean;
  admin: {
    userId: string;
    email?: string;
    role: AdminRole;
    source: AdminAccess['source'];
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    paidUsers: number;
    trialUsers: number;
    suspendedUsers: number;
    riskAccounts: number;
    aiRequestsToday: number;
    deepRequestsToday: number;
    scannerRunsToday: number;
    collectionWritesToday: number;
    planConversionRate: number;
  };
  plans: AdminPlan[];
  users: AdminUserRecord[];
  audit: AdminAuditEvent[];
  checks: AdminSystemCheck[];
  launchChecklist: LaunchChecklistItem[];
  featureFlags: AdminFeatureFlag[];
  ai: AiProviderAdminSnapshot;
  aiBrewFallbacks: AdminAiBrewFallbackSnapshot;
  billing: {
    ready: boolean;
    mode: 'not_configured' | 'test' | 'live_ready';
    connectedProviders: BillingProvider[];
    activeSubscriptions: number;
    trialingSubscriptions: number;
    pastDueSubscriptions: number;
    revenueMonthlyUsd: number;
    attentionUsers: number;
    supportedMarkets: BillingMarket[];
    realtimeTables: string[];
    gaps: string[];
    manualPayments: ManualPaymentRequest[];
    manualQueueCounts: Record<'pending_review' | 'receipt_received' | 'verified_paid' | 'rejected' | 'expired', number>;
    planParity: {
      ok: boolean;
      mismatches: string[];
      sharedCatalogPlans: PlanCode[];
    };
  };
  catalog: {
    ready: boolean;
    supportedKinds: CatalogKind[];
    tables: string[];
    publishedCounts: Record<CatalogKind, number>;
    reviewQueue: {
      total: number;
      queued: number;
      needsSource: number;
      approved: number;
      rejected: number;
    };
    recentRequests: AdminCatalogRequest[];
    gaps: string[];
  };
  recipeLibrary: AdminRecipeLibrarySummary;
  recommendations: string[];
  warnings: string[];
  realtime: {
    strategy: 'polling';
    intervalSec: number;
    sequence: number;
  };
};

type UserPatch = Partial<{
  role: AdminRole;
  status: AccountStatus;
  planCode: PlanCode;
  displayName: string;
  username: string;
  notes: string;
  supportNote: string;
  accountRecoveryStatus: AccountRecoveryStatus;
  supportLockedUntil: string;
  lastRecoveryRequestAt: string;
  passwordResetRequired: boolean;
  billingStatus: BillingStatus;
  billingProvider: BillingProvider;
  billingMarket: BillingMarket;
  paymentActionRequired: boolean;
}>;

type PlanPatch = Partial<{
  name: string;
  description: string;
  priceMonthlyUsd: number;
  aiDailyLimit: number;
  deepDailyLimit: number;
  scannerDailyLimit: number;
  storageMb: number;
  seats: number;
  supportSlaHours: number;
  features: string[];
  recommended: boolean;
  billingProvider: BillingProvider;
  billingProductId: string;
  billingPriceId: string;
  revenuecatEntitlementId: string;
  market: BillingMarket;
  displayPrice: string;
  checkoutMode: CheckoutMode;
  paymentMethods: string[];
  operatorNote: string;
}>;

type CatalogRequestPatch = {
  kind: CatalogKind;
  title: string;
  entityId?: string;
  sourceUrl?: string;
  payload: Record<string, unknown>;
  operatorNote: string;
};

type SupabaseConfig = {
  configured: true;
  url: string;
  serviceRoleKey: string;
} | {
  configured: false;
};

const VALID_ADMIN_ROLES = new Set<AdminRole>(['owner', 'admin', 'support', 'analyst', 'user']);
const VALID_ACCOUNT_STATUSES = new Set<AccountStatus>(['active', 'trialing', 'past_due', 'suspended', 'deleted']);
const VALID_ACCOUNT_RECOVERY_STATUSES = new Set<AccountRecoveryStatus>(['none', 'requested', 'verified', 'resolved', 'rejected']);
const VALID_PLAN_CODES = new Set<PlanCode>(['free', 'starter', 'pro', 'team', 'enterprise']);
const VALID_BILLING_STATUSES = new Set<BillingStatus>(['none', 'active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded']);
const VALID_BILLING_PROVIDERS = new Set<BillingProvider>(['none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual', 'midtrans', 'xendit']);
const VALID_BILLING_MARKETS = new Set<BillingMarket>(['indonesia', 'brunei', 'global', 'unknown']);
const VALID_CHECKOUT_MODES = new Set<CheckoutMode>(['disabled', 'external', 'stripe_checkout', 'play_billing', 'app_store', 'manual_invoice']);
const VALID_CATALOG_KINDS = new Set<CatalogKind>(['water', 'dripper', 'grinder']);
const VALID_FEATURE_FLAG_STATUSES = new Set<FeatureFlagStatus>(FEATURE_FLAG_STATUSES);
const VALID_FEATURE_FLAG_SURFACES = new Set<FeatureSurface>(FEATURE_FLAG_SURFACES);
const VALID_FEATURE_FLAG_KEYS = new Set(buildRuntimeFeatureFlags().map((flag) => flag.key));
const ADMIN_ROLE_WEIGHT: Record<AdminRole, number> = {
  owner: 5,
  admin: 4,
  support: 3,
  analyst: 2,
  user: 1,
};
const RESERVED_USERNAMES = new Set([
  'account',
  'admin',
  'administrator',
  'api',
  'app',
  'baristachaw',
  'billing',
  'help',
  'login',
  'logout',
  'me',
  'owner',
  'root',
  'security',
  'settings',
  'signup',
  'staff',
  'support',
  'system',
  'user',
  'users',
]);
const DISPLAY_NAME_MAX_LENGTH = 96;
const USERNAME_MAX_LENGTH = 32;
const USERNAME_INPUT_MAX_LENGTH = 96;
const NOTES_MAX_LENGTH = 500;
const SUPPORT_NOTE_MAX_LENGTH = 800;
const PLAN_NAME_MAX_LENGTH = 64;
const PLAN_DESCRIPTION_MAX_LENGTH = 240;
const PLAN_DISPLAY_PRICE_MAX_LENGTH = 120;
const PLAN_EXTERNAL_ID_MAX_LENGTH = 160;
const PLAN_LIST_ITEM_MAX_LENGTH = 60;
const PLAN_OPERATOR_NOTE_MAX_LENGTH = 240;
const CATALOG_TITLE_MAX_LENGTH = 120;
const CATALOG_ENTITY_ID_MAX_LENGTH = 120;
const CATALOG_SOURCE_URL_MAX_LENGTH = 320;
const CATALOG_OPERATOR_NOTE_MAX_LENGTH = 300;
const CATALOG_PAYLOAD_MAX_LENGTH = 5000;

const ADMIN_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 20,
  burstWindowMs: 10 * 1000,
} as const;

const LIVE_POLL_INTERVAL_SEC = 12;
const RUNTIME_AUDIT_LIMIT = 80;
let snapshotSequence = 0;
const RUNTIME_USER_PATCHES = new Map<string, UserPatch>();
const RUNTIME_PLAN_PATCHES = new Map<PlanCode, Omit<PlanPatch, 'operatorNote'>>();
const RUNTIME_CATALOG_REQUESTS: AdminCatalogRequest[] = [];
const RUNTIME_AUDIT: AdminAuditEvent[] = [];

function sharedAdminPlan(code: PlanCode) {
  return PLAN_CATALOG.find((plan) => plan.code === code) || PLAN_CATALOG[0];
}

function sharedAdminMonthlyPriceLabel(code: PlanCode): string {
  if (code === 'starter' || code === 'pro') {
    const tier = PLAN_PRICING[code].monthly.discounted;
    return `${formatCurrency(tier.idr, 'idr')} / ${formatCurrency(tier.bnd, 'bnd')} / ${formatCurrency(tier.usd, 'usd')} monthly`;
  }
  if (code === 'team') return `${formatCurrency(sharedAdminPlan('team').priceMonthlyUsd, 'usd')} monthly`;
  if (code === 'enterprise') return 'Custom invoice';
  return 'Free';
}

const PLAN_BLUEPRINTS: Omit<AdminPlan, 'activeUsers'>[] = [
  {
    code: 'free',
    name: sharedAdminPlan('free').displayName,
    description: sharedAdminPlan('free').description,
    priceMonthlyUsd: 0,
    aiDailyLimit: 12,
    deepDailyLimit: 0,
    scannerDailyLimit: 2,
    storageMb: 64,
    seats: 1,
    supportSlaHours: 72,
    features: [...sharedAdminPlan('free').features],
    billingProvider: 'none',
    billingProductId: '',
    billingPriceId: '',
    revenuecatEntitlementId: '',
    market: 'global',
    displayPrice: sharedAdminMonthlyPriceLabel('free'),
    checkoutMode: 'disabled',
    paymentMethods: [],
  },
  {
    code: 'starter',
    name: sharedAdminPlan('starter').displayName,
    description: sharedAdminPlan('starter').description,
    priceMonthlyUsd: sharedAdminPlan('starter').priceMonthlyUsd,
    aiDailyLimit: 60,
    deepDailyLimit: 0,
    scannerDailyLimit: 12,
    storageMb: 512,
    seats: 1,
    supportSlaHours: 48,
    features: [...sharedAdminPlan('starter').features],
    billingProvider: 'manual',
    billingProductId: 'baristachaw_starter_monthly',
    billingPriceId: 'STRIPE_PRICE_STARTER_MONTHLY',
    revenuecatEntitlementId: 'starter',
    market: 'global',
    displayPrice: sharedAdminMonthlyPriceLabel('starter'),
    checkoutMode: 'manual_invoice',
    paymentMethods: ['Manual bank transfer', 'Admin review'],
  },
  {
    code: 'pro',
    name: sharedAdminPlan('pro').displayName,
    description: sharedAdminPlan('pro').description,
    priceMonthlyUsd: sharedAdminPlan('pro').priceMonthlyUsd,
    aiDailyLimit: 180,
    deepDailyLimit: 40,
    scannerDailyLimit: 60,
    storageMb: 2048,
    seats: 1,
    supportSlaHours: 24,
    features: [...sharedAdminPlan('pro').features],
    recommended: true,
    billingProvider: 'manual',
    billingProductId: 'baristachaw_pro_monthly',
    billingPriceId: 'STRIPE_PRICE_PRO_MONTHLY',
    revenuecatEntitlementId: 'pro',
    market: 'global',
    displayPrice: sharedAdminMonthlyPriceLabel('pro'),
    checkoutMode: 'manual_invoice',
    paymentMethods: ['Manual bank transfer', 'Admin review'],
  },
  {
    code: 'team',
    name: sharedAdminPlan('team').displayName,
    description: sharedAdminPlan('team').description,
    priceMonthlyUsd: sharedAdminPlan('team').priceMonthlyUsd,
    aiDailyLimit: 800,
    deepDailyLimit: 160,
    scannerDailyLimit: 240,
    storageMb: 10240,
    seats: 8,
    supportSlaHours: 12,
    features: [...sharedAdminPlan('team').features],
    billingProvider: 'manual',
    billingProductId: 'baristachaw_team_monthly',
    billingPriceId: 'STRIPE_PRICE_TEAM_MONTHLY',
    revenuecatEntitlementId: 'team',
    market: 'global',
    displayPrice: sharedAdminMonthlyPriceLabel('team'),
    checkoutMode: 'manual_invoice',
    paymentMethods: ['Manual bank transfer', 'Admin review'],
  },
  {
    code: 'enterprise',
    name: sharedAdminPlan('enterprise').displayName,
    description: sharedAdminPlan('enterprise').description,
    priceMonthlyUsd: 0,
    aiDailyLimit: 5000,
    deepDailyLimit: 1000,
    scannerDailyLimit: 1000,
    storageMb: 102400,
    seats: 50,
    supportSlaHours: 4,
    features: [...sharedAdminPlan('enterprise').features],
    billingProvider: 'manual',
    billingProductId: 'baristachaw_enterprise',
    billingPriceId: '',
    revenuecatEntitlementId: 'enterprise',
    market: 'global',
    displayPrice: sharedAdminMonthlyPriceLabel('enterprise'),
    checkoutMode: 'manual_invoice',
    paymentMethods: ['Manual invoice', 'Bank transfer'],
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function queryStringValue(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function parseAiUsageRangeQuery(query: VercelRequest['query']): AiUsageRangeInput | undefined {
  const from = queryStringValue(query.aiFrom || query.from).trim();
  const to = queryStringValue(query.aiTo || query.to).trim();
  if (!from && !to) return undefined;
  return { from, to };
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

function envEnabled(name: string): boolean {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function runtimeMutationFallbackEnabled(): boolean {
  return envEnabled('ADMIN_RUNTIME_WRITE_FALLBACK') || envEnabled('ALLOW_RUNTIME_ADMIN_WRITE_FALLBACK');
}

function normalizeRole(value: unknown): AdminRole {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'owner' || raw === 'admin' || raw === 'support' || raw === 'analyst') return raw;
  return 'user';
}

function normalizeStatus(value: unknown): AccountStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'active' || raw === 'trialing' || raw === 'past_due' || raw === 'suspended' || raw === 'deleted') {
    return raw;
  }
  return 'active';
}

function normalizePlanCode(value: unknown): PlanCode {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'starter' || raw === 'pro' || raw === 'team' || raw === 'enterprise') return raw;
  return 'free';
}

function normalizeAccountRecoveryStatus(value: unknown): AccountRecoveryStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'requested' || raw === 'verified' || raw === 'resolved' || raw === 'rejected') return raw;
  return 'none';
}

function normalizeUsername(value: unknown, fallback: string): string {
  const raw = normalizeText(value, fallback).toLowerCase();
  const cleaned = raw
    .replace(/^@+/, '')
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 32);
  if (cleaned.length >= 3) return cleaned;
  const fallbackSeed = normalizeText(fallback, 'user')
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return fallbackSeed.length >= 3 ? fallbackSeed : 'user-account';
}

type ValidationError = { ok: false; error: string; details?: string };
type AuthorizationError = { ok: false; statusCode: 403; error: string; errorCode: 'admin_role_forbidden'; details?: string };

class AdminMutationError extends Error {
  statusCode: number;
  errorCode: string;
  details?: string;

  constructor(message: string, params: { statusCode: number; errorCode: string; details?: string }) {
    super(message);
    this.name = 'AdminMutationError';
    this.statusCode = params.statusCode;
    this.errorCode = params.errorCode;
    this.details = params.details;
  }
}

function validateEnumValue<T extends string>(value: unknown, field: string, allowed: Set<T>): { ok: true; value: T } | ValidationError {
  if (typeof value !== 'string') {
    return { ok: false, error: `${field} must be a string` };
  }
  const normalized = value.trim().toLowerCase() as T;
  if (!allowed.has(normalized)) {
    return {
      ok: false,
      error: `${field} is invalid`,
      details: `Allowed values: ${Array.from(allowed).join(', ')}`,
    };
  }
  return { ok: true, value: normalized };
}

function validatePatchText(
  value: unknown,
  field: string,
  maxLength: number,
  options: { required?: boolean } = {},
): { ok: true; value: string } | ValidationError {
  if (typeof value !== 'string') {
    return { ok: false, error: `${field} must be a string` };
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (options.required && !normalized) {
    return { ok: false, error: `${field} is required` };
  }
  if (normalized.length > maxLength) {
    return {
      ok: false,
      error: `${field} is too long`,
      details: `${field} must be ${maxLength} characters or fewer.`,
    };
  }
  return { ok: true, value: normalized };
}

function validateUsernamePatch(value: unknown): { ok: true; value: string } | ValidationError {
  if (typeof value !== 'string') {
    return { ok: false, error: 'username must be a string' };
  }
  const raw = value.trim();
  if (!raw) return { ok: false, error: 'username is required' };
  if (raw.length > USERNAME_INPUT_MAX_LENGTH) {
    return {
      ok: false,
      error: 'username is too long',
      details: `Username input must be ${USERNAME_INPUT_MAX_LENGTH} characters or fewer.`,
    };
  }

  const username = raw
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/@.*$/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/[._-]{2,}/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');

  if (username.length < 3) {
    return {
      ok: false,
      error: 'username is too short',
      details: 'Username must be at least 3 letters or numbers after normalization.',
    };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: 'username is too long',
      details: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer after normalization.`,
    };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return {
      ok: false,
      error: 'username is reserved',
      details: `@${username} is reserved for Baristachaw system routes or support operations.`,
    };
  }
  return { ok: true, value: username };
}

function validateBooleanPatch(value: unknown, field: string): { ok: true; value: boolean } | ValidationError {
  if (typeof value === 'boolean') return { ok: true, value };
  if (value === 1 || value === 'true') return { ok: true, value: true };
  if (value === 0 || value === 'false') return { ok: true, value: false };
  return { ok: false, error: `${field} must be boolean` };
}

function validateNumberPatch(
  value: unknown,
  field: string,
  options: { min: number; max: number; integer?: boolean },
): { ok: true; value: number } | ValidationError {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return { ok: false, error: `${field} must be a number` };
  const normalized = options.integer ? Math.round(parsed) : Math.round(parsed * 100) / 100;
  if (normalized < options.min || normalized > options.max) {
    return {
      ok: false,
      error: `${field} is out of range`,
      details: `${field} must be between ${options.min} and ${options.max}.`,
    };
  }
  return { ok: true, value: normalized };
}

function validateStringListPatch(
  value: unknown,
  field: string,
  options: { maxItems: number; maxItemLength: number },
): { ok: true; value: string[] } | ValidationError {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]+/g)
      : null;
  if (!source) return { ok: false, error: `${field} must be a string list` };
  const items: string[] = [];
  for (const item of source) {
    const normalized = normalizeText(item);
    if (!normalized) continue;
    if (normalized.length > options.maxItemLength) {
      return {
        ok: false,
        error: `${field} item is too long`,
        details: `${field} items must be ${options.maxItemLength} characters or fewer.`,
      };
    }
    if (!items.includes(normalized)) items.push(normalized);
  }
  if (items.length > options.maxItems) {
    return {
      ok: false,
      error: `${field} has too many items`,
      details: `${field} supports up to ${options.maxItems} items.`,
    };
  }
  return { ok: true, value: items };
}

function runtimePlanBlueprints(): Omit<AdminPlan, 'activeUsers'>[] {
  return PLAN_BLUEPRINTS.map((plan) => ({
    ...plan,
    ...(RUNTIME_PLAN_PATCHES.get(plan.code) || {}),
  }));
}

function planName(code: PlanCode): string {
  return runtimePlanBlueprints().find((plan) => plan.code === code)?.name || 'Free';
}

function normalizeProvider(value: unknown): AdminUserRecord['provider'] {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'google' || raw === 'apple' || raw === 'email' || raw === 'guest') return raw;
  return 'unknown';
}

function normalizePlatform(value: unknown): AdminUserRecord['platform'] {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'web' || raw === 'pwa' || raw === 'mobile') return raw;
  return 'unknown';
}

function normalizeBillingProvider(value: unknown): BillingProvider {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'admin' || raw === 'google_play' || raw === 'app_store' || raw === 'stripe' || raw === 'revenuecat' || raw === 'manual' || raw === 'midtrans' || raw === 'xendit') {
    return raw;
  }
  return 'none';
}

function normalizeBillingStatus(value: unknown, fallback: BillingStatus = 'none'): BillingStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'active' || raw === 'trialing' || raw === 'past_due' || raw === 'cancelled' || raw === 'expired' || raw === 'refunded') {
    return raw;
  }
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
  if (raw === 'disabled' || raw === 'external' || raw === 'stripe_checkout' || raw === 'play_billing' || raw === 'app_store' || raw === 'manual_invoice') {
    return raw;
  }
  return fallback;
}

function defaultBillingStatus(planCode: PlanCode, status: AccountStatus): BillingStatus {
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due') return 'past_due';
  if (status === 'deleted' || status === 'suspended') return 'none';
  return planCode === 'free' ? 'none' : 'active';
}

function billingRecommendedAction(billing: Pick<AdminUserBilling, 'status' | 'provider' | 'paymentActionRequired'>, planCode: PlanCode): string {
  if (billing.paymentActionRequired || billing.status === 'past_due') return 'Open payment retry or downgrade to Free until resolved.';
  if (billing.status === 'cancelled' || billing.status === 'expired') return 'Confirm cancellation, then move user to Free or restore entitlement.';
  if (billing.status === 'refunded') return 'Review refund reason and remove paid entitlement if access should stop.';
  if (planCode !== 'free' && (billing.provider === 'none' || billing.provider === 'admin')) return 'Admin override active; connect provider entitlement before public paid launch.';
  if (planCode === 'free') return 'Offer Pro upgrade when the user hits AI Brew or Deep limits.';
  return 'No payment action required.';
}

function billingFromRaw(row: any, metadata: Record<string, unknown>, planCode: PlanCode, status: AccountStatus): AdminUserBilling {
  const provider = normalizeBillingProvider(row.billing_provider ?? metadata.billingProvider);
  const fallbackStatus = defaultBillingStatus(planCode, status);
  const billingStatus = normalizeBillingStatus(row.billing_status ?? metadata.billingStatus, fallbackStatus);
  const paymentActionRequired = Boolean(row.payment_action_required ?? metadata.paymentActionRequired ?? billingStatus === 'past_due');
  const billing: AdminUserBilling = {
    status: billingStatus,
    provider,
    market: normalizeBillingMarket(row.billing_market ?? metadata.billingMarket, normalizeText(row.country || metadata.country)),
    source: normalizeBillingProvider(row.billing_source ?? row.entitlement_source ?? metadata.billingSource ?? provider),
    customerId: normalizeText(row.billing_customer_id || row.external_customer_id || metadata.billingCustomerId),
    subscriptionId: normalizeText(row.billing_subscription_id || row.external_subscription_id || metadata.billingSubscriptionId),
    currentPeriodStart: normalizeText(row.billing_period_start || row.current_period_start || metadata.billingPeriodStart) || undefined,
    currentPeriodEnd: normalizeText(row.billing_period_end || row.current_period_end || metadata.billingPeriodEnd) || undefined,
    lastEventAt: normalizeText(row.billing_last_event_at || metadata.billingLastEventAt) || undefined,
    paymentActionRequired,
    recommendedAction: '',
  };
  return {
    ...billing,
    recommendedAction: billingRecommendedAction(billing, planCode),
  };
}

function mergeBillingPatch(user: AdminUserRecord, patch: UserPatch, nextPlanCode: PlanCode, nextStatus: AccountStatus): AdminUserBilling {
  const billing: AdminUserBilling = {
    ...user.billing,
    status: patch.billingStatus || user.billing.status || defaultBillingStatus(nextPlanCode, nextStatus),
    provider: patch.billingProvider || user.billing.provider,
    market: patch.billingMarket || user.billing.market,
    source: patch.billingProvider || user.billing.source,
    paymentActionRequired: typeof patch.paymentActionRequired === 'boolean'
      ? patch.paymentActionRequired
      : user.billing.paymentActionRequired,
  };
  return {
    ...billing,
    recommendedAction: billingRecommendedAction(billing, nextPlanCode),
  };
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

function readUsage(raw: any): AdminUserRecord['usage'] {
  const usage = raw && typeof raw === 'object' ? raw : {};
  return {
    aiRequestsToday: Number(usage.aiRequestsToday ?? usage.ai_requests_today ?? 0) || 0,
    deepRequestsToday: Number(usage.deepRequestsToday ?? usage.deep_requests_today ?? 0) || 0,
    scannerRunsToday: Number(usage.scannerRunsToday ?? usage.scanner_runs_today ?? 0) || 0,
    collectionWritesToday: Number(usage.collectionWritesToday ?? usage.collection_writes_today ?? 0) || 0,
    totalTokensToday: Number(usage.totalTokensToday ?? usage.total_tokens_today ?? 0) || 0,
  };
}

function userFromSupabase(row: any): AdminUserRecord {
  const planCode = normalizePlanCode(row.plan_code || row.planCode);
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const id = normalizeText(row.id || row.user_id, 'unknown-user');
  const email = normalizeText(row.email, 'unknown@example.com');
  const accountRecoveryStatus = normalizeAccountRecoveryStatus(row.account_recovery_status || row.accountRecoveryStatus);
  const status = normalizeStatus(row.status);
  return {
    id,
    email,
    name: normalizeText(row.display_name || row.name, email.split('@')[0]),
    username: normalizeUsername(row.username || metadata.username, email || id),
    picture: normalizeText(row.avatar_url || row.picture),
    provider: normalizeProvider(row.provider),
    role: normalizeRole(row.role),
    status,
    planCode,
    planName: planName(planCode),
    createdAt: normalizeText(row.created_at, nowIso()),
    lastSeenAt: normalizeText(row.last_seen_at || row.updated_at, nowIso()),
    locale: normalizeText(row.locale || metadata.locale),
    platform: normalizePlatform(row.platform || metadata.platform),
    country: normalizeText(row.country || metadata.country),
    usage: readUsage(row.usage_today || metadata.usageToday),
    riskScore: Math.max(0, Math.min(100, Number(row.risk_score ?? metadata.riskScore ?? 0) || 0)),
    flags: Array.isArray(row.flags) ? row.flags.map((item: unknown) => normalizeText(item)).filter(Boolean) : [],
    notes: normalizeText(row.notes),
    supportNote: normalizeText(row.support_note || row.supportNote),
    accountRecoveryStatus,
    supportLockedUntil: normalizeText(row.support_locked_until || row.supportLockedUntil),
    lastRecoveryRequestAt: normalizeText(row.last_recovery_request_at || row.lastRecoveryRequestAt),
    passwordResetRequired: Boolean(row.password_reset_required ?? metadata.passwordResetRequired ?? accountRecoveryStatus === 'requested'),
    billing: billingFromRaw(row, metadata, planCode, status),
  };
}

function planFromSupabase(row: any, activeUsers: number): AdminPlan {
  const code = normalizePlanCode(row.code || row.plan_code);
  return {
    code,
    name: normalizeText(row.name, planName(code)),
    description: normalizeText(row.description, PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.description || ''),
    priceMonthlyUsd: Number(row.price_monthly_usd ?? row.priceMonthlyUsd ?? 0) || 0,
    aiDailyLimit: Number(row.ai_daily_limit ?? row.aiDailyLimit ?? 0) || 0,
    deepDailyLimit: Number(row.deep_daily_limit ?? row.deepDailyLimit ?? 0) || 0,
    scannerDailyLimit: Number(row.scanner_daily_limit ?? row.scannerDailyLimit ?? 0) || 0,
    storageMb: Number(row.storage_mb ?? row.storageMb ?? 0) || 0,
    seats: Number(row.seats ?? 1) || 1,
    supportSlaHours: Number(row.support_sla_hours ?? row.supportSlaHours ?? 72) || 72,
    features: Array.isArray(row.features) ? row.features.map((item: unknown) => normalizeText(item)).filter(Boolean) : [],
    recommended: Boolean(row.recommended),
    activeUsers,
    billingProvider: normalizeBillingProvider(row.billing_provider || row.billingProvider || PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.billingProvider),
    billingProductId: normalizeText(row.billing_product_id || row.billingProductId || PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.billingProductId),
    billingPriceId: normalizeText(row.billing_price_id || row.billingPriceId || PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.billingPriceId),
    revenuecatEntitlementId: normalizeText(row.revenuecat_entitlement_id || row.revenuecatEntitlementId || PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.revenuecatEntitlementId),
    market: normalizeBillingMarket(row.market || row.billing_market || row.billingMarket || PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.market),
    displayPrice: normalizeText(row.display_price || row.displayPrice || PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.displayPrice),
    checkoutMode: normalizeCheckoutMode(row.checkout_mode || row.checkoutMode, PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.checkoutMode || 'disabled'),
    paymentMethods: Array.isArray(row.payment_methods)
      ? row.payment_methods.map((item: unknown) => normalizeText(item)).filter(Boolean)
      : (PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.paymentMethods || []),
  };
}

function auditFromSupabase(row: any): AdminAuditEvent {
  return {
    id: normalizeText(row.id || row.event_id, `audit_${Date.now()}`),
    actor: normalizeText(row.actor_email || row.actor_user_id || row.actor, 'system'),
    target: normalizeText(row.target_id || row.target, 'platform'),
    action: normalizeText(row.action, 'admin_event'),
    createdAt: normalizeText(row.created_at, nowIso()),
    detail: normalizeText(row.detail || row.summary, 'Administrative event recorded.'),
    severity: row.severity === 'critical' || row.severity === 'warning' ? row.severity : 'info',
  };
}

function classifyAiBrewFallbackEvent(event: AdminAuditEvent): AdminAiBrewFallbackEvent['kind'] | null {
  const text = `${event.action} ${event.target} ${event.detail}`.toLowerCase();
  if (!text.includes('ai_brew') && !text.includes('ai brew')) return null;
  if (text.includes('ai_brew_optimizer_no_change') || text.includes('optimizer no change')) return 'optimizer_no_change';
  if (text.includes('ai_brew_optimizer_rejected') || text.includes('optimizer rejected')) return 'optimizer_rejected';
  if (text.includes('ai_brew_sequence_fallback') || text.includes('sequence fallback')) return 'sequence_fallback';
  return null;
}

const AI_BREW_FALLBACK_WARN_THRESHOLD_PCT = 8;
const AI_BREW_FALLBACK_FAIL_THRESHOLD_PCT = 20;

function aiBrewFallbackStatus(ratePct: number): CheckStatus {
  if (ratePct >= AI_BREW_FALLBACK_FAIL_THRESHOLD_PCT) return 'fail';
  if (ratePct >= AI_BREW_FALLBACK_WARN_THRESHOLD_PCT) return 'warn';
  return 'pass';
}

function dateBucketKey(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function buildAiBrewFallbackTrend(
  events: AdminAiBrewFallbackEvent[],
  ai: AiProviderAdminSnapshot,
): AdminAiBrewFallbackTrendBucket[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (6 - index));
    return {
      date: dateBucketKey(date),
      totalEvents: 0,
      optimizerRejected: 0,
      optimizerNoChange: 0,
      sequenceFallback: 0,
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  for (const event of events) {
    const bucket = bucketMap.get(dateBucketKey(event.createdAt));
    if (!bucket) continue;
    bucket.totalEvents += 1;
    if (event.kind === 'optimizer_rejected') bucket.optimizerRejected += 1;
    else if (event.kind === 'optimizer_no_change') bucket.optimizerNoChange += 1;
    else if (event.kind === 'sequence_fallback') bucket.sequenceFallback += 1;
  }

  const dailyAiRequests = Math.max(1, Math.ceil(Math.max(0, ai.usage.today.requests) / 7));
  return buckets.map((bucket) => {
    const denominator = Math.max(bucket.totalEvents, bucket.totalEvents + dailyAiRequests);
    const fallbackRatePct = denominator > 0 ? Math.round((bucket.totalEvents / denominator) * 100) : 0;
    return {
      ...bucket,
      fallbackRatePct,
      status: aiBrewFallbackStatus(fallbackRatePct),
    };
  });
}

function buildAiBrewFallbackSnapshot(
  audit: AdminAuditEvent[],
  ai: AiProviderAdminSnapshot,
  source: AdminAiBrewFallbackSnapshot['source'],
): AdminAiBrewFallbackSnapshot {
  const fallbackEvents = audit
    .map((event): AdminAiBrewFallbackEvent | null => {
      const kind = classifyAiBrewFallbackEvent(event);
      if (!kind) return null;
      return {
        id: event.id,
        createdAt: event.createdAt,
        kind,
        source,
        detail: event.detail.slice(0, 220),
      };
    })
    .filter((event): event is AdminAiBrewFallbackEvent => Boolean(event));
  const recentEvents = fallbackEvents.slice(0, 12);
  const optimizerRejected = fallbackEvents.filter((event) => event.kind === 'optimizer_rejected').length;
  const optimizerNoChange = fallbackEvents.filter((event) => event.kind === 'optimizer_no_change').length;
  const sequenceFallback = fallbackEvents.filter((event) => event.kind === 'sequence_fallback').length;
  const totalEvents = fallbackEvents.length;
  const denominator = Math.max(totalEvents, totalEvents + ai.usage.today.requests);
  const fallbackRatePct = denominator > 0 ? Math.round((totalEvents / denominator) * 100) : 0;
  return {
    source,
    totalEvents,
    optimizerRejected,
    optimizerNoChange,
    sequenceFallback,
    fallbackRatePct,
    thresholdPct: AI_BREW_FALLBACK_WARN_THRESHOLD_PCT,
    status: aiBrewFallbackStatus(fallbackRatePct),
    trend: buildAiBrewFallbackTrend(fallbackEvents, ai),
    recentEvents,
  };
}

function runtimeBilling(
  planCode: PlanCode,
  status: AccountStatus,
  provider: BillingProvider,
  market: BillingMarket,
  overrides: Partial<AdminUserBilling> = {},
): AdminUserBilling {
  const billing: AdminUserBilling = {
    status: overrides.status || defaultBillingStatus(planCode, status),
    provider,
    market,
    source: overrides.source || provider,
    customerId: overrides.customerId || '',
    subscriptionId: overrides.subscriptionId || '',
    currentPeriodStart: overrides.currentPeriodStart,
    currentPeriodEnd: overrides.currentPeriodEnd,
    lastEventAt: overrides.lastEventAt,
    paymentActionRequired: Boolean(overrides.paymentActionRequired || status === 'past_due'),
    recommendedAction: '',
  };
  return {
    ...billing,
    recommendedAction: billingRecommendedAction(billing, planCode),
  };
}

function currentAuthUser(admin: AdminAccess, rawUser?: Record<string, unknown>): AdminUserRecord {
  const email = admin.email || normalizeText(rawUser?.email, 'admin@baristachaw.local');
  const id = admin.userId || normalizeText(rawUser?.id, email);
  const planCode: PlanCode = admin.role === 'owner' ? 'enterprise' : 'team';
  return {
    id,
    email,
    name: normalizeText(rawUser?.name || rawUser?.displayName, email.split('@')[0]),
    username: normalizeUsername(rawUser?.username, email || id),
    picture: normalizeText(rawUser?.picture || rawUser?.avatarUrl),
    provider: normalizeProvider(rawUser?.provider),
    role: admin.role,
    status: 'active',
    planCode,
    planName: planName(planCode),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeenAt: nowIso(),
    locale: 'id-ID',
    platform: 'web',
    usage: {
      aiRequestsToday: 24,
      deepRequestsToday: 6,
      scannerRunsToday: 3,
      collectionWritesToday: 9,
      totalTokensToday: 45200,
    },
    riskScore: 0,
    flags: ['admin_verified'],
    notes: '',
    supportNote: '',
    accountRecoveryStatus: 'none',
    passwordResetRequired: false,
    billing: runtimeBilling(planCode, 'active', 'manual', 'global', {
      customerId: 'manual_owner',
      subscriptionId: 'manual_enterprise_owner',
    }),
  };
}

function runtimeSeedUsers(admin: AdminAccess, rawUser?: Record<string, unknown>): AdminUserRecord[] {
  const seeds: AdminUserRecord[] = [
    currentAuthUser(admin, rawUser),
    {
      id: 'runtime_user_trial_review',
      email: 'trial.review@example.com',
      name: 'Trial Review',
      username: 'trial-review',
      provider: 'email',
      role: 'user',
      status: 'trialing',
      planCode: 'free',
      planName: 'Free',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      locale: 'id-ID',
      platform: 'mobile',
      country: 'ID',
      usage: {
        aiRequestsToday: 8,
        deepRequestsToday: 1,
        scannerRunsToday: 2,
        collectionWritesToday: 1,
        totalTokensToday: 9200,
      },
      riskScore: 12,
      flags: ['trial'],
      accountRecoveryStatus: 'none',
      passwordResetRequired: false,
      billing: runtimeBilling('free', 'trialing', 'none', 'indonesia'),
      isSample: true,
    },
    {
      id: 'runtime_user_pro_barista',
      email: 'pro.barista@example.com',
      name: 'Pro Barista',
      username: 'pro-barista',
      provider: 'google',
      role: 'user',
      status: 'active',
      planCode: 'pro',
      planName: 'Pro',
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
      locale: 'en-US',
      platform: 'pwa',
      country: 'SG',
      usage: {
        aiRequestsToday: 84,
        deepRequestsToday: 17,
        scannerRunsToday: 12,
        collectionWritesToday: 22,
        totalTokensToday: 182000,
      },
      riskScore: 4,
      flags: ['power_user'],
      accountRecoveryStatus: 'none',
      passwordResetRequired: false,
      billing: runtimeBilling('pro', 'active', 'revenuecat', 'global', {
        customerId: 'rc_customer_pro_barista',
        subscriptionId: 'sub_pro_monthly',
        currentPeriodEnd: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      isSample: true,
    },
    {
      id: 'runtime_user_team_cafe',
      email: 'manager.cafe@example.com',
      name: 'Cafe Manager',
      username: 'cafe-manager',
      provider: 'google',
      role: 'admin',
      status: 'active',
      planCode: 'team',
      planName: 'Team',
      createdAt: new Date(Date.now() - 74 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 63 * 60 * 1000).toISOString(),
      locale: 'ms-MY',
      platform: 'mobile',
      country: 'MY',
      usage: {
        aiRequestsToday: 196,
        deepRequestsToday: 42,
        scannerRunsToday: 33,
        collectionWritesToday: 41,
        totalTokensToday: 436000,
      },
      riskScore: 8,
      flags: ['team_owner'],
      accountRecoveryStatus: 'none',
      passwordResetRequired: false,
      billing: runtimeBilling('team', 'active', 'manual', 'global', {
        customerId: 'invoice_cafe_manager',
        subscriptionId: 'manual_team_2026_04',
        currentPeriodEnd: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      isSample: true,
    },
    {
      id: 'runtime_user_past_due',
      email: 'billing.watch@example.com',
      name: 'Billing Watch',
      username: 'billing-watch',
      provider: 'email',
      role: 'user',
      status: 'past_due',
      planCode: 'starter',
      planName: 'Starter',
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      locale: 'id-ID',
      platform: 'web',
      country: 'ID',
      usage: {
        aiRequestsToday: 51,
        deepRequestsToday: 8,
        scannerRunsToday: 7,
        collectionWritesToday: 5,
        totalTokensToday: 74000,
      },
      riskScore: 68,
      flags: ['billing_attention'],
      notes: 'Payment retry window open.',
      supportNote: 'Confirm payment method before restoring higher quota.',
      accountRecoveryStatus: 'requested',
      lastRecoveryRequestAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      passwordResetRequired: true,
      billing: runtimeBilling('starter', 'past_due', 'stripe', 'indonesia', {
        customerId: 'cus_billing_watch',
        subscriptionId: 'sub_starter_retry',
        currentPeriodEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastEventAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        paymentActionRequired: true,
      }),
      isSample: true,
    },
  ];

  return seeds.map((user) => {
    const patch = RUNTIME_USER_PATCHES.get(user.id);
    if (!patch) return user;
    const planCode = patch.planCode || user.planCode;
    const status = patch.status || user.status;
    const {
      displayName,
      billingStatus,
      billingProvider,
      billingMarket,
      paymentActionRequired,
      ...recordPatch
    } = patch;
    return {
      ...user,
      ...recordPatch,
      name: displayName || user.name,
      planCode,
      planName: planName(planCode),
      billing: mergeBillingPatch(user, {
        billingStatus,
        billingProvider,
        billingMarket,
        paymentActionRequired,
      }, planCode, status),
      flags: user.flags,
    };
  });
}

function withActiveCounts(users: AdminUserRecord[], plans = runtimePlanBlueprints()): AdminPlan[] {
  return plans.map((plan) => ({
    ...plan,
    activeUsers: users.filter((user) => user.planCode === plan.code && user.status !== 'deleted').length,
  }));
}

function applyPlanNamesToUsers(users: AdminUserRecord[], plans: AdminPlan[]): AdminUserRecord[] {
  const names = new Map(plans.map((plan) => [plan.code, plan.name]));
  return users.map((user) => ({
    ...user,
    planName: names.get(user.planCode) || user.planName,
  }));
}

function metricsFromUsers(users: AdminUserRecord[]): AdminSnapshot['metrics'] {
  const activeUsers = users.filter((user) => user.status === 'active' || user.status === 'trialing').length;
  const paidUsers = users.filter((user) => user.planCode !== 'free' && user.status !== 'deleted').length;
  const totalUsers = users.filter((user) => user.status !== 'deleted').length;
  return {
    totalUsers,
    activeUsers,
    paidUsers,
    trialUsers: users.filter((user) => user.status === 'trialing').length,
    suspendedUsers: users.filter((user) => user.status === 'suspended').length,
    riskAccounts: users.filter((user) => user.riskScore >= 60 || user.status === 'past_due' || user.status === 'suspended').length,
    aiRequestsToday: users.reduce((sum, user) => sum + user.usage.aiRequestsToday, 0),
    deepRequestsToday: users.reduce((sum, user) => sum + user.usage.deepRequestsToday, 0),
    scannerRunsToday: users.reduce((sum, user) => sum + user.usage.scannerRunsToday, 0),
    collectionWritesToday: users.reduce((sum, user) => sum + user.usage.collectionWritesToday, 0),
    planConversionRate: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 1000) / 10 : 0,
  };
}

function connectedBillingProviders(): BillingProvider[] {
  const providers: BillingProvider[] = [];
  if (readEnv('REVENUECAT_API_KEY', 'REVENUECAT_WEBHOOK_SECRET')) providers.push('revenuecat');
  if (readEnv('GOOGLE_PLAY_PACKAGE_NAME', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'GOOGLE_PLAY_SERVICE_ACCOUNT_KEY')) providers.push('google_play');
  if (readEnv('APP_STORE_CONNECT_ISSUER_ID', 'APP_STORE_SHARED_SECRET', 'APPLE_APP_ID')) providers.push('app_store');
  if (readEnv('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'BILLING_CHECKOUT_URL')) providers.push('stripe');
  if (readEnv('MIDTRANS_SERVER_KEY', 'MIDTRANS_WEBHOOK_SECRET')) providers.push('midtrans');
  if (readEnv('XENDIT_SECRET_KEY', 'XENDIT_WEBHOOK_TOKEN')) providers.push('xendit');
  if (readManualPaymentInstructions('Admin readiness check')) providers.push('manual');
  return providers;
}

function billingSyncConfigured(): boolean {
  return Boolean(readEnv(
    'BILLING_SYNC_TOKEN',
    'BILLING_WEBHOOK_SECRET',
    'REVENUECAT_WEBHOOK_SECRET',
    'STRIPE_WEBHOOK_SECRET',
    'MIDTRANS_WEBHOOK_SECRET',
    'XENDIT_WEBHOOK_TOKEN',
  ));
}

function buildManualQueueCounts(requests: ManualPaymentRequest[]): AdminSnapshot['billing']['manualQueueCounts'] {
  return requests.reduce<AdminSnapshot['billing']['manualQueueCounts']>((counts, request) => {
    counts[request.status] += 1;
    return counts;
  }, {
    pending_review: 0,
    receipt_received: 0,
    verified_paid: 0,
    rejected: 0,
    expired: 0,
  });
}

function buildPlanParity(plans: AdminPlan[]): AdminSnapshot['billing']['planParity'] {
  const mismatches: string[] = [];
  const planByCode = new Map(plans.map((plan) => [plan.code, plan]));
  for (const shared of PLAN_CATALOG) {
    const local = planByCode.get(shared.code as PlanCode);
    if (!local) {
      mismatches.push(`${shared.code}: missing in admin plan catalog`);
      continue;
    }
    const localFeatures = [...local.features].map((item) => item.trim()).sort();
    const sharedFeatures = [...shared.features].map((item) => item.trim()).sort();
    if (local.name !== shared.displayName) mismatches.push(`${shared.code}: name differs`);
    if (localFeatures.join('|') !== sharedFeatures.join('|')) mismatches.push(`${shared.code}: features differ`);
  }
  return {
    ok: mismatches.length === 0,
    mismatches,
    sharedCatalogPlans: PLAN_CATALOG.map((plan) => plan.code as PlanCode),
  };
}

async function buildBillingSummary(users: AdminUserRecord[], plans: AdminPlan[], dataMode: DataMode): Promise<AdminSnapshot['billing']> {
  const connectedProviders = connectedBillingProviders();
  const hasSyncToken = billingSyncConfigured();
  const manualPayments = dataMode === 'supabase'
    ? await listPersistedManualPaymentRequests().catch((error) => {
        console.error('Failed to load persisted manual payments:', error);
        return listManualPaymentRequests();
      })
    : listManualPaymentRequests();
  const manualQueueCounts = buildManualQueueCounts(manualPayments);
  const planParity = buildPlanParity(plans);
  const activeStatuses = new Set<BillingStatus>(['active', 'trialing']);
  const paidUsers = users.filter((user) => user.planCode !== 'free' && user.status !== 'deleted');
  const revenueMonthlyUsd = paidUsers
    .filter((user) => activeStatuses.has(user.billing.status))
    .reduce((sum, user) => sum + (plans.find((plan) => plan.code === user.planCode)?.priceMonthlyUsd || 0), 0);
  const gaps: string[] = [];
  const manualConfigured = connectedProviders.includes('manual');
  const externalProviderConfigured = connectedProviders.some((provider) => provider !== 'manual');

  if (dataMode !== 'supabase') {
    gaps.push('Supabase billing tables are not live yet; runtime billing controls are preview-only.');
  }
  if (!connectedProviders.length) {
    gaps.push('No payment provider env is configured. Enable MANUAL_PAYMENT_ENABLED or add RevenueCat/Google Play/App Store/Stripe/Midtrans/Xendit before paid launch.');
  }
  if (!hasSyncToken && !connectedProviders.includes('manual')) {
    gaps.push('Billing lifecycle sync token is missing. Set BILLING_SYNC_TOKEN or provider webhook secret before live payments.');
  }
  if (externalProviderConfigured && !connectedProviders.includes('google_play')) {
    gaps.push('Google Play Billing package/service account is not configured for Android purchases.');
  }
  if (externalProviderConfigured && !connectedProviders.includes('app_store')) {
    gaps.push('App Store purchase credentials are not configured for iOS parity.');
  }
  if (!planParity.ok) {
    gaps.push(`Plan catalog parity mismatch: ${planParity.mismatches.join('; ')}`);
  }

  return {
    ready: dataMode === 'supabase' && connectedProviders.length > 0 && (hasSyncToken || manualConfigured),
    mode: connectedProviders.length ? (envEnabled('BILLING_LIVE_MODE') ? 'live_ready' : 'test') : 'not_configured',
    connectedProviders,
    activeSubscriptions: users.filter((user) => user.planCode !== 'free' && user.billing.status === 'active').length,
    trialingSubscriptions: users.filter((user) => user.billing.status === 'trialing').length,
    pastDueSubscriptions: users.filter((user) => user.billing.status === 'past_due').length,
    revenueMonthlyUsd: Math.round(revenueMonthlyUsd * 100) / 100,
    attentionUsers: users.filter((user) => user.billing.paymentActionRequired || user.billing.status === 'past_due' || user.billing.status === 'refunded').length,
    supportedMarkets: ['indonesia', 'brunei', 'global'],
    realtimeTables: ['app_users', 'app_plans', 'user_entitlements', 'payment_receipts', 'admin_audit_events', 'app_feature_flags', 'catalog_review_queue', 'ai_brew_journal', 'recipe_library_items'],
    gaps,
    manualPayments,
    manualQueueCounts,
    planParity,
  };
}

function emptyCatalogCounts(): Record<CatalogKind, number> {
  return {
    water: 0,
    dripper: 0,
    grinder: 0,
  };
}

function normalizeCatalogReviewStatus(value: unknown): CatalogReviewStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'approved' || raw === 'published' || raw === 'rejected' || raw === 'needs_source') return raw;
  return 'queued';
}

function catalogPayloadPreview(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  const brand = normalizeText(record.brand);
  const model = normalizeText(record.model || record.name || record.sku_label);
  const region = normalizeText(record.region || record.market || record.available_in);
  const summary = [brand, model, region].filter(Boolean).join(' / ');
  return summary || JSON.stringify(record).slice(0, 180);
}

function catalogRequestFromSupabase(row: any): AdminCatalogRequest {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {};
  return {
    id: normalizeText(row.id, `catalog_${Date.now()}`),
    kind: VALID_CATALOG_KINDS.has(normalizeText(row.kind).toLowerCase() as CatalogKind)
      ? normalizeText(row.kind).toLowerCase() as CatalogKind
      : 'grinder',
    entityId: normalizeText(row.entity_id || payload.entityId),
    title: normalizeText(payload.title || row.title || payload.brand || payload.model, 'Catalog request'),
    reviewStatus: normalizeCatalogReviewStatus(row.review_status || payload.reviewStatus),
    sourceUrl: normalizeText(payload.sourceUrl || payload.source_url),
    operatorNote: normalizeText(payload.operatorNote || payload.operator_note),
    payloadPreview: catalogPayloadPreview(payload),
    createdAt: normalizeText(row.created_at, nowIso()),
  };
}

async function loadSupabaseCatalogSummary(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminSnapshot['catalog']> {
  const publishedCounts = emptyCatalogCounts();
  const gaps: string[] = [];
  const tableByKind: Record<CatalogKind, string> = {
    water: 'waters',
    dripper: 'drippers',
    grinder: 'grinders',
  };

  for (const [kind, table] of Object.entries(tableByKind) as Array<[CatalogKind, string]>) {
    try {
      const rows = await supabaseRest<any[]>(config, `${table}?select=id,published&published=eq.true&limit=1000`);
      publishedCounts[kind] = Array.isArray(rows) ? rows.length : 0;
    } catch (error) {
      gaps.push(`${table} belum siap atau belum dimigrasikan: ${sanitizeErrorDetails(error, 120)}`);
    }
  }

  let recentRequests: AdminCatalogRequest[] = [];
  try {
    const rows = await supabaseRest<any[]>(config, 'catalog_review_queue?select=*&order=created_at.desc&limit=50');
    recentRequests = Array.isArray(rows) ? rows.map(catalogRequestFromSupabase) : [];
  } catch (error) {
    gaps.push(`catalog_review_queue belum siap: ${sanitizeErrorDetails(error, 120)}`);
  }

  const reviewQueue = {
    total: recentRequests.length,
    queued: recentRequests.filter((request) => request.reviewStatus === 'queued').length,
    needsSource: recentRequests.filter((request) => request.reviewStatus === 'needs_source').length,
    approved: recentRequests.filter((request) => request.reviewStatus === 'approved' || request.reviewStatus === 'published').length,
    rejected: recentRequests.filter((request) => request.reviewStatus === 'rejected').length,
  };

  return {
    ready: gaps.length === 0,
    supportedKinds: ['water', 'dripper', 'grinder'],
    tables: ['waters', 'drippers', 'grinders', 'catalog_review_queue', 'brand_suggestions', 'ingest_runs'],
    publishedCounts,
    reviewQueue,
    recentRequests,
    gaps,
  };
}

function buildRuntimeCatalogSummary(): AdminSnapshot['catalog'] {
  const reviewQueue = {
    total: RUNTIME_CATALOG_REQUESTS.length,
    queued: RUNTIME_CATALOG_REQUESTS.filter((request) => request.reviewStatus === 'queued').length,
    needsSource: RUNTIME_CATALOG_REQUESTS.filter((request) => request.reviewStatus === 'needs_source').length,
    approved: RUNTIME_CATALOG_REQUESTS.filter((request) => request.reviewStatus === 'approved' || request.reviewStatus === 'published').length,
    rejected: RUNTIME_CATALOG_REQUESTS.filter((request) => request.reviewStatus === 'rejected').length,
  };
  return {
    ready: false,
    supportedKinds: ['water', 'dripper', 'grinder'],
    tables: ['waters', 'drippers', 'grinders', 'catalog_review_queue', 'brand_suggestions', 'ingest_runs'],
    publishedCounts: emptyCatalogCounts(),
    reviewQueue,
    recentRequests: RUNTIME_CATALOG_REQUESTS.slice(0, 20),
    gaps: ['Supabase catalog_platform.sql belum aktif; request katalog runtime hanya preview sampai database produksi tersambung.'],
  };
}

function recipeLibrarySource(value: unknown): AdminRecipeLibraryItem['source'] {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'ai_brew' || raw === 'collection' || raw === 'import') return raw;
  return 'unknown';
}

function recipeLibraryItemType(value: unknown): AdminRecipeLibraryItem['itemType'] {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'recipe' || raw === 'ai_canvas') return raw;
  if (raw === 'brew_journal') return raw;
  return 'unknown';
}

function recipeLibrarySummaryText(...parts: unknown[]): string {
  return parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(' / ')
    .slice(0, 220);
}

function aiBrewJournalItemFromSupabase(row: any): AdminRecipeLibraryItem {
  const title = normalizeText(row.title, normalizeText(row.coffee_name, 'AI Brew'));
  return {
    id: normalizeText(row.id, `brew_${Date.now()}`),
    userId: normalizeText(row.user_id, 'unknown-user'),
    title,
    source: 'ai_brew',
    itemType: 'brew_journal',
    brewMode: normalizeText(row.brew_mode).toLowerCase() === 'iced' ? 'iced' : 'hot',
    methodFamily: normalizeText(row.method_family),
    coffeeName: normalizeText(row.coffee_name),
    dripperName: normalizeText(row.dripper_name),
    feedbackRating: normalizeText(row.feedback_rating),
    createdAt: normalizeText(row.created_at, nowIso()),
    updatedAt: normalizeText(row.updated_at || row.created_at, nowIso()),
    summary: recipeLibrarySummaryText(
      row.coffee_name,
      row.dripper_name,
      row.method_family,
      row.brew_mode,
      row.feedback_rating ? `feedback: ${row.feedback_rating}` : '',
    ) || title,
  };
}

function collectionItemFromSupabase(row: any): AdminRecipeLibraryItem {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const content = row.content && typeof row.content === 'object' ? row.content : {};
  const title = normalizeText(row.title, normalizeText((content as Record<string, unknown>).name, 'Recipe item'));
  return {
    id: normalizeText(row.id, `collection_${Date.now()}`),
    userId: normalizeText(row.user_id, 'unknown-user'),
    title,
    source: recipeLibrarySource(row.source),
    itemType: recipeLibraryItemType(row.item_type),
    createdAt: normalizeText(row.created_at, nowIso()),
    updatedAt: normalizeText(row.updated_at || row.created_at, nowIso()),
    deletedAt: normalizeText(row.deleted_at),
    summary: recipeLibrarySummaryText(
      row.item_type,
      row.source,
      (content as Record<string, unknown>).description,
      (metadata as Record<string, unknown>).syncedFrom,
    ) || title,
  };
}

async function loadSupabaseRecipeLibrarySummary(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminRecipeLibrarySummary> {
  const gaps: string[] = [];
  let aiBrewItems: AdminRecipeLibraryItem[] = [];
  let collectionItems: AdminRecipeLibraryItem[] = [];

  try {
    const rows = await supabaseRest<any[]>(config, 'ai_brew_journal?select=id,user_id,title,brew_mode,method_family,coffee_name,dripper_name,feedback_rating,created_at,updated_at&order=updated_at.desc&limit=60');
    aiBrewItems = Array.isArray(rows) ? rows.map(aiBrewJournalItemFromSupabase) : [];
  } catch (error) {
    gaps.push(`ai_brew_journal belum siap: ${sanitizeErrorDetails(error, 140)}`);
  }

  try {
    const rows = await supabaseRest<any[]>(config, 'recipe_library_items?select=id,user_id,title,source,item_type,content,metadata,deleted_at,created_at,updated_at&order=updated_at.desc&limit=60');
    collectionItems = Array.isArray(rows) ? rows.map(collectionItemFromSupabase) : [];
  } catch (error) {
    gaps.push(`recipe_library_items belum siap: ${sanitizeErrorDetails(error, 140)}`);
  }

  const recentItems = [...aiBrewItems, ...collectionItems]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 40);

  return {
    ready: gaps.length === 0,
    totalItems: recentItems.length,
    aiBrewCount: aiBrewItems.length,
    collectionCount: collectionItems.filter((item) => !item.deletedAt).length,
    feedbackCount: aiBrewItems.filter((item) => Boolean(item.feedbackRating)).length,
    recentItems,
    tables: ['ai_brew_journal', 'recipe_library_items'],
    gaps,
  };
}

function buildRuntimeRecipeLibrarySummary(): AdminRecipeLibrarySummary {
  return {
    ready: false,
    totalItems: 0,
    aiBrewCount: 0,
    collectionCount: 0,
    feedbackCount: 0,
    recentItems: [],
    tables: ['ai_brew_journal', 'recipe_library_items'],
    gaps: ['Supabase ai_brew_recipe_library.sql belum aktif; Recipe Library admin akan terisi setelah sync production berjalan.'],
  };
}

function buildChecks(dataMode: DataMode): AdminSystemCheck[] {
  const supabase = getSupabaseConfig();
  const adminConfigured = Boolean(readEnv('ADMIN_EMAILS', 'ADMIN_BOOTSTRAP_EMAILS', 'ADMIN_USER_IDS', 'ADMIN_BOOTSTRAP_USER_IDS'));
  const jwtConfigured = Boolean(readEnv('JWT_SECRET'));
  const aiConfigured = resolveAiProviderAdminSnapshot().configuredProviders > 0;
  const billingConfigured = connectedBillingProviders().length > 0;
  const billingSyncReady = billingSyncConfigured();
  const sentryConfigured = Boolean(readEnv('SENTRY_DSN', 'EXPO_PUBLIC_SENTRY_DSN', 'VITE_SENTRY_DSN'));
  const planEnforcementEnabled = envEnabled('PLAN_ENFORCEMENT_ENABLED');
  const planEnforcementReady = planEnforcementEnabled && dataMode === 'supabase';
  const quotaStrictEnabled = envEnabled('PLAN_QUOTA_STRICT_ENABLED') || envEnabled('PLAN_ENFORCEMENT_STRICT');

  return [
    {
      id: 'jwt_auth',
      label: 'JWT auth guard',
      status: jwtConfigured ? 'pass' : 'fail',
      owner: 'Security',
      detail: jwtConfigured ? 'Server API requires signed JWT for protected endpoints.' : 'JWT_SECRET is missing.',
      nextAction: jwtConfigured ? undefined : 'Set JWT_SECRET in production and rotate test secrets before launch.',
    },
    {
      id: 'admin_allowlist',
      label: 'Admin allowlist',
      status: adminConfigured ? 'pass' : 'fail',
      owner: 'Security',
      detail: adminConfigured ? 'Admin access is restricted by claim/email/user-id allowlist.' : 'No admin allowlist env is configured.',
      nextAction: adminConfigured ? undefined : 'Set ADMIN_EMAILS or ADMIN_USER_IDS for launch admins.',
    },
    {
      id: 'database_persistence',
      label: 'Persistent admin database',
      status: dataMode === 'supabase' && supabase.configured ? 'pass' : 'fail',
      owner: 'Data',
      detail: dataMode === 'supabase' ? 'Admin reads and mutations are backed by Supabase tables.' : 'Admin is running with runtime fallback data.',
      nextAction: dataMode === 'supabase' ? undefined : 'Run supabase/admin_management.sql and set SUPABASE_SERVICE_ROLE_KEY.',
    },
    {
      id: 'audit_trail',
      label: 'Audit trail',
      status: dataMode === 'supabase' ? 'pass' : 'warn',
      owner: 'Operations',
      detail: dataMode === 'supabase' ? 'Admin mutations are written to admin_audit_events.' : 'Runtime audit resets when serverless instances recycle.',
      nextAction: dataMode === 'supabase' ? undefined : 'Enable the admin database migration before managing real accounts.',
    },
    {
      id: 'plan_catalog',
      label: 'Plan catalog',
      status: 'pass',
      owner: 'Billing',
      detail: 'Free, Starter, Pro, Team, and Enterprise plan definitions are editable from admin.',
    },
    {
      id: 'catalog_platform',
      label: 'Brew catalog database',
      status: dataMode === 'supabase' ? 'pass' : 'warn',
      owner: 'Data',
      detail: dataMode === 'supabase'
        ? 'Catalog tables can power water, dripper, and grinder review operations.'
        : 'Catalog search uses bundled data until Supabase catalog_platform.sql is applied.',
      nextAction: dataMode === 'supabase' ? undefined : 'Run supabase/catalog_platform.sql and import curated catalog data before public scale.',
    },
    {
      id: 'feature_flags',
      label: 'Maintenance feature flags',
      status: dataMode === 'supabase' || Boolean(readEnv('MAINTENANCE_FEATURES', 'APP_MAINTENANCE_FEATURES', 'APP_MAINTENANCE_ENABLED')) ? 'pass' : 'warn',
      owner: 'Operations',
      detail: dataMode === 'supabase'
        ? 'Feature availability is read from app_feature_flags.'
        : 'Runtime feature flags are available for preview only.',
      nextAction: dataMode === 'supabase' ? undefined : 'Apply the admin migration so maintenance changes persist across devices.',
    },
    {
      id: 'billing_provider',
      label: 'Billing provider contract',
      status: billingConfigured && billingSyncReady ? 'pass' : 'warn',
      owner: 'Billing',
      detail: billingConfigured && billingSyncReady ? 'Billing provider env and lifecycle sync token are present.' : 'Billing provider or lifecycle sync token is missing.',
      nextAction: billingConfigured && billingSyncReady ? undefined : 'Connect Google Play Billing/RevenueCat/Stripe/Midtrans/Xendit and set BILLING_SYNC_TOKEN before paid launch.',
    },
    {
      id: 'ai_capacity',
      label: 'AI provider capacity',
      status: aiConfigured ? 'pass' : 'fail',
      owner: 'AI',
      detail: aiConfigured ? 'AI provider keys are configured for protected AI endpoints.' : 'AI provider key is missing.',
      nextAction: aiConfigured ? undefined : 'Set GEMINI_API_KEY or equivalent provider keys in production.',
    },
    {
      id: 'plan_enforcement',
      label: 'Per-plan enforcement',
      status: planEnforcementReady ? 'pass' : planEnforcementEnabled ? 'fail' : 'warn',
      owner: 'Backend',
      detail: planEnforcementReady
        ? 'Plan enforcement flag is enabled and Supabase quota consumption is required for paid AI routes.'
        : planEnforcementEnabled
          ? 'PLAN_ENFORCEMENT_ENABLED is true, but Supabase persistence is not active; paid AI routes will fail closed.'
          : 'Admin can manage plans, but daily quota enforcement is disabled until PLAN_ENFORCEMENT_ENABLED is true.',
      nextAction: planEnforcementReady
        ? undefined
        : planEnforcementEnabled
          ? 'Run supabase/admin_management.sql and set SUPABASE_SERVICE_ROLE_KEY before keeping quota enforcement enabled.'
          : 'Enable PLAN_ENFORCEMENT_ENABLED after Supabase admin tables and consume_app_quota RPC are deployed.',
    },
    {
      id: 'paid_ai_quota_failure_policy',
      label: 'Paid AI quota failure policy',
      status: planEnforcementReady && quotaStrictEnabled ? 'pass' : planEnforcementReady ? 'warn' : 'fail',
      owner: 'Billing',
      detail: planEnforcementReady && quotaStrictEnabled
        ? 'Paid AI quota RPC outages fail closed in production strict mode.'
        : planEnforcementReady
          ? 'Paid AI quota consumption is enabled, but RPC outages currently soft-open for verified paid users.'
          : 'Paid AI quota policy cannot be enforced until Supabase-backed plan enforcement is active.',
      nextAction: planEnforcementReady && quotaStrictEnabled
        ? undefined
        : planEnforcementReady
          ? 'Set PLAN_QUOTA_STRICT_ENABLED=true after confirming consume_app_quota is live in production.'
          : 'Apply the admin migration, verify consume_app_quota, then enable PLAN_ENFORCEMENT_ENABLED.',
    },
    {
      id: 'telemetry',
      label: 'Crash and error telemetry',
      status: sentryConfigured ? 'pass' : 'warn',
      owner: 'Operations',
      detail: sentryConfigured ? 'Telemetry DSN is configured.' : 'Telemetry DSN is not configured.',
      nextAction: sentryConfigured ? undefined : 'Enable Sentry before Play Store rollout.',
    },
  ];
}

function buildLaunchChecklist(checks: AdminSystemCheck[]): LaunchChecklistItem[] {
  const statusFor = (id: string) => checks.find((check) => check.id === id)?.status || 'warn';
  return [
    {
      id: 'admin_locked',
      label: 'Admin access locked to owners',
      status: statusFor('admin_allowlist'),
      due: 'now',
      owner: 'Admin',
      action: 'Keep only founder/support owner emails in ADMIN_EMAILS for v1 launch.',
    },
    {
      id: 'db_live',
      label: 'User, plan, usage, audit tables live',
      status: statusFor('database_persistence'),
      due: 'now',
      owner: 'Backend',
      action: 'Apply Supabase admin migration and verify REST service role access.',
    },
    {
      id: 'quota_wired',
      label: 'Plan quotas enforced in AI and scanner routes',
      status: statusFor('plan_enforcement'),
      due: 'now',
      owner: 'Backend',
      action: 'Reject or degrade requests when daily plan quotas are exceeded.',
    },
    {
      id: 'quota_rpc_outage_policy',
      label: 'Paid AI quota outage policy selected',
      status: statusFor('paid_ai_quota_failure_policy'),
      due: 'now',
      owner: 'Backend',
      action: 'Use strict fail-closed quota mode for production paid AI after verifying consume_app_quota.',
    },
    {
      id: 'maintenance_controls',
      label: 'Maintenance controls visible to users',
      status: statusFor('feature_flags'),
      due: 'now',
      owner: 'Support',
      action: 'Use admin maintenance flags before disabling risky web, PWA, or mobile features.',
    },
    {
      id: 'catalog_ready',
      label: 'Brew catalog review queue ready',
      status: statusFor('catalog_platform'),
      due: 'this_week',
      owner: 'Backend',
      action: 'Apply catalog_platform.sql, import grinder/water/dripper data, and review queued additions before launch.',
    },
    {
      id: 'billing_ready',
      label: 'Billing lifecycle sync',
      status: statusFor('billing_provider'),
      due: 'this_week',
      owner: 'Backend',
      action: 'Sync active, trialing, past_due, cancelled, and refunded events into app_users.',
    },
    {
      id: 'support_ready',
      label: 'Support account workflow',
      due: 'now',
      owner: 'Mobile',
      action: 'Verify release, environment, and user context appear in Sentry.',
    },
  ];
}

function buildRecommendations(snapshot: {
  dataMode: DataMode;
  metrics: AdminSnapshot['metrics'];
  checks: AdminSystemCheck[];
}): string[] {
  const recommendations: string[] = [];
  if (snapshot.dataMode !== 'supabase') {
    recommendations.push('Move admin to Supabase service-role persistence before managing real launch users.');
  }
  if (snapshot.checks.some((check) => check.id === 'plan_enforcement' && check.status !== 'pass')) {
    recommendations.push('Wire plan_code to quota middleware for /api/ai, scanner, image edit, and speech generation.');
  }
  if (snapshot.checks.some((check) => check.id === 'feature_flags' && check.status !== 'pass')) {
    recommendations.push('Persist maintenance flags so user-facing web/PWA/mobile banners match admin changes.');
  }
  if (snapshot.checks.some((check) => check.id === 'catalog_platform' && check.status !== 'pass')) {
    recommendations.push('Move grinder, dripper, and water catalog review into Supabase before adding new public catalog data.');
  }
  if (snapshot.metrics.riskAccounts > 0) {
    recommendations.push('Review past_due and suspended accounts daily during the first launch week.');
  }
  if (snapshot.metrics.planConversionRate < 10) {
    recommendations.push('Keep Free plan useful for Play Store review, but make Pro limits visibly valuable.');
  }
  recommendations.push('Use audit events for every admin mutation: role changes, suspensions, plan overrides, and support notes.');
  return recommendations;
}

async function loadSupabaseUsers(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminUserRecord[]> {
  const rows = await supabaseRest<any[]>(config, 'app_users?select=*&order=updated_at.desc&limit=250');
  return Array.isArray(rows) ? rows.map(userFromSupabase) : [];
}

async function loadSupabasePlans(
  config: Extract<SupabaseConfig, { configured: true }>,
  users: AdminUserRecord[],
): Promise<AdminPlan[]> {
  const rows = await supabaseRest<any[]>(config, 'app_plans?select=*&order=display_order.asc');
  if (!Array.isArray(rows) || rows.length === 0) return withActiveCounts(users);
  const counts = withActiveCounts(users);
  return rows.map((row) => planFromSupabase(row, counts.find((plan) => plan.code === normalizePlanCode(row.code || row.plan_code))?.activeUsers || 0));
}

async function loadSupabaseAudit(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminAuditEvent[]> {
  const rows = await supabaseRest<any[]>(config, 'admin_audit_events?select=*&order=created_at.desc&limit=60');
  return Array.isArray(rows) ? rows.map(auditFromSupabase) : [];
}

async function loadSupabaseFeatureFlags(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminFeatureFlag[]> {
  const rows = await supabaseRest<any[]>(config, 'app_feature_flags?select=*&order=key.asc');
  return mergeFeatureFlagsWithDefaults(rows);
}

async function upsertSupabaseAdminUser(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  rawUser?: Record<string, unknown>,
): Promise<void> {
  if (!admin.userId) return;
  const row = {
    id: admin.userId,
    email: admin.email || normalizeText(rawUser?.email),
    display_name: normalizeText(rawUser?.name || rawUser?.displayName),
    username: normalizeUsername(rawUser?.username, admin.email || admin.userId),
    avatar_url: normalizeText(rawUser?.picture || rawUser?.avatarUrl),
    provider: normalizeProvider(rawUser?.provider),
    role: admin.role,
    last_seen_at: nowIso(),
    account_recovery_status: 'none',
    password_reset_required: false,
    metadata: {
      adminAccessSource: admin.source,
      platform: 'web',
    },
  };
  await supabaseRest(config, 'app_users?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([row]),
  });
}

function buildRuntimeAudit(admin: AdminAccess): AdminAuditEvent[] {
  const base: AdminAuditEvent[] = [
    {
      id: 'runtime_audit_boot',
      actor: admin.email || admin.userId || 'admin',
      target: 'admin_management',
      action: 'snapshot_loaded',
      createdAt: nowIso(),
      detail: 'Runtime fallback snapshot generated. Configure Supabase for persistent audit.',
      severity: 'warning',
    },
  ];
  return [...RUNTIME_AUDIT, ...base].slice(0, 60);
}

async function buildAdminSnapshot(
  requestId: string,
  admin: AdminAccess,
  rawUser?: Record<string, unknown>,
  aiUsageRange?: AiUsageRangeInput,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  let dataMode: DataMode = 'runtime_fallback';
  let users: AdminUserRecord[] = [];
  let plans: AdminPlan[] = [];
  let audit: AdminAuditEvent[] = [];
  let featureFlags: AdminFeatureFlag[] = [];
  let catalog: AdminSnapshot['catalog'] = buildRuntimeCatalogSummary();
  let recipeLibrary: AdminRecipeLibrarySummary = buildRuntimeRecipeLibrarySummary();
  const warnings: string[] = [];

  if (config.configured) {
    try {
      await upsertSupabaseAdminUser(config, admin, rawUser).catch((error) => {
        warnings.push(`Admin user upsert skipped: ${sanitizeErrorDetails(error, 160)}`);
      });
      users = await loadSupabaseUsers(config);
      if (!users.some((user) => user.id === admin.userId)) {
        users.unshift(currentAuthUser(admin, rawUser));
      }
      plans = await loadSupabasePlans(config, users);
      users = applyPlanNamesToUsers(users, plans);
      audit = await loadSupabaseAudit(config);
      featureFlags = await loadSupabaseFeatureFlags(config);
      catalog = await loadSupabaseCatalogSummary(config);
      recipeLibrary = await loadSupabaseRecipeLibrarySummary(config);
      dataMode = 'supabase';
    } catch (error) {
      warnings.push(`Supabase admin read failed: ${sanitizeErrorDetails(error, 180)}`);
    }
  } else {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not configured; using runtime fallback data.');
  }

  if (dataMode !== 'supabase') {
    users = runtimeSeedUsers(admin, rawUser);
    plans = withActiveCounts(users);
    users = applyPlanNamesToUsers(users, plans);
    audit = buildRuntimeAudit(admin);
    featureFlags = buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
    catalog = buildRuntimeCatalogSummary();
    recipeLibrary = buildRuntimeRecipeLibrarySummary();
  }

  const metrics = metricsFromUsers(users);
  const ai = resolveAiProviderAdminSnapshot(featureFlags, aiUsageRange);
  const aiBrewFallbacks = buildAiBrewFallbackSnapshot(
    audit,
    ai,
    dataMode === 'supabase' ? 'admin_audit_events' : 'runtime_audit',
  );
  const checks = buildChecks(dataMode);
  const billing = await buildBillingSummary(users, plans, dataMode);
  const launchChecklist = buildLaunchChecklist(checks);
  const recommendations = buildRecommendations({ dataMode, metrics, checks });
  for (const warning of ai.warnings) {
    warnings.push(warning);
  }
  if (!recipeLibrary.ready) {
    recommendations.unshift('Run supabase/ai_brew_recipe_library.sql so AI Brew saves and Collection recipes appear in admin Recipe Library.');
  }
  if (!billing.ready) {
    recommendations.unshift('Finish billing provider and Supabase entitlement setup before opening paid plans to real users.');
  }

  return {
    ok: true,
    requestId,
    generatedAt: nowIso(),
    dataMode,
    dataFreshnessSec: 0,
    degraded: dataMode !== 'supabase' || checks.some((check) => check.status === 'fail'),
    admin: {
      userId: admin.userId || 'unknown',
      email: admin.email,
      role: admin.role,
      source: admin.source,
    },
    metrics,
    plans,
    users,
    audit,
    checks,
    launchChecklist,
    featureFlags,
    ai,
    aiBrewFallbacks,
    billing,
    catalog,
    recipeLibrary,
    recommendations,
    warnings,
    realtime: {
      strategy: 'polling',
      intervalSec: LIVE_POLL_INTERVAL_SEC,
      sequence: ++snapshotSequence,
    },
  };
}

function validatePatch(body: any): { ok: true; userId: string; patch: UserPatch } | ValidationError {
  const userId = normalizeText(body?.userId);
  if (!userId) return { ok: false, error: 'userId is required' };
  const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
  const patch: UserPatch = {};

  if ('role' in rawPatch) {
    const validated = validateEnumValue(rawPatch.role, 'role', VALID_ADMIN_ROLES);
    if (validated.ok === false) return validated;
    patch.role = validated.value;
  }
  if ('status' in rawPatch) {
    const validated = validateEnumValue(rawPatch.status, 'status', VALID_ACCOUNT_STATUSES);
    if (validated.ok === false) return validated;
    patch.status = validated.value;
  }
  if ('planCode' in rawPatch) {
    const validated = validateEnumValue(rawPatch.planCode, 'planCode', VALID_PLAN_CODES);
    if (validated.ok === false) return validated;
    patch.planCode = validated.value;
  }
  if ('displayName' in rawPatch) {
    const validated = validatePatchText(rawPatch.displayName, 'displayName', DISPLAY_NAME_MAX_LENGTH, { required: true });
    if (validated.ok === false) return validated;
    patch.displayName = validated.value;
  }
  if ('username' in rawPatch) {
    const validated = validateUsernamePatch(rawPatch.username);
    if (validated.ok === false) return validated;
    patch.username = validated.value;
  }
  if ('notes' in rawPatch) {
    const validated = validatePatchText(rawPatch.notes, 'notes', NOTES_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.notes = validated.value;
  }
  if ('supportNote' in rawPatch) {
    const validated = validatePatchText(rawPatch.supportNote, 'supportNote', SUPPORT_NOTE_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.supportNote = validated.value;
  }
  if ('accountRecoveryStatus' in rawPatch) {
    const validated = validateEnumValue(rawPatch.accountRecoveryStatus, 'accountRecoveryStatus', VALID_ACCOUNT_RECOVERY_STATUSES);
    if (validated.ok === false) return validated;
    patch.accountRecoveryStatus = validated.value;
    if (patch.accountRecoveryStatus === 'requested') {
      patch.lastRecoveryRequestAt = nowIso();
      if (!('passwordResetRequired' in rawPatch)) patch.passwordResetRequired = true;
    } else if (!('passwordResetRequired' in rawPatch)) {
      patch.passwordResetRequired = false;
    }
  }
  if ('passwordResetRequired' in rawPatch) {
    const validated = validateBooleanPatch(rawPatch.passwordResetRequired, 'passwordResetRequired');
    if (validated.ok === false) return validated;
    patch.passwordResetRequired = validated.value;
    if (patch.passwordResetRequired && !patch.accountRecoveryStatus) {
      patch.accountRecoveryStatus = 'requested';
      patch.lastRecoveryRequestAt = nowIso();
    }
  }
  if ('billingStatus' in rawPatch) {
    const validated = validateEnumValue(rawPatch.billingStatus, 'billingStatus', VALID_BILLING_STATUSES);
    if (validated.ok === false) return validated;
    patch.billingStatus = validated.value;
    if (validated.value === 'past_due' && !patch.status) patch.status = 'past_due';
    if ((validated.value === 'active' || validated.value === 'trialing') && !('paymentActionRequired' in rawPatch)) {
      patch.paymentActionRequired = false;
    }
  }
  if ('billingProvider' in rawPatch) {
    const validated = validateEnumValue(rawPatch.billingProvider, 'billingProvider', VALID_BILLING_PROVIDERS);
    if (validated.ok === false) return validated;
    patch.billingProvider = validated.value;
  }
  if ('billingMarket' in rawPatch) {
    const validated = validateEnumValue(rawPatch.billingMarket, 'billingMarket', VALID_BILLING_MARKETS);
    if (validated.ok === false) return validated;
    patch.billingMarket = validated.value;
  }
  if ('paymentActionRequired' in rawPatch) {
    const validated = validateBooleanPatch(rawPatch.paymentActionRequired, 'paymentActionRequired');
    if (validated.ok === false) return validated;
    patch.paymentActionRequired = validated.value;
  }

  normalizePlanBillingPatch(patch);
  if (Object.keys(patch).length === 0) return { ok: false, error: 'patch is empty' };
  return { ok: true, userId, patch };
}

function validateFeatureFlagPatch(body: any): { ok: true; key: string; patch: FeatureFlagPatch } | ValidationError {
  const key = normalizeFeatureFlagKey(body?.key);
  if (!key) return { ok: false, error: 'key is required' };
  if (!VALID_FEATURE_FLAG_KEYS.has(key)) {
    return {
      ok: false,
      error: 'feature flag key is unknown',
      details: `Allowed values: ${Array.from(VALID_FEATURE_FLAG_KEYS).join(', ')}`,
    };
  }
  const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch as Record<string, unknown> : {};
  const patch: FeatureFlagPatch = {};
  if ('status' in rawPatch) {
    const validated = validateEnumValue(rawPatch.status, 'status', VALID_FEATURE_FLAG_STATUSES);
    if (validated.ok === false) return validated;
    patch.status = validated.value;
  }
  if ('message' in rawPatch) {
    const validated = validatePatchText(rawPatch.message, 'message', 240);
    if (validated.ok === false) return validated;
    patch.message = validated.value;
  }
  if ('surfaces' in rawPatch) {
    const rawSurfaces = Array.isArray(rawPatch.surfaces)
      ? rawPatch.surfaces
      : typeof rawPatch.surfaces === 'string'
        ? rawPatch.surfaces.split(/[\n,;]+/)
        : [];
    if (!rawSurfaces.length) {
      return { ok: false, error: 'surfaces must include at least one surface' };
    }
    const surfaces: FeatureSurface[] = [];
    for (const rawSurface of rawSurfaces) {
      const validated = validateEnumValue(rawSurface, 'surface', VALID_FEATURE_FLAG_SURFACES);
      if (validated.ok === false) return validated;
      if (!surfaces.includes(validated.value)) surfaces.push(validated.value);
    }
    patch.surfaces = surfaces.slice(0, 5);
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'patch is empty' };
  return { ok: true, key, patch };
}

function validatePlanPatch(body: any): { ok: true; planCode: PlanCode; patch: PlanPatch } | ValidationError {
  const planCodeRaw = normalizeText(body?.planCode || body?.code).toLowerCase();
  const codeValidation = validateEnumValue(planCodeRaw, 'planCode', VALID_PLAN_CODES);
  if (codeValidation.ok === false) return codeValidation;
  const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
  const patch: PlanPatch = {};

  if ('name' in rawPatch) {
    const validated = validatePatchText(rawPatch.name, 'name', PLAN_NAME_MAX_LENGTH, { required: true });
    if (validated.ok === false) return validated;
    patch.name = validated.value;
  }
  if ('description' in rawPatch) {
    const validated = validatePatchText(rawPatch.description, 'description', PLAN_DESCRIPTION_MAX_LENGTH, { required: true });
    if (validated.ok === false) return validated;
    patch.description = validated.value;
  }
  if ('priceMonthlyUsd' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.priceMonthlyUsd, 'priceMonthlyUsd', { min: 0, max: 10000 });
    if (validated.ok === false) return validated;
    patch.priceMonthlyUsd = validated.value;
  }
  if ('aiDailyLimit' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.aiDailyLimit, 'aiDailyLimit', { min: 0, max: 100000, integer: true });
    if (validated.ok === false) return validated;
    patch.aiDailyLimit = validated.value;
  }
  if ('deepDailyLimit' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.deepDailyLimit, 'deepDailyLimit', { min: 0, max: 100000, integer: true });
    if (validated.ok === false) return validated;
    patch.deepDailyLimit = validated.value;
  }
  if ('scannerDailyLimit' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.scannerDailyLimit, 'scannerDailyLimit', { min: 0, max: 100000, integer: true });
    if (validated.ok === false) return validated;
    patch.scannerDailyLimit = validated.value;
  }
  if ('storageMb' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.storageMb, 'storageMb', { min: 0, max: 1048576, integer: true });
    if (validated.ok === false) return validated;
    patch.storageMb = validated.value;
  }
  if ('seats' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.seats, 'seats', { min: 1, max: 10000, integer: true });
    if (validated.ok === false) return validated;
    patch.seats = validated.value;
  }
  if ('supportSlaHours' in rawPatch) {
    const validated = validateNumberPatch(rawPatch.supportSlaHours, 'supportSlaHours', { min: 1, max: 720, integer: true });
    if (validated.ok === false) return validated;
    patch.supportSlaHours = validated.value;
  }
  if ('features' in rawPatch) {
    const validated = validateStringListPatch(rawPatch.features, 'features', { maxItems: 24, maxItemLength: PLAN_LIST_ITEM_MAX_LENGTH });
    if (validated.ok === false) return validated;
    patch.features = validated.value;
  }
  if ('recommended' in rawPatch) {
    const validated = validateBooleanPatch(rawPatch.recommended, 'recommended');
    if (validated.ok === false) return validated;
    patch.recommended = validated.value;
  }
  if ('billingProvider' in rawPatch) {
    const validated = validateEnumValue(rawPatch.billingProvider, 'billingProvider', VALID_BILLING_PROVIDERS);
    if (validated.ok === false) return validated;
    patch.billingProvider = validated.value;
  }
  if ('billingProductId' in rawPatch) {
    const validated = validatePatchText(rawPatch.billingProductId, 'billingProductId', PLAN_EXTERNAL_ID_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.billingProductId = validated.value;
  }
  if ('billingPriceId' in rawPatch) {
    const validated = validatePatchText(rawPatch.billingPriceId, 'billingPriceId', PLAN_EXTERNAL_ID_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.billingPriceId = validated.value;
  }
  if ('revenuecatEntitlementId' in rawPatch) {
    const validated = validatePatchText(rawPatch.revenuecatEntitlementId, 'revenuecatEntitlementId', PLAN_EXTERNAL_ID_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.revenuecatEntitlementId = validated.value;
  }
  if ('market' in rawPatch) {
    const validated = validateEnumValue(rawPatch.market, 'market', VALID_BILLING_MARKETS);
    if (validated.ok === false) return validated;
    patch.market = validated.value;
  }
  if ('displayPrice' in rawPatch) {
    const validated = validatePatchText(rawPatch.displayPrice, 'displayPrice', PLAN_DISPLAY_PRICE_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.displayPrice = validated.value;
  }
  if ('checkoutMode' in rawPatch) {
    const validated = validateEnumValue(rawPatch.checkoutMode, 'checkoutMode', VALID_CHECKOUT_MODES);
    if (validated.ok === false) return validated;
    patch.checkoutMode = validated.value;
  }
  if ('paymentMethods' in rawPatch) {
    const validated = validateStringListPatch(rawPatch.paymentMethods, 'paymentMethods', { maxItems: 12, maxItemLength: PLAN_LIST_ITEM_MAX_LENGTH });
    if (validated.ok === false) return validated;
    patch.paymentMethods = validated.value;
  }
  if ('operatorNote' in rawPatch) {
    const validated = validatePatchText(rawPatch.operatorNote, 'operatorNote', PLAN_OPERATOR_NOTE_MAX_LENGTH);
    if (validated.ok === false) return validated;
    patch.operatorNote = validated.value;
  }

  if (Object.keys(patch).filter((key) => key !== 'operatorNote').length === 0) return { ok: false, error: 'patch is empty' };
  return { ok: true, planCode: codeValidation.value, patch };
}

function validateCatalogRequestPatch(body: any): { ok: true; patch: CatalogRequestPatch } | ValidationError {
  const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
  const kindValidation = validateEnumValue(rawPatch.kind, 'kind', VALID_CATALOG_KINDS);
  if (kindValidation.ok === false) return kindValidation;
  const titleValidation = validatePatchText(rawPatch.title, 'title', CATALOG_TITLE_MAX_LENGTH, { required: true });
  if (titleValidation.ok === false) return titleValidation;
  const noteValidation = validatePatchText(rawPatch.operatorNote, 'operatorNote', CATALOG_OPERATOR_NOTE_MAX_LENGTH, { required: true });
  if (noteValidation.ok === false) return noteValidation;
  const entityIdValidation = 'entityId' in rawPatch
    ? validatePatchText(rawPatch.entityId, 'entityId', CATALOG_ENTITY_ID_MAX_LENGTH)
    : { ok: true as const, value: '' };
  if (entityIdValidation.ok === false) return entityIdValidation;
  const sourceUrlValidation = 'sourceUrl' in rawPatch
    ? validatePatchText(rawPatch.sourceUrl, 'sourceUrl', CATALOG_SOURCE_URL_MAX_LENGTH)
    : { ok: true as const, value: '' };
  if (sourceUrlValidation.ok === false) return sourceUrlValidation;
  if (!rawPatch.payload || typeof rawPatch.payload !== 'object' || Array.isArray(rawPatch.payload)) {
    return { ok: false, error: 'payload must be an object' };
  }
  const payloadJson = JSON.stringify(rawPatch.payload);
  if (payloadJson.length > CATALOG_PAYLOAD_MAX_LENGTH) {
    return {
      ok: false,
      error: 'payload is too large',
      details: `payload must be ${CATALOG_PAYLOAD_MAX_LENGTH} characters or fewer.`,
    };
  }
  return {
    ok: true,
    patch: {
      kind: kindValidation.value,
      title: titleValidation.value,
      entityId: entityIdValidation.value,
      sourceUrl: sourceUrlValidation.value,
      payload: rawPatch.payload,
      operatorNote: noteValidation.value,
    },
  };
}

function featureFlagPatchRequiresMessage(patch: FeatureFlagPatch): boolean {
  return patch.status === 'maintenance' || patch.status === 'disabled';
}

function hasFeatureFlagMessage(value: unknown): boolean {
  return typeof value === 'string' && value.replace(/\s+/g, ' ').trim().length >= 12;
}

function featureFlagPatchHasMessage(patch: FeatureFlagPatch): boolean {
  return hasFeatureFlagMessage(patch.message);
}

function featureFlagPatchSeverity(patch: FeatureFlagPatch): AdminAuditEvent['severity'] {
  if (patch.status === 'disabled') return 'critical';
  if (patch.status === 'maintenance') return 'warning';
  return 'info';
}

function featureFlagPatchAuditDetail(prefix: string, patch: FeatureFlagPatch): string {
  const keys = Object.keys(patch).join(', ');
  const messagePreview = typeof patch.message === 'string'
    ? patch.message.replace(/\s+/g, ' ').trim().slice(0, 160)
    : '';
  return messagePreview ? `${prefix}: ${keys}. Message: ${messagePreview}` : `${prefix}: ${keys}`;
}

function planPatchHasOperatorReason(patch: PlanPatch): boolean {
  return typeof patch.operatorNote === 'string' && patch.operatorNote.replace(/\s+/g, ' ').trim().length >= 12;
}

function planWritePatch(patch: PlanPatch): Omit<PlanPatch, 'operatorNote'> {
  const { operatorNote: _operatorNote, ...writePatch } = patch;
  return writePatch;
}

function planPatchSeverity(patch: PlanPatch): AdminAuditEvent['severity'] {
  if (
    typeof patch.priceMonthlyUsd === 'number'
    || patch.billingProvider
    || patch.billingProductId
    || patch.billingPriceId
    || patch.revenuecatEntitlementId
    || patch.checkoutMode
    || patch.market
  ) {
    return 'warning';
  }
  return 'info';
}

function planPatchAuditDetail(prefix: string, planCode: PlanCode, patch: PlanPatch): string {
  const keys = Object.keys(patch).filter((key) => key !== 'operatorNote').join(', ');
  const notePreview = typeof patch.operatorNote === 'string'
    ? patch.operatorNote.replace(/\s+/g, ' ').trim().slice(0, 180)
    : '';
  return `${prefix} ${planCode}: ${keys}. Operator note: ${notePreview}`;
}

function catalogPatchHasOperatorReason(patch: CatalogRequestPatch): boolean {
  return patch.operatorNote.replace(/\s+/g, ' ').trim().length >= 12;
}

function catalogPatchAuditDetail(prefix: string, patch: CatalogRequestPatch): string {
  const notePreview = patch.operatorNote.replace(/\s+/g, ' ').trim().slice(0, 180);
  return `${prefix} ${patch.kind}: ${patch.title}. Operator note: ${notePreview}`;
}

function findUsernameConflict(users: AdminUserRecord[], userId: string, username: string): AdminUserRecord | null {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;
  return users.find((user) => user.id !== userId && user.username.trim().toLowerCase() === normalized) || null;
}

async function findCurrentUsernameConflict(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  userId: string,
  username: string,
): Promise<AdminUserRecord | null> {
  const snapshot = await buildAdminSnapshot(`admin_username_validate_${Date.now()}`, admin, rawUser);
  return findUsernameConflict(snapshot.users, userId, username);
}

function normalizePlanBillingPatch(patch: UserPatch): void {
  if (patch.planCode === 'free') {
    if (!patch.billingStatus) patch.billingStatus = 'none';
    if (!patch.billingProvider) patch.billingProvider = 'none';
    if (typeof patch.paymentActionRequired !== 'boolean') patch.paymentActionRequired = false;
    return;
  }
  if (patch.planCode) {
    if (!patch.billingStatus) patch.billingStatus = 'trialing';
    if (!patch.billingProvider || patch.billingProvider === 'none' || patch.billingProvider === 'admin') {
      patch.billingProvider = 'manual';
    }
    if (typeof patch.paymentActionRequired !== 'boolean') patch.paymentActionRequired = true;
    return;
  }
  if ((patch.billingStatus === 'active' || patch.billingStatus === 'trialing') && (!patch.billingProvider || patch.billingProvider === 'none' || patch.billingProvider === 'admin')) {
    patch.billingProvider = 'manual';
  }
  if (patch.billingStatus === 'past_due' && typeof patch.paymentActionRequired !== 'boolean') {
    patch.paymentActionRequired = true;
  }
}

function authorizeUserMutation(admin: AdminAccess, patch: UserPatch): AuthorizationError | null {
  if (admin.role === 'owner' || admin.role === 'admin') return null;
  if (admin.role === 'analyst') {
    return {
      ok: false,
      statusCode: 403,
      error: 'Analyst admins are read-only',
      errorCode: 'admin_role_forbidden',
    };
  }
  if (admin.role === 'support') {
    const allowedFields = new Set([
      'notes',
      'supportNote',
      'accountRecoveryStatus',
      'lastRecoveryRequestAt',
      'passwordResetRequired',
      'billingStatus',
      'billingProvider',
      'billingMarket',
      'paymentActionRequired',
    ]);
    const forbidden = Object.keys(patch).filter((key) => !allowedFields.has(key));
    if (forbidden.length > 0 || patch.billingStatus === 'active' || patch.billingStatus === 'trialing') {
      return {
        ok: false,
        statusCode: 403,
        error: 'Support admins can only manage recovery, notes, and billing attention states',
        errorCode: 'admin_role_forbidden',
        details: forbidden.length ? `Forbidden fields: ${forbidden.join(', ')}` : undefined,
      };
    }
    return null;
  }
  return {
    ok: false,
    statusCode: 403,
    error: 'This admin role cannot mutate account management',
    errorCode: 'admin_role_forbidden',
  };
}

async function authorizeUserTargetMutation(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  userId: string,
  patch: UserPatch,
): Promise<AuthorizationError | null> {
  const snapshot = await buildAdminSnapshot(`admin_target_authorize_${Date.now()}`, admin, rawUser);
  const target = snapshot.users.find((user) => user.id === userId);
  if (!target) return null;
  const adminWeight = ADMIN_ROLE_WEIGHT[admin.role] || 0;
  const targetWeight = ADMIN_ROLE_WEIGHT[target.role] || 0;
  const nextRoleWeight = patch.role ? ADMIN_ROLE_WEIGHT[patch.role] || 0 : targetWeight;

  if (target.role === 'owner' && admin.role !== 'owner') {
    return {
      ok: false,
      statusCode: 403,
      error: 'Only owners can change owner accounts',
      errorCode: 'admin_role_forbidden',
      details: `Target role: ${target.role}`,
    };
  }
  if (patch.role === 'owner' && admin.role !== 'owner') {
    return {
      ok: false,
      statusCode: 403,
      error: 'Only owners can grant owner access',
      errorCode: 'admin_role_forbidden',
      details: `Requested role: ${patch.role}`,
    };
  }
  if (admin.role !== 'owner' && nextRoleWeight >= adminWeight && patch.role && patch.role !== target.role) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Admins cannot grant equal or higher admin roles',
      errorCode: 'admin_role_forbidden',
      details: `Requested role: ${patch.role}`,
    };
  }
  if (admin.role !== 'owner' && targetWeight > adminWeight) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Admins cannot mutate accounts with a higher role',
      errorCode: 'admin_role_forbidden',
      details: `Target role: ${target.role}`,
    };
  }
  return null;
}

function authorizeFeatureFlagMutation(admin: AdminAccess): AuthorizationError | null {
  if (admin.role === 'owner' || admin.role === 'admin') return null;
  return {
    ok: false,
    statusCode: 403,
    error: 'Only owner and admin roles can change platform feature controls',
    errorCode: 'admin_role_forbidden',
  };
}

function authorizePlanMutation(admin: AdminAccess): AuthorizationError | null {
  if (admin.role === 'owner' || admin.role === 'admin') return null;
  return {
    ok: false,
    statusCode: 403,
    error: 'Only owner and admin roles can change plan catalog controls',
    errorCode: 'admin_role_forbidden',
  };
}

function authorizeCatalogMutation(admin: AdminAccess): AuthorizationError | null {
  if (admin.role === 'owner' || admin.role === 'admin' || admin.role === 'support') return null;
  return {
    ok: false,
    statusCode: 403,
    error: 'Only owner, admin, and support roles can queue catalog database changes',
    errorCode: 'admin_role_forbidden',
  };
}

function userPatchRequiresOperatorReason(patch: UserPatch): boolean {
  const activatesPaidBilling = patch.billingStatus === 'active' || patch.billingStatus === 'trialing';
  const changesPlan = Boolean(patch.planCode);
  return changesPlan
    || patch.status === 'suspended'
    || patch.status === 'deleted'
    || patch.role === 'owner'
    || activatesPaidBilling;
}

function userPatchHasOperatorReason(patch: UserPatch): boolean {
  return typeof patch.supportNote === 'string' && patch.supportNote.replace(/\s+/g, ' ').trim().length >= 12;
}

function userPatchSeverity(patch: UserPatch): AdminAuditEvent['severity'] {
  if (patch.status === 'deleted' || patch.role === 'owner') {
    return 'critical';
  }
  if (patch.status === 'suspended' || patch.passwordResetRequired) {
    return 'warning';
  }
  if (patch.billingStatus === 'past_due' || patch.billingStatus === 'refunded' || patch.paymentActionRequired) {
    return 'warning';
  }
  return 'info';
}

function userPatchAuditDetail(prefix: string, patch: UserPatch): string {
  const keys = Object.keys(patch).join(', ');
  const notePreview = typeof patch.supportNote === 'string'
    ? patch.supportNote.replace(/\s+/g, ' ').trim().slice(0, 160)
    : '';
  return notePreview ? `${prefix}: ${keys}. Support note: ${notePreview}` : `${prefix}: ${keys}`;
}

function auditRuntimeMutation(admin: AdminAccess, userId: string, patch: UserPatch): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: userId,
    action: 'user_updated',
    createdAt: nowIso(),
    detail: userPatchAuditDetail('Runtime user patch', patch),
    severity: userPatchSeverity(patch),
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

function auditRuntimeFeatureFlagMutation(admin: AdminAccess, key: string, patch: FeatureFlagPatch): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_flag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: key,
    action: 'feature_flag_updated',
    createdAt: nowIso(),
    detail: featureFlagPatchAuditDetail('Runtime feature flag patch', patch),
    severity: featureFlagPatchSeverity(patch),
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

function auditRuntimePlanMutation(admin: AdminAccess, planCode: PlanCode, patch: PlanPatch): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: planCode,
    action: 'plan_updated',
    createdAt: nowIso(),
    detail: planPatchAuditDetail('Runtime plan patch', planCode, patch),
    severity: planPatchSeverity(patch),
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

function auditRuntimeCatalogMutation(admin: AdminAccess, request: AdminCatalogRequest, patch: CatalogRequestPatch): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_catalog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: request.id,
    action: 'catalog_request_created',
    createdAt: nowIso(),
    detail: catalogPatchAuditDetail('Runtime catalog request', patch),
    severity: 'info',
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

function auditRuntimeManualPayment(admin: AdminAccess, request: ManualPaymentRequest, action: ManualPaymentAction, reason?: string): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_manual_payment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: request.id,
    action: `manual_payment_${action}`,
    createdAt: nowIso(),
    detail: `Manual payment ${request.id} for ${request.planCode} is ${request.status}${reason ? `: ${reason}` : ''}`,
    severity: action === 'rejected' || action === 'expired' ? 'warning' : 'info',
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

async function patchSupabaseUser(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  userId: string,
  patch: UserPatch,
): Promise<void> {
  const body: Record<string, unknown> = {
    updated_at: nowIso(),
  };
  if (patch.role) body.role = patch.role;
  if (patch.status) body.status = patch.status;
  if (patch.planCode) body.plan_code = patch.planCode;
  if (patch.displayName) body.display_name = patch.displayName;
  if (patch.username) body.username = patch.username;
  if (typeof patch.notes === 'string') body.notes = patch.notes;
  if (typeof patch.supportNote === 'string') body.support_note = patch.supportNote;
  if (patch.accountRecoveryStatus) body.account_recovery_status = patch.accountRecoveryStatus;
  if (typeof patch.passwordResetRequired === 'boolean') body.password_reset_required = patch.passwordResetRequired;
  if (patch.lastRecoveryRequestAt) body.last_recovery_request_at = patch.lastRecoveryRequestAt;
  if (patch.billingStatus) {
    body.billing_status = patch.billingStatus;
    body.billing_last_event_at = nowIso();
  }
  if (patch.billingProvider) body.billing_provider = patch.billingProvider;
  if (patch.billingMarket) body.billing_market = patch.billingMarket;
  if (typeof patch.paymentActionRequired === 'boolean') body.payment_action_required = patch.paymentActionRequired;

  await supabaseRest(config, `app_users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });

  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'user',
      target_id: userId,
      action: 'user_updated',
      detail: userPatchAuditDetail('Updated', patch),
      after: patch,
      severity: userPatchSeverity(patch),
    }]),
  });
}

async function patchSupabaseFeatureFlag(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  key: string,
  patch: FeatureFlagPatch,
): Promise<void> {
  const existing = buildRuntimeFeatureFlags().find((flag) => flag.key === key);
  const body: Record<string, unknown> = {
    key,
    label: existing?.label || key.replace(/[_:-]+/g, ' '),
    updated_at: nowIso(),
  };
  if (patch.status) body.status = patch.status;
  if (typeof patch.message === 'string') body.message = patch.message;
  if (patch.surfaces?.length) body.surfaces = patch.surfaces;

  await supabaseRest(config, 'app_feature_flags?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([body]),
  });

  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'feature_flag',
      target_id: key,
      action: 'feature_flag_updated',
      detail: featureFlagPatchAuditDetail('Updated', patch),
      after: patch,
      severity: featureFlagPatchSeverity(patch),
    }]),
  });
}

function planToSupabaseRow(planCode: PlanCode, patch: PlanPatch): Record<string, unknown> {
  const base = runtimePlanBlueprints().find((plan) => plan.code === planCode) || PLAN_BLUEPRINTS[0];
  const merged = {
    ...base,
    ...planWritePatch(patch),
  };
  return {
    code: planCode,
    name: merged.name,
    description: merged.description,
    price_monthly_usd: merged.priceMonthlyUsd,
    ai_daily_limit: merged.aiDailyLimit,
    deep_daily_limit: merged.deepDailyLimit,
    scanner_daily_limit: merged.scannerDailyLimit,
    storage_mb: merged.storageMb,
    seats: merged.seats,
    support_sla_hours: merged.supportSlaHours,
    features: merged.features,
    recommended: Boolean(merged.recommended),
    billing_provider: merged.billingProvider,
    billing_product_id: merged.billingProductId,
    billing_price_id: merged.billingPriceId,
    revenuecat_entitlement_id: merged.revenuecatEntitlementId,
    market: merged.market,
    display_price: merged.displayPrice,
    checkout_mode: merged.checkoutMode,
    payment_methods: merged.paymentMethods,
    updated_at: nowIso(),
  };
}

async function patchSupabasePlan(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  planCode: PlanCode,
  patch: PlanPatch,
): Promise<void> {
  if (patch.recommended === true) {
    await supabaseRest(config, `app_plans?code=neq.${encodeURIComponent(planCode)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ recommended: false, updated_at: nowIso() }),
    });
  }

  await supabaseRest(config, 'app_plans?on_conflict=code', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([planToSupabaseRow(planCode, patch)]),
  });

  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'plan',
      target_id: planCode,
      action: 'plan_updated',
      detail: planPatchAuditDetail('Updated', planCode, patch),
      after: planWritePatch(patch),
      severity: planPatchSeverity(patch),
    }]),
  });
}

async function insertSupabaseCatalogRequest(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  patch: CatalogRequestPatch,
): Promise<void> {
  const payload = {
    ...patch.payload,
    title: patch.title,
    sourceUrl: patch.sourceUrl || '',
    operatorNote: patch.operatorNote,
    requestedBy: admin.email || admin.userId || 'admin',
  };

  await supabaseRest(config, 'catalog_review_queue', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      kind: patch.kind,
      entity_id: patch.entityId || '',
      payload,
      review_status: patch.sourceUrl ? 'queued' : 'needs_source',
    }]),
  });

  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'catalog',
      target_id: patch.entityId || patch.title,
      action: 'catalog_request_created',
      detail: catalogPatchAuditDetail('Created', patch),
      after: payload,
      severity: 'info',
    }]),
  });
}

async function updateUser(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  userId: string,
  patch: UserPatch,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_update_${Date.now()}`;
  if (config.configured) {
    try {
      await patchSupabaseUser(config, admin, userId, patch);
      return buildAdminSnapshot(requestId, admin, rawUser);
    } catch (error) {
      const details = sanitizeErrorDetails(error, 180);
      RUNTIME_AUDIT.unshift({
        id: `runtime_supabase_failure_${Date.now()}`,
        actor: admin.email || admin.userId || 'admin',
        target: userId,
        action: 'supabase_update_failed',
        createdAt: nowIso(),
        detail: details,
        severity: 'critical',
      });
      if (!runtimeMutationFallbackEnabled()) {
        throw new AdminMutationError('Supabase user update failed; no runtime fallback write was applied', {
          statusCode: 503,
          errorCode: 'supabase_update_failed',
          details,
        });
      }
    }
  }

  const previous = RUNTIME_USER_PATCHES.get(userId) || {};
  RUNTIME_USER_PATCHES.set(userId, { ...previous, ...patch });
  auditRuntimeMutation(admin, userId, patch);
  return buildAdminSnapshot(requestId, admin, rawUser);
}

async function updateFeatureFlag(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  key: string,
  patch: FeatureFlagPatch,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_flag_${Date.now()}`;
  const currentFlags = config.configured
    ? await loadSupabaseFeatureFlags(config).catch(() => buildRuntimeFeatureFlags())
    : buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
  const currentFlag = currentFlags.find((flag) => flag.key === key);
  const nextStatus = patch.status || currentFlag?.status || 'available';
  const nextMessage = typeof patch.message === 'string' ? patch.message : currentFlag?.message || '';
  if (nextStatus !== 'available' && !hasFeatureFlagMessage(nextMessage)) {
    throw new AdminMutationError('Maintenance and disabled feature flags require an operator message', {
      statusCode: 400,
      errorCode: 'feature_flag_message_required',
    });
  }
  if (config.configured) {
    try {
      await patchSupabaseFeatureFlag(config, admin, key, patch);
      return buildAdminSnapshot(requestId, admin, rawUser);
    } catch (error) {
      const details = sanitizeErrorDetails(error, 180);
      RUNTIME_AUDIT.unshift({
        id: `runtime_supabase_flag_failure_${Date.now()}`,
        actor: admin.email || admin.userId || 'admin',
        target: key,
        action: 'supabase_feature_flag_update_failed',
        createdAt: nowIso(),
        detail: details,
        severity: 'critical',
      });
      if (!runtimeMutationFallbackEnabled()) {
        throw new AdminMutationError('Supabase feature flag update failed; no runtime fallback write was applied', {
          statusCode: 503,
          errorCode: 'supabase_update_failed',
          details,
        });
      }
    }
  }

  const previous = RUNTIME_FEATURE_FLAG_PATCHES.get(key) || {};
  RUNTIME_FEATURE_FLAG_PATCHES.set(key, { ...previous, ...patch });
  auditRuntimeFeatureFlagMutation(admin, key, patch);
  return buildAdminSnapshot(requestId, admin, rawUser);
}

async function updatePlan(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  planCode: PlanCode,
  patch: PlanPatch,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_plan_${Date.now()}`;
  if (config.configured) {
    try {
      await patchSupabasePlan(config, admin, planCode, patch);
      return buildAdminSnapshot(requestId, admin, rawUser);
    } catch (error) {
      const details = sanitizeErrorDetails(error, 180);
      RUNTIME_AUDIT.unshift({
        id: `runtime_supabase_plan_failure_${Date.now()}`,
        actor: admin.email || admin.userId || 'admin',
        target: planCode,
        action: 'supabase_plan_update_failed',
        createdAt: nowIso(),
        detail: details,
        severity: 'critical',
      });
      if (!runtimeMutationFallbackEnabled()) {
        throw new AdminMutationError('Supabase plan update failed; no runtime fallback write was applied', {
          statusCode: 503,
          errorCode: 'supabase_update_failed',
          details,
        });
      }
    }
  }

  const writePatch = planWritePatch(patch);
  if (writePatch.recommended === true) {
    for (const code of VALID_PLAN_CODES) {
      if (code !== planCode) {
        const previous = RUNTIME_PLAN_PATCHES.get(code) || {};
        RUNTIME_PLAN_PATCHES.set(code, { ...previous, recommended: false });
      }
    }
  }
  const previous = RUNTIME_PLAN_PATCHES.get(planCode) || {};
  RUNTIME_PLAN_PATCHES.set(planCode, { ...previous, ...writePatch });
  auditRuntimePlanMutation(admin, planCode, patch);
  return buildAdminSnapshot(requestId, admin, rawUser);
}

function normalizeManualPaymentAction(value: unknown): ManualPaymentAction | '' {
  const raw = normalizeText(value).toLowerCase();
  if (
    raw === 'receipt_received'
    || raw === 'verified_paid'
    || raw === 'rejected'
    || raw === 'expired'
    || raw === 'downgrade_free'
  ) {
    return raw;
  }
  return '';
}

async function upsertSupabaseManualEntitlement(
  config: Extract<SupabaseConfig, { configured: true }>,
  request: ManualPaymentRequest,
  status: 'active' | 'expired',
): Promise<void> {
  const existing = await supabaseRest<Array<{ id: string }>>(
    config,
    `user_entitlements?external_subscription_id=eq.${encodeURIComponent(request.id)}&source=eq.manual&select=id&limit=1`,
  );
  const body = {
    user_id: request.userId,
    plan_code: request.planCode,
    source: 'manual',
    status,
    current_period_start: status === 'active' ? nowIso() : null,
    current_period_end: null,
    external_customer_id: request.userId,
    external_subscription_id: request.id,
    metadata: {
      manualRequestId: request.id,
      amount: request.amount,
      amountLabel: request.amountLabel,
      currency: request.currency,
      duration: request.duration,
      proof: request.proof || null,
      reason: request.reason || null,
    },
  };
  if (existing?.[0]?.id) {
    await supabaseRest(config, `user_entitlements?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        ...body,
        updated_at: nowIso(),
      }),
    });
    return;
  }
  await supabaseRest(config, 'user_entitlements', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([body]),
  });
}

async function insertSupabaseManualPaymentAudit(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  request: ManualPaymentRequest,
  action: ManualPaymentAction,
  reason?: string,
): Promise<void> {
  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'payment_receipt',
      target_id: request.id,
      action: `manual_payment_${action}`,
      detail: `Manual payment ${request.id} for ${request.planCode} is ${request.status}${reason ? `: ${reason}` : ''}`,
      after: {
        status: request.status,
        reason: reason || null,
      },
      severity: action === 'rejected' || action === 'expired' ? 'warning' : 'info',
    }]),
  });
}

async function updateManualPayment(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  paymentRequestId: string,
  manualAction: ManualPaymentAction,
  reason?: string,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_manual_payment_${Date.now()}`;
  const request = config.configured
    ? await updatePersistedManualPaymentStatus(
        paymentRequestId,
        manualAction,
        reason,
        admin.email || admin.userId || 'admin',
      ).catch((error) => {
        throw new AdminMutationError('Manual payment storage update failed', {
          statusCode: 503,
          errorCode: 'manual_payment_storage_unavailable',
          details: sanitizeErrorDetails(error, 180),
        });
      })
    : updateManualPaymentStatus(paymentRequestId, manualAction, reason);
  if (!request) {
    throw new AdminMutationError('Manual payment request was not found', {
      statusCode: 404,
      errorCode: 'manual_payment_not_found',
    });
  }

  auditRuntimeManualPayment(admin, request, manualAction, reason);
  if (config.configured) {
    await insertSupabaseManualPaymentAudit(config, admin, request, manualAction, reason).catch((error) => {
      console.error('Failed to write manual payment audit event:', error);
    });
  }

  if (manualAction === 'verified_paid') {
    const patch: UserPatch = {
      planCode: request.planCode as PlanCode,
      status: 'active',
      billingStatus: 'active',
      billingProvider: 'manual',
      billingMarket: 'global',
      paymentActionRequired: false,
      supportNote: `Manual payment verified: ${request.id}`,
    };
    if (config.configured) {
      try {
        await patchSupabaseUser(config, admin, request.userId, patch);
        await upsertSupabaseManualEntitlement(config, request, 'active');
      } catch (error) {
        throw new AdminMutationError('Failed to grant manual payment entitlement', {
          statusCode: 503,
          errorCode: 'manual_entitlement_sync_failed',
          details: sanitizeErrorDetails(error, 180),
        });
      }
    }
    const previous = RUNTIME_USER_PATCHES.get(request.userId) || {};
    RUNTIME_USER_PATCHES.set(request.userId, { ...previous, ...patch });
    auditRuntimeMutation(admin, request.userId, patch);
  }

  if (manualAction === 'downgrade_free') {
    const patch: UserPatch = {
      planCode: 'free',
      status: 'active',
      billingStatus: 'none',
      billingProvider: 'none',
      billingMarket: 'global',
      paymentActionRequired: false,
      supportNote: `Downgraded after manual payment review: ${request.id}`,
    };
    if (config.configured) {
      try {
        await patchSupabaseUser(config, admin, request.userId, patch);
        await upsertSupabaseManualEntitlement(config, request, 'expired');
      } catch (error) {
        throw new AdminMutationError('Failed to downgrade manual payment entitlement', {
          statusCode: 503,
          errorCode: 'manual_entitlement_sync_failed',
          details: sanitizeErrorDetails(error, 180),
        });
      }
    }
    const previous = RUNTIME_USER_PATCHES.get(request.userId) || {};
    RUNTIME_USER_PATCHES.set(request.userId, { ...previous, ...patch });
    auditRuntimeMutation(admin, request.userId, patch);
  }

  return buildAdminSnapshot(requestId, admin, rawUser);
}

async function createCatalogRequest(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  patch: CatalogRequestPatch,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_catalog_${Date.now()}`;
  if (config.configured) {
    try {
      await insertSupabaseCatalogRequest(config, admin, patch);
      return buildAdminSnapshot(requestId, admin, rawUser);
    } catch (error) {
      const details = sanitizeErrorDetails(error, 180);
      RUNTIME_AUDIT.unshift({
        id: `runtime_supabase_catalog_failure_${Date.now()}`,
        actor: admin.email || admin.userId || 'admin',
        target: patch.entityId || patch.title,
        action: 'supabase_catalog_request_failed',
        createdAt: nowIso(),
        detail: details,
        severity: 'critical',
      });
      if (!runtimeMutationFallbackEnabled()) {
        throw new AdminMutationError('Supabase catalog request failed; no runtime fallback write was applied', {
          statusCode: 503,
          errorCode: 'supabase_update_failed',
          details,
        });
      }
    }
  }

  const request: AdminCatalogRequest = {
    id: `runtime_catalog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: patch.kind,
    entityId: patch.entityId || '',
    title: patch.title,
    reviewStatus: patch.sourceUrl ? 'queued' : 'needs_source',
    sourceUrl: patch.sourceUrl || '',
    operatorNote: patch.operatorNote,
    payloadPreview: catalogPayloadPreview(patch.payload),
    createdAt: nowIso(),
  };
  RUNTIME_CATALOG_REQUESTS.unshift(request);
  RUNTIME_CATALOG_REQUESTS.splice(30);
  auditRuntimeCatalogMutation(admin, request, patch);
  return buildAdminSnapshot(requestId, admin, rawUser);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, PATCH, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const access = requireAdmin(req);
  if (access.ok === false) {
    return res.status(access.statusCode).json({
      ok: false,
      requestId,
      error: access.error,
      errorCode: access.errorCode,
      hint: access.errorCode === 'admin_required'
        ? 'Set ADMIN_EMAILS or ADMIN_USER_IDS for the signed-in owner account.'
        : undefined,
    });
  }

  const limit = checkRateLimit(req, '/api/admin/management', access.auth.userId, ADMIN_RATE_LIMIT);
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
    if (req.method === 'GET') {
      const snapshot = await buildAdminSnapshot(requestId, access.admin, access.auth.user, parseAiUsageRangeQuery(req.query));
      return res.status(200).json(snapshot);
    }

    if (req.method === 'PATCH') {
      const action = normalizeText(req.body?.action);
      if (action !== 'update_user' && action !== 'update_feature_flag' && action !== 'update_plan' && action !== 'create_catalog_request' && action !== 'update_manual_payment') {
        return res.status(400).json({
          ok: false,
          requestId,
          error: 'Unsupported admin action',
          errorCode: 'validation_error',
        });
      }
      if (action === 'update_plan') {
        const validated = validatePlanPatch(req.body);
        if (validated.ok === false) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: validated.error,
            errorCode: 'validation_error',
            details: validated.details,
          });
        }
        const authorization = authorizePlanMutation(access.admin);
        if (authorization) {
          return res.status(authorization.statusCode).json({
            ok: false,
            requestId,
            error: authorization.error,
            errorCode: authorization.errorCode,
            details: authorization.details,
          });
        }
        if (!planPatchHasOperatorReason(validated.patch)) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: 'Plan catalog changes require an operator note',
            errorCode: 'operator_reason_required',
          });
        }
        const snapshot = await updatePlan(access.admin, access.auth.user, validated.planCode, validated.patch);
        return res.status(200).json({
          ...snapshot,
          requestId,
        });
      }
      if (action === 'create_catalog_request') {
        const validated = validateCatalogRequestPatch(req.body);
        if (validated.ok === false) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: validated.error,
            errorCode: 'validation_error',
            details: validated.details,
          });
        }
        const authorization = authorizeCatalogMutation(access.admin);
        if (authorization) {
          return res.status(authorization.statusCode).json({
            ok: false,
            requestId,
            error: authorization.error,
            errorCode: authorization.errorCode,
            details: authorization.details,
          });
        }
        if (!catalogPatchHasOperatorReason(validated.patch)) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: 'Catalog changes require an operator note',
            errorCode: 'operator_reason_required',
          });
        }
        const snapshot = await createCatalogRequest(access.admin, access.auth.user, validated.patch);
        return res.status(200).json({
          ...snapshot,
          requestId,
        });
      }
      if (action === 'update_manual_payment') {
        const paymentRequestId = normalizeText(req.body?.paymentRequestId);
        const manualAction = normalizeManualPaymentAction(req.body?.manualAction);
        const reason = normalizeText(req.body?.reason).slice(0, 240);
        if (!paymentRequestId || !manualAction) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: 'paymentRequestId and manualAction are required',
            errorCode: 'validation_error',
          });
        }
        if ((manualAction === 'rejected' || manualAction === 'downgrade_free') && reason.length < 3) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: 'Reject and downgrade actions require a reason',
            errorCode: 'operator_reason_required',
          });
        }
        const authorization = authorizeUserMutation(access.admin, {
          planCode: manualAction === 'verified_paid' || manualAction === 'downgrade_free' ? 'free' : undefined,
        });
        if (authorization) {
          return res.status(authorization.statusCode).json({
            ok: false,
            requestId,
            error: authorization.error,
            errorCode: authorization.errorCode,
            details: authorization.details,
          });
        }
        const snapshot = await updateManualPayment(access.admin, access.auth.user, paymentRequestId, manualAction, reason);
        return res.status(200).json({
          ...snapshot,
          requestId,
        });
      }
      if (action === 'update_feature_flag') {
        const validated = validateFeatureFlagPatch(req.body);
        if (validated.ok === false) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: validated.error,
            errorCode: 'validation_error',
            details: validated.details,
          });
        }
        if (featureFlagPatchRequiresMessage(validated.patch) && !featureFlagPatchHasMessage(validated.patch)) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: 'Maintenance and disabled feature flags require an operator message',
            errorCode: 'feature_flag_message_required',
          });
        }
        const authorization = authorizeFeatureFlagMutation(access.admin);
        if (authorization) {
          return res.status(authorization.statusCode).json({
            ok: false,
            requestId,
            error: authorization.error,
            errorCode: authorization.errorCode,
            details: authorization.details,
          });
        }
        const snapshot = await updateFeatureFlag(access.admin, access.auth.user, validated.key, validated.patch);
        return res.status(200).json({
          ...snapshot,
          requestId,
        });
      }
      const validated = validatePatch(req.body);
      if (validated.ok === false) {
        return res.status(400).json({
          ok: false,
          requestId,
          error: validated.error,
          errorCode: 'validation_error',
          details: validated.details,
        });
      }
      if (
        validated.userId === access.admin.userId
        && (
          (validated.patch.role && validated.patch.role !== access.admin.role)
          || validated.patch.status === 'suspended'
          || validated.patch.status === 'deleted'
        )
      ) {
        return res.status(400).json({
          ok: false,
          requestId,
          error: 'Refusing to lock out the signed-in admin account',
          errorCode: 'self_protection',
        });
      }
      const authorization = authorizeUserMutation(access.admin, validated.patch);
      if (authorization) {
        return res.status(authorization.statusCode).json({
          ok: false,
          requestId,
          error: authorization.error,
          errorCode: authorization.errorCode,
          details: authorization.details,
        });
      }
      const targetAuthorization = await authorizeUserTargetMutation(access.admin, access.auth.user, validated.userId, validated.patch);
      if (targetAuthorization) {
        return res.status(targetAuthorization.statusCode).json({
          ok: false,
          requestId,
          error: targetAuthorization.error,
          errorCode: targetAuthorization.errorCode,
          details: targetAuthorization.details,
        });
      }
      if (userPatchRequiresOperatorReason(validated.patch) && !userPatchHasOperatorReason(validated.patch)) {
        return res.status(400).json({
          ok: false,
          requestId,
          error: 'Critical account changes require an operator reason in supportNote',
          errorCode: 'operator_reason_required',
        });
      }
      if (validated.patch.username) {
        const conflict = await findCurrentUsernameConflict(access.admin, access.auth.user, validated.userId, validated.patch.username);
        if (conflict) {
          return res.status(409).json({
            ok: false,
            requestId,
            error: `Username @${validated.patch.username} is already assigned`,
            errorCode: 'username_conflict',
            details: `Conflicts with ${conflict.email || conflict.id}`,
          });
        }
      }
      const snapshot = await updateUser(access.admin, access.auth.user, validated.userId, validated.patch);
      return res.status(200).json({
        ...snapshot,
        requestId,
      });
    }

    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof AdminMutationError) {
      return res.status(error.statusCode).json({
        ok: false,
        requestId,
        error: error.message,
        errorCode: error.errorCode,
        details: error.details,
      });
    }
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Admin management failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
