import type { PlanCode } from './accountStatus';
import type { CurrencyCode } from './billingConfig';

export type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

export type ManualPaymentInstructions = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  banks?: Array<{
    bankName: string;
    accountName: string;
    accountNumber: string;
  }>;
  whatsappNumber?: string;
  whatsappUrl?: string;
  supportEmail?: string;
  instagramUrl?: string;
  instagramHandle?: string;
  notifyWebhookConfigured: boolean;
};

export type BillingManualInvoice = {
  id: string;
  status: 'pending_review' | 'receipt_received' | 'verified_paid' | 'rejected' | 'expired';
  amount: number;
  amountLabel: string;
  currency: CurrencyCode;
  uniqueSuffix?: number;
  instructions: ManualPaymentInstructions;
  supportLinks?: {
    whatsappUrl?: string;
    supportEmail?: string;
    instagramUrl?: string;
  };
  proof: {
    endpoint: string;
    allowedTypes: string[];
    storage?: 'persisted' | 'deferred';
  };
  message: string;
};

type BillingRedirectResponse = {
  ok: true;
  requestId: string;
  mode: 'redirect';
  url: string;
  planCode?: PlanCode;
  duration?: BillingDuration;
  promoCode?: string;
  provider?: string;
};

export type BillingManualInvoiceResponse = {
  ok: true;
  requestId: string;
  mode: 'manual_invoice';
  provider: 'manual';
  paymentRequestId: string;
  paymentActionRequired: true;
  reviewStorage?: 'persisted' | 'deferred';
  planCode: PlanCode;
  duration: BillingDuration;
  promoCode?: string;
  manualInvoice: BillingManualInvoice;
};

export type BillingCheckoutResponse = BillingRedirectResponse | BillingManualInvoiceResponse;

export type BillingManualSupportResponse = {
  ok: true;
  requestId: string;
  mode: 'manual_support';
  provider?: 'manual';
  paymentActionRequired?: true;
  supportLinks?: {
    whatsappUrl?: string;
    supportEmail?: string;
    instagramUrl?: string;
  };
  message: string;
};

export type BillingPortalResponse = BillingRedirectResponse | BillingManualSupportResponse;

export type ManualPaymentProofSubmission = {
  requestId: string;
  mimeType: string;
  sizeBytes: number;
};

export class BillingApiError extends Error {
  status: number;
  errorCode?: string;
  details?: string;
  requestId?: string;

  constructor(message: string, params: { status: number; errorCode?: string; details?: string; requestId?: string }) {
    super(message);
    this.name = 'BillingApiError';
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

async function billingRequest<TResponse = BillingCheckoutResponse>(path: string, body: Record<string, unknown> = {}): Promise<TResponse> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response);
  if (!response.ok || payload?.ok === false) {
    throw new BillingApiError(payload?.error || `Billing request failed with HTTP ${response.status}`, {
      status: response.status,
      errorCode: payload?.errorCode,
      details: payload?.details || payload?.hint,
      requestId: payload?.requestId || response.headers.get('x-request-id') || undefined,
    });
  }
  return payload as TResponse;
}

export function startBillingCheckout(
  planCode: Exclude<PlanCode, 'free'>,
  options?: { duration?: BillingDuration; promoCode?: string; currency?: CurrencyCode },
): Promise<BillingCheckoutResponse> {
  return billingRequest('/api/billing/checkout', {
    planCode,
    duration: options?.duration ?? 'monthly',
    ...(options?.promoCode ? { promoCode: options.promoCode } : {}),
    ...(options?.currency ? { currency: options.currency } : {}),
  });
}

export function submitManualPaymentProof(input: ManualPaymentProofSubmission): Promise<{
  ok: true;
  requestId: string;
  paymentRequestId: string;
  status: BillingManualInvoice['status'];
  proof: { generatedFileName: string; mimeType: string; sizeBytes: number; storage: 'metadata_only'; receivedAt: number };
  proofStorage: 'storage_ready' | 'support_fallback';
  deliveryMode: 'direct_upload' | 'manual_support';
  uploadUrl?: string;
  supportLinks?: {
    whatsappUrl?: string;
    supportEmail?: string;
    instagramUrl?: string;
  };
  paymentActionRequired: true;
  entitlement: 'pending_admin_review';
  message: string;
}> {
  return billingRequest('/api/billing/proof', input);
}

export function openBillingPortal(): Promise<BillingPortalResponse> {
  return billingRequest('/api/billing/portal');
}

const PLAN_DISPLAY_NAMES: Record<PlanCode, string> = {
  free: 'Free',
  starter: 'Barista Plus',
  pro: 'Barista Pro',
  team: 'Cafe Team',
  enterprise: 'Enterprise',
};

export function planDisplayName(code: PlanCode): string {
  return PLAN_DISPLAY_NAMES[code] ?? code;
}
