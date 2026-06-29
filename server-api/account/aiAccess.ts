import { isEnvFlagEnabled, type AuthContext } from '../_shared.js';
import { getSupabaseAdminConfig, supabaseAdminRest } from '../_supabaseAdmin.js';
import type { FeatureSurface } from '../admin/_featureFlags.js';
import { buildAccountStatus, type AccountStatusResponse, type PlanCode } from './status.js';

export type PaidAiFeature = string;
export type PaidAiQuotaKind = string;

export type PaidAiQuotaReservation = {
  requestId: string;
  userId: string;
  kind: PaidAiQuotaKind;
  route: string;
  action: string;
  mode: string;
  used: number;
  limit: number;
  planCode: string;
};

export type PaidAiAccessResult =
  | { ok: true; snapshot: AccountStatusResponse; quotaReservation?: PaidAiQuotaReservation }
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
const PLAN_ORDER: PlanCode[] = ['free', ...PAID_PLAN_ORDER];
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

function minimumPlanByCode(snapshot: AccountStatusResponse, code: PlanCode): MinimumPaidPlan | undefined {
  const plan = snapshot.plans.find((item) => item.code === code);
  return plan ? { code: plan.code, name: plan.name, displayPrice: plan.displayPrice } : minimumPaidPlan(snapshot);
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
  if (feature === 'scanner') return 'read_label';
  if (feature === 'chat') return 'chat_normal';
  if (feature === 'search') return 'ai_search';
  if (feature === 'brew') return 'ai_brew';
  if (feature === 'coach') return 'ai_coach';
  return feature;
}

function planMeetsMinimum(planCode: PlanCode, minimumPlanCode: PlanCode): boolean {
  return PLAN_ORDER.indexOf(planCode) >= PLAN_ORDER.indexOf(minimumPlanCode);
}

function quotaOutagePolicy(): 'strict_fail_closed' | 'graceful_dev_fallback' | '' {
  const raw = normalizeText(process.env.AI_QUOTA_OUTAGE_POLICY).toLowerCase();
  if (raw === 'strict_fail_closed' || raw === 'fail_closed' || raw === 'strict') return 'strict_fail_closed';
  if (raw === 'graceful_dev_fallback' || raw === 'soft_open' || raw === 'dev_fallback') return 'graceful_dev_fallback';
  return '';
}

function strictQuotaEnforcementEnabled(): boolean {
  const policy = quotaOutagePolicy();
  if (policy === 'strict_fail_closed') return true;
  if (policy === 'graceful_dev_fallback') return false;
  return isEnvFlagEnabled('PLAN_QUOTA_STRICT_ENABLED', false)
    || isEnvFlagEnabled('PLAN_ENFORCEMENT_STRICT', false);
}

type QuotaConsumeRow = {
  allowed?: boolean;
  used?: number;
  daily_limit?: number;
  plan_code?: string;
  reason?: string;
  request_id?: string;
};

type QuotaFinalizeRow = {
  committed?: boolean;
  refunded?: boolean;
  request_id?: string;
  reason?: string;
};

async function reserveDailyQuota(params: {
  requestId: string;
  userId: string;
  quotaKind: PaidAiQuotaKind;
  route: string;
  action: string;
  mode: string;
}): Promise<QuotaConsumeRow> {
  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    throw new Error('Supabase service role is required for plan quota enforcement.');
  }

  const reservation = await supabaseAdminRest<QuotaConsumeRow[] | QuotaConsumeRow>(config, 'rpc/reserve_app_quota', {
    method: 'POST',
    body: JSON.stringify({
      p_request_id: params.requestId,
      p_user_id: params.userId,
      p_feature: params.quotaKind,
      p_amount: 1,
      p_route: params.route,
      p_action: params.action,
      p_mode: params.mode,
    }),
  });

  const row = Array.isArray(reservation) ? reservation[0] : reservation;
  if (!row || typeof row !== 'object') {
    throw new Error('Supabase quota reservation RPC returned an empty response.');
  }
  return row;
}

async function callQuotaFinalizeRpc(
  path: 'rpc/commit_app_quota' | 'rpc/refund_app_quota',
  body: Record<string, unknown>,
): Promise<QuotaFinalizeRow> {
  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    throw new Error('Supabase service role is required for plan quota finalization.');
  }

  const result = await supabaseAdminRest<QuotaFinalizeRow[] | QuotaFinalizeRow>(config, path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || typeof row !== 'object') {
    throw new Error(`Supabase quota finalization RPC returned an empty response for ${path}.`);
  }
  return row;
}

export async function commitPaidAiQuota(
  reservation: PaidAiQuotaReservation | undefined,
  details: {
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
    outcome?: string;
  } = {},
): Promise<boolean> {
  if (!reservation?.requestId) return true;
  try {
    const row = await callQuotaFinalizeRpc('rpc/commit_app_quota', {
      p_request_id: reservation.requestId,
      p_total_tokens: Math.max(0, Number(details.totalTokens || 0)),
      p_cost_usd: Math.max(0, Number(details.estimatedCostUsd || 0)),
      p_input_tokens: Math.max(0, Number(details.inputTokens || 0)),
      p_output_tokens: Math.max(0, Number(details.outputTokens || 0)),
      p_provider: details.provider || '',
      p_model: details.model || '',
      p_outcome: details.outcome || 'success',
    });
    return row.committed !== false;
  } catch (error) {
    console.error(`[account/aiAccess][${reservation.requestId}] quota_commit_failed:`, error);
    return false;
  }
}

export async function refundPaidAiQuota(
  reservation: PaidAiQuotaReservation | undefined,
  reason = 'refunded',
): Promise<boolean> {
  if (!reservation?.requestId) return true;
  try {
    const row = await callQuotaFinalizeRpc('rpc/refund_app_quota', {
      p_request_id: reservation.requestId,
      p_reason: reason,
    });
    return row.refunded !== false;
  } catch (error) {
    console.error(`[account/aiAccess][${reservation.requestId}] quota_refund_failed:`, error);
    return false;
  }
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
  route?: string;
  action?: string;
  mode?: string;
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

  if ((params.quotaKind || quotaKindForFeature(params.feature)) === 'deep' && !planMeetsMinimum(snapshot.user.planCode, 'pro')) {
    return {
      ok: false,
      statusCode: 402,
      error: 'Deep Think requires Barista Pro or higher.',
      errorCode: 'paid_plan_required',
      retryable: false,
      minimumPlan: minimumPlanByCode(snapshot, 'pro'),
    };
  }

  if (params.action === 'ai_coach' && !planMeetsMinimum(snapshot.user.planCode, 'pro')) {
    return {
      ok: false,
      statusCode: 402,
      error: 'AI Coach requires Barista Pro or higher.',
      errorCode: 'paid_plan_required',
      retryable: false,
      minimumPlan: minimumPlanByCode(snapshot, 'pro'),
    };
  }

  if (params.action === 'edit_latte_art' && !planMeetsMinimum(snapshot.user.planCode, 'pro')) {
    return {
      ok: false,
      statusCode: 402,
      error: 'AI Latte Art requires Barista Pro or higher.',
      errorCode: 'paid_plan_required',
      retryable: false,
      minimumPlan: minimumPlanByCode(snapshot, 'pro'),
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
      const quota = await reserveDailyQuota({
        requestId: params.requestId,
        userId: snapshot.user.id,
        quotaKind,
        route: params.route || '',
        action: params.action || params.feature,
        mode: params.mode || '',
      });
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
      return {
        ok: true,
        snapshot,
        quotaReservation: {
          requestId: quota.request_id || params.requestId,
          userId: snapshot.user.id,
          kind: quotaKind,
          route: params.route || '',
          action: params.action || params.feature,
          mode: params.mode || '',
          used: Number(quota.used || 0),
          limit: Number(quota.daily_limit || 0),
          planCode: typeof quota.plan_code === 'string' ? quota.plan_code : snapshot.user.planCode,
        },
      };
    } catch (error) {
      console.error(`[account/aiAccess][${params.requestId}] QUOTA_ERROR_DEBUG:`, error);
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
