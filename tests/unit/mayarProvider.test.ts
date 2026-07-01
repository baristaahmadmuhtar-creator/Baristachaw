import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import adminManagementHandler from '../../server-api/admin/management.ts';
import {
  createMayarCheckoutSession,
  getMayarConfig,
  mapMayarStatusToBillingStatus,
  normalizeMayarBaseUrl,
  verifyMayarWebhookSignature,
} from '../../server-api/billing/providers/mayar.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  MAYAR_API_KEY: process.env.MAYAR_API_KEY,
  MAYAR_WEBHOOK_SECRET: process.env.MAYAR_WEBHOOK_SECRET,
  MAYAR_BASE_URL: process.env.MAYAR_BASE_URL,
  MAYAR_ENV: process.env.MAYAR_ENV,
  MAYAR_SUCCESS_URL: process.env.MAYAR_SUCCESS_URL,
  MAYAR_CANCEL_URL: process.env.MAYAR_CANCEL_URL,
  MAYAR_WEBHOOK_PATH: process.env.MAYAR_WEBHOOK_PATH,
  BILLING_LIVE_MODE: process.env.BILLING_LIVE_MODE,
  MANUAL_PAYMENT_ENABLED: process.env.MANUAL_PAYMENT_ENABLED,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function createToken(user: Record<string, unknown>) {
  return jwt.sign({ user }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    query: {},
    body: {},
    headers: {
      origin: 'http://127.0.0.1:3000',
      ...((overrides.headers as Record<string, string>) || {}),
    },
    cookies: {},
    socket: { remoteAddress: '203.0.113.22' },
    ...overrides,
  } as any;
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: new Map<string, string | string[]>(),
    body: '',
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
    json(payload: unknown) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end(payload?: string) {
      if (typeof payload === 'string') this.body += payload;
      return this;
    },
  };
}

test.after(() => {
  restoreEnv();
});

test('Mayar config normalizes official base URLs and exposes readiness without leaking secrets', () => {
  process.env.MAYAR_API_KEY = 'mayar-secret-key';
  process.env.MAYAR_WEBHOOK_SECRET = 'mayar-webhook-secret';
  process.env.MAYAR_ENV = 'sandbox';
  process.env.MAYAR_SUCCESS_URL = 'https://app.baristachaw.com/billing/success';
  process.env.MAYAR_CANCEL_URL = 'https://app.baristachaw.com/billing/cancel';

  const config = getMayarConfig();

  assert.equal(config.configured, true);
  assert.equal(config.mode, 'sandbox');
  assert.equal(config.baseUrl, 'https://api.mayar.club');
  assert.equal(config.checkoutCreatePath, '/hl/v1/invoice/create');
  // A configured MAYAR_WEBHOOK_SECRET means signature verification is ready and there is
  // nothing blocking checkout (API key + success URL are both set in this test).
  assert.equal(config.webhookSignatureReady, true);
  assert.deepEqual(config.blockers, []);
  assert.doesNotMatch(JSON.stringify(config), /mayar-secret-key|mayar-webhook-secret/);
  assert.equal(normalizeMayarBaseUrl('https://api.mayar.id/'), 'https://api.mayar.id');
  assert.equal(normalizeMayarBaseUrl('https://api.mayar.club/'), 'https://api.mayar.club');
});

test('Mayar checkout creates server-side invoice payload using official invoice endpoint', async () => {
  process.env.MAYAR_API_KEY = 'mayar-secret-key';
  process.env.MAYAR_ENV = 'production';
  process.env.MAYAR_SUCCESS_URL = 'https://app.baristachaw.com/billing/success';
  process.env.MAYAR_CANCEL_URL = 'https://app.baristachaw.com/billing/cancel';

  const originalFetch = globalThis.fetch;
  let calledUrl = '';
  let calledAuth = '';
  let calledBody: any = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input);
    calledAuth = String((init?.headers as Record<string, string>)?.Authorization || '');
    calledBody = JSON.parse(String(init?.body || '{}'));
    return new Response(JSON.stringify({
      data: {
        id: 'inv_mayar_123',
        transactionId: 'trx_mayar_123',
        link: 'https://mayar.id/invoice/inv_mayar_123',
        expiredAt: '2026-06-30T00:00:00.000Z',
        extraData: calledBody.extraData,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const session = await createMayarCheckoutSession({
      requestId: 'checkout_req_1',
      userId: 'user_123',
      email: 'buyer@example.com',
      userName: 'Buyer Example',
      mobile: '081234567890',
      planCode: 'pro',
      planDisplayName: 'Barista Pro',
      duration: 'yearly',
      amount: 999000,
      amountLabel: 'Rp 999.000',
      currency: 'idr',
      promoCode: 'LAUNCH10',
      redirectUrl: 'https://app.baristachaw.com/billing/success',
      description: 'Baristachaw Barista Pro yearly',
    });

    assert.equal(calledUrl, 'https://api.mayar.id/hl/v1/invoice/create');
    assert.equal(calledAuth, 'Bearer mayar-secret-key');
    assert.equal(calledBody.name, 'Buyer Example');
    assert.equal(calledBody.email, 'buyer@example.com');
    assert.equal(calledBody.mobile, '081234567890');
    assert.equal(calledBody.redirectUrl, 'https://app.baristachaw.com/billing/success');
    assert.equal(calledBody.items[0].quantity, 1);
    assert.equal(calledBody.items[0].rate, 999000);
    assert.equal(calledBody.extraData.userId, 'user_123');
    assert.equal(calledBody.extraData.planCode, 'pro');
    assert.equal(session.provider, 'mayar');
    assert.equal(session.checkoutUrl, 'https://mayar.id/invoice/inv_mayar_123');
    assert.equal(session.invoiceId, 'inv_mayar_123');
    assert.equal(session.rawMode, 'production');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Mayar status mapping is conservative and webhook verification requires a matching shared secret', () => {
  assert.equal(mapMayarStatusToBillingStatus('settled'), 'active');
  assert.equal(mapMayarStatusToBillingStatus('paid'), 'active');
  assert.equal(mapMayarStatusToBillingStatus('pending'), 'trialing');
  assert.equal(mapMayarStatusToBillingStatus('expired'), 'expired');
  assert.equal(mapMayarStatusToBillingStatus('failed'), 'cancelled');

  delete process.env.MAYAR_WEBHOOK_SECRET;
  assert.deepEqual(verifyMayarWebhookSignature({}), {
    verified: false,
    reason: 'mayar_webhook_signature_docs_missing',
  });

  process.env.MAYAR_WEBHOOK_SECRET = 'mayar-webhook-secret';
  assert.deepEqual(verifyMayarWebhookSignature({ authorization: 'Bearer mayar-webhook-secret' }), {
    verified: true,
    reason: 'verified',
  });
  assert.deepEqual(verifyMayarWebhookSignature({ 'webhook-token': 'mayar-webhook-secret' }), {
    verified: true,
    reason: 'verified',
  });
  assert.deepEqual(verifyMayarWebhookSignature({ authorization: 'Bearer wrong-token' }), {
    verified: false,
    reason: 'invalid_signature',
  });
});

test('admin management recognizes Mayar provider readiness without leaking Mayar API key', async () => {
  process.env.JWT_SECRET = 'mayar-admin-test-secret-32-chars';
  process.env.ADMIN_EMAILS = 'owner@example.com';
  process.env.MAYAR_API_KEY = 'mayar-secret-key';
  process.env.MAYAR_WEBHOOK_SECRET = 'mayar-webhook-secret';
  process.env.MAYAR_ENV = 'sandbox';
  process.env.MANUAL_PAYMENT_ENABLED = '1';

  const req = makeReq({
    cookies: {
      auth_token: createToken({
        id: 'owner-user',
        email: 'owner@example.com',
        name: 'Owner User',
      }),
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.ok(body.billing.connectedProviders.includes('mayar'));
  // MAYAR_WEBHOOK_SECRET is configured above, so signature verification is ready and
  // the admin panel should not warn that it is missing.
  assert.equal(body.billing.gaps.some((gap: string) => /Mayar webhook signature/i.test(gap)), false);
  assert.equal(JSON.stringify(body).includes('mayar-secret-key'), false);
  assert.equal(JSON.stringify(body).includes('mayar-webhook-secret'), false);
});
