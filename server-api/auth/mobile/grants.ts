import { randomUUID } from 'node:crypto';

export interface MobileAuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  provider: 'google' | 'facebook' | 'apple' | 'email' | 'guest';
  isPrivateEmail?: boolean;
}

interface MobileAuthGrantRecord {
  id: string;
  user: MobileAuthUser;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
}

const MOBILE_AUTH_GRANTS = new Map<string, MobileAuthGrantRecord>();
const DEFAULT_MOBILE_AUTH_GRANT_TTL_SEC = 120;
const MIN_MOBILE_AUTH_GRANT_TTL_SEC = 30;
const MAX_MOBILE_AUTH_GRANT_TTL_SEC = 600;
const USED_GRANT_RETENTION_MS = 10 * 60 * 1000;

function readGrantTtlMs(): number {
  const raw = Number.parseInt(String(process.env.MOBILE_AUTH_GRANT_TTL_SEC || ''), 10);
  const ttlSec = Number.isFinite(raw)
    ? Math.max(MIN_MOBILE_AUTH_GRANT_TTL_SEC, Math.min(MAX_MOBILE_AUTH_GRANT_TTL_SEC, raw))
    : DEFAULT_MOBILE_AUTH_GRANT_TTL_SEC;
  return ttlSec * 1000;
}

function cleanupMobileAuthGrants(now = Date.now()): void {
  for (const [grantId, grant] of MOBILE_AUTH_GRANTS.entries()) {
    const usedAndStale = typeof grant.usedAt === 'number' && (now - grant.usedAt) > USED_GRANT_RETENTION_MS;
    const expiredAndStale = now > grant.expiresAt && (now - grant.expiresAt) > USED_GRANT_RETENTION_MS;
    if (usedAndStale || expiredAndStale) {
      MOBILE_AUTH_GRANTS.delete(grantId);
    }
  }
}

export function createMobileAuthGrant(user: MobileAuthUser): { id: string; expiresAt: number } {
  const now = Date.now();
  cleanupMobileAuthGrants(now);

  const id = randomUUID();
  const expiresAt = now + readGrantTtlMs();

  MOBILE_AUTH_GRANTS.set(id, {
    id,
    user,
    createdAt: now,
    expiresAt,
  });

  return { id, expiresAt };
}

export type ConsumeMobileAuthGrantResult =
  | { ok: true; user: MobileAuthUser; expiresAt: number }
  | { ok: false; error: 'invalid_grant' | 'expired_grant' | 'used_grant' };

export function consumeMobileAuthGrant(grantId: string): ConsumeMobileAuthGrantResult {
  const now = Date.now();
  cleanupMobileAuthGrants(now);

  const normalizedGrantId = grantId.trim();
  if (!normalizedGrantId) {
    return { ok: false, error: 'invalid_grant' };
  }

  const record = MOBILE_AUTH_GRANTS.get(normalizedGrantId);
  if (!record) {
    return { ok: false, error: 'invalid_grant' };
  }

  if (typeof record.usedAt === 'number') {
    return { ok: false, error: 'used_grant' };
  }

  if (now > record.expiresAt) {
    MOBILE_AUTH_GRANTS.delete(normalizedGrantId);
    return { ok: false, error: 'expired_grant' };
  }

  record.usedAt = now;
  MOBILE_AUTH_GRANTS.set(normalizedGrantId, record);

  return {
    ok: true,
    user: record.user,
    expiresAt: record.expiresAt,
  };
}

// Test-only helpers
export function __resetMobileAuthGrantsForTests(): void {
  MOBILE_AUTH_GRANTS.clear();
}

export function __getMobileAuthGrantForTests(grantId: string): MobileAuthGrantRecord | undefined {
  return MOBILE_AUTH_GRANTS.get(grantId);
}
