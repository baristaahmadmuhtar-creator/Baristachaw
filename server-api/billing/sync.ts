import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  sanitizeErrorDetails,
} from '../_shared.js';
import {
  getSupabaseAdminConfig,
  hashRequestIp,
  insertAdminAuditEvent,
  supabaseAdminRest,
} from '../_supabaseAdmin.js';

type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
type BillingStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'refunded';
type BillingProvider = 'admin' | 'google_play' | 'app_store' | 'stripe' | 'revenuecat' | 'manual' | 'midtrans' | 'xendit';
type BillingMarket = 'indonesia' | 'brunei' | 'global' | 'unknown';

const BILLING_SYNC_RATE_LIMIT = {
  maxRequests: 240,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 60,
  burstWindowMs: 10 * 1000,
} as const;

const PLAN_CODES = new Set<PlanCode>(['free', 'starter', 'pro', 'team', 'enterprise']);
const BILLING_STATUSES = new Set<BillingStatus>(['active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded']);
const BILLING_PROVIDERS = new Set<BillingProvider>(['admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual', 'midtrans', 'xendit']);

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizePlanCode(value: unknown): PlanCode | '' {
  const raw = normalizeText(value).toLowerCase();
  return PLAN_CODES.has(raw as PlanCode) ? raw as PlanCode : '';
}

function normalizeBillingStatus(value: unknown): BillingStatus | '' {
  const raw = normalizeText(value).toLowerCase();
  return BILLING_STATUSES.has(raw as BillingStatus) ? raw as BillingStatus : '';
}

function normalizeBillingProvider(value: unknown): BillingProvider | '' {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'google') return 'google_play';
  if (raw === 'apple') return 'app_store';
  return BILLING_PROVIDERS.has(raw as BillingProvider) ? raw as BillingProvider : '';
}

function normalizeBillingMarket(value: unknown): BillingMarket {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'id' || raw === 'idn' || raw === 'indonesia') return 'indonesia';
  if (raw === 'bn' || raw === 'brn' || raw === 'brunei' || raw === 'brunei darussalam') return 'brunei';
  if (raw === 'global') return 'global';
  return 'unknown';
}

function readSecret(): string {
  return normalizeText(
    process.env.BILLING_SYNC_TOKEN
      || process.env.BILLING_WEBHOOK_SECRET
      || process.env.REVENUECAT_WEBHOOK_SECRET
      || process.env.STRIPE_WEBHOOK_SECRET
      || process.env.MIDTRANS_WEBHOOK_SECRET
      || process.env.XENDIT_WEBHOOK_TOKEN,
  );
}

function getSubmittedToken(req: VercelRequest): string {
  const headerToken = req.headers['x-billing-sync-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim();
  const authHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] || '' : req.headers.authorization || '';
  const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function tokenMatches(expected: string, submitted: string): boolean {
  if (!expected || !submitted) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(submitted);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function isActivePaidStatus(status: BillingStatus): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

function paymentActionRequiredFor(status: BillingStatus): boolean {
  return status === 'past_due';
}

function appPlanFor(status: BillingStatus, planCode: PlanCode): PlanCode {
  if (!isActivePaidStatus(status)) return 'free';
  return planCode;
}

function appStatusFor(status: BillingStatus): 'active' | 'trialing' | 'past_due' {
  if (status === 'past_due') return 'past_due';
  if (status === 'trialing') return 'trialing';
  return 'active';
}

async function resolveUserId(
  config: Extract<ReturnType<typeof getSupabaseAdminConfig>, { configured: true }>,
  inputUserId: string,
  email: string,
): Promise<string> {
  if (inputUserId) {
    const rows = await supabaseAdminRest<Array<{ id: string }>>(
      config,
      `app_users?id=eq.${encodeURIComponent(inputUserId)}&select=id&limit=1`,
    );
    return Array.isArray(rows) && rows[0]?.id ? inputUserId : '';
  }
  if (!email) return '';
  const rows = await supabaseAdminRest<Array<{ id: string }>>(
    config,
    `app_users?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
  );
  return Array.isArray(rows) && rows[0]?.id ? rows[0].id : '';
}

async function upsertEntitlement(
  config: Extract<ReturnType<typeof getSupabaseAdminConfig>, { configured: true }>,
  row: Record<string, unknown>,
  externalSubscriptionId: string,
  provider: BillingProvider,
): Promise<void> {
  if (externalSubscriptionId) {
    const existing = await supabaseAdminRest<Array<{ id: string }>>(
      config,
      `user_entitlements?external_subscription_id=eq.${encodeURIComponent(externalSubscriptionId)}&source=eq.${encodeURIComponent(provider)}&select=id&limit=1`,
    );
    if (Array.isArray(existing) && existing[0]?.id) {
      await supabaseAdminRest(config, `user_entitlements?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      return;
    }
  }

  await supabaseAdminRest(config, 'user_entitlements', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([row]),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const limit = checkRateLimit(req, '/api/billing/sync', 'provider', BILLING_SYNC_RATE_LIMIT);
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

  const expectedSecret = readSecret();
  if (!expectedSecret) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Billing sync token is not configured',
      errorCode: 'billing_sync_not_configured',
    });
  }
  if (!tokenMatches(expectedSecret, getSubmittedToken(req))) {
    return res.status(401).json({
      ok: false,
      requestId,
      error: 'Invalid billing sync token',
      errorCode: 'billing_sync_unauthorized',
    });
  }

  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Supabase is not configured',
      errorCode: 'supabase_not_configured',
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const planCode = normalizePlanCode((body as any).planCode || (body as any).plan_code);
  const status = normalizeBillingStatus((body as any).status || (body as any).billingStatus);
  const provider = normalizeBillingProvider((body as any).provider || (body as any).source);
  const email = normalizeText((body as any).email).toLowerCase();
  const inputUserId = normalizeText((body as any).userId || (body as any).user_id);
  const externalCustomerId = normalizeText((body as any).customerId || (body as any).customer_id || (body as any).externalCustomerId);
  const externalSubscriptionId = normalizeText((body as any).subscriptionId || (body as any).subscription_id || (body as any).externalSubscriptionId);
  const eventId = normalizeText((body as any).eventId || (body as any).event_id);
  const market = normalizeBillingMarket((body as any).market || (body as any).country);
  const currentPeriodStart = parseDate((body as any).currentPeriodStart || (body as any).periodStart || (body as any).current_period_start);
  const currentPeriodEnd = parseDate((body as any).currentPeriodEnd || (body as any).periodEnd || (body as any).current_period_end);
  const occurredAt = parseDate((body as any).occurredAt || (body as any).eventTime || (body as any).createdAt) || new Date().toISOString();

  if (!planCode || !status || !provider || (!inputUserId && !email)) {
    return res.status(400).json({
      ok: false,
      requestId,
      error: 'Invalid billing sync payload',
      errorCode: 'validation_error',
      details: 'Required: provider, status, planCode, and userId or email.',
    });
  }

  try {
    const userId = await resolveUserId(config, inputUserId, email);
    if (!userId) {
      return res.status(404).json({
        ok: false,
        requestId,
        error: 'Billing user was not found',
        errorCode: 'user_not_found',
      });
    }

    const nextPlanCode = appPlanFor(status, planCode);
    const paymentActionRequired = paymentActionRequiredFor(status);
    const metadata = {
      billingSyncVersion: 1,
      eventId,
      provider,
      market,
      occurredAt,
      rawStatus: status,
    };

    await upsertEntitlement(config, {
      user_id: userId,
      plan_code: planCode,
      source: provider,
      status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      external_customer_id: externalCustomerId || null,
      external_subscription_id: externalSubscriptionId || null,
      metadata,
      updated_at: occurredAt,
    }, externalSubscriptionId, provider);

    const appUserPatch: Record<string, unknown> = {
      plan_code: nextPlanCode,
      status: appStatusFor(status),
      billing_status: status,
      billing_provider: provider,
      billing_market: market,
      billing_customer_id: externalCustomerId,
      billing_subscription_id: externalSubscriptionId,
      billing_period_start: currentPeriodStart,
      billing_period_end: currentPeriodEnd,
      billing_last_event_at: occurredAt,
      payment_action_required: paymentActionRequired,
      support_note: status === 'past_due'
        ? 'Billing provider marked the subscription past due. User should update payment method.'
        : status === 'active' || status === 'trialing'
          ? 'Billing provider confirmed active entitlement.'
          : 'Billing provider ended the paid entitlement. User was moved to Free.',
      metadata,
      updated_at: occurredAt,
    };

    await supabaseAdminRest(config, `app_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(appUserPatch),
    });

    await insertAdminAuditEvent(config, {
      actor_user_id: null,
      actor_email: provider,
      target_type: 'user',
      target_id: userId,
      action: 'billing_lifecycle_synced',
      detail: `Billing sync ${provider} ${status} for ${planCode}.`,
      after: appUserPatch,
      severity: status === 'past_due' || status === 'refunded' ? 'warning' : 'info',
      request_id: requestId,
      ip_hash: hashRequestIp(req),
      metadata,
    });

    return res.status(200).json({
      ok: true,
      requestId,
      userId,
      planCode: nextPlanCode,
      billingStatus: status,
      provider,
      paymentActionRequired,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Billing sync failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
