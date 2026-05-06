import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  sanitizeErrorDetails,
} from '../_shared.js';
import {
  getSupabaseAdminConfig,
  hashRequestIp,
  insertAdminAuditEvent,
} from '../_supabaseAdmin.js';

const MONITORING_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 20,
  burstWindowMs: 10 * 1000,
} as const;

function normalizeText(value: unknown, maxLen: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

function normalizeSurface(value: unknown): 'web' | 'pwa' | 'mobile' | 'admin' | 'unknown' {
  const raw = normalizeText(value, 20).toLowerCase();
  if (raw === 'web' || raw === 'pwa' || raw === 'mobile' || raw === 'admin') return raw;
  return 'unknown';
}

function safePathFromUrl(value: unknown): string {
  const raw = normalizeText(value, 300);
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'https://baristachaw.local');
    return parsed.pathname.slice(0, 300);
  } catch {
    return raw.slice(0, 120);
  }
}

function normalizeSeverity(value: unknown): 'info' | 'warning' | 'critical' {
  const raw = normalizeText(value, 20).toLowerCase();
  if (raw === 'info' || raw === 'warning' || raw === 'critical') return raw;
  return 'warning';
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

  const limit = checkRateLimit(req, '/api/monitoring/error', 'client', MONITORING_RATE_LIMIT);
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

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = sanitizeErrorDetails(normalizeText((body as any).message, 260, 'Client error'), 260) || 'Client error';
  const source = normalizeSurface((body as any).source);
  const route = safePathFromUrl((body as any).url || (body as any).route);
  const component = normalizeText((body as any).component, 80);
  const errorName = normalizeText((body as any).name, 80);
  const release = normalizeText((body as any).release, 80);
  const stack = sanitizeErrorDetails(normalizeText((body as any).stack, 1200), 900);
  const userId = normalizeText((body as any).userId, 80);
  const severity = normalizeSeverity((body as any).severity);
  const occurredAt = new Date().toISOString();

  const event = {
    requestId,
    occurredAt,
    source,
    route,
    component,
    errorName,
    message,
    release,
    hasStack: Boolean(stack),
    severity,
  };
  const level = severity === 'critical' ? 'error' : severity === 'info' ? 'info' : 'warn';
  console[level](JSON.stringify({ level, type: 'client_error_reported', ...event }));

  const config = getSupabaseAdminConfig();
  if (config.configured) {
    await insertAdminAuditEvent(config, {
      actor_user_id: userId || null,
      actor_email: null,
      target_type: 'client_error',
      target_id: route || source,
      action: 'client_error_reported',
      detail: `${source} ${component || 'app'}: ${message}`,
      severity,
      request_id: requestId,
      ip_hash: hashRequestIp(req),
      metadata: {
        ...event,
        stack,
      },
    }).catch((error) => {
      console.error(JSON.stringify({
        level: 'warn',
        type: 'client_error_audit_write_failed',
        requestId,
        details: sanitizeErrorDetails(error, 180),
      }));
    });
  }

  return res.status(200).json({ ok: true, requestId });
}
