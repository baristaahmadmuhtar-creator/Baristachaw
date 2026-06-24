import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OTP_CODE_LENGTH } from '../../packages/shared/src/domain.js';
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
import { getSupabaseAdminConfig, supabaseAdminRest } from '../_supabaseAdmin.js';

const EMAIL_AUTH_RATE_LIMIT = {
  maxRequests: 18,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 5,
  burstWindowMs: 60 * 1000,
} as const;

const EMAIL_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PasswordAuthMode = 'signIn' | 'signUp';
type EmailAuthMode = PasswordAuthMode | 'reset' | 'updatePassword' | 'sendOtp' | 'verifyOtp' | 'resetStart' | 'resetVerify' | 'resetUpdatePassword';

type SupabaseAuthPayload = Record<string, unknown>;
type AppSessionUser = NonNullable<Awaited<ReturnType<typeof resolveAuthenticatedUser>>> & {
  sessionIssuedAt?: number;
  sessionExpiresAt?: number;
};

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

function withSessionMetadata(user: NonNullable<Awaited<ReturnType<typeof resolveAuthenticatedUser>>>): AppSessionUser {
  const sessionIssuedAt = Date.now();
  return {
    ...user,
    sessionIssuedAt,
    sessionExpiresAt: sessionIssuedAt + EMAIL_SESSION_TTL_SECONDS * 1000,
  };
}

function buildEmailRedirectUrl(pathAndQuery: string): string {
  const appUrl = resolveAppUrl().replace(/\/+$/, '');
  const suffix = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return `${appUrl}${suffix}`;
}

function resolveMode(req: VercelRequest): EmailAuthMode | null {
  const rawMode = readString(req.query.mode || req.body?.mode).toLowerCase();
  if (rawMode === 'signin' || rawMode === 'sign_in' || rawMode === 'login') return 'signIn';
  if (rawMode === 'signup' || rawMode === 'sign_up' || rawMode === 'register') return 'signUp';
  if (rawMode === 'reset' || rawMode === 'recover' || rawMode === 'forgot_password') return 'reset';
  if (rawMode === 'updatepassword' || rawMode === 'update_password' || rawMode === 'set_password') return 'updatePassword';

  const pathQuery = Array.isArray(req.query.path) ? req.query.path.join('/') : readString(req.query.path);
  const urlPath = readString(String(req.url || '').split('?')[0]).toLowerCase();
  const candidate = `${pathQuery}/${urlPath}`.toLowerCase();
  if (candidate.includes('email/signin')) return 'signIn';
  if (candidate.includes('email/signup')) return 'signUp';
  if (candidate.includes('email/reset')) return 'reset';
  if (candidate.includes('email/update-password')) return 'updatePassword';
  if (candidate.includes('email/otp/send')) return 'sendOtp';
  if (candidate.includes('email/otp/verify')) return 'verifyOtp';
  if (candidate.includes('email/password/reset/start')) return 'resetStart';
  if (candidate.includes('email/password/reset/verify')) return 'resetVerify';
  if (candidate.includes('email/password/reset/update')) return 'resetUpdatePassword';
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

async function classifySupabaseAuthFailure(status: number, message: string, mode: PasswordAuthMode, email: string) {
  const text = message.toLowerCase();
  if (status === 429 || text.includes('rate limit')) {
    return { statusCode: 429, errorCode: 'rate_limited', error: 'Too many authentication attempts' };
  }
  if (text.includes('email not confirmed') || text.includes('not confirmed')) {
    return { statusCode: 403, errorCode: 'email_confirmation_required', error: 'Email verification code is required' };
  }
  if (text.includes('already registered') || text.includes('already exists')) {
    return { statusCode: 409, errorCode: 'email_already_registered', error: 'Email is already registered' };
  }
  if (text.includes('weak password') || text.includes('password should') || text.includes('password must')) {
    return { statusCode: 400, errorCode: 'weak_password', error: 'Password does not meet the requirement' };
  }
  if (text.includes('invalid login credentials') || text.includes('invalid credentials') || status === 400) {
    if (mode === 'signIn' && email) {
      const config = getSupabaseAdminConfig();
      if (config.configured) {
        try {
          const users = await supabaseAdminRest<any[]>(
            config,
            `app_users?email=eq.${encodeURIComponent(email)}&select=id&limit=1`
          );
          if (Array.isArray(users) && users.length === 0) {
            return {
              statusCode: 401,
              errorCode: 'email_not_registered',
              error: 'Email is not registered',
            };
          }
        } catch (e) {
          // ignore error and fallback to generic
        }
      }
    }
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
  mode: PasswordAuthMode;
  email: string;
  password: string;
  displayName: string;
}): Promise<SupabaseAuthPayload> {
  const config = resolveSupabaseAuthConfig();
  const redirectTo = buildEmailRedirectUrl('/masuk?confirmed=1');
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
    const failure = await classifySupabaseAuthFailure(response.status, readSupabaseError(payload), params.mode, params.email);
    const error = new Error(failure.error) as Error & { statusCode?: number; errorCode?: string };
    error.statusCode = failure.statusCode;
    error.errorCode = failure.errorCode;
    throw error;
  }

  return payload;
}

async function requestSupabasePasswordReset(email: string): Promise<void> {
  const config = resolveSupabaseAuthConfig();
  const redirectTo = buildEmailRedirectUrl('/masuk?recovery=1');
  const response = await fetch(`${config.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthPayload;

  if (response.ok) return;

  const message = readSupabaseError(payload).toLowerCase();
  const failure =
    response.status === 429 || message.includes('rate limit')
      ? { statusCode: 429, errorCode: 'rate_limited', error: 'Too many password reset attempts' }
      : { statusCode: response.status >= 500 ? 502 : 400, errorCode: 'reset_rejected', error: 'Unable to send reset email' };
  const error = new Error(failure.error) as Error & { statusCode?: number; errorCode?: string };
  error.statusCode = failure.statusCode;
  error.errorCode = failure.errorCode;
  throw error;
}

async function requestSupabasePasswordUpdate(params: {
  accessToken: string;
  password: string;
}): Promise<void> {
  const config = resolveSupabaseAuthConfig();
  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: params.password }),
  });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthPayload;

  if (response.ok) return;

  const message = readSupabaseError(payload).toLowerCase();
  const failure =
    response.status === 401 ||
    response.status === 403 ||
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('expired')
      ? { statusCode: 401, errorCode: 'recovery_token_invalid', error: 'Password reset link is invalid or expired' }
      : message.includes('weak password') || message.includes('password should') || message.includes('password must')
        ? { statusCode: 400, errorCode: 'weak_password', error: 'Password does not meet the requirement' }
        : { statusCode: response.status >= 500 ? 502 : 400, errorCode: 'auth_rejected', error: 'Unable to update password' };
  const error = new Error(failure.error) as Error & { statusCode?: number; errorCode?: string };
  error.statusCode = failure.statusCode;
  error.errorCode = failure.errorCode;
  throw error;
}

async function requestSupabaseOtpVerify(params: {
  email: string;
  token: string;
  type: 'signup' | 'recovery' | 'magiclink';
}): Promise<SupabaseAuthPayload> {
  const config = resolveSupabaseAuthConfig();
  const response = await fetch(`${config.url}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: params.email, token: params.token, type: params.type }),
  });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthPayload;

  if (!response.ok) {
    const message = readSupabaseError(payload).toLowerCase();
    let failure = { statusCode: 400, errorCode: 'otp_invalid', error: 'Invalid or expired code' };
    if (response.status === 429 || message.includes('rate limit')) {
      failure = { statusCode: 429, errorCode: 'otp_rate_limited', error: 'Too many verification attempts' };
    } else if (message.includes('expired')) {
      failure = { statusCode: 400, errorCode: 'otp_expired', error: 'Code has expired' };
    } else if (message.includes('invalid')) {
      failure = { statusCode: 400, errorCode: 'otp_invalid', error: 'Invalid code' };
    }
    const error = new Error(failure.error) as Error & { statusCode?: number; errorCode?: string };
    error.statusCode = failure.statusCode;
    error.errorCode = failure.errorCode;
    throw error;
  }

  return payload;
}

async function requestSupabaseOtpResend(params: {
  email: string;
  type: 'signup' | 'recovery';
}): Promise<void> {
  const config = resolveSupabaseAuthConfig();
  const response = await fetch(`${config.url}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: params.email, type: params.type }),
  });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthPayload;
  if (!response.ok) {
    const message = readSupabaseError(payload).toLowerCase();
    if (response.status === 429 || message.includes('rate limit')) {
      const error = new Error('Too many requests') as Error & { statusCode?: number; errorCode?: string };
      error.statusCode = 429;
      error.errorCode = 'otp_rate_limited';
      throw error;
    }
  }
}

async function resolveAuthenticatedUser(payload: SupabaseAuthPayload) {
  const accessToken = readAccessToken(payload);
  if (!accessToken) return null;
  return resolveAuthenticatedUserFromAccessToken(accessToken);
}

async function resolveAuthenticatedUserFromAccessToken(accessToken: string) {
  const user = await fetchSupabaseProfile(accessToken);
  return decorateUserWithAdminClaims({
    ...user,
    provider: 'email',
    planCode: 'free',
    role: 'user',
  });
}

function setAppSessionCookie(res: VercelResponse, user: AppSessionUser, jwtSecret: string) {
  const token = jwt.sign({ user }, jwtSecret, { expiresIn: EMAIL_SESSION_TTL_SECONDS });
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.setHeader('Set-Cookie', `auth_token=${token}; ${buildCookieAttributes({
    maxAgeSeconds: EMAIL_SESSION_TTL_SECONDS,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  })}`);
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
  const accessToken = readString(req.body?.accessToken || req.body?.access_token);
  const displayName = normalizeDisplayName(req.body?.displayName || req.body?.name);
  let otpToken = readString(req.body?.token || req.body?.otp);
  if (otpToken) {
    otpToken = otpToken.replace(/\D/g, '');
  }

  const needsEmail = mode !== 'updatePassword' && mode !== 'resetUpdatePassword';
  if (needsEmail && (!email || !EMAIL_RE.test(email) || email.length > 254)) {
    return validationError(res, requestId, 'Enter a valid email address');
  }
  const needsPassword = mode === 'signIn' || mode === 'signUp' || mode === 'updatePassword' || mode === 'resetUpdatePassword';
  if (needsPassword && (password.length < 8 || password.length > 128)) {
    return validationError(res, requestId, 'Password must be 8 to 128 characters');
  }
  if ((mode === 'updatePassword' || mode === 'resetUpdatePassword') && !accessToken) {
    return validationError(res, requestId, 'Missing password reset token');
  }
  if (mode === 'verifyOtp' || mode === 'resetVerify') {
    if (!otpToken) {
      return validationError(res, requestId, 'Missing verification code');
    }
    if (otpToken.length !== OTP_CODE_LENGTH) {
      return res.status(400).json({
        ok: false,
        requestId,
        error: 'The verification code looks incomplete. Please enter the full code from your email.',
        errorCode: 'otp_invalid'
      });
    }
  }
  if (mode === 'signUp' && displayName.length > 80) {
    return validationError(res, requestId, 'Display name is too long');
  }

  const rateLimitIdentity = (mode === 'updatePassword' || mode === 'resetUpdatePassword')
    ? createHash('sha256').update(accessToken).digest('hex').slice(0, 24)
    : email;
  const limit = checkRateLimit(req, `/api/auth/email/${mode}`, rateLimitIdentity, EMAIL_AUTH_RATE_LIMIT);
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

  if (mode === 'reset' || mode === 'resetStart') {
    try {
      await requestSupabasePasswordReset(email);
      return res.status(200).json({
        ok: true,
        requestId,
        resetEmailSent: true,
        email,
      });
    } catch (error) {
      // Prevent enumeration: Always return success for generic errors unless it's a rate limit or config error
      const errorCode = readString((error as { errorCode?: string }).errorCode) || 'internal_error';
      if (errorCode === 'rate_limited' || errorCode === 'supabase_not_configured') {
        const statusCode = Number((error as { statusCode?: number }).statusCode) || 500;
        return res.status(statusCode).json({
          ok: false,
          requestId,
          error: sanitizeErrorDetails(error, 160),
          errorCode,
        });
      }
      return res.status(200).json({
        ok: true,
        requestId,
        resetEmailSent: true,
        email,
      });
    }
  }

  if (mode === 'sendOtp') {
    try {
      await requestSupabaseOtpResend({ email, type: 'signup' });
      return res.status(200).json({ ok: true, requestId, email });
    } catch (error) {
      const errorCode = readString((error as { errorCode?: string }).errorCode) || 'internal_error';
      if (errorCode === 'rate_limited') {
        return res.status(429).json({ ok: false, requestId, error: 'Too many requests', errorCode });
      }
      return res.status(200).json({ ok: true, requestId, email }); // generic success
    }
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
    let authPayload: SupabaseAuthPayload | null = null;
    let user: AppSessionUser | null = null;
    let newAccessToken = '';

    if (mode === 'updatePassword' || mode === 'resetUpdatePassword') {
      await requestSupabasePasswordUpdate({ accessToken, password });
      user = await resolveAuthenticatedUserFromAccessToken(accessToken);
    } else if (mode === 'verifyOtp') {
      authPayload = await requestSupabaseOtpVerify({ email, token: otpToken, type: 'signup' });
      user = await resolveAuthenticatedUser(authPayload);
      newAccessToken = readAccessToken(authPayload);
    } else if (mode === 'resetVerify') {
      authPayload = await requestSupabaseOtpVerify({ email, token: otpToken, type: 'recovery' });
      user = await resolveAuthenticatedUser(authPayload);
      newAccessToken = readAccessToken(authPayload);
    } else {
      authPayload = await requestSupabaseEmailAuth({ mode, email, password, displayName });
      user = await resolveAuthenticatedUser(authPayload);
      if (authPayload) {
        newAccessToken = readAccessToken(authPayload);
      }
    }

    if (!user) {
      return res.status(202).json({
        ok: true,
        requestId,
        authenticated: false,
        emailConfirmationRequired: true,
        email,
      });
    }

    const sessionUser = withSessionMetadata(user);
    setAppSessionCookie(res, sessionUser, jwtSecret);

    return res.status(200).json({
      ok: true,
      requestId,
      authenticated: true,
      passwordUpdated: (mode === 'updatePassword' || mode === 'resetUpdatePassword') || undefined,
      accessToken: newAccessToken || undefined,
      user: sessionUser,
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
