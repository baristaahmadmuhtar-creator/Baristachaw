import { createHash, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export type TestAuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

function parseBooleanEnv(name: string): boolean {
  return String(process.env[name] || '').trim() === '1';
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function getQaAllowedOrigins(): string[] {
  return (process.env.QA_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter(Boolean) as string[];
}

function readHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return value[0].trim();
  return '';
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1' || normalized === '[::1]';
}

function getRequestHostOrigin(req: VercelRequest): string | null {
  const host = readHeaderValue(req.headers['x-forwarded-host']) || readHeaderValue(req.headers.host);
  if (!host) return null;

  const forwardedProto = readHeaderValue(req.headers['x-forwarded-proto']).split(',')[0]?.trim().toLowerCase();
  const protocol = forwardedProto === 'http' || forwardedProto === 'https'
    ? forwardedProto
    : isLocalHostname(host.split(':')[0] || '') ? 'http' : 'https';

  return normalizeOrigin(`${protocol}://${host}`);
}

export function getAllowedTestAuthOrigins(req: VercelRequest): string[] {
  const allowed = new Set<string>(getQaAllowedOrigins());
  const requestHostOrigin = getRequestHostOrigin(req);
  if (requestHostOrigin) allowed.add(requestHostOrigin);
  return Array.from(allowed);
}

export function isTestAuthOriginAllowed(req: VercelRequest): boolean {
  const requestOrigin = normalizeOrigin(readHeaderValue(req.headers.origin));
  if (!requestOrigin) return true;
  return getAllowedTestAuthOrigins(req).includes(requestOrigin);
}

function getRequestId(req: VercelRequest): string {
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && incoming.trim()) return incoming.trim().slice(0, 64);
  if (Array.isArray(incoming) && incoming[0]?.trim()) return incoming[0].trim().slice(0, 64);
  return randomUUID();
}

function getClientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff[0]?.trim()) {
    return xff[0].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function getTestAuthCookieAttributes(): string {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  if (isProduction) return 'Path=/; HttpOnly; Secure; SameSite=None';
  return 'Path=/; HttpOnly; SameSite=Lax';
}

function buildDefaultUser(): TestAuthUser {
  return {
    id: (process.env.QA_TEST_USER_ID || 'qa-test-user').trim(),
    email: (process.env.QA_TEST_USER_EMAIL || 'qa-e2e@example.com').trim(),
    name: (process.env.QA_TEST_USER_NAME || 'QA E2E').trim(),
    picture: (process.env.QA_TEST_USER_PICTURE || 'https://via.placeholder.com/64').trim(),
  };
}

function sanitizeBodyUser(input: unknown): Partial<TestAuthUser> {
  if (!input || typeof input !== 'object') return {};
  const body = input as Record<string, unknown>;
  const pick = (key: keyof TestAuthUser) => (typeof body[key] === 'string' ? body[key].trim() : '');
  return {
    id: pick('id'),
    email: pick('email'),
    name: pick('name'),
    picture: pick('picture'),
  };
}

export function resolveTestUser(body: unknown): TestAuthUser {
  const defaults = buildDefaultUser();
  const incoming = sanitizeBodyUser(body);
  return {
    id: incoming.id || defaults.id,
    email: incoming.email || defaults.email,
    name: incoming.name || defaults.name,
    picture: incoming.picture || defaults.picture,
  };
}

export function applyTestAuthCors(req: VercelRequest, res: VercelResponse): void {
  const origin = readHeaderValue(req.headers.origin);
  if (origin) {
    res.setHeader('Vary', 'Origin');
    if (isTestAuthOriginAllowed(req)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-test-token, x-request-id');
}

export function guardTestAuthRequest(req: VercelRequest): { ok: true; requestId: string; ipHash: string } | { ok: false; status: number; error: string } {
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  const isProd = vercelEnv
    ? vercelEnv === 'production'
    : (process.env.NODE_ENV === 'production' && !process.env.VERCEL);
  // Fail-closed policy: never expose QA auth endpoints on production runtime.
  if (isProd) {
    return { ok: false, status: 404, error: 'Not found' };
  }

  if (!parseBooleanEnv('ENABLE_TEST_AUTH_ENDPOINT')) {
    return { ok: false, status: 404, error: 'Not found' };
  }

  if (!isTestAuthOriginAllowed(req)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const requestId = getRequestId(req);
  const ipHash = hashIp(getClientIp(req));

  const expectedToken = String(process.env.TEST_AUTH_TOKEN || '').trim();
  const providedToken = String(req.headers['x-test-token'] || '').trim();
  if (!expectedToken || providedToken !== expectedToken) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, requestId, ipHash };
}

export function logTestAuthAudit(event: 'login' | 'logout', details: { requestId: string; ipHash: string; origin: string; userId?: string }): void {
  const payload = {
    event,
    requestId: details.requestId,
    ipHash: details.ipHash,
    origin: details.origin,
    userId: details.userId || null,
    at: new Date().toISOString(),
  };
  console.info('[test-auth-audit]', JSON.stringify(payload));
}
