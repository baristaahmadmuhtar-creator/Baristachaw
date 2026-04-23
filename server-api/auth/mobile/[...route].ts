import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { applyCors, applyRateLimitHeaders, checkRateLimit, createRequestId, sanitizeErrorDetails } from '../../_shared.js';
import { consumeMobileAuthGrant, createMobileAuthGrant, type MobileAuthUser } from './grants.js';
import {
  buildGoogleAuthUrl,
  escapeHtml,
  exchangeGoogleCodeForToken,
  fetchGoogleProfile,
  fetchSupabaseProfile,
  resolveMobileAndroidPackage,
  resolveMobileAppScheme,
  resolveMobileOAuthConfig,
} from './shared.js';

const ACCESS_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const MOBILE_AUTH_PUBLIC_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 6,
  burstWindowMs: 60 * 1000,
} as const;

function enforceMobileAuthRateLimit(req: VercelRequest, res: VercelResponse, routeKey: string): boolean {
  const limit = checkRateLimit(req, routeKey, 'anonymous', MOBILE_AUTH_PUBLIC_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (limit.allowed) return true;
  res.status(429).json({
    ok: false,
    error: 'Too many authentication attempts',
    errorCode: 'rate_limited',
    retryAfterSec: limit.retryAfterSec,
  });
  return false;
}

function routeSegments(req: VercelRequest): string[] {
  const raw = req.query.route;
  if (Array.isArray(raw)) return raw.map(item => String(item || '').trim()).filter(Boolean);
  const text = String(raw || '').trim();
  if (text) return [text];

  const urlPath = String(req.url || '').split('?')[0] || '';
  const prefix = '/api/auth/mobile/';
  const idx = urlPath.indexOf(prefix);
  if (idx >= 0) {
    const suffix = urlPath.slice(idx + prefix.length).trim();
    if (!suffix) return [];
    return suffix.split('/').map(item => item.trim()).filter(Boolean);
  }

  return [];
}

function sendHtml(res: VercelResponse, statusCode: number, html: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  return res.status(statusCode).send(html);
}

function parseBooleanClaim(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

function resolveAppleAudience(): string {
  const bundleId = String(process.env.APPLE_BUNDLE_ID || '').trim();
  if (bundleId) return bundleId;
  const serviceId = String(process.env.APPLE_SERVICE_ID || '').trim();
  if (serviceId) return serviceId;
  return '';
}

function toAppleUser(payload: Record<string, unknown>, body: any): MobileAuthUser {
  const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const tokenEmail = typeof payload.email === 'string' ? payload.email.trim() : '';
  const requestEmail = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = requestEmail || tokenEmail || '';
  const nameFromBody = typeof body?.name === 'string' ? body.name.trim() : '';
  const fallbackName = email ? email.split('@')[0] : 'Apple User';
  const name = nameFromBody || fallbackName || 'Apple User';
  const isPrivateEmail = parseBooleanClaim(payload.is_private_email);

  if (!sub) throw new Error('Apple identity token is missing subject.');

  return {
    id: sub,
    email,
    name,
    picture: '',
    provider: 'apple',
    isPrivateEmail,
  };
}

function applyMobileCors(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, POST, OPTIONS');
}

function signMobileAccessToken(user: MobileAuthUser, jwtSecret: string): { accessToken: string; expiresAt: number } {
  const accessToken = jwt.sign({ user }, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL_SEC });
  return {
    accessToken,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_SEC * 1000,
  };
}

async function handleStart(req: VercelRequest, res: VercelResponse, requestId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceMobileAuthRateLimit(req, res, '/api/auth/mobile/start')) return;

  try {
    const config = resolveMobileOAuthConfig();
    const scheme = resolveMobileAppScheme();
    const state = `mobile.${jwt.sign(
      {
        purpose: 'mobile_oauth',
        nonce: randomUUID(),
      },
      config.jwtSecret,
      {
        expiresIn: '10m',
      },
    )}`;
    const url = buildGoogleAuthUrl(config, state);

    return res.status(200).json({
      ok: true,
      requestId,
      url,
      state,
      redirectUri: config.redirectUri,
      appScheme: scheme,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'OAuth not configured',
      errorCode: 'oauth_not_configured',
      details: sanitizeErrorDetails(error, 180),
      hint: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the active environment.',
    });
  }
}

async function handleCallback(req: VercelRequest, res: VercelResponse, requestId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceMobileAuthRateLimit(req, res, '/api/auth/mobile/callback')) return;

  try {
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    if (!code) throw new Error('Missing OAuth code');

    const config = resolveMobileOAuthConfig('/api/auth/mobile/callback');
    const accessToken = await exchangeGoogleCodeForToken(code, config);
    const user = await fetchGoogleProfile(accessToken);
    const grant = createMobileAuthGrant(user);
    const scheme = resolveMobileAppScheme();
    const androidPackage = resolveMobileAndroidPackage();
    const redirectParams = new URLSearchParams({
      grant: grant.id,
      expiresAt: String(grant.expiresAt),
    });
    const deepLink = `${scheme}://auth?${redirectParams.toString()}`;
    const intentUrl = `intent://auth?${redirectParams.toString()}#Intent;scheme=${scheme};package=${androidPackage};end`;
    const escapedDeepLink = escapeHtml(deepLink);
    const escapedIntentUrl = escapeHtml(intentUrl);

    return sendHtml(
      res,
      200,
      `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BaristaClaw Sign In</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 24px; color: #111;">
    <h2>Sign-in complete</h2>
    <p>Returning to the app…</p>
    <p>If you are not redirected automatically, <a href="${escapedDeepLink}">open BaristaClaw</a>.</p>
    <p style="margin-top: 8px; font-size: 14px; opacity: .72;">Android fallback: <a href="${escapedIntentUrl}">open installed app</a>.</p>
    <script>
      (function () {
        var deepLink = ${JSON.stringify(deepLink)};
        var intentUrl = ${JSON.stringify(intentUrl)};
        var launch = function (url) {
          try {
            window.location.replace(url);
          } catch (error) {
            window.location.href = url;
          }
        };
        launch(deepLink);
        window.setTimeout(function () {
          var ua = navigator.userAgent || '';
          if (/Android/i.test(ua)) {
            launch(intentUrl);
          }
        }, 700);
      })();
    </script>
  </body>
</html>`,
    );
  } catch (error) {
    const details = sanitizeErrorDetails(error, 240);
    const safeDetails = escapeHtml(details);

    try {
      const config = resolveMobileOAuthConfig();
      const retryUrl = buildGoogleAuthUrl(config, 'retry');
      const safeRetryUrl = escapeHtml(retryUrl);
      return sendHtml(
        res,
        500,
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BaristaClaw Sign In Failed</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 24px; color: #111;">
    <h2>Sign-in failed</h2>
    <p>${safeDetails}</p>
    <p><a href="${safeRetryUrl}">Try sign-in again</a></p>
  </body>
</html>`,
      );
    } catch {
      return sendHtml(
        res,
        500,
        `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>BaristaClaw Sign In Failed</title></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 24px; color: #111;">
    <h2>Sign-in failed</h2>
    <p>${safeDetails}</p>
  </body>
</html>`,
      );
    }
  }
}

async function handleExchange(req: VercelRequest, res: VercelResponse, requestId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceMobileAuthRateLimit(req, res, '/api/auth/mobile/exchange')) return;

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
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
    const grantId = typeof req.body?.grantId === 'string' ? req.body.grantId.trim() : '';
    if (!grantId) {
      return res.status(400).json({
        ok: false,
        requestId,
        error: 'grantId is required',
        errorCode: 'validation_error',
      });
    }

    const grant = consumeMobileAuthGrant(grantId);
    if (grant.ok === false) {
      const statusCode = grant.error === 'used_grant' ? 409 : grant.error === 'expired_grant' ? 410 : 404;
      return res.status(statusCode).json({
        ok: false,
        requestId,
        error: grant.error,
        errorCode: grant.error,
      });
    }

    const token = signMobileAccessToken(grant.user, jwtSecret);

    return res.status(200).json({
      ok: true,
      requestId,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      user: grant.user,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Failed to exchange mobile auth grant',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 200),
    });
  }
}

async function handleAppleExchange(req: VercelRequest, res: VercelResponse, requestId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceMobileAuthRateLimit(req, res, '/api/auth/mobile/apple/exchange')) return;

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Server authentication is not configured',
      errorCode: 'server_misconfigured',
      hint: 'Set JWT_SECRET in the active environment.',
    });
  }

  const audience = resolveAppleAudience();
  if (!audience) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Apple Sign-In is not configured',
      errorCode: 'apple_oauth_not_configured',
      hint: 'Set APPLE_BUNDLE_ID in the active environment.',
    });
  }

  try {
    const identityToken = typeof req.body?.identityToken === 'string' ? req.body.identityToken.trim() : '';
    if (!identityToken) {
      return res.status(400).json({
        ok: false,
        requestId,
        error: 'identityToken is required',
        errorCode: 'validation_error',
      });
    }

    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience,
    });

    const user = toAppleUser(payload as Record<string, unknown>, req.body);
    const token = signMobileAccessToken(user, jwtSecret);

    return res.status(200).json({
      ok: true,
      requestId,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      user,
    });
  } catch (error) {
    return res.status(401).json({
      ok: false,
      requestId,
      error: 'Failed to verify Apple identity token',
      errorCode: 'apple_token_invalid',
      details: sanitizeErrorDetails(error, 200),
    });
  }
}

async function handleSupabaseExchange(req: VercelRequest, res: VercelResponse, requestId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceMobileAuthRateLimit(req, res, '/api/auth/mobile/supabase/exchange')) return;

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
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
    const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
    if (!accessToken) {
      return res.status(400).json({
        ok: false,
        requestId,
        error: 'accessToken is required',
        errorCode: 'validation_error',
      });
    }

    const user = await fetchSupabaseProfile(accessToken);
    const token = signMobileAccessToken(user, jwtSecret);

    return res.status(200).json({
      ok: true,
      requestId,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      user,
    });
  } catch (error) {
    const details = sanitizeErrorDetails(error, 220);
    const isConfigError = /supabase auth not configured|invalid supabase url|hosted https/i.test(details);
    return res.status(isConfigError ? 503 : 401).json({
      ok: false,
      requestId,
      error: isConfigError ? 'Supabase Auth is not configured' : 'Failed to verify Supabase session',
      errorCode: isConfigError ? 'supabase_not_configured' : 'supabase_token_invalid',
      details,
      hint: isConfigError ? 'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the active environment.' : undefined,
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyMobileCors(req, res);
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const route = routeSegments(req);
  const routeKey = route.join('/');

  if (routeKey === 'start') return handleStart(req, res, requestId);
  if (routeKey === 'callback') return handleCallback(req, res, requestId);
  if (routeKey === 'exchange') return handleExchange(req, res, requestId);
  if (routeKey === 'apple/exchange') return handleAppleExchange(req, res, requestId);
  if (routeKey === 'supabase/exchange') return handleSupabaseExchange(req, res, requestId);

  return res.status(404).json({
    ok: false,
    requestId,
    error: `Unknown mobile auth route: ${routeKey || '(empty)'}`,
  });
}




