import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { applyCors, applyRateLimitHeaders, checkRateLimit, getAllowedOrigins } from '../_shared.js';
import { resolveAuthAppUrl } from './_origin.js';

const AUTH_URL_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 4,
  burstWindowMs: 30 * 1000,
} as const;

type WebOAuthProvider = 'google' | 'facebook';

const DEFAULT_FACEBOOK_GRAPH_API_VERSION = 'v25.0';

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

function readProviderQuery(raw: string | string[] | undefined): WebOAuthProvider {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'facebook' ? 'facebook' : 'google';
}

function readReturnToQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = String(value || '').trim();
  if (text.startsWith('/') && !text.startsWith('//')) {
    return text;
  }
  try {
    const parsed = new URL(text);
    const allowed = getAllowedOrigins();
    if (allowed.includes(parsed.origin)) {
      return text;
    }
  } catch {
    // Ignore URL parse error
  }
  return '/';
}

function readFacebookGraphVersion(): string {
  const raw = String(process.env.FACEBOOK_GRAPH_API_VERSION || DEFAULT_FACEBOOK_GRAPH_API_VERSION).trim();
  return /^v\d+\.\d+$/.test(raw) ? raw : DEFAULT_FACEBOOK_GRAPH_API_VERSION;
}

function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: params.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

function buildFacebookAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: 'public_profile,email',
    auth_type: 'rerequest',
    state: params.state,
  });
  return `https://www.facebook.com/${readFacebookGraphVersion()}/dialog/oauth?${query.toString()}`;
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
  const provider = readProviderQuery(req.query.provider as string | string[] | undefined);

  const clientId = provider === 'facebook'
    ? (process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || '').trim()
    : (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    return res.status(503).json({
      error: 'OAuth not configured',
      errorCode: 'oauth_not_configured',
      provider,
      hint: provider === 'facebook'
        ? 'Set FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and JWT_SECRET in the active environment.'
        : 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and JWT_SECRET in the active environment.',
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

  const authUrl = provider === 'facebook'
    ? buildFacebookAuthUrl({ clientId, redirectUri, state: oauthState })
    : buildGoogleAuthUrl({ clientId, redirectUri, state: oauthState });
  res.setHeader('Set-Cookie', [
    `oauth_state=${encodeURIComponent(oauthState)}; ${cookieAttributes}`,
    `oauth_return_to=${encodeURIComponent(returnTo)}; ${cookieAttributes}`,
    `oauth_provider=${encodeURIComponent(provider)}; ${cookieAttributes}`,
  ]);
  res.json({ url: authUrl, provider });
}
