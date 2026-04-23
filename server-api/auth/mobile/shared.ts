import { sanitizeErrorDetails } from '../../_shared.js';
import type { MobileAuthUser } from './grants.js';

interface MobileOAuthConfig {
  appUrl: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

export function resolveAppUrl(): string {
  const fromEnv = String(process.env.APP_URL || '').trim();
  if (fromEnv) return fromEnv;
  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}

export function resolveMobileAppScheme(): string {
  const raw = String(process.env.MOBILE_APP_SCHEME || 'baristaclaw').trim();
  if (!raw) return 'baristaclaw';
  const normalized = raw.toLowerCase();
  const valid = /^[a-z][a-z0-9+.-]*$/.test(normalized);
  return valid ? normalized : 'baristaclaw';
}

export function resolveMobileAndroidPackage(): string {
  const raw = String(process.env.MOBILE_APP_ANDROID_PACKAGE || 'com.baristaclaw.mobile').trim();
  if (!raw) return 'com.baristaclaw.mobile';
  const normalized = raw.toLowerCase();
  const valid = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(normalized);
  return valid ? normalized : 'com.baristaclaw.mobile';
}

export function resolveMobileOAuthConfig(): MobileOAuthConfig {
  const appUrl = resolveAppUrl();
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();

  if (!clientId || !clientSecret || !jwtSecret) {
    throw new Error('OAuth not configured');
  }

  return {
    appUrl,
    redirectUri: `${appUrl}/api/auth/mobile/callback`,
    clientId,
    clientSecret,
  };
}

export function buildGoogleAuthUrl(config: MobileOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForToken(code: string, config: MobileOAuthConfig): Promise<string> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    throw new Error(sanitizeErrorDetails(tokenPayload?.error_description || 'Failed to exchange code'));
  }

  const accessToken = String(tokenPayload?.access_token || '').trim();
  if (!accessToken) {
    throw new Error('OAuth token exchange did not return access token');
  }

  return accessToken;
}

export async function fetchGoogleProfile(accessToken: string): Promise<MobileAuthUser> {
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const userData = await userInfoResponse.json().catch(() => ({}));
  if (!userInfoResponse.ok) {
    throw new Error(sanitizeErrorDetails(userData?.error || 'Failed to fetch Google user profile'));
  }

  const user = {
    id: String(userData?.id || '').trim(),
    email: String(userData?.email || '').trim(),
    name: String(userData?.name || '').trim(),
    picture: String(userData?.picture || '').trim(),
    provider: 'google' as const,
  };

  if (!user.id) {
    throw new Error('Google user profile missing id');
  }

  return user;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
