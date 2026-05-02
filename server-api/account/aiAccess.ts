import type { AuthContext } from '../_shared.js';
import type { FeatureSurface } from '../admin/_featureFlags.js';
import { buildAccountStatus, type AccountStatusResponse, type PlanCode } from './status.js';

export type PaidAiFeature = 'chat' | 'scanner' | 'search' | 'brew';

export type PaidAiAccessResult =
  | { ok: true; snapshot: AccountStatusResponse }
  | {
      ok: false;
      statusCode: 401 | 402 | 403 | 503;
      error: string;
      errorCode: 'auth_required' | 'paid_plan_required' | 'account_blocked' | 'billing_attention_required' | 'account_status_unavailable';
      retryable: boolean;
      minimumPlan?: {
        code: PlanCode;
        name: string;
        displayPrice: string;
      };
    };

const PAID_PLAN_ORDER: PlanCode[] = ['starter', 'pro', 'team', 'enterprise'];
type MinimumPaidPlan = {
  code: PlanCode;
  name: string;
  displayPrice: string;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isGuestAuth(auth: AuthContext): boolean {
  const rawUser = auth.user || {};
  const provider = normalizeText(rawUser.provider).toLowerCase();
  return rawUser.isGuest === true || provider === 'guest' || auth.userId.startsWith('guest_');
}

function isPaidPlan(code: PlanCode): code is Exclude<PlanCode, 'free'> {
  return code !== 'free';
}

function minimumPaidPlan(snapshot: AccountStatusResponse): MinimumPaidPlan | undefined {
  const paidPlans = snapshot.plans.filter((plan) => plan.code !== 'free');
  const starter = paidPlans.find((plan) => plan.code === 'starter');
  const plan = starter || paidPlans.slice().sort((a, b) => {
    const aPrice = Number.isFinite(a.priceMonthlyUsd) && a.priceMonthlyUsd > 0 ? a.priceMonthlyUsd : Number.POSITIVE_INFINITY;
    const bPrice = Number.isFinite(b.priceMonthlyUsd) && b.priceMonthlyUsd > 0 ? b.priceMonthlyUsd : Number.POSITIVE_INFINITY;
    if (aPrice !== bPrice) return aPrice - bPrice;
    return PAID_PLAN_ORDER.indexOf(a.code) - PAID_PLAN_ORDER.indexOf(b.code);
  })[0];
  return plan ? { code: plan.code, name: plan.name, displayPrice: plan.displayPrice } : undefined;
}

export function featureSurfaceFromClientContext(rawClientContext: unknown): FeatureSurface {
  const context = rawClientContext && typeof rawClientContext === 'object' ? rawClientContext as Record<string, unknown> : {};
  const platform = normalizeText(context.platform).toLowerCase();
  if (platform === 'mobile') return 'mobile';
  if (platform === 'pwa') return 'pwa';
  return 'web';
}

export async function requirePaidAiAccess(params: {
  requestId: string;
  auth: AuthContext;
  rawClientContext?: unknown;
  feature: PaidAiFeature;
}): Promise<PaidAiAccessResult> {
  if (isGuestAuth(params.auth)) {
    return {
      ok: false,
      statusCode: 401,
      error: 'Sign in is required before using paid AI features.',
      errorCode: 'auth_required',
      retryable: false,
    };
  }

  let snapshot: AccountStatusResponse;
  try {
    snapshot = await buildAccountStatus(
      params.requestId,
      params.auth,
      featureSurfaceFromClientContext(params.rawClientContext),
    );
  } catch {
    return {
      ok: false,
      statusCode: 503,
      error: 'Account status is unavailable. Please retry after plan sync finishes.',
      errorCode: 'account_status_unavailable',
      retryable: true,
    };
  }

  if (snapshot.appAccess.status === 'blocked' || snapshot.user.status === 'suspended' || snapshot.user.status === 'deleted') {
    return {
      ok: false,
      statusCode: 403,
      error: snapshot.appAccess.message || 'Account access is blocked.',
      errorCode: 'account_blocked',
      retryable: false,
    };
  }

  if (!isPaidPlan(snapshot.user.planCode)) {
    const featureLabel = params.feature === 'search'
      ? 'AI Search'
      : params.feature === 'scanner'
        ? 'AI Scan'
        : params.feature === 'brew'
          ? 'AI Brew'
          : 'AI Chat';
    return {
      ok: false,
      statusCode: 402,
      error: `${featureLabel} requires the minimum paid plan.`,
      errorCode: 'paid_plan_required',
      retryable: false,
      minimumPlan: minimumPaidPlan(snapshot),
    };
  }

  if (snapshot.user.status === 'past_due' || snapshot.billing.status === 'past_due' || snapshot.billing.status === 'cancelled' || snapshot.billing.status === 'expired' || snapshot.billing.status === 'refunded') {
    return {
      ok: false,
      statusCode: 402,
      error: snapshot.billing.message || 'Billing needs attention before paid AI can continue.',
      errorCode: 'billing_attention_required',
      retryable: false,
      minimumPlan: minimumPaidPlan(snapshot),
    };
  }

  return { ok: true, snapshot };
}
