export type AccountStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
export type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
export type FeatureFlagStatus = 'available' | 'maintenance' | 'disabled';
export type FeatureSurface = 'global' | 'web' | 'pwa' | 'mobile' | 'admin';
export type DataMode = 'supabase' | 'runtime_fallback';
export type BillingProvider = 'none' | 'admin' | 'google_play' | 'app_store' | 'stripe' | 'revenuecat' | 'manual';
export type BillingStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'refunded';
export type BillingMarket = 'indonesia' | 'brunei' | 'global' | 'unknown';
export type CheckoutMode = 'disabled' | 'external' | 'stripe_checkout' | 'play_billing' | 'app_store' | 'manual_invoice';

export type AccountFeatureFlag = {
  key: string;
  label: string;
  status: FeatureFlagStatus;
  message: string;
  surfaces: FeatureSurface[];
  updatedAt: string;
};

export type AccountPlan = {
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

export type AccountBilling = {
  status: BillingStatus;
  provider: BillingProvider;
  market: BillingMarket;
  paymentAction: 'none' | 'checkout' | 'manage' | 'contact_support';
  paymentActionRequired: boolean;
  message: string;
  checkoutUrl?: string;
  manageUrl?: string;
};

export type AccountStatusSnapshot = {
  ok: true;
  requestId: string;
  generatedAt: string;
  dataMode: DataMode;
  user: {
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
  featureFlags: AccountFeatureFlag[];
  maintenance: AccountFeatureFlag[];
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

export class AccountStatusError extends Error {
  status: number;
  errorCode?: string;
  requestId?: string;

  constructor(message: string, params: { status: number; errorCode?: string; requestId?: string }) {
    super(message);
    this.name = 'AccountStatusError';
    this.status = params.status;
    this.errorCode = params.errorCode;
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

export async function fetchAccountStatus(surface: FeatureSurface, timeoutMs = 10_000): Promise<AccountStatusSnapshot> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const params = new URLSearchParams({ surface });
    const response = await fetch(`/api/account/status?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    const payload = await parseJson(response);
    if (!response.ok || payload?.ok === false) {
      throw new AccountStatusError(payload?.error || `Account status failed with HTTP ${response.status}`, {
        status: response.status,
        errorCode: payload?.errorCode,
        requestId: payload?.requestId || response.headers.get('x-request-id') || undefined,
      });
    }
    return payload as AccountStatusSnapshot;
  } catch (error) {
    if (error instanceof AccountStatusError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AccountStatusError('Account status timed out.', { status: 0, errorCode: 'timeout' });
    }
    throw new AccountStatusError(error instanceof Error ? error.message : 'Account status request failed.', {
      status: 0,
      errorCode: 'network_error',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
