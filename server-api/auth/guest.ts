import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
  sanitizeErrorDetails,
} from '../_shared.js';

const GUEST_AUTH_RATE_LIMIT = {
  maxRequests: 12,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 4,
  burstWindowMs: 60 * 1000,
} as const;

const GUEST_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type GuestUser = {
  id: string;
  name: string;
  role: 'user';
  provider: 'guest';
  planCode: 'free';
  isGuest: true;
};

function buildCookieAttributes(options: {
  maxAgeSeconds: number;
  secure: boolean;
  sameSite: 'lax' | 'none' | 'strict';
}): string {
  const sameSite = options.sameSite === 'none'
    ? 'None'
    : options.sameSite === 'strict'
      ? 'Strict'
      : 'Lax';
  return [
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
    'HttpOnly',
    options.secure ? 'Secure' : '',
    `SameSite=${sameSite}`,
  ]
    .filter(Boolean)
    .join('; ');
}

function createGuestUser(): GuestUser {
  const id = `guest_${crypto.randomUUID().replace(/-/g, '')}`;
  return {
    id,
    name: 'Guest Barista',
    role: 'user',
    provider: 'guest',
    planCode: 'free',
    isGuest: true,
  };
}

function isGuestUser(value: unknown): value is GuestUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return user.provider === 'guest' && typeof user.id === 'string' && user.id.startsWith('guest_');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const limit = checkRateLimit(req, '/api/auth/guest', 'anonymous', GUEST_AUTH_RATE_LIMIT);
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

  try {
    const secret = (process.env.JWT_SECRET || '').trim();
    if (!secret) {
      return res.status(500).json({
        ok: false,
        requestId,
        error: 'Server authentication is not configured',
        errorCode: 'server_misconfigured',
        hint: 'Set JWT_SECRET in the active environment.',
      });
    }

    const existingAuth = requireAuth(req);
    const existingUser = existingAuth.ok ? existingAuth.auth.user : null;
    const user = isGuestUser(existingUser) ? existingUser : createGuestUser();
    const token = jwt.sign({ user }, secret, { expiresIn: GUEST_SESSION_TTL_SECONDS });
    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

    res.setHeader('Set-Cookie', `auth_token=${token}; ${buildCookieAttributes({
      maxAgeSeconds: GUEST_SESSION_TTL_SECONDS,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    })}`);

    return res.status(200).json({
      ok: true,
      requestId,
      authenticated: true,
      user,
      expiresInSec: GUEST_SESSION_TTL_SECONDS,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Guest session failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 180),
    });
  }
}
