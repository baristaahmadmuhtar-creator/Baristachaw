import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
} from '../_shared.js';

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

function checkoutUrlForPlan(planCode: PlanCode): string {
  const suffix = planCode.toUpperCase();
  return readUrl(
    `BILLING_CHECKOUT_URL_${suffix}`,
    `STRIPE_CHECKOUT_URL_${suffix}`,
    `REVENUECAT_CHECKOUT_URL_${suffix}`,
    'BILLING_CHECKOUT_URL',
  );
}

function providerForPlan(planCode: PlanCode): 'stripe' | 'revenuecat' | 'manual' {
  const suffix = planCode.toUpperCase();
  if (readUrl(`STRIPE_CHECKOUT_URL_${suffix}`) || process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (readUrl(`REVENUECAT_CHECKOUT_URL_${suffix}`) || process.env.REVENUECAT_API_KEY) return 'revenuecat';
  return 'manual';
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

  const url = checkoutUrlForPlan(planCode);
  if (!url) {
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
    provider: providerForPlan(planCode),
    mode: 'redirect',
    url,
  });
}
