import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  requireAuth,
  sanitizeErrorDetails,
} from '../_shared.js';
import {
  getSupabaseAdminConfig,
  hashRequestIp,
  insertAdminAuditEvent,
  supabaseAdminRest,
} from '../_supabaseAdmin.js';

const ACCOUNT_EXPORT_RATE_LIMIT = {
  maxRequests: 12,
  windowMs: 60 * 60 * 1000,
  burstMaxRequests: 3,
  burstWindowMs: 60 * 1000,
} as const;

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'account';
}

async function loadRows<T>(
  config: Extract<ReturnType<typeof getSupabaseAdminConfig>, { configured: true }>,
  path: string,
  warnings: string[],
  label: string,
): Promise<T[]> {
  try {
    const rows = await supabaseAdminRest<T[]>(config, path);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    warnings.push(`${label} skipped: ${sanitizeErrorDetails(error, 160)}`);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/account/export', authResult.auth.userId, ACCOUNT_EXPORT_RATE_LIMIT);
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

  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Account export is not configured',
      errorCode: 'supabase_not_configured',
      details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for production account export.',
    });
  }

  const userId = authResult.auth.userId;
  const user = authResult.auth.user || {};
  const email = normalizeText(user.email);
  const encodedUserId = encodeURIComponent(userId);
  const warnings: string[] = [];

  try {
    const [
      profileRows,
      usageRows,
      entitlementRows,
      receiptRows,
      auditRows,
    ] = await Promise.all([
      loadRows<Record<string, unknown>>(config, `app_users?id=eq.${encodedUserId}&select=*`, warnings, 'Account profile'),
      loadRows<Record<string, unknown>>(config, `app_usage_daily?user_id=eq.${encodedUserId}&select=*&order=usage_date.desc&limit=366`, warnings, 'Usage history'),
      loadRows<Record<string, unknown>>(config, `user_entitlements?user_id=eq.${encodedUserId}&select=*&order=updated_at.desc&limit=100`, warnings, 'Entitlement history'),
      loadRows<Record<string, unknown>>(config, `payment_receipts?user_id=eq.${encodedUserId}&select=*&order=created_at.desc&limit=100`, warnings, 'Payment receipts'),
      loadRows<Record<string, unknown>>(config, `admin_audit_events?target_type=eq.user&target_id=eq.${encodedUserId}&select=*&order=created_at.desc&limit=200`, warnings, 'Audit events'),
    ]);

    await insertAdminAuditEvent(config, {
      actor_user_id: userId,
      actor_email: email || null,
      target_type: 'user',
      target_id: userId,
      action: 'account_exported',
      detail: 'User downloaded account export.',
      severity: 'info',
      request_id: requestId,
      ip_hash: hashRequestIp(req),
      metadata: {
        exportVersion: 1,
        warningCount: warnings.length,
      },
    }).catch((error) => {
      warnings.push(`Audit write skipped: ${sanitizeErrorDetails(error, 140)}`);
    });

    const generatedAt = new Date().toISOString();
    const datePart = generatedAt.slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="baristachaw-account-export-${safeFilePart(userId)}-${datePart}.json"`);
    return res.status(200).json({
      ok: true,
      requestId,
      generatedAt,
      exportVersion: 1,
      account: {
        userId,
        email: email || undefined,
        name: normalizeText(user.name || user.displayName) || undefined,
        provider: normalizeText(user.provider, 'unknown'),
        tokenSource: authResult.auth.tokenSource,
      },
      data: {
        profile: profileRows[0] || null,
        usageDaily: usageRows,
        entitlements: entitlementRows,
        paymentReceipts: receiptRows,
        auditEvents: auditRows,
      },
      warnings,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Account export failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
