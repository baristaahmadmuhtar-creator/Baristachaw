/**
 * Mayar Payment Checkout Endpoint
 * Creates a Mayar invoice/payment link for subscription plans.
 *
 * POST /api/payment/create-checkout
 * Body: { plan, duration, email, name, currency, language }
 * Returns: { checkoutUrl }
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizeMvpPaidPlanCode, type MvpPaidPlanCode } from '../../packages/shared/src/billingFlow.js';
import { PLAN_PRICING } from '../../packages/shared/src/planCatalog.js';

const MAYAR_API_BASE = 'https://api.mayar.id/hl/v1';

type CurrencyCode = 'idr' | 'bnd' | 'usd';
type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

interface CheckoutRequest {
  plan: 'plus' | MvpPaidPlanCode;
  duration: BillingDuration;
  email: string;
  name: string;
  currency: CurrencyCode;
  language: string;
}

const PLAN_NAMES: Record<MvpPaidPlanCode, string> = {
  starter: 'Barista Starter',
  pro: 'Barista Pro',
};

const DURATION_LABELS: Record<BillingDuration, string> = {
  monthly: '1 Month',
  quarterly: '3 Months',
  yearly: '1 Year',
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function envFlag(name: string): boolean {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function resolveCorsOrigin(req: IncomingMessage): string {
  const origin = String(req.headers.origin || '').trim();
  const appUrl = String(process.env.APP_URL || 'https://app.baristachaw.com').trim();
  try {
    const allowed = new URL(appUrl).origin;
    if (origin && new URL(origin).origin === allowed) return origin;
    return allowed;
  } catch {
    return 'https://app.baristachaw.com';
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', resolveCorsOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!envFlag('MAYAR_PAYMENT_ENABLED')) {
    sendJson(res, 503, {
      error: 'Legacy payment checkout is disabled. Use /api/billing/checkout.',
      errorCode: 'payment_legacy_disabled',
    });
    return;
  }

  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) {
    console.error('[Payment] MAYAR_API_KEY not configured');
    sendJson(res, 503, { error: 'Payment service not configured' });
    return;
  }

  try {
    const rawBody = await readBody(req);
    const body: CheckoutRequest = JSON.parse(rawBody);

    const { duration, email, name, currency } = body;
    const plan = normalizeMvpPaidPlanCode(body.plan);

    // Validate required fields
    if (!body.plan || !duration || !email || !name) {
      sendJson(res, 400, { error: 'Missing required fields: plan, duration, email, name' });
      return;
    }

    // Validate plan
    if (!plan) {
      sendJson(res, 400, { error: `Invalid plan: ${String(body.plan)}. Must be 'starter' or 'pro'.` });
      return;
    }

    // Validate duration
    if (!PLAN_PRICING[plan]?.[duration]) {
      sendJson(res, 400, { error: `Invalid duration: ${duration}` });
      return;
    }

    const activeCurrency = currency || 'idr';
    const amount = PLAN_PRICING[plan][duration].discounted[activeCurrency] ?? PLAN_PRICING[plan][duration].discounted.idr;
    const planName = PLAN_NAMES[plan];
    const durationLabel = DURATION_LABELS[duration] || duration;

    // Create Mayar payment link
    const mayarPayload = {
      name: `${planName} - ${durationLabel}`,
      description: `BaristaChaw ${planName} subscription (${durationLabel})`,
      amount: activeCurrency === 'idr' ? amount : Math.round(amount * 100), // Mayar expects cents for non-IDR
      currency: activeCurrency.toUpperCase(),
      customer: {
        name,
        email,
      },
      redirectUrl: `${process.env.APP_URL || 'https://app.baristachaw.com'}/upgrade/success?plan=${plan}&duration=${duration}`,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      metadata: {
        plan,
        duration,
        source: 'landing_page',
      },
    };

    const mayarRes = await fetch(`${MAYAR_API_BASE}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(mayarPayload),
    });

    if (!mayarRes.ok) {
      const errorText = await mayarRes.text();
      console.error(`[Payment] Mayar API error (${mayarRes.status}):`, errorText);
      sendJson(res, 502, { error: 'Payment gateway error', detail: `Mayar returned ${mayarRes.status}` });
      return;
    }

    const mayarData = await mayarRes.json();

    // Mayar returns the checkout URL in the response
    const checkoutUrl = mayarData.data?.link || mayarData.data?.url || mayarData.link || mayarData.url;

    if (!checkoutUrl) {
      console.error('[Payment] No checkout URL in Mayar response:', JSON.stringify(mayarData));
      sendJson(res, 502, { error: 'No checkout URL received from payment gateway' });
      return;
    }

    sendJson(res, 200, { checkoutUrl, invoiceId: mayarData.data?.id });
  } catch (err) {
    console.error('[Payment] Error creating checkout:', err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
}
