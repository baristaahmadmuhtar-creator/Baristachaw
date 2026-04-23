import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { applyCors, applyRateLimitHeaders, checkRateLimit } from '../_shared.js';
import { resolveAuthAppUrl } from './_origin.js';

const AUTH_URL_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 4,
  burstWindowMs: 30 * 1000,
} as const;

function buildCookieAttributes(options: {
  maxAgeSeconds: number;
  secure: boolean;
  sameSite: 'lax' | 'none' | 'strict';
}): string {
  return [
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
    'HttpOnly',
    options.secure ? 'Secure' : '',
    `SameSite=${options.sameSite}`,
  ]
    .filter(Boolean)
    .join('; ');
}

function readReturnToQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = String(value || '').trim();
  if (!text.startsWith('/') || text.startsWith('//')) return '/';
  try {
    const parsed = new URL(text, 'http://baristachaw.local');
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return '/';
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limit = checkRateLimit(req, '/api/auth/url', 'anonymous', AUTH_URL_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Too many authentication attempts',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const appUrl = resolveAuthAppUrl(req);

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    return res.status(503).json({
      error: 'OAuth not configured',
      errorCode: 'oauth_not_configured',
      hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and JWT_SECRET in the active environment.',
    });
  }

  const redirectUri = `${appUrl}/api/auth/callback`;
  const oauthState = randomUUID();
  const returnTo = readReturnToQuery(req.query.returnTo as string | string[] | undefined);
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const cookieAttributes = buildCookieAttributes({
    maxAgeSeconds: 10 * 60,
    secure: isProduction,
    sameSite: 'lax',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: oauthState,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.setHeader('Set-Cookie', [
    `oauth_state=${encodeURIComponent(oauthState)}; ${cookieAttributes}`,
    `oauth_return_to=${encodeURIComponent(returnTo)}; ${cookieAttributes}`,
  ]);
  res.json({ url: authUrl });
}
