import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
} from '../_shared.js';
import {
  createManualPaymentRequest,
  loadPersistedManualPaymentQrConfigs,
  loadPersistedManualPaymentRequest,
  normalizeManualCurrency,
  createDraftToken,
} from './manualPayments.js';
import { buildAccountStatus } from '../account/status.js';
import { getSupabaseAdminConfig, supabaseAdminRest } from '../_supabaseAdmin.js';
import { PLAN_TIERS } from '../../packages/shared/src/planCatalog.js';

type PlanCode = 'starter' | 'pro' | 'team' | 'enterprise';

const BILLING_RATE_LIMIT = {
  maxRequests: 40,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 8,
  burstWindowMs: 10 * 1000,
} as const;

const VALID_PAID_PLANS = new Set<PlanCode>(['starter', 'pro', 'team', 'enterprise']);

function normalizePlanCode(value: unknown): PlanCode | '' {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_PAID_PLANS.has(raw as PlanCode) ? raw as PlanCode : '';
}

function readUrl(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (/^https:\/\//i.test(value)) return value;
  }
  return '';
}

type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

const VALID_DURATIONS = new Set<BillingDuration>(['monthly', 'quarterly', 'yearly']);

function normalizeDuration(value: unknown): BillingDuration {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_DURATIONS.has(raw as BillingDuration) ? raw as BillingDuration : 'monthly';
}

function normalizePromoCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  return cleaned.length >= 4 ? cleaned : '';
}

function checkoutUrlForPlan(planCode: PlanCode, duration: BillingDuration, promoCode: string): string {
  const suffix = planCode.toUpperCase();
  const durationSuffix = duration.toUpperCase();
  let url = readUrl(
    `BILLING_CHECKOUT_URL_${suffix}_${durationSuffix}`,
    `BILLING_CHECKOUT_URL_${suffix}`,
    `STRIPE_CHECKOUT_URL_${suffix}`,
    `REVENUECAT_CHECKOUT_URL_${suffix}`,
    'BILLING_CHECKOUT_URL',
  );
  if (url && promoCode) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}promo=${encodeURIComponent(promoCode)}`;
  }
  return url;
}

function providerForPlan(planCode: PlanCode): 'stripe' | 'revenuecat' | 'manual' {
  const suffix = planCode.toUpperCase();
  if (readUrl(`STRIPE_CHECKOUT_URL_${suffix}`) || process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (readUrl(`REVENUECAT_CHECKOUT_URL_${suffix}`) || process.env.REVENUECAT_API_KEY) return 'revenuecat';
  return 'manual';
}

function authEmail(user: Record<string, unknown> | undefined): string | undefined {
  const email = user?.email;
  return typeof email === 'string' && email.includes('@') ? email.slice(0, 160) : undefined;
}

function manualInvoiceResponse(input: {
  requestId: string;
  planCode: PlanCode;
  duration: BillingDuration;
  promoCode?: string;
  manualRequest: NonNullable<ReturnType<typeof createManualPaymentRequest>>;
  reviewStorage: 'persisted' | 'deferred';
}) {
  const proofReady = input.reviewStorage === 'persisted';
  return {
    ok: true,
    requestId: input.requestId,
    planCode: input.planCode,
    duration: input.duration,
    promoCode: input.promoCode || undefined,
    provider: 'manual' as const,
    mode: 'manual_invoice' as const,
    paymentRequestId: input.manualRequest.id,
    paymentActionRequired: true as const,
    reviewStorage: input.reviewStorage,
    manualInvoice: {
      id: input.manualRequest.id,
      status: input.manualRequest.status,
      amount: input.manualRequest.amount,
      amountLabel: input.manualRequest.amountLabel,
      currency: input.manualRequest.currency,
      uniqueSuffix: input.manualRequest.uniqueSuffix,
      instructions: input.manualRequest.instructions,
      supportLinks: {
        whatsappUrl: input.manualRequest.instructions.whatsappUrl,
        supportEmail: input.manualRequest.instructions.supportEmail,
        instagramUrl: input.manualRequest.instructions.instagramUrl,
      },
      proof: {
        endpoint: proofReady ? '/api/billing/proof' : '',
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        storage: input.reviewStorage,
      },
      message: proofReady
        ? 'Manual payment is pending admin review. Paid entitlement is not granted until the payment is verified.'
        : 'Manual payment details are ready, but automated proof storage is temporarily unavailable. Send proof to support with the invoice ID for admin review.',
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
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

  const limit = checkRateLimit(req, '/api/billing/checkout', authResult.auth.userId, BILLING_RATE_LIMIT);
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

  const planCode = normalizePlanCode(req.body?.planCode);
  if (!planCode) {
    return res.status(400).json({
      ok: false,
      requestId,
      error: 'Paid planCode is required',
      errorCode: 'validation_error',
      details: 'Allowed values: starter, pro, team, enterprise.',
    });
  }

  const duration = normalizeDuration(req.body?.duration);
  const promoCode = normalizePromoCode(req.body?.promoCode);
  const currency = normalizeManualCurrency(req.body?.currency);

  const url = checkoutUrlForPlan(planCode, duration, promoCode);
  if (!url) {
    const statusSnapshot = await buildAccountStatus(requestId, authResult.auth, 'web').catch((e) => {
      console.error('[DEBUG] buildAccountStatus error:', e);
      return null;
    });
    let isUpgrade = false;
    let currentPlanCode = 'free';

    if (statusSnapshot) {
      if (authResult.auth.userId === 'user_upgrade') {
        console.error('[DEBUG] auth userId:', authResult.auth.userId);
        console.error('[DEBUG] statusSnapshot user_upgrade:', JSON.stringify(statusSnapshot));
      }
      const hasActivePaidPlan = statusSnapshot.user.planCode !== 'free' && statusSnapshot.billing.status === 'active';
      const hasPendingManual = statusSnapshot.billing.provider === 'manual'
        && statusSnapshot.billing.paymentActionRequired === true
        && statusSnapshot.billing.paymentAction === 'contact_support';
      
      if (hasPendingManual) {
        return res.status(403).json({
          ok: false,
          requestId,
          error: 'Anda memiliki tagihan manual yang belum selesai.',
          errorCode: 'pending_invoice_exists',
          details: 'Harap selesaikan pembayaran dan unggah bukti transfer, atau tunggu review admin selesai sebelum memesan paket baru.',
        });
      }

      if (statusSnapshot.billing.status === 'past_due') {
        return res.status(403).json({
          ok: false,
          requestId,
          error: 'Tagihan Anda sebelumnya tertunda.',
          errorCode: 'past_due',
          details: 'Harap selesaikan pembayaran tagihan yang tertunda sebelum memesan paket baru.',
        });
      }

      if (hasActivePaidPlan) {
        currentPlanCode = statusSnapshot.user.planCode;
        const currentTier = PLAN_TIERS[currentPlanCode] ?? 0;
        const requestedTier = PLAN_TIERS[planCode] ?? 0;

        if (requestedTier <= currentTier) {
          return res.status(403).json({
            ok: false,
            requestId,
            error: 'Anda sudah berlangganan paket ini atau yang lebih tinggi.',
            errorCode: 'active_plan_exists',
            details: 'Silakan tunggu hingga siklus tagihan Anda berakhir jika ingin mengganti, memperbarui, atau beralih ke paket lain.',
          });
        } else {
          isUpgrade = true;
        }
      }
    }

    await loadPersistedManualPaymentQrConfigs().catch((error) => {
      console.error('Failed to load manual payment QR config:', error);
    });

    let overrideAmount: number | undefined = undefined;
    const config = getSupabaseAdminConfig();
    if (config.configured) {
      // Fetch dynamic price if available
      let priceData: any = null;
      let priceError = false;
      try {
        const prices = await supabaseAdminRest<any[]>(config, `plan_prices?plan_code=eq.${planCode}&duration=eq.${duration}&currency=eq.${currency}&is_active=is.true&select=*&limit=1`);
        priceData = prices?.[0];
      } catch (e) {
        priceError = true;
      }
        
      if (priceData && !priceError) {
        const amt = Number(priceData.discount_price ?? priceData.original_price);
        if (!isNaN(amt)) {
          overrideAmount = amt;
        }
      }

      if (isUpgrade && overrideAmount !== undefined) {
        try {
          const currentPrices = await supabaseAdminRest<any[]>(config, `plan_prices?plan_code=eq.${currentPlanCode}&duration=eq.${duration}&currency=eq.${currency}&is_active=is.true&select=*&limit=1`);
          const currentPriceData = currentPrices?.[0];
          if (currentPriceData) {
            const currentPlanPrice = Number(currentPriceData.discount_price ?? currentPriceData.original_price);
            if (!isNaN(currentPlanPrice)) {
              overrideAmount = Math.max(0, overrideAmount - currentPlanPrice);
            }
          }
        } catch (e) {
          console.error('Failed to fetch current plan price for upgrade calculation:', e);
        }
      }

      // Apply promo code if provided (AFTER upgrade calculation, so discount applies to the difference)
      if (promoCode && overrideAmount !== undefined) {
        let promoData: any = null;
        let promoError = false;
        try {
          const promos = await supabaseAdminRest<any[]>(config, `promo_codes?code=eq.${promoCode}&is_active=is.true&select=*&limit=1`);
          promoData = promos?.[0];
        } catch (e) {
          promoError = true;
        }

        if (promoData && !promoError) {
          const validPlan = promoData.valid_plan_codes == null || promoData.valid_plan_codes.length === 0 || promoData.valid_plan_codes.includes(planCode);
          const validDuration = promoData.valid_durations == null || promoData.valid_durations.length === 0 || promoData.valid_durations.includes(duration);
          const notExpired = !promoData.valid_until || new Date(promoData.valid_until).getTime() > Date.now();
          const notMaxed = !promoData.max_uses || promoData.current_uses < promoData.max_uses;

          if (validPlan && validDuration && notExpired && notMaxed) {
            if (promoData.discount_type === 'percentage') {
              overrideAmount = Math.max(0, overrideAmount - (overrideAmount * Number(promoData.discount_value) / 100));
            } else if (promoData.discount_type === 'fixed_amount') {
              overrideAmount = Math.max(0, overrideAmount - Number(promoData.discount_value));
            }
          } else {
             return res.status(400).json({
               ok: false,
               requestId,
               error: 'Promo code is invalid, expired, or not applicable to this plan.',
               errorCode: 'invalid_promo_code',
             });
          }
        } else {
           return res.status(400).json({
             ok: false,
             requestId,
             error: 'Promo code not found or inactive.',
             errorCode: 'invalid_promo_code',
           });
        }
      }

      // Idempotency: Check if there's already a pending manual request for the same plan & duration.
      try {
        const pendingRows = await supabaseAdminRest<any[]>(config, `payment_receipts?user_id=eq.${encodeURIComponent(authResult.auth.userId)}&status=in.(queued,manual_review)&requested_plan_code=eq.${planCode}&requested_duration=eq.${duration}&requested_currency=eq.${currency}&select=manual_request_id,metadata&limit=1`);
        if (pendingRows && pendingRows.length > 0) {
          return res.status(403).json({
            ok: false,
            requestId,
            error: 'Anda memiliki tagihan manual yang belum selesai untuk paket ini.',
            errorCode: 'pending_invoice_exists',
            details: 'Harap selesaikan pembayaran dan unggah bukti transfer, atau tunggu review admin selesai sebelum memesan ulang paket yang sama.',
          });
        }
      } catch (e) {
        console.error('Failed to check pending manual payment idempotency:', e);
      }
    }

    const manualRequest = createManualPaymentRequest({
      userId: authResult.auth.userId,
      email: authEmail(authResult.auth.user),
      planCode,
      duration,
      currency,
      promoCode: promoCode || undefined,
      overrideAmount,
      allowFallbackInstructions: true,
    });
    
    if (manualRequest) {
      let draftToken = '';
      try {
        draftToken = createDraftToken(manualRequest);
      } catch (error) {
        console.error('Failed to create manual payment draft token:', error);
        return res.status(500).json({
          ok: false,
          requestId,
          error: 'Failed to prepare billing session',
          errorCode: 'internal_error',
        });
      }

      const responsePayload = manualInvoiceResponse({
        requestId,
        planCode,
        duration,
        promoCode: promoCode || undefined,
        manualRequest,
        reviewStorage: 'deferred',
      });
      // Attach token to response
      (responsePayload as any).draftToken = draftToken;
      return res.status(200).json(responsePayload);
    }

    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Billing checkout is not configured yet',
      errorCode: 'billing_not_configured',
      details: 'Payments are being prepared for this plan. The Free plan remains available.',
    });
  }

  return res.status(200).json({
    ok: true,
    requestId,
    planCode,
    duration,
    promoCode: promoCode || undefined,
    provider: providerForPlan(planCode),
    mode: 'redirect',
    url,
  });
}
