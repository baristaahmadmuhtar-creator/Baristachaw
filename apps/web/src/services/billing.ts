import type { PlanCode } from './accountStatus';

type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

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

async function billingRequest(path: string, body: Record<string, unknown> = {}): Promise<BillingRedirectResponse> {
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
  return payload as BillingRedirectResponse;
}

export function startBillingCheckout(
  planCode: Exclude<PlanCode, 'free'>,
  options?: { duration?: BillingDuration; promoCode?: string },
): Promise<BillingRedirectResponse> {
  return billingRequest('/api/billing/checkout', {
    planCode,
    duration: options?.duration ?? 'monthly',
    ...(options?.promoCode ? { promoCode: options.promoCode } : {}),
  });
}

export function openBillingPortal(): Promise<BillingRedirectResponse> {
  return billingRequest('/api/billing/portal');
}

const PLAN_DISPLAY_NAMES: Record<PlanCode, string> = {
  free: 'Free',
  starter: 'Barista Plus',
  pro: 'Barista Pro',
  team: 'Café Team',
  enterprise: 'Enterprise',
};

export function planDisplayName(code: PlanCode): string {
  return PLAN_DISPLAY_NAMES[code] ?? code;
}

