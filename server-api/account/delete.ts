import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
  sanitizeErrorDetails,
} from '../_shared.js';
import {
  getSupabaseAdminConfig,
  hashRequestIp,
  insertAdminAuditEvent,
  supabaseAdminRest,
} from '../_supabaseAdmin.js';

const ACCOUNT_DELETE_RATE_LIMIT = {
  maxRequests: 6,
  windowMs: 60 * 60 * 1000,
  burstMaxRequests: 2,
  burstWindowMs: 60 * 1000,
} as const;

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeProvider(value: unknown): 'google' | 'apple' | 'email' | 'guest' | 'unknown' {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'google' || raw === 'apple' || raw === 'email' || raw === 'guest') return raw;
  return 'unknown';
}

function isGuestAccount(userId: string, user: Record<string, unknown>): boolean {
  return userId.startsWith('guest_') || normalizeText(user.provider).toLowerCase() === 'guest' || user.isGuest === true;
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
  ].filter(Boolean).join('; ');
}

function clearAuthCookies(res: VercelResponse) {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.setHeader('Set-Cookie', [
    `auth_token=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    })}`,
    `oauth_state=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: 'lax',
    })}`,
    `oauth_return_to=; ${buildCookieAttributes({
      maxAgeSeconds: 0,
      secure: isProduction,
      sameSite: 'lax',
    })}`,
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/account/delete', authResult.auth.userId, ACCOUNT_DELETE_RATE_LIMIT);
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

  const userId = authResult.auth.userId;
  const user = authResult.auth.user || {};
  if (isGuestAccount(userId, user)) {
    clearAuthCookies(res);
    return res.status(200).json({
      ok: true,
      requestId,
      deleted: true,
      mode: 'guest_session_cleared',
      message: 'Guest session cleared. No permanent account data was stored for guest mode.',
    });
  }

  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Account deletion is not configured',
      errorCode: 'supabase_not_configured',
      details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required before accepting account deletion requests.',
    });
  }

  const now = new Date().toISOString();
  const reason = normalizeText(req.body?.reason).slice(0, 240);
  const email = normalizeText(user.email, `${userId}@deleted.local`);
  const displayName = normalizeText(user.name || user.displayName, 'Deleted account');
  const provider = normalizeProvider(user.provider);
  const row = {
    id: userId,
    email,
    display_name: displayName,
    provider,
    status: 'deleted',
    plan_code: 'free',
    billing_status: 'cancelled',
    billing_provider: 'manual',
    billing_market: 'unknown',
    payment_action_required: false,
    support_note: 'User requested account deletion from self-service privacy panel. Admin must complete retention/provider cleanup.',
    metadata: {
      deletionRequestedAt: now,
      deletionMode: 'soft_delete_pending_retention_review',
      requestedBy: 'self_service',
      reason,
    },
    updated_at: now,
  };

  try {
    await supabaseAdminRest(config, 'app_users?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([row]),
    });

    await insertAdminAuditEvent(config, {
      actor_user_id: userId,
      actor_email: email,
      target_type: 'user',
      target_id: userId,
      action: 'account_deletion_requested',
      detail: 'User requested account deletion. Account was blocked and queued for retention/provider cleanup.',
      after: row,
      severity: 'critical',
      request_id: requestId,
      ip_hash: hashRequestIp(req),
      metadata: {
        deletionRequestedAt: now,
        reason,
      },
    });

    clearAuthCookies(res);
    return res.status(200).json({
      ok: true,
      requestId,
      deleted: true,
      mode: 'soft_delete_pending_retention_review',
      message: 'Account deletion request was recorded. Access is blocked while admin completes retention cleanup.',
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Account deletion failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
