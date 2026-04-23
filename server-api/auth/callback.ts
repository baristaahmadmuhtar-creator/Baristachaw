import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { applyRateLimitHeaders, checkRateLimit } from '../_shared.js';
import { resolveAuthAppUrl } from './_origin.js';

const AUTH_CALLBACK_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 10 * 60 * 1000,
  burstMaxRequests: 6,
  burstWindowMs: 60 * 1000,
} as const;
const AUTH_CALLBACK_SCRIPT_PATH = '/auth-callback.js';

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

function readCookie(req: VercelRequest, key: string): string {
  const direct = (req.cookies as Record<string, string> | undefined)?.[key];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const raw = String(req.headers.cookie || '');
  if (!raw) return '';

  const parts = raw.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (name !== key) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }

  return '';
}

function sanitizeReturnToPath(raw: string): string {
  const value = String(raw || '').trim();
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const parsed = new URL(value, 'http://baristaclaw.local');
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return '/';
  }
}

function applyCallbackHtmlHeaders(res: VercelResponse): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state } = req.query;
  const jwtSecret = (process.env.JWT_SECRET || '').trim();

  const appUrl = resolveAuthAppUrl(req);
  const appOrigin = appUrl;

  const redirectUri = `${appUrl}/api/auth/callback`;
  const returnTo = sanitizeReturnToPath(readCookie(req, 'oauth_return_to'));

  const limit = checkRateLimit(req, '/api/auth/callback', 'anonymous', AUTH_CALLBACK_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    const message = encodeURIComponent('Too many authentication attempts. Please try again shortly.');
    const encodedReturnTo = encodeURIComponent(returnTo);
    applyCallbackHtmlHeaders(res);
    return res.status(429).send(`
      <html>
        <body>
          <div id="auth-callback-data" data-mode="error" data-error-message="${message}" data-return-to="${encodedReturnTo}"></div>
          <script src="${AUTH_CALLBACK_SCRIPT_PATH}" defer></script>
          <h2>Authentication Rate Limited</h2>
          <p>Too many authentication attempts. Please try again shortly.</p>
        </body>
      </html>
    `);
  }

  try {
    if (!jwtSecret) {
      throw new Error('Server authentication is not configured (JWT_SECRET missing).');
    }

    if (typeof code !== 'string' || !code.trim()) {
      throw new Error('Missing OAuth code');
    }

    const expectedState = readCookie(req, 'oauth_state');
    const receivedState = typeof state === 'string' ? state.trim() : '';
    if (!expectedState || !receivedState || expectedState !== receivedState) {
      throw new Error('Invalid OAuth state');
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Failed to exchange code');
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userInfoResponse.json();
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      provider: 'google',
    };

    const token = jwt.sign({ user }, jwtSecret, { expiresIn: '7d' });

    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const authCookie = `auth_token=${token}; ${buildCookieAttributes({
      maxAgeSeconds: 7 * 24 * 60 * 60,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    })}`;
    const clearStateCookie = `oauth_state=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: 'lax',
    })}`;
    const clearReturnToCookie = `oauth_return_to=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: 'lax',
    })}`;
    res.setHeader('Set-Cookie', [authCookie, clearStateCookie, clearReturnToCookie]);

    const encodedUser = encodeURIComponent(JSON.stringify(user));
    const encodedTargetOrigin = encodeURIComponent(appOrigin || '*');
    const encodedReturnTo = encodeURIComponent(returnTo);

    applyCallbackHtmlHeaders(res);
    res.send(`
      <html>
        <body>
          <div id="auth-callback-data" data-mode="success" data-user="${encodedUser}" data-target-origin="${encodedTargetOrigin}" data-return-to="${encodedReturnTo}"></div>
          <script src="${AUTH_CALLBACK_SCRIPT_PATH}" defer></script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Error:', error);
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    const safeErrorMessage = rawMessage
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const message = encodeURIComponent(rawMessage);

    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const clearStateCookie = `oauth_state=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: 'lax',
    })}`;
    const clearReturnToCookie = `oauth_return_to=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: 'lax',
    })}`;
    res.setHeader('Set-Cookie', [clearStateCookie, clearReturnToCookie]);
    const encodedReturnTo = encodeURIComponent(returnTo);

    applyCallbackHtmlHeaders(res);
    res.status(500).send(`
      <html>
        <body>
          <div id="auth-callback-data" data-mode="error" data-error-message="${message}" data-return-to="${encodedReturnTo}"></div>
          <script src="${AUTH_CALLBACK_SCRIPT_PATH}" defer></script>
          <h2>Authentication Failed</h2>
          <p>${safeErrorMessage}</p>
        </body>
      </html>
    `);
  }
}
