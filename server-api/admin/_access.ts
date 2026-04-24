import type { VercelRequest } from '@vercel/node';
import { requireAuth, type AuthContext } from '../_shared.js';

type AdminRole = 'owner' | 'admin' | 'support' | 'analyst' | 'user';

export type AdminAccess = {
  isAdmin: boolean;
  role: AdminRole;
  source: 'claim' | 'email_allowlist' | 'user_id_allowlist' | 'none';
  email?: string;
  userId?: string;
};

export type AdminAccessFailure = {
  ok: false;
  statusCode: 401 | 403 | 500;
  error: string;
  errorCode: 'auth_required' | 'admin_required' | 'server_misconfigured';
};

export type AdminAccessSuccess = {
  ok: true;
  auth: AuthContext;
  admin: AdminAccess;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function parseEnvList(...names: string[]): Set<string> {
  const values = names
    .map((name) => String(process.env[name] || ''))
    .join(',');
  return new Set(
    values
      .split(/[\n,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function readRole(value: unknown): AdminRole {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'owner' || raw === 'super_admin') return 'owner';
  if (raw === 'admin') return 'admin';
  if (raw === 'support') return 'support';
  if (raw === 'analyst') return 'analyst';
  return 'user';
}

function isTrueClaim(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function getAdminAccess(auth: AuthContext): AdminAccess {
  const user = auth.user || {};
  const userId = normalizeText(user.id) || auth.userId;
  const email = normalizeEmail(user.email);
  const role = readRole(user.role || user.adminRole || user.appRole);
  const claimAdmin =
    role === 'owner' ||
    role === 'admin' ||
    isTrueClaim(user.isAdmin) ||
    isTrueClaim(user.admin) ||
    isTrueClaim(user.superAdmin);

  if (claimAdmin) {
    return {
      isAdmin: true,
      role: role === 'user' ? 'admin' : role,
      source: 'claim',
      email,
      userId,
    };
  }

  const adminEmails = parseEnvList('ADMIN_EMAILS', 'ADMIN_BOOTSTRAP_EMAILS', 'ADMIN_ALLOWED_EMAILS');
  if (email && adminEmails.has(email)) {
    return {
      isAdmin: true,
      role: 'owner',
      source: 'email_allowlist',
      email,
      userId,
    };
  }

  const adminUserIds = parseEnvList('ADMIN_USER_IDS', 'ADMIN_BOOTSTRAP_USER_IDS');
  if (userId && adminUserIds.has(userId.toLowerCase())) {
    return {
      isAdmin: true,
      role: 'owner',
      source: 'user_id_allowlist',
      email,
      userId,
    };
  }

  return {
    isAdmin: false,
    role: 'user',
    source: 'none',
    email,
    userId,
  };
}

export function decorateUserWithAdminClaims<T extends object>(user: T): T {
  const userRecord = user as Record<string, unknown>;
  const auth: AuthContext = {
    userId: normalizeText(userRecord.id) || 'unknown',
    user: userRecord,
    tokenSource: 'bearer',
  };
  const access = getAdminAccess(auth);
  if (!access.isAdmin) return user;
  return {
    ...user,
    role: access.role,
    isAdmin: true,
  } as T;
}

export function requireAdmin(req: VercelRequest): AdminAccessFailure | AdminAccessSuccess {
  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return {
      ok: false,
      statusCode: authResult.statusCode,
      error: authResult.error,
      errorCode: authResult.errorCode,
    };
  }

  const admin = getAdminAccess(authResult.auth);
  if (!admin.isAdmin) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Admin access required',
      errorCode: 'admin_required',
    };
  }

  return {
    ok: true,
    auth: authResult.auth,
    admin,
  };
}
