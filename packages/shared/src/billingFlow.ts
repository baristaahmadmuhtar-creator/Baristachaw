import { PLAN_TIERS, type PlanCode } from './planCatalog.ts';

export type BillingPlanCode = PlanCode;
export type MvpPaidPlanCode = 'starter' | 'pro';
export type PendingManualPaymentStatus = 'receipt_received' | 'pending_admin_review';

export type PendingManualPaymentMarker = {
  paymentRequestId: string;
  planCode: MvpPaidPlanCode;
  status: PendingManualPaymentStatus;
  updatedAt: number;
};

export type BillingSnapshotForPendingCheck = {
  status?: string;
  provider?: string;
  paymentActionRequired?: boolean;
  paymentAction?: string;
  message?: string;
};

export const BILLING_PENDING_STORAGE_KEY = 'BARISTACHAW_MANUAL_PAYMENT_PENDING_V1';
export const BILLING_PENDING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const MVP_PAID_PLAN_CODES = ['starter', 'pro'] as const;

const VALID_PLAN_CODES = new Set<BillingPlanCode>(['free', 'starter', 'pro', 'team', 'enterprise']);
const VALID_PENDING_STATUSES = new Set<PendingManualPaymentStatus>(['receipt_received', 'pending_admin_review']);

export function normalizeBillingPlanCode(value: unknown): BillingPlanCode | '' {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const normalized = raw === 'plus' ? 'starter' : raw;
  return VALID_PLAN_CODES.has(normalized as BillingPlanCode) ? normalized as BillingPlanCode : '';
}

export function normalizeMvpPaidPlanCode(value: unknown): MvpPaidPlanCode | '' {
  const normalized = normalizeBillingPlanCode(value);
  return normalized === 'starter' || normalized === 'pro' ? normalized : '';
}

export function getMvpUpgradeOptions(currentPlanCode: unknown, minimumPlanCode: unknown = 'starter'): MvpPaidPlanCode[] {
  const current = normalizeBillingPlanCode(currentPlanCode) || 'free';
  const currentTier = PLAN_TIERS[current] ?? 0;
  const minimum = normalizeMvpPaidPlanCode(minimumPlanCode) || 'starter';
  const minimumTier = PLAN_TIERS[minimum] ?? PLAN_TIERS.starter;
  return MVP_PAID_PLAN_CODES.filter((code) => {
    const tier = PLAN_TIERS[code] ?? 0;
    return tier > currentTier && tier >= minimumTier;
  });
}

export function minimumMvpPlanForFeature(featureOrSource: unknown): MvpPaidPlanCode {
  const raw = typeof featureOrSource === 'string' ? featureOrSource.trim().toLowerCase() : '';
  if (
    raw.includes('latte')
    || raw.includes('deep')
    || raw.includes('image_generation')
    || raw.includes('pro')
  ) {
    return 'pro';
  }
  return 'starter';
}

export function isBillingPlanAtLeast(currentPlanCode: unknown, minimumPlanCode: unknown): boolean {
  const current = normalizeBillingPlanCode(currentPlanCode) || 'free';
  const minimum = normalizeBillingPlanCode(minimumPlanCode) || 'starter';
  return (PLAN_TIERS[current] ?? 0) >= (PLAN_TIERS[minimum] ?? PLAN_TIERS.starter);
}

function readMarkerObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function parsePendingManualPaymentMarker(
  raw: string | null | undefined,
  now = Date.now(),
): PendingManualPaymentMarker | null {
  const parsed = readMarkerObject(String(raw || ''));
  if (!parsed) return null;

  const paymentRequestId = typeof parsed.paymentRequestId === 'string'
    ? parsed.paymentRequestId.trim().slice(0, 120)
    : '';
  const planCode = normalizeMvpPaidPlanCode(parsed.planCode);
  const status = typeof parsed.status === 'string' ? parsed.status.trim() : '';
  const updatedAt = Number(parsed.updatedAt || 0);

  if (!paymentRequestId || !planCode || !VALID_PENDING_STATUSES.has(status as PendingManualPaymentStatus)) return null;
  if (!Number.isFinite(updatedAt) || updatedAt <= 0 || now - updatedAt > BILLING_PENDING_MAX_AGE_MS) return null;

  return {
    paymentRequestId,
    planCode,
    status: status as PendingManualPaymentStatus,
    updatedAt,
  };
}

export function buildPendingManualPaymentMarker(
  paymentRequestId: string,
  planCode: unknown,
  now = Date.now(),
): PendingManualPaymentMarker | null {
  const normalizedPlan = normalizeMvpPaidPlanCode(planCode);
  const normalizedRequestId = String(paymentRequestId || '').trim().slice(0, 120);
  if (!normalizedRequestId || !normalizedPlan) return null;
  return {
    paymentRequestId: normalizedRequestId,
    planCode: normalizedPlan,
    status: 'pending_admin_review',
    updatedAt: now,
  };
}

export function shouldBlockDuplicateManualPayment(input: {
  markerRaw?: string | null;
  now?: number;
  billing?: BillingSnapshotForPendingCheck | null;
}): boolean {
  // Once the server snapshot confirms the plan is active, that is authoritative: a leftover
  // local "pending review" marker (e.g. the client hasn't polled since admin approval landed)
  // must never keep showing a stale pending-review state on top of a genuinely active plan.
  if (String(input.billing?.status || '').toLowerCase() === 'active') return false;

  if (parsePendingManualPaymentMarker(input.markerRaw, input.now)) return true;

  const billing = input.billing;
  if (!billing) return false;
  const provider = String(billing.provider || '').toLowerCase();
  const action = String(billing.paymentAction || '').toLowerCase();
  const message = String(billing.message || '').toLowerCase();
  if (provider === 'manual' && billing.paymentActionRequired) return true;
  if (billing.paymentActionRequired && action === 'contact_support') return true;
  return billing.paymentActionRequired === true
    && /waiting for admin|verification|review|menunggu review|pending review/.test(message);
}

export function clearBillingPendingMarker(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(BILLING_PENDING_STORAGE_KEY);
    } catch {}
  }
}

export function shouldClearBillingPendingMarker(input: {
  markerRaw?: string | null;
  now?: number;
  billing?: BillingSnapshotForPendingCheck | null;
}): boolean {
  if (!input.markerRaw) return false;
  
  const marker = parsePendingManualPaymentMarker(input.markerRaw, input.now);
  if (!marker) return true; // Invalid or expired

  const billing = input.billing;
  if (!billing) return false; // Needs snapshot to decide

  const status = String(billing.status || '').toLowerCase();
  const provider = String(billing.provider || '').toLowerCase();
  const action = String(billing.paymentAction || '').toLowerCase();
  const message = String(billing.message || '').toLowerCase();

  // 1. Account snapshot active
  if (status === 'active' || status === 'trialing') return true;

  // 2. Rejected or specific clear states
  if (/rejected|declined|failed/.test(message)) return true;
  
  // 3. Still pending according to the server.
  const isPendingReview = (provider === 'manual' && billing.paymentActionRequired) ||
    (billing.paymentActionRequired && action === 'contact_support') ||
    (billing.paymentActionRequired === true && /waiting for admin|verification|review|menunggu review|pending review/.test(message));

  if (isPendingReview) {
    return false;
  }

  // Account status can lag immediately after proof upload. Keep a fresh local
  // proof marker until the server reports a final entitlement or rejection.
  return false;
}
