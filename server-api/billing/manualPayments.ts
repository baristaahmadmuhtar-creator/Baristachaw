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
import {
  getSupabaseAdminConfig,
  supabaseAdminRest,
  type SupabaseAdminConfig,
} from '../_supabaseAdmin.js';

export type BankDetail = {
  bankName: string;
  accountName: string;
  accountNumber: string;
};

export type ManualPaymentInstructions = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  banks?: BankDetail[];
  whatsappNumber?: string;
  whatsappUrl?: string;
  supportEmail?: string;
  instagramUrl?: string;
  instagramHandle?: string;
  qrisImageUrl?: string;
  qrisLabel?: string;
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

type PaymentReceiptStatus = 'queued' | 'auto_accepted' | 'manual_review' | 'rejected' | 'applied';

type PaymentReceiptRow = {
  id?: string;
  manual_request_id?: string;
  user_id?: string;
  requested_plan_code?: string;
  requested_duration?: string;
  requested_currency?: string;
  requested_amount?: number | string;
  requested_amount_label?: string;
  payer_email?: string;
  receipt_url?: string;
  receipt_reference?: string;
  receipt_mime_type?: string;
  receipt_size_bytes?: number | string;
  status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  apply_error?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

const VALID_MANUAL_PLANS = new Set<PaidPlanCode>(['starter', 'pro', 'team']);
const VALID_CURRENCIES = new Set<CurrencyCode>(['idr', 'bnd', 'myr', 'sgd', 'usd', 'eur', 'aud']);
const VALID_DURATIONS = new Set<BillingDuration>(['monthly', 'quarterly', 'yearly']);
const VALID_MANUAL_STATUSES = new Set<ManualPaymentStatus>([
  'pending_review',
  'receipt_received',
  'verified_paid',
  'rejected',
  'expired',
]);
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

function hasSupabaseConfig(config: SupabaseAdminConfig): config is Extract<SupabaseAdminConfig, { configured: true }> {
  return config.configured;
}

export function manualPaymentSupabaseConfigured(): boolean {
  return hasSupabaseConfig(getSupabaseAdminConfig());
}

function safeText(value: unknown, fallback = '', maxLength = 240): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function safeHttpsUrl(value: unknown, fallback = '', maxLength = 600): string {
  const candidate = safeText(value, fallback, maxLength);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function safeNumber(value: unknown, fallback = 0): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

function isoToMs(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStoredManualStatus(row: PaymentReceiptRow): ManualPaymentStatus {
  const metadataStatus = row.metadata && typeof row.metadata.manualStatus === 'string'
    ? row.metadata.manualStatus.trim()
    : '';
  if (VALID_MANUAL_STATUSES.has(metadataStatus as ManualPaymentStatus)) {
    return metadataStatus as ManualPaymentStatus;
  }
  switch (row.status) {
    case 'manual_review':
      return 'receipt_received';
    case 'applied':
    case 'auto_accepted':
      return 'verified_paid';
    case 'rejected':
      return row.apply_error === 'expired' ? 'expired' : 'rejected';
    case 'queued':
    default:
      return 'pending_review';
  }
}

function manualStatusToReceiptStatus(status: ManualPaymentStatus): PaymentReceiptStatus {
  switch (status) {
    case 'receipt_received':
      return 'manual_review';
    case 'verified_paid':
      return 'applied';
    case 'rejected':
    case 'expired':
      return 'rejected';
    case 'pending_review':
    default:
      return 'queued';
  }
}

function readMetadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeBankDetails(value: unknown, fallback: BankDetail[] | undefined): BankDetail[] | undefined {
  if (!Array.isArray(value)) return fallback;
  const banks = value
    .map((item) => {
      const bank = readMetadataObject(item);
      return {
        bankName: safeText(bank.bankName, safeText(bank.bank_name), 80),
        accountName: safeText(bank.accountName, safeText(bank.account_name), 120),
        accountNumber: safeText(bank.accountNumber, safeText(bank.account_number), 80),
      };
    })
    .filter((bank) => bank.bankName && bank.accountName && bank.accountNumber);
  return banks.length ? banks : fallback;
}

function normalizeStoredInstructions(
  value: unknown,
  currency: CurrencyCode,
  message: string,
): ManualPaymentInstructions {
  const fallback = readManualPaymentInstructions(currency, message) || {
    bankName: '',
    accountName: '',
    accountNumber: '',
    notifyWebhookConfigured: false,
  };
  const raw = readMetadataObject(value);
  const banks = normalizeBankDetails(raw.banks, fallback.banks);
  const primaryBank = banks?.[0] || {
    bankName: safeText(raw.bankName, fallback.bankName, 80),
    accountName: safeText(raw.accountName, fallback.accountName, 120),
    accountNumber: safeText(raw.accountNumber, fallback.accountNumber, 80),
  };
  return {
    bankName: primaryBank.bankName,
    accountName: primaryBank.accountName,
    accountNumber: primaryBank.accountNumber,
    banks,
    whatsappNumber: safeText(raw.whatsappNumber, fallback.whatsappNumber, 32) || undefined,
    whatsappUrl: safeText(raw.whatsappUrl, fallback.whatsappUrl, 500) || undefined,
    supportEmail: safeText(raw.supportEmail, fallback.supportEmail, 320) || undefined,
    instagramUrl: safeText(raw.instagramUrl, fallback.instagramUrl, 500) || undefined,
    instagramHandle: safeText(raw.instagramHandle, fallback.instagramHandle, 80) || undefined,
    qrisImageUrl: safeHttpsUrl(raw.qrisImageUrl, fallback.qrisImageUrl) || undefined,
    qrisLabel: safeText(raw.qrisLabel, fallback.qrisLabel, 80) || undefined,
    notifyWebhookConfigured: Boolean(raw.notifyWebhookConfigured ?? fallback.notifyWebhookConfigured),
  };
}

function normalizeWhatsappNumber(value: string): string {
  return value.replace(/[^\d]/g, '').slice(0, 20);
}

function buildWhatsappUrl(number: string, message: string): string | undefined {
  const digits = normalizeWhatsappNumber(number);
  if (!digits) return undefined;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function readManualPaymentInstructions(
  currencyOrMessage: string = 'usd',
  messageInput?: string,
  options: { allowFallbackInstructions?: boolean } = {},
): ManualPaymentInstructions | null {
  if (!envFlag('MANUAL_PAYMENT_ENABLED') && !options.allowFallbackInstructions) return null;

  let currency: CurrencyCode = 'usd';
  let message = 'Manual payment review request';

  if (VALID_CURRENCIES.has(currencyOrMessage as CurrencyCode)) {
    currency = currencyOrMessage as CurrencyCode;
    message = messageInput || 'Manual payment review request';
  } else {
    message = currencyOrMessage;
  }

  const whatsappNumber = normalizeWhatsappNumber(envText('MANUAL_PAYMENT_WHATSAPP_NUMBER') || '+6738270092');
  const supportEmail = envText('MANUAL_PAYMENT_SUPPORT_EMAIL') || 'support@baristachaw.com';
  const instagram = '@baristachaw';
  const qrisImageUrl = safeHttpsUrl(envText(`MANUAL_PAYMENT_QRIS_IMAGE_URL_${currency.toUpperCase()}`) || envText('MANUAL_PAYMENT_QRIS_IMAGE_URL'));
  const qrisLabel = envText(`MANUAL_PAYMENT_QRIS_LABEL_${currency.toUpperCase()}`) || envText('MANUAL_PAYMENT_QRIS_LABEL') || 'QRIS manual';

  let banks: BankDetail[] = [];

  if (currency === 'bnd') {
    banks = [
      {
        bankName: 'BIBD',
        accountName: 'NUR HANISAH BINTI MUSLI',
        accountNumber: '00010020260978',
      },
      {
        bankName: 'TAIB',
        accountName: 'NUR HANISAH BINTI MUSLI',
        accountNumber: '005103344301013',
      }
    ];
  } else if (currency === 'idr') {
    banks = [
      {
        bankName: 'BCA',
        accountName: 'AHMAD MUHTAR ALIMUDIN',
        accountNumber: '3480711393',
      },
      {
        bankName: 'SEABANK',
        accountName: 'AHMAD MUHTAR ALIMUDIN',
        accountNumber: '901080204855',
      }
    ];
  } else {
    const envBankName = envText('MANUAL_PAYMENT_BANK_NAME');
    const envAccountName = envText('MANUAL_PAYMENT_ACCOUNT_NAME');
    const envAccountNumber = envText('MANUAL_PAYMENT_ACCOUNT_NUMBER');
    if (envBankName && envAccountName && envAccountNumber) {
      banks = [{ bankName: envBankName, accountName: envAccountName, accountNumber: envAccountNumber }];
    } else {
      banks = [
        {
          bankName: 'BIBD',
          accountName: 'NUR HANISAH BINTI MUSLI',
          accountNumber: '00010020260978',
        },
        {
          bankName: 'TAIB',
          accountName: 'NUR HANISAH BINTI MUSLI',
          accountNumber: '005103344301013',
        },
        {
          bankName: 'BCA',
          accountName: 'AHMAD MUHTAR ALIMUDIN',
          accountNumber: '3480711393',
        },
        {
          bankName: 'SEABANK',
          accountName: 'AHMAD MUHTAR ALIMUDIN',
          accountNumber: '901080204855',
        }
      ];
    }
  }

  const primaryBank = banks[0] || { bankName: '', accountName: '', accountNumber: '' };

  return {
    bankName: primaryBank.bankName,
    accountName: primaryBank.accountName,
    accountNumber: primaryBank.accountNumber,
    banks,
    whatsappNumber: whatsappNumber || undefined,
    whatsappUrl: whatsappNumber ? buildWhatsappUrl(whatsappNumber, message) : undefined,
    supportEmail,
    instagramUrl: `https://instagram.com/${instagram.replace(/^@/, '')}`,
    instagramHandle: instagram,
    qrisImageUrl: qrisImageUrl || undefined,
    qrisLabel: qrisImageUrl ? qrisLabel : undefined,
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
  allowFallbackInstructions?: boolean;
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
  const instructions = readManualPaymentInstructions(currency, message, {
    allowFallbackInstructions: input.allowFallbackInstructions,
  });
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

function manualPaymentMetadata(request: ManualPaymentRequest): Record<string, unknown> {
  return {
    manualStatus: request.status,
    manualRequestId: request.id,
    planCode: request.planCode,
    duration: request.duration,
    currency: request.currency,
    amount: request.amount,
    amountLabel: request.amountLabel,
    promoCode: request.promoCode || null,
    uniqueSuffix: request.uniqueSuffix ?? null,
    instructions: request.instructions,
    proof: request.proof || null,
    reason: request.reason || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function paymentReceiptPayload(request: ManualPaymentRequest): Record<string, unknown> {
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET_PROOF || 'payment-proofs').trim();
  return {
    manual_request_id: request.id,
    user_id: request.userId,
    requested_plan_code: request.planCode,
    requested_duration: request.duration,
    requested_currency: request.currency,
    requested_amount: request.amount,
    requested_amount_label: request.amountLabel,
    payer_email: request.email || '',
    receipt_reference: request.proof?.generatedFileName || '',
    receipt_url: request.proof?.generatedFileName ? `${bucket}/${request.proof.generatedFileName}` : '',
    receipt_mime_type: request.proof?.mimeType || '',
    receipt_size_bytes: request.proof?.sizeBytes || null,
    status: manualStatusToReceiptStatus(request.status),
    apply_error: request.reason || (request.status === 'expired' ? 'expired' : ''),
    metadata: manualPaymentMetadata(request),
  };
}

function billingMarketForCurrency(currency: CurrencyCode): string {
  if (currency === 'idr') return 'indonesia';
  if (currency === 'bnd') return 'brunei';
  return 'global';
}

async function ensureManualPaymentAppUser(
  config: Extract<SupabaseAdminConfig, { configured: true }>,
  request: ManualPaymentRequest,
): Promise<void> {
  const existing = await supabaseAdminRest<Array<{ id: string }>>(
    config,
    `app_users?id=eq.${encodeURIComponent(request.userId)}&select=id&limit=1`,
  );
  if (existing?.length) {
    await supabaseAdminRest(config, `app_users?id=eq.${encodeURIComponent(request.userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        payment_action_required: true,
        billing_status: request.status === 'pending_review' ? 'none' : 'trialing',
        billing_provider: request.status === 'pending_review' ? 'none' : 'manual',
        billing_market: billingMarketForCurrency(request.currency),
        billing_last_event_at: new Date(request.updatedAt).toISOString(),
        last_seen_at: new Date(request.updatedAt).toISOString(),
        updated_at: new Date(request.updatedAt).toISOString(),
      }),
    });
    return;
  }

  await supabaseAdminRest(config, 'app_users', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      id: request.userId,
      email: request.email || `${request.userId}@manual.baristachaw.local`,
      display_name: request.email || request.userId,
      provider: request.email ? 'email' : 'unknown',
      role: 'user',
      status: 'active',
      plan_code: 'free',
      billing_status: 'none',
      billing_provider: 'none',
      billing_market: 'global',
      payment_action_required: true,
      billing_last_event_at: new Date(request.updatedAt).toISOString(),
      last_seen_at: new Date(request.updatedAt).toISOString(),
      metadata: {
        manualPaymentCheckout: true,
        lastManualPaymentRequestId: request.id,
      },
    }]),
  });
}

function requestFromPaymentReceipt(row: PaymentReceiptRow): ManualPaymentRequest | null {
  const metadata = readMetadataObject(row.metadata);
  const id = safeText(row.manual_request_id, safeText(metadata.manualRequestId, '', 96), 96);
  const userId = safeText(row.user_id, '', 160);
  const planCode = safeText(row.requested_plan_code, safeText(metadata.planCode), 40) as PaidPlanCode;
  if (!id || !userId || !VALID_MANUAL_PLANS.has(planCode)) return null;

  const duration = normalizeManualDuration(row.requested_duration || metadata.duration);
  const currency = normalizeManualCurrency(row.requested_currency || metadata.currency);
  const amount = safeNumber(row.requested_amount ?? metadata.amount, 0);
  const amountLabel = safeText(row.requested_amount_label, safeText(metadata.amountLabel), 120)
    || formatCurrency(amount, currency);
  const createdAt = isoToMs(row.created_at, safeNumber(metadata.createdAt, Date.now()));
  const updatedAt = isoToMs(row.updated_at, safeNumber(metadata.updatedAt, createdAt));
  const proofMetadata = readMetadataObject(metadata.proof);
  const receiptReference = safeText(row.receipt_reference, safeText(proofMetadata.generatedFileName), 240);
  const receiptMimeType = safeText(row.receipt_mime_type, safeText(proofMetadata.mimeType), 80);
  const receiptSizeBytes = safeNumber(row.receipt_size_bytes ?? proofMetadata.sizeBytes, 0);
  const proofReceivedAt = safeNumber(proofMetadata.receivedAt, updatedAt);
  const proof = receiptReference && receiptMimeType && receiptSizeBytes > 0
    ? {
        generatedFileName: receiptReference,
        mimeType: receiptMimeType,
        sizeBytes: Math.floor(receiptSizeBytes),
        storage: 'metadata_only' as const,
        receivedAt: proofReceivedAt,
      }
    : undefined;
  const message = [
    `Baristachaw manual payment ${id}`,
    `Plan: ${getPlanByCode(planCode).displayName}`,
    `Duration: ${duration}`,
    `Amount: ${amountLabel}`,
  ].join('\n');

  return {
    id,
    userId,
    email: safeText(row.payer_email, safeText(metadata.email), 320) || undefined,
    planCode,
    duration,
    amount,
    amountLabel,
    currency,
    promoCode: safeText(metadata.promoCode, '', 40) || undefined,
    status: normalizeStoredManualStatus(row),
    paymentActionRequired: true,
    instructions: normalizeStoredInstructions(metadata.instructions, currency, message),
    proof,
    reason: safeText(row.apply_error, safeText(metadata.reason), 240) || undefined,
    createdAt,
    updatedAt,
    uniqueSuffix: metadata.uniqueSuffix !== null
      && metadata.uniqueSuffix !== undefined
      && Number.isFinite(Number(metadata.uniqueSuffix))
      ? Number(metadata.uniqueSuffix)
      : undefined,
  };
}

export async function persistManualPaymentRequest(request: ManualPaymentRequest): Promise<boolean> {
  const config = getSupabaseAdminConfig();
  if (!hasSupabaseConfig(config)) return false;
  await ensureManualPaymentAppUser(config, request);
  await supabaseAdminRest(config, 'payment_receipts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([paymentReceiptPayload(request)]),
  });
  return true;
}

export async function persistManualPaymentProof(request: ManualPaymentRequest): Promise<boolean> {
  const config = getSupabaseAdminConfig();
  if (!hasSupabaseConfig(config)) return false;
  await ensureManualPaymentAppUser(config, request);
  await supabaseAdminRest(config, `payment_receipts?manual_request_id=eq.${encodeURIComponent(request.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(paymentReceiptPayload(request)),
  });
  return true;
}

export async function loadPersistedManualPaymentRequest(
  requestId: string,
  userId?: string,
): Promise<ManualPaymentRequest | undefined> {
  const config = getSupabaseAdminConfig();
  if (!hasSupabaseConfig(config)) return undefined;
  const rows = await supabaseAdminRest<PaymentReceiptRow[]>(
    config,
    `payment_receipts?manual_request_id=eq.${encodeURIComponent(requestId)}&select=*&limit=1`,
  );
  const request = rows?.[0] ? requestFromPaymentReceipt(rows[0]) : null;
  if (!request || (userId && request.userId !== userId)) return undefined;
  REQUESTS.set(request.id, request);
  return request;
}

export async function listPersistedManualPaymentRequests(): Promise<ManualPaymentRequest[]> {
  const config = getSupabaseAdminConfig();
  if (!hasSupabaseConfig(config)) return listManualPaymentRequests();
  const rows = await supabaseAdminRest<PaymentReceiptRow[]>(
    config,
    'payment_receipts?select=*&manual_request_id=neq.&order=updated_at.desc&limit=100',
  );
  const persisted = (rows || [])
    .map(requestFromPaymentReceipt)
    .filter((request): request is ManualPaymentRequest => Boolean(request));
  for (const request of persisted) {
    REQUESTS.set(request.id, request);
  }
  const merged = new Map<string, ManualPaymentRequest>();
  for (const request of listManualPaymentRequests()) merged.set(request.id, request);
  for (const request of persisted) merged.set(request.id, request);
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updatePersistedManualPaymentStatus(
  requestId: string,
  action: ManualPaymentAction,
  reason?: string,
  reviewedBy?: string,
): Promise<ManualPaymentRequest | undefined> {
  const config = getSupabaseAdminConfig();
  if (!hasSupabaseConfig(config)) return updateManualPaymentStatus(requestId, action, reason);
  const request = await loadPersistedManualPaymentRequest(requestId) || getManualPaymentRequest(requestId);
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

  const reviewedActions = new Set<ManualPaymentAction>(['verified_paid', 'rejected', 'expired', 'downgrade_free']);
  await supabaseAdminRest(config, `payment_receipts?manual_request_id=eq.${encodeURIComponent(request.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      ...paymentReceiptPayload(request),
      reviewed_by: reviewedActions.has(action) ? (reviewedBy || 'admin') : null,
      reviewed_at: reviewedActions.has(action) ? new Date(request.updatedAt).toISOString() : null,
    }),
  });
  return request;
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
