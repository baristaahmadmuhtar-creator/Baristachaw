import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
} from '../_shared.js';
import { verifyMayarWebhookSignature } from './providers/mayar.js';

const MAYAR_WEBHOOK_RATE_LIMIT = {
  maxRequests: 300,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 80,
  burstWindowMs: 10 * 1000,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const limit = checkRateLimit(req, '/api/billing/mayar-webhook', 'mayar', MAYAR_WEBHOOK_RATE_LIMIT);
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

  const signature = verifyMayarWebhookSignature();
  if (!signature.verified) {
    return res.status(501).json({
      ok: false,
      requestId,
      error: 'Mayar webhook signature verification is not implemented because the inspected official Mayar docs do not document a signature algorithm.',
      errorCode: signature.reason,
    });
  }

  return res.status(501).json({
    ok: false,
    requestId,
    error: 'Mayar webhook processing is disabled until official signature verification is available.',
    errorCode: 'mayar_webhook_not_ready',
  });
}
