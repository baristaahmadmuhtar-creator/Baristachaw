import { isEnvFlagEnabled, type AuthContext } from '../_shared.js';
import { getSupabaseAdminConfig, supabaseAdminRest } from '../_supabaseAdmin.js';
import type { FeatureSurface } from '../admin/_featureFlags.js';
import { buildAccountStatus, type AccountStatusResponse, type PlanCode } from './status.js';

export type PaidAiFeature = 'chat' | 'scanner' | 'search' | 'brew';
export type PaidAiQuotaKind = 'ai' | 'deep' | 'scanner';

export type PaidAiAccessResult =
  | { ok: true; snapshot: AccountStatusResponse }
  | {
      ok: false;
      statusCode: 401 | 402 | 403 | 503;
      error: string;
      errorCode: 'auth_required' | 'paid_plan_required' | 'account_blocked' | 'billing_attention_required' | 'account_status_unavailable' | 'quota_exceeded';
      retryable: boolean;
      minimumPlan?: {
        code: PlanCode;
        name: string;
        displayPrice: string;
      };
      quota?: {
        kind: PaidAiQuotaKind;
        used: number;
        limit: number;
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

function nextPlanAfterCurrent(snapshot: AccountStatusResponse): MinimumPaidPlan | undefined {
  const currentIndex = PAID_PLAN_ORDER.indexOf(snapshot.user.planCode);
  const candidates = snapshot.plans
    .filter((plan) => plan.code !== 'free')
    .sort((a, b) => PAID_PLAN_ORDER.indexOf(a.code) - PAID_PLAN_ORDER.indexOf(b.code));
  const next = candidates.find((plan) => PAID_PLAN_ORDER.indexOf(plan.code) > currentIndex);
  return next ? { code: next.code, name: next.name, displayPrice: next.displayPrice } : minimumPaidPlan(snapshot);
}

function quotaKindForFeature(feature: PaidAiFeature): PaidAiQuotaKind {
  return feature === 'scanner' ? 'scanner' : 'ai';
}

function strictQuotaEnforcementEnabled(): boolean {
  return isEnvFlagEnabled('PLAN_QUOTA_STRICT_ENABLED', false)
    || isEnvFlagEnabled('PLAN_ENFORCEMENT_STRICT', false);
}

type QuotaConsumeRow = {
  allowed?: boolean;
  used?: number;
  daily_limit?: number;
  plan_code?: string;
  reason?: string;
};

async function consumeDailyQuota(userId: string, quotaKind: PaidAiQuotaKind): Promise<QuotaConsumeRow> {
  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    throw new Error('Supabase service role is required for plan quota enforcement.');
  }

  const result = await supabaseAdminRest<QuotaConsumeRow[] | QuotaConsumeRow>(config, 'rpc/consume_app_quota', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: userId,
      p_feature: quotaKind,
      p_amount: 1,
    }),
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || typeof row !== 'object') {
    throw new Error('Supabase quota RPC returned an empty response.');
  }
  return row;
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
  quotaKind?: PaidAiQuotaKind;
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

  if (isEnvFlagEnabled('PLAN_ENFORCEMENT_ENABLED', false)) {
    if (snapshot.dataMode !== 'supabase') {
      return {
        ok: false,
        statusCode: 503,
        error: 'Plan quota enforcement requires Supabase account status. Please retry after account sync finishes.',
        errorCode: 'account_status_unavailable',
        retryable: true,
        minimumPlan: minimumPaidPlan(snapshot),
      };
    }

    const quotaKind = params.quotaKind || quotaKindForFeature(params.feature);
    try {
      const quota = await consumeDailyQuota(snapshot.user.id, quotaKind);
      if (quota.allowed === false) {
        return {
          ok: false,
          statusCode: 402,
          error: `Daily ${quotaKind} quota has been reached for this plan.`,
          errorCode: 'quota_exceeded',
          retryable: false,
          minimumPlan: nextPlanAfterCurrent(snapshot),
          quota: {
            kind: quotaKind,
            used: Number(quota.used || 0),
            limit: Number(quota.daily_limit || 0),
          },
        };
      }
    } catch (error) {
      if (strictQuotaEnforcementEnabled()) {
        return {
          ok: false,
          statusCode: 503,
          error: 'Plan quota status is unavailable. Please retry after account sync finishes.',
          errorCode: 'account_status_unavailable',
          retryable: true,
          minimumPlan: minimumPaidPlan(snapshot),
        };
      }

      console.warn(
        `[account/aiAccess][${params.requestId}] quota_unavailable_soft_open feature=${params.feature} quotaKind=${quotaKind} details="${error instanceof Error ? error.message.slice(0, 180) : String(error || 'unknown_error').slice(0, 180)}"`,
      );
    }
  }

  return { ok: true, snapshot };
}
