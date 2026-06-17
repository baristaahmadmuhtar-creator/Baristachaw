import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
} from '../_shared.js';
import { readManualPaymentInstructions } from './manualPayments.js';

const BILLING_RATE_LIMIT = {
  maxRequests: 40,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 8,
  burstWindowMs: 10 * 1000,
} as const;

function readUrl(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (/^https:\/\//i.test(value)) return value;
  }
  return '';
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

  const limit = checkRateLimit(req, '/api/billing/portal', authResult.auth.userId, BILLING_RATE_LIMIT);
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

  const url = readUrl('BILLING_PORTAL_URL', 'STRIPE_CUSTOMER_PORTAL_URL', 'REVENUECAT_CUSTOMER_CENTER_URL');
  if (!url) {
    const instructions = readManualPaymentInstructions('Billing portal support', undefined, {
      allowFallbackInstructions: true,
    });
    return res.status(200).json({
      ok: true,
      requestId,
      mode: 'manual_support',
      provider: 'manual',
      paymentActionRequired: true,
      supportLinks: {
        whatsappUrl: instructions?.whatsappUrl,
        supportEmail: instructions?.supportEmail,
        instagramUrl: instructions?.instagramUrl,
      },
      message: 'Self-service billing portal is not enabled yet. Contact support to review payment status, send proof, or request plan changes.',
    });
  }

  return res.status(200).json({
    ok: true,
    requestId,
    mode: 'redirect',
    url,
  });
}
