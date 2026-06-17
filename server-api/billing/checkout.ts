import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
} from '../_shared.js';
import {
  createManualPaymentRequest,
  normalizeManualCurrency,
  persistManualPaymentRequest,
} from './manualPayments.js';

type PlanCode = 'starter' | 'pro' | 'team' | 'enterprise';

const BILLING_RATE_LIMIT = {
  maxRequests: 40,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 8,
  burstWindowMs: 10 * 1000,
} as const;

const VALID_PAID_PLANS = new Set<PlanCode>(['starter', 'pro', 'team', 'enterprise']);

function normalizePlanCode(value: unknown): PlanCode | '' {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_PAID_PLANS.has(raw as PlanCode) ? raw as PlanCode : '';
}

function readUrl(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (/^https:\/\//i.test(value)) return value;
  }
  return '';
}

type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

const VALID_DURATIONS = new Set<BillingDuration>(['monthly', 'quarterly', 'yearly']);

function normalizeDuration(value: unknown): BillingDuration {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_DURATIONS.has(raw as BillingDuration) ? raw as BillingDuration : 'monthly';
}

function normalizePromoCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  return cleaned.length >= 4 ? cleaned : '';
}

function checkoutUrlForPlan(planCode: PlanCode, duration: BillingDuration, promoCode: string): string {
  const suffix = planCode.toUpperCase();
  const durationSuffix = duration.toUpperCase();
  let url = readUrl(
    `BILLING_CHECKOUT_URL_${suffix}_${durationSuffix}`,
    `BILLING_CHECKOUT_URL_${suffix}`,
    `STRIPE_CHECKOUT_URL_${suffix}`,
    `REVENUECAT_CHECKOUT_URL_${suffix}`,
    'BILLING_CHECKOUT_URL',
  );
  if (url && promoCode) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}promo=${encodeURIComponent(promoCode)}`;
  }
  return url;
}

function providerForPlan(planCode: PlanCode): 'stripe' | 'revenuecat' | 'manual' {
  const suffix = planCode.toUpperCase();
  if (readUrl(`STRIPE_CHECKOUT_URL_${suffix}`) || process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (readUrl(`REVENUECAT_CHECKOUT_URL_${suffix}`) || process.env.REVENUECAT_API_KEY) return 'revenuecat';
  return 'manual';
}

function authEmail(user: Record<string, unknown> | undefined): string | undefined {
  const email = user?.email;
  return typeof email === 'string' && email.includes('@') ? email.slice(0, 160) : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/billing/checkout', authResult.auth.userId, BILLING_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Rate limit exceeded',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const planCode = normalizePlanCode(req.body?.planCode);
  if (!planCode) {
    return res.status(400).json({
      ok: false,
      requestId,
      error: 'Paid planCode is required',
      errorCode: 'validation_error',
      details: 'Allowed values: starter, pro, team, enterprise.',
    });
  }

  const duration = normalizeDuration(req.body?.duration);
  const promoCode = normalizePromoCode(req.body?.promoCode);
  const currency = normalizeManualCurrency(req.body?.currency);

  const url = checkoutUrlForPlan(planCode, duration, promoCode);
  if (!url) {
    const manualRequest = createManualPaymentRequest({
      userId: authResult.auth.userId,
      email: authEmail(authResult.auth.user),
      planCode,
      duration,
      currency,
      promoCode: promoCode || undefined,
    });
    if (manualRequest) {
      try {
        await persistManualPaymentRequest(manualRequest);
      } catch (error) {
        console.error('Failed to persist manual payment request:', error);
        return res.status(503).json({
          ok: false,
          requestId,
          error: 'Manual payment storage is not ready',
          errorCode: 'manual_payment_storage_unavailable',
          details: 'Admin review storage must be available before a manual invoice can be created.',
        });
      }
      return res.status(200).json({
        ok: true,
        requestId,
        planCode,
        duration,
        promoCode: promoCode || undefined,
        provider: 'manual',
        mode: 'manual_invoice',
        paymentRequestId: manualRequest.id,
        paymentActionRequired: true,
        manualInvoice: {
          id: manualRequest.id,
          status: manualRequest.status,
          amount: manualRequest.amount,
          amountLabel: manualRequest.amountLabel,
          currency: manualRequest.currency,
          uniqueSuffix: manualRequest.uniqueSuffix,
          instructions: manualRequest.instructions,
          supportLinks: {
            whatsappUrl: manualRequest.instructions.whatsappUrl,
            supportEmail: manualRequest.instructions.supportEmail,
            instagramUrl: manualRequest.instructions.instagramUrl,
          },
          proof: {
            endpoint: '/api/billing/proof',
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          },
          message: 'Manual payment is pending admin review. Paid entitlement is not granted until the payment is verified.',
        },
      });
    }

    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Billing checkout is not configured yet',
      errorCode: 'billing_not_configured',
      details: 'Payments are being prepared for this plan. The Free plan remains available.',
    });
  }

  return res.status(200).json({
    ok: true,
    requestId,
    planCode,
    duration,
    promoCode: promoCode || undefined,
    provider: providerForPlan(planCode),
    mode: 'redirect',
    url,
  });
}
