import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
} from '../_shared.js';
import { getSupabaseConfig, supabaseAdminRest } from '../_supabaseAdmin.js';

const PUBLIC_PRICING_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 20,
  burstWindowMs: 10 * 1000,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300'); // Short cache for dynamic pricing

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
  const limit = checkRateLimit(req, '/api/billing/pricing', clientIp, PUBLIC_PRICING_RATE_LIMIT);
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

  const config = getSupabaseConfig();
  if (!config.configured) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Supabase is not configured. Fallback to hardcoded prices recommended.',
      errorCode: 'supabase_not_configured',
    });
  }

  try {
    const prices = await supabaseAdminRest<any[]>(config, 'rest/v1/plan_prices?is_active=is.true&select=id,plan_code,duration,currency,original_price,discount_price,is_active');

    return res.status(200).json({
      ok: true,
      requestId,
      prices: prices || [],
    });
  } catch (error) {
    console.error('Fatal error fetching prices:', error);
    return res.status(500).json({ ok: false, requestId, error: 'Internal server error', errorCode: 'internal_error' });
  }
}
