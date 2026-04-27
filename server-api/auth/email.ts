import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  sanitizeErrorDetails,
} from '../_shared.js';
import { decorateUserWithAdminClaims } from '../admin/_access.js';
import { fetchSupabaseProfile, resolveAppUrl, resolveSupabaseAuthConfig } from './mobile/shared.js';

const EMAIL_AUTH_RATE_LIMIT = {
  maxRequests: 18,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 5,
  burstWindowMs: 60 * 1000,
} as const;

const EMAIL_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailAuthMode = 'signIn' | 'signUp';

type SupabaseAuthPayload = Record<string, unknown>;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeEmail(value: unknown): string {
  return readString(value).toLowerCase();
}

function normalizeDisplayName(value: unknown): string {
  return readString(value).replace(/\s+/g, ' ').slice(0, 80);
}

function resolveMode(req: VercelRequest): EmailAuthMode | null {
  const rawMode = readString(req.query.mode || req.body?.mode).toLowerCase();
  if (rawMode === 'signin' || rawMode === 'sign_in' || rawMode === 'login') return 'signIn';
  if (rawMode === 'signup' || rawMode === 'sign_up' || rawMode === 'register') return 'signUp';

  const pathQuery = Array.isArray(req.query.path) ? req.query.path.join('/') : readString(req.query.path);
  const urlPath = readString(String(req.url || '').split('?')[0]).toLowerCase();
  const candidate = `${pathQuery}/${urlPath}`.toLowerCase();
  if (candidate.includes('email/signin')) return 'signIn';
  if (candidate.includes('email/signup')) return 'signUp';
  return null;
}

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

function validationError(res: VercelResponse, requestId: string, error: string) {
  return res.status(400).json({
    ok: false,
    requestId,
    error,
    errorCode: 'validation_error',
  });
}

function readAccessToken(payload: SupabaseAuthPayload): string {
  return readString(payload.access_token) || readString(readObject(payload.session).access_token);
}

function readSupabaseError(payload: SupabaseAuthPayload): string {
  return (
    readString(payload.msg) ||
    readString(payload.message) ||
    readString(payload.error_description) ||
    readString(payload.error) ||
    'Authentication failed'
  );
}

function classifySupabaseAuthFailure(status: number, message: string, mode: EmailAuthMode) {
  const text = message.toLowerCase();
  if (status === 429 || text.includes('rate limit')) {
    return { statusCode: 429, errorCode: 'rate_limited', error: 'Too many authentication attempts' };
  }
  if (text.includes('email not confirmed') || text.includes('not confirmed')) {
    return { statusCode: 403, errorCode: 'email_confirmation_required', error: 'Email confirmation is required' };
  }
  if (text.includes('already registered') || text.includes('already exists')) {
    return { statusCode: 409, errorCode: 'email_already_registered', error: 'Email is already registered' };
  }
  if (text.includes('weak password') || text.includes('password should') || text.includes('password must')) {
    return { statusCode: 400, errorCode: 'weak_password', error: 'Password does not meet the requirement' };
  }
  if (text.includes('invalid login credentials') || text.includes('invalid credentials') || status === 400) {
    return {
      statusCode: mode === 'signIn' ? 401 : 400,
      errorCode: mode === 'signIn' ? 'invalid_credentials' : 'auth_rejected',
      error: mode === 'signIn' ? 'Invalid email or password' : 'Unable to create account',
    };
  }
  return {
    statusCode: status >= 500 ? 502 : 400,
    errorCode: 'auth_rejected',
    error: mode === 'signIn' ? 'Unable to sign in' : 'Unable to create account',
  };
}

async function requestSupabaseEmailAuth(params: {
  mode: EmailAuthMode;
  email: string;
  password: string;
  displayName: string;
}): Promise<SupabaseAuthPayload> {
  const config = resolveSupabaseAuthConfig();
  const appUrl = resolveAppUrl().replace(/\/+$/, '');
  const redirectTo = `${appUrl}/masuk?confirmed=1`;
  const isSignUp = params.mode === 'signUp';
  const url = isSignUp
    ? `${config.url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`
    : `${config.url}/auth/v1/token?grant_type=password`;
  const body = isSignUp
    ? {
        email: params.email,
        password: params.password,
        data: params.displayName
          ? {
              full_name: params.displayName,
              name: params.displayName,
            }
          : undefined,
      }
    : {
        email: params.email,
        password: params.password,
      };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthPayload;

  if (!response.ok) {
    const failure = classifySupabaseAuthFailure(response.status, readSupabaseError(payload), params.mode);
    const error = new Error(failure.error) as Error & { statusCode?: number; errorCode?: string };
    error.statusCode = failure.statusCode;
    error.errorCode = failure.errorCode;
    throw error;
  }

  return payload;
}

async function resolveAuthenticatedUser(payload: SupabaseAuthPayload) {
  const accessToken = readAccessToken(payload);
  if (!accessToken) return null;
  const user = await fetchSupabaseProfile(accessToken);
  return decorateUserWithAdminClaims({
    ...user,
    provider: 'email',
    planCode: 'free',
    role: 'user',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const mode = resolveMode(req);
  if (!mode) {
    return validationError(res, requestId, 'Unknown email authentication mode');
  }

  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const displayName = normalizeDisplayName(req.body?.displayName || req.body?.name);

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return validationError(res, requestId, 'Enter a valid email address');
  }
  if (password.length < 8 || password.length > 128) {
    return validationError(res, requestId, 'Password must be 8 to 128 characters');
  }
  if (mode === 'signUp' && displayName.length > 80) {
    return validationError(res, requestId, 'Display name is too long');
  }

  const limit = checkRateLimit(req, `/api/auth/email/${mode}`, email, EMAIL_AUTH_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Too many authentication attempts',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const jwtSecret = (process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Server authentication is not configured',
      errorCode: 'server_misconfigured',
      hint: 'Set JWT_SECRET in the active environment.',
    });
  }

  try {
    const payload = await requestSupabaseEmailAuth({ mode, email, password, displayName });
    const user = await resolveAuthenticatedUser(payload);

    if (!user) {
      return res.status(202).json({
        ok: true,
        requestId,
        authenticated: false,
        emailConfirmationRequired: true,
        email,
      });
    }

    const token = jwt.sign({ user }, jwtSecret, { expiresIn: EMAIL_SESSION_TTL_SECONDS });
    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.setHeader('Set-Cookie', `auth_token=${token}; ${buildCookieAttributes({
      maxAgeSeconds: EMAIL_SESSION_TTL_SECONDS,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    })}`);

    return res.status(200).json({
      ok: true,
      requestId,
      authenticated: true,
      user,
      expiresInSec: EMAIL_SESSION_TTL_SECONDS,
    });
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode) || 500;
    const errorCode = readString((error as { errorCode?: string }).errorCode) || 'internal_error';
    const isConfigError = /supabase auth not configured|invalid supabase url|hosted https/i.test(sanitizeErrorDetails(error, 220));
    return res.status(isConfigError ? 503 : statusCode).json({
      ok: false,
      requestId,
      error: isConfigError ? 'Supabase Auth is not configured' : sanitizeErrorDetails(error, 160),
      errorCode: isConfigError ? 'supabase_not_configured' : errorCode,
      hint: isConfigError ? 'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the active environment.' : undefined,
    });
  }
}
