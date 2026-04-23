import { sanitizeErrorDetails } from '../../_shared.js';
import type { MobileAuthUser } from './grants.js';

interface MobileOAuthConfig {
  appUrl: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

interface SupabaseAuthConfig {
  url: string;
  publishableKey: string;
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

export function resolveSupabaseAuthConfig(): SupabaseAuthConfig {
  const rawUrl = String(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const publishableKey = String(
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    '',
  ).trim();

  if (!rawUrl || !publishableKey) {
    throw new Error('Supabase Auth not configured');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid Supabase URL');
  }

  if (parsed.protocol !== 'https:' || !/\.supabase\.co$/i.test(parsed.hostname)) {
    throw new Error('Supabase URL must be a hosted HTTPS project URL');
  }

  return { url: rawUrl, publishableKey };
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

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSupabaseProvider(userData: Record<string, unknown>): MobileAuthUser['provider'] {
  const appMetadata = readObject(userData.app_metadata);
  const provider = readString(appMetadata.provider).toLowerCase();
  if (provider === 'google') return 'google';

  const identities = Array.isArray(userData.identities) ? userData.identities : [];
  const hasGoogleIdentity = identities.some((identity) => readString(readObject(identity).provider).toLowerCase() === 'google');
  return hasGoogleIdentity ? 'google' : 'email';
}

export async function fetchSupabaseProfile(accessToken: string, config = resolveSupabaseAuthConfig()): Promise<MobileAuthUser> {
  const token = accessToken.trim();
  if (!token) {
    throw new Error('Missing Supabase access token');
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: config.publishableKey,
    },
  });

  const userData = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = readString(userData.msg) || readString(userData.message) || readString(userData.error_description) || 'Failed to verify Supabase session';
    throw new Error(sanitizeErrorDetails(message));
  }

  const userMetadata = readObject(userData.user_metadata);
  const email = readString(userData.email);
  const name =
    readString(userMetadata.full_name) ||
    readString(userMetadata.name) ||
    (email ? email.split('@')[0] : 'BaristaClaw User');
  const picture = readString(userMetadata.avatar_url) || readString(userMetadata.picture);
  const id = readString(userData.id);

  if (!id) {
    throw new Error('Supabase user profile missing id');
  }

  return {
    id,
    email,
    name,
    picture,
    provider: normalizeSupabaseProvider(userData),
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
