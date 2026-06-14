/**
 * Mayar Payment Checkout Endpoint
 * Creates a Mayar invoice/payment link for subscription plans.
 *
 * POST /api/payment/create-checkout
 * Body: { plan, duration, email, name, currency, language }
 * Returns: { checkoutUrl }
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

const MAYAR_API_BASE = 'https://api.mayar.id/hl/v1';

type CurrencyCode = 'idr' | 'bnd' | 'usd';
type BillingDuration = 'monthly' | 'quarterly' | 'yearly';

interface CheckoutRequest {
  plan: 'plus' | 'pro';
  duration: BillingDuration;
  email: string;
  name: string;
  currency: CurrencyCode;
  language: string;
}

// Pricing table mirrors the landing page config
const PRICING: Record<string, Record<BillingDuration, Record<CurrencyCode, number>>> = {
  plus: {
    monthly: { idr: 61_000, bnd: 1.80, usd: 1.50 },
    quarterly: { idr: 149_000, bnd: 4.50, usd: 3.75 },
    yearly: { idr: 449_000, bnd: 14.00, usd: 11.50 },
  },
  pro: {
    monthly: { idr: 199_000, bnd: 6.00, usd: 4.99 },
    quarterly: { idr: 399_000, bnd: 12.00, usd: 10.00 },
    yearly: { idr: 999_000, bnd: 30.00, usd: 25.00 },
  },
};

const PLAN_NAMES: Record<string, string> = {
  plus: 'Barista Plus',
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
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

    const { plan, duration, email, name, currency } = body;

    // Validate required fields
    if (!plan || !duration || !email || !name) {
      sendJson(res, 400, { error: 'Missing required fields: plan, duration, email, name' });
      return;
    }

    // Validate plan
    if (!PRICING[plan]) {
      sendJson(res, 400, { error: `Invalid plan: ${plan}. Must be 'plus' or 'pro'.` });
      return;
    }

    // Validate duration
    if (!PRICING[plan][duration]) {
      sendJson(res, 400, { error: `Invalid duration: ${duration}` });
      return;
    }

    const activeCurrency = currency || 'idr';
    const amount = PRICING[plan][duration][activeCurrency] ?? PRICING[plan][duration].idr;
    const planName = PLAN_NAMES[plan] || plan;
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
