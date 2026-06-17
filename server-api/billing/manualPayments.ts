import { randomUUID } from 'node:crypto';
import {
  formatCurrency,
  getPlanByCode,
  PLAN_PRICING,
  resolveTeamPrice,
  type BillingDuration,
  type CurrencyCode,
  type ManualPaymentStatus,
  type PaidPlanCode,
} from '../../packages/shared/src/planCatalog.js';

export type ManualPaymentInstructions = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  whatsappNumber?: string;
  whatsappUrl?: string;
  supportEmail?: string;
  notifyWebhookConfigured: boolean;
};

export type ManualPaymentProof = {
  generatedFileName: string;
  mimeType: string;
  sizeBytes: number;
  storage: 'metadata_only';
  receivedAt: number;
};

export type ManualPaymentRequest = {
  id: string;
  userId: string;
  email?: string;
  planCode: PaidPlanCode;
  duration: BillingDuration;
  amount: number;
  amountLabel: string;
  currency: CurrencyCode;
  promoCode?: string;
  status: ManualPaymentStatus;
  paymentActionRequired: true;
  instructions: ManualPaymentInstructions;
  proof?: ManualPaymentProof;
  reason?: string;
  createdAt: number;
  updatedAt: number;
  uniqueSuffix?: number;
};

export type ManualPaymentAction = 'receipt_received' | 'verified_paid' | 'rejected' | 'expired' | 'downgrade_free';

const VALID_MANUAL_PLANS = new Set<PaidPlanCode>(['starter', 'pro', 'team']);
const VALID_CURRENCIES = new Set<CurrencyCode>(['idr', 'bnd', 'myr', 'sgd', 'usd', 'eur', 'aud']);
const VALID_DURATIONS = new Set<BillingDuration>(['monthly', 'quarterly', 'yearly']);
const ALLOWED_PROOF_TYPES: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
] as const);
const REQUESTS = new Map<string, ManualPaymentRequest>();

function envText(name: string): string {
  return String(process.env[name] || '').trim();
}

function envFlag(name: string): boolean {
  const raw = envText(name).toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function normalizeWhatsappNumber(value: string): string {
  return value.replace(/[^\d]/g, '').slice(0, 20);
}

function buildWhatsappUrl(number: string, message: string): string | undefined {
  const digits = normalizeWhatsappNumber(number);
  if (!digits) return undefined;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function readManualPaymentInstructions(message = 'Manual payment review request'): ManualPaymentInstructions | null {
  if (!envFlag('MANUAL_PAYMENT_ENABLED')) return null;

  const bankName = envText('MANUAL_PAYMENT_BANK_NAME');
  const accountName = envText('MANUAL_PAYMENT_ACCOUNT_NAME');
  const accountNumber = envText('MANUAL_PAYMENT_ACCOUNT_NUMBER');
  if (!bankName || !accountName || !accountNumber) return null;

  const whatsappNumber = normalizeWhatsappNumber(envText('MANUAL_PAYMENT_WHATSAPP_NUMBER'));
  const supportEmail = envText('MANUAL_PAYMENT_SUPPORT_EMAIL') || undefined;

  return {
    bankName,
    accountName,
    accountNumber,
    whatsappNumber: whatsappNumber || undefined,
    whatsappUrl: whatsappNumber ? buildWhatsappUrl(whatsappNumber, message) : undefined,
    supportEmail,
    notifyWebhookConfigured: Boolean(envText('MANUAL_PAYMENT_NOTIFY_WEBHOOK_URL')),
  };
}

export function normalizeManualCurrency(value: unknown): CurrencyCode {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_CURRENCIES.has(raw as CurrencyCode) ? raw as CurrencyCode : 'usd';
}

export function normalizeManualDuration(value: unknown): BillingDuration {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_DURATIONS.has(raw as BillingDuration) ? raw as BillingDuration : 'monthly';
}

export function getManualPaymentProofMaxBytes(): number {
  const configured = Number(envText('MANUAL_PAYMENT_PROOF_MAX_BYTES'));
  if (Number.isFinite(configured) && configured >= 64 * 1024 && configured <= 20 * 1024 * 1024) {
    return Math.floor(configured);
  }
  return 5 * 1024 * 1024;
}

function resolveManualAmount(planCode: PaidPlanCode, duration: BillingDuration, currency: CurrencyCode): number {
  if (planCode === 'starter' || planCode === 'pro') {
    return PLAN_PRICING[planCode][duration].discounted[currency];
  }
  return resolveTeamPrice(duration, currency);
}

export function createManualPaymentRequest(input: {
  userId: string;
  email?: string;
  planCode: PaidPlanCode;
  duration: BillingDuration;
  currency?: CurrencyCode;
  promoCode?: string;
}): ManualPaymentRequest | null {
  if (!VALID_MANUAL_PLANS.has(input.planCode)) return null;
  const currency = input.currency || 'usd';
  let amount = resolveManualAmount(input.planCode, input.duration, currency);
  
  let uniqueSuffix: number | undefined = undefined;
  if (currency === 'idr') {
    uniqueSuffix = Math.floor(100 + Math.random() * 900); // 100 to 999
    amount = amount + uniqueSuffix;
  }

  const plan = getPlanByCode(input.planCode);
  const id = `manual_${Date.now().toString(36)}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const amountLabel = formatCurrency(amount, currency);
  const message = [
    `Baristachaw manual payment ${id}`,
    `Plan: ${plan.displayName}`,
    `Duration: ${input.duration}`,
    `Amount: ${amountLabel}`,
  ].join('\n');
  const instructions = readManualPaymentInstructions(message);
  if (!instructions) return null;

  const now = Date.now();
  const request: ManualPaymentRequest = {
    id,
    userId: input.userId,
    email: input.email,
    planCode: input.planCode,
    duration: input.duration,
    amount,
    amountLabel,
    currency,
    promoCode: input.promoCode || undefined,
    status: 'pending_review',
    paymentActionRequired: true,
    instructions,
    uniqueSuffix,
    createdAt: now,
    updatedAt: now,
  };
  REQUESTS.set(id, request);
  return request;
}

export function getManualPaymentRequest(id: string): ManualPaymentRequest | undefined {
  return REQUESTS.get(id);
}

export function listManualPaymentRequests(): ManualPaymentRequest[] {
  return [...REQUESTS.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function resetManualPaymentRequestsForTests(): void {
  REQUESTS.clear();
}

export function attachManualPaymentProof(input: {
  requestId: string;
  userId: string;
  mimeType: string;
  sizeBytes: number;
}): { ok: true; request: ManualPaymentRequest; proof: ManualPaymentProof } | { ok: false; statusCode: number; errorCode: string; error: string } {
  const request = REQUESTS.get(input.requestId);
  if (!request) {
    return { ok: false, statusCode: 404, errorCode: 'manual_payment_not_found', error: 'Manual payment request was not found' };
  }
  if (request.userId !== input.userId) {
    return { ok: false, statusCode: 403, errorCode: 'manual_payment_forbidden', error: 'This payment request belongs to another user' };
  }
  const mimeType = input.mimeType.trim().toLowerCase();
  const extension = ALLOWED_PROOF_TYPES.get(mimeType);
  if (!extension) {
    return { ok: false, statusCode: 400, errorCode: 'invalid_proof_type', error: 'Upload proof must be a JPG, PNG, WebP, or PDF file' };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > getManualPaymentProofMaxBytes()) {
    return { ok: false, statusCode: 413, errorCode: 'proof_too_large', error: 'Upload proof is too large' };
  }

  const proof: ManualPaymentProof = {
    generatedFileName: `${input.requestId}_${randomUUID().replace(/-/g, '').slice(0, 16)}.${extension}`,
    mimeType,
    sizeBytes: Math.floor(input.sizeBytes),
    storage: 'metadata_only',
    receivedAt: Date.now(),
  };

  request.proof = proof;
  request.status = 'receipt_received';
  request.updatedAt = Date.now();
  REQUESTS.set(request.id, request);
  return { ok: true, request, proof };
}

export function updateManualPaymentStatus(
  requestId: string,
  action: ManualPaymentAction,
  reason?: string,
): ManualPaymentRequest | undefined {
  const request = REQUESTS.get(requestId);
  if (!request) return undefined;
  const statusByAction: Record<Exclude<ManualPaymentAction, 'downgrade_free'>, ManualPaymentStatus> = {
    receipt_received: 'receipt_received',
    verified_paid: 'verified_paid',
    rejected: 'rejected',
    expired: 'expired',
  };
  if (action !== 'downgrade_free') {
    request.status = statusByAction[action];
  }
  request.reason = reason?.trim().slice(0, 240) || undefined;
  request.updatedAt = Date.now();
  REQUESTS.set(request.id, request);
  return request;
}
