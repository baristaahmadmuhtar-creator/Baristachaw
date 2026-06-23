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

export function getMvpUpgradeOptions(currentPlanCode: unknown): MvpPaidPlanCode[] {
  const current = normalizeBillingPlanCode(currentPlanCode) || 'free';
  const currentTier = PLAN_TIERS[current] ?? 0;
  return MVP_PAID_PLAN_CODES.filter((code) => (PLAN_TIERS[code] ?? 0) > currentTier);
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
