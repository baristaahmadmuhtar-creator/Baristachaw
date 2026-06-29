import { sanitizeErrorDetails } from '../../_shared.js';

export type MayarMode = 'sandbox' | 'production';
export type MayarBillingStatus = 'active' | 'trialing' | 'cancelled' | 'expired' | 'refunded';

export type MayarConfig = {
  configured: boolean;
  mode: MayarMode;
  baseUrl: string;
  checkoutCreatePath: '/hl/v1/invoice/create';
  webhookRegisterPath: '/hl/v1/webhook/register';
  successUrl: string;
  cancelUrl: string;
  webhookPath: string;
  webhookSignatureReady: boolean;
  blockers: string[];
};

export type MayarCheckoutInput = {
  requestId: string;
  userId: string;
  email: string;
  userName?: string;
  mobile?: string;
  planCode: string;
  planDisplayName: string;
  duration: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  amountLabel: string;
  currency: string;
  promoCode?: string;
  redirectUrl?: string;
  description?: string;
  expiresAt?: string;
};

export type MayarCheckoutSession = {
  provider: 'mayar';
  checkoutUrl: string;
  paymentId: string;
  invoiceId: string;
  transactionId: string;
  externalReference: string;
  expiresAt?: string;
  rawMode: MayarMode;
  requestId: string;
};

export type MayarWebhookVerification = {
  verified: boolean;
  reason: 'mayar_webhook_signature_docs_missing' | 'invalid_signature' | 'verified';
};

function envText(name: string): string {
  return String(process.env[name] || '').trim();
}

function safeText(value: unknown, fallback = '', maxLength = 240): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function safeHttpsUrl(value: unknown, fallback = ''): string {
  const raw = safeText(value, fallback, 600);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeMode(value: unknown): MayarMode {
  return safeText(value, '', 24).toLowerCase() === 'production' ? 'production' : 'sandbox';
}

export function normalizeMayarBaseUrl(value: unknown, mode: MayarMode = normalizeMode(process.env.MAYAR_ENV)): string {
  const fallback = mode === 'production' ? 'https://api.mayar.id' : 'https://api.mayar.club';
  const raw = safeHttpsUrl(value, fallback) || fallback;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

function readMayarApiKey(): string {
  return envText('MAYAR_API_KEY');
}

export function getMayarConfig(): MayarConfig {
  const mode = normalizeMode(process.env.MAYAR_ENV);
  const apiKey = readMayarApiKey();
  const webhookSecret = envText('MAYAR_WEBHOOK_SECRET');
  const successUrl = safeHttpsUrl(envText('MAYAR_SUCCESS_URL') || envText('APP_URL'));
  const cancelUrl = safeHttpsUrl(envText('MAYAR_CANCEL_URL') || envText('APP_URL'));
  const webhookPath = safeText(envText('MAYAR_WEBHOOK_PATH'), '/api/billing/mayar-webhook', 120) || '/api/billing/mayar-webhook';
  const blockers: string[] = [];
  if (!apiKey) blockers.push('MAYAR_API_KEY is missing.');
  if (!webhookSecret) blockers.push('MAYAR_WEBHOOK_SECRET is missing.');
  if (!successUrl) blockers.push('MAYAR_SUCCESS_URL or APP_URL must be an https URL.');
  blockers.push('Mayar official webhook signature verification method is not documented in inspected docs.');

  return {
    configured: Boolean(apiKey),
    mode,
    baseUrl: normalizeMayarBaseUrl(envText('MAYAR_BASE_URL'), mode),
    checkoutCreatePath: '/hl/v1/invoice/create',
    webhookRegisterPath: '/hl/v1/webhook/register',
    successUrl,
    cancelUrl,
    webhookPath,
    webhookSignatureReady: false,
    blockers,
  };
}

function normalizeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function defaultExpiryIso(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function normalizeMobile(value: unknown): string {
  return safeText(value, '', 32).replace(/[^\d+]/g, '').slice(0, 24);
}

function safeMayarError(error: unknown): Error {
  return new Error(sanitizeErrorDetails(error, 180) || 'Mayar request failed');
}

export async function createMayarCheckoutSession(input: MayarCheckoutInput): Promise<MayarCheckoutSession> {
  const config = getMayarConfig();
  const apiKey = readMayarApiKey();
  if (!config.configured || !apiKey) throw new Error('mayar_not_configured');
  const email = safeText(input.email, '', 180).toLowerCase();
  const mobile = normalizeMobile(input.mobile);
  const amount = normalizeAmount(input.amount);
  const redirectUrl = safeHttpsUrl(input.redirectUrl || config.successUrl);
  if (!email || !email.includes('@')) throw new Error('mayar_customer_email_required');
  if (!mobile) throw new Error('mayar_customer_mobile_required');
  if (!amount) throw new Error('mayar_amount_required');
  if (!redirectUrl) throw new Error('mayar_redirect_url_required');

  const externalReference = safeText(input.requestId, `mayar_${Date.now()}`, 120);
  const description = safeText(
    input.description,
    `Baristachaw ${input.planDisplayName} ${input.duration}`,
    180,
  );
  const payload = {
    name: safeText(input.userName, email, 120),
    email,
    mobile,
    redirectUrl,
    description,
    expiredAt: safeText(input.expiresAt, '', 80) || defaultExpiryIso(),
    items: [{
      quantity: 1,
      rate: amount,
      description,
    }],
    extraData: {
      noCustomer: safeText(input.userId, '', 120),
      idProd: safeText(input.planCode, '', 80),
      requestId: externalReference,
      userId: safeText(input.userId, '', 120),
      email,
      planCode: safeText(input.planCode, '', 80),
      duration: input.duration,
      amount,
      amountLabel: safeText(input.amountLabel, '', 80),
      currency: safeText(input.currency, '', 12).toLowerCase(),
      promoCode: safeText(input.promoCode, '', 40) || undefined,
    },
  };

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${config.checkoutCreatePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw safeMayarError(error);
  }

  const text = await response.text().catch(() => '');
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`mayar_checkout_failed:${sanitizeErrorDetails(body?.messages || body?.message || text || response.statusText, 140)}`);
  }
  const data = body?.data && typeof body.data === 'object' ? body.data : {};
  const checkoutUrl = safeHttpsUrl(data.link);
  const invoiceId = safeText(data.id, '', 120);
  const transactionId = safeText(data.transactionId || data.transaction_id, '', 120);
  if (!checkoutUrl || !invoiceId) throw new Error('mayar_checkout_response_invalid');

  return {
    provider: 'mayar',
    checkoutUrl,
    paymentId: transactionId || invoiceId,
    invoiceId,
    transactionId,
    externalReference,
    expiresAt: typeof data.expiredAt === 'number' ? new Date(data.expiredAt).toISOString() : safeText(data.expiredAt, '', 80) || undefined,
    rawMode: config.mode,
    requestId: input.requestId,
  };
}

export function mapMayarStatusToBillingStatus(status: unknown): MayarBillingStatus {
  const raw = safeText(status, '', 48).toLowerCase();
  if (raw === 'settled' || raw === 'paid' || raw === 'success' || raw === 'successful' || raw === 'completed') return 'active';
  if (raw === 'pending' || raw === 'waiting' || raw === 'unpaid') return 'trialing';
  if (raw === 'expired') return 'expired';
  if (raw === 'refund' || raw === 'refunded') return 'refunded';
  return 'cancelled';
}

export function verifyMayarWebhookSignature(): MayarWebhookVerification {
  return {
    verified: false,
    reason: 'mayar_webhook_signature_docs_missing',
  };
}
