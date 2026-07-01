import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
} from '../_shared.js';
import { verifyMayarWebhookSignature } from './providers/mayar.js';

const MAYAR_WEBHOOK_RATE_LIMIT = {
  maxRequests: 300,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 80,
  burstWindowMs: 10 * 1000,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const limit = checkRateLimit(req, '/api/billing/mayar-webhook', 'mayar', MAYAR_WEBHOOK_RATE_LIMIT);
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

  // For testing Mayar Webhook from Dashboard, bypass signature if it's the test event.
  // The actual event type is checked after parsing the body.
  const bodyForTesting = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (bodyForTesting?.event === 'testing') {
    return res.status(200).json({ ok: true, message: 'Test webhook received' });
  }

  const signature = verifyMayarWebhookSignature(req.headers);
  if (!signature.verified) {
    console.warn('Mayar webhook rejected: signature verification failed.', { requestId, reason: signature.reason });
    return res.status(401).json({
      ok: false,
      requestId,
      error: 'Invalid webhook signature',
      errorCode: 'invalid_webhook_signature',
    });
  }

  // Parse webhook payload
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const data = body.data || body;
  
  // Extract info from data
  const extraData = data.extraData || data.extra_data || {};
  const status = data.status;
  
  const { mapMayarStatusToBillingStatus } = await import('./providers/mayar.js');
  const billingStatus = mapMayarStatusToBillingStatus(status);
  
  const userId = extraData.userId || extraData.noCustomer;
  const planCode = extraData.planCode || extraData.idProd;
  const duration = extraData.duration;
  
  if (!userId || !planCode) {
    return res.status(200).json({ ok: true, message: 'Ignored: missing userId or planCode' });
  }

  const { getSupabaseAdminConfig, supabaseAdminRest } = await import('../_supabaseAdmin.js');
  const config = getSupabaseAdminConfig();
  
  if (config.configured && billingStatus === 'active') {
    // Determine expiration date based on duration
    const now = new Date();
    let currentPeriodEnd = new Date(now);
    if (duration === 'yearly') {
      currentPeriodEnd.setFullYear(now.getFullYear() + 1);
    } else if (duration === 'quarterly') {
      currentPeriodEnd.setMonth(now.getMonth() + 3);
    } else {
      currentPeriodEnd.setMonth(now.getMonth() + 1); // default monthly
    }

    const row = {
      user_id: userId,
      plan_code: planCode,
      billing_status: billingStatus,
      payment_action_required: false,
      current_period_end: currentPeriodEnd.toISOString(),
      source: 'mayar',
      external_subscription_id: data.id || data.transactionId || '',
      provider_payment_id: data.transactionId || data.transaction_id || '',
      updated_at: new Date().toISOString(),
    };
    
    try {
      // Find existing entitlement
      const existing = await supabaseAdminRest<Array<{ id: string }>>(
        config,
        `user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
      );
      
      if (Array.isArray(existing) && existing.length > 0 && existing[0]?.id) {
        await supabaseAdminRest(config, `user_entitlements?id=eq.${encodeURIComponent(existing[0].id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(row),
        });
      } else {
        await supabaseAdminRest(config, 'user_entitlements', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify([row]),
        });
      }
      
      // Update app_users as well to reflect active plan
      await supabaseAdminRest(config, `app_users?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            current_plan: planCode,
            billing_status: 'active',
            updated_at: new Date().toISOString(),
          }),
      });

    } catch (e) {
      console.error('Failed to update entitlement in Mayar webhook', e);
      return res.status(500).json({ ok: false, error: 'Database update failed' });
    }
  }

  return res.status(200).json({
    ok: true,
    requestId,
    message: 'Webhook processed',
  });
}
