export type AdminRole = 'owner' | 'admin' | 'support' | 'analyst' | 'user';
export type AccountStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
export type AccountRecoveryStatus = 'none' | 'requested' | 'verified' | 'resolved' | 'rejected';
export type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
export type CheckStatus = 'pass' | 'warn' | 'fail';
export type DataMode = 'supabase' | 'runtime_fallback';
export type FeatureFlagStatus = 'available' | 'maintenance' | 'disabled';
export type FeatureSurface = 'global' | 'web' | 'pwa' | 'mobile' | 'admin';
export type BillingProvider = 'none' | 'admin' | 'google_play' | 'app_store' | 'stripe' | 'revenuecat' | 'manual';
export type BillingStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'refunded';
export type BillingMarket = 'indonesia' | 'brunei' | 'global' | 'unknown';
export type CheckoutMode = 'disabled' | 'external' | 'stripe_checkout' | 'play_billing' | 'app_store' | 'manual_invoice';
export type AdminCatalogKind = 'water' | 'dripper' | 'grinder';
export type AdminCatalogReviewStatus = 'queued' | 'approved' | 'published' | 'rejected' | 'needs_source';

export type AdminPlan = {
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

export type AdminCatalogRequest = {
  id: string;
  kind: AdminCatalogKind;
  entityId: string;
  title: string;
  reviewStatus: AdminCatalogReviewStatus;
  sourceUrl: string;
  operatorNote: string;
  payloadPreview: string;
  createdAt: string;
};

export type AdminUserBilling = {
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

export type AdminUserRecord = {
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

export type AdminAuditEvent = {
  id: string;
  actor: string;
  target: string;
  action: string;
  createdAt: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

export type AdminFeatureFlag = {
  key: string;
  label: string;
  status: FeatureFlagStatus;
  message: string;
  surfaces: FeatureSurface[];
  updatedAt: string;
};

export type AdminSystemCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  owner: 'Security' | 'Data' | 'Billing' | 'Operations' | 'Mobile' | 'AI' | 'Backend';
  detail: string;
  nextAction?: string;
};

export type LaunchChecklistItem = {
  id: string;
  label: string;
  status: CheckStatus;
  due: 'now' | 'this_week' | 'post_launch';
  owner: 'Admin' | 'Backend' | 'Mobile' | 'Growth' | 'Support';
  action: string;
};

export type AdminSnapshot = {
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
    source: 'claim' | 'email_allowlist' | 'user_id_allowlist' | 'none';
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
  };
  catalog: {
    ready: boolean;
    supportedKinds: AdminCatalogKind[];
    tables: string[];
    publishedCounts: Record<AdminCatalogKind, number>;
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
  recommendations: string[];
  warnings: string[];
  realtime: {
    strategy: 'polling';
    intervalSec: number;
    sequence: number;
  };
};

export type AdminUserPatch = Partial<{
  role: AdminRole;
  status: AccountStatus;
  planCode: PlanCode;
  displayName: string;
  username: string;
  notes: string;
  supportNote: string;
  accountRecoveryStatus: AccountRecoveryStatus;
  passwordResetRequired: boolean;
  billingStatus: BillingStatus;
  billingProvider: BillingProvider;
  billingMarket: BillingMarket;
  paymentActionRequired: boolean;
}>;

export type AdminFeatureFlagPatch = Partial<{
  status: FeatureFlagStatus;
  message: string;
  surfaces: FeatureSurface[];
}>;

export type AdminPlanPatch = Partial<{
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

export type AdminCatalogRequestPatch = {
  kind: AdminCatalogKind;
  title: string;
  entityId?: string;
  sourceUrl?: string;
  payload: Record<string, unknown>;
  operatorNote: string;
};

export class AdminApiError extends Error {
  status: number;
  errorCode?: string;
  details?: string;
  requestId?: string;

  constructor(message: string, params: { status: number; errorCode?: string; details?: string; requestId?: string }) {
    super(message);
    this.name = 'AdminApiError';
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

async function parseJson(response: Response): Promise<any> {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function adminRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    const payload = await parseJson(response);
    if (!response.ok || payload?.ok === false) {
      throw new AdminApiError(payload?.error || `Admin request failed with HTTP ${response.status}`, {
        status: response.status,
        errorCode: payload?.errorCode,
        details: payload?.details || payload?.hint,
        requestId: payload?.requestId || response.headers.get('x-request-id') || undefined,
      });
    }
    return payload as T;
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AdminApiError('Admin request timed out.', {
        status: 0,
        errorCode: 'timeout',
      });
    }
    throw new AdminApiError(error instanceof Error ? error.message : 'Admin network request failed.', {
      status: 0,
      errorCode: 'network_error',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>('/api/admin/management', { method: 'GET' }, 18_000);
}

export function updateAdminUser(userId: string, patch: AdminUserPatch): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>('/api/admin/management', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'update_user',
      userId,
      patch,
    }),
  }, 18_000);
}

export function updateFeatureFlag(key: string, patch: AdminFeatureFlagPatch): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>('/api/admin/management', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'update_feature_flag',
      key,
      patch,
    }),
  }, 18_000);
}

export function updateAdminPlan(planCode: PlanCode, patch: AdminPlanPatch): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>('/api/admin/management', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'update_plan',
      planCode,
      patch,
    }),
  }, 18_000);
}

export function createCatalogRequest(patch: AdminCatalogRequestPatch): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>('/api/admin/management', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'create_catalog_request',
      patch,
    }),
  }, 18_000);
}
