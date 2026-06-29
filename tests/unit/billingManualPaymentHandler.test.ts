import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import checkoutHandler from '../../server-api/billing/checkout.ts';
import proofHandler from '../../server-api/billing/proof.ts';
import portalHandler from '../../server-api/billing/portal.ts';
import adminManagementHandler from '../../server-api/admin/management.ts';
import {
  readManualPaymentInstructions,
  resetManualPaymentRequestsForTests,
  updatePersistedManualPaymentStatus,
} from '../../server-api/billing/manualPayments.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  MANUAL_PAYMENT_ENABLED: process.env.MANUAL_PAYMENT_ENABLED,
  MANUAL_PAYMENT_BANK_NAME: process.env.MANUAL_PAYMENT_BANK_NAME,
  MANUAL_PAYMENT_ACCOUNT_NAME: process.env.MANUAL_PAYMENT_ACCOUNT_NAME,
  MANUAL_PAYMENT_ACCOUNT_NUMBER: process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER,
  MANUAL_PAYMENT_WHATSAPP_NUMBER: process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER,
  MANUAL_PAYMENT_SUPPORT_EMAIL: process.env.MANUAL_PAYMENT_SUPPORT_EMAIL,
  MANUAL_PAYMENT_PROOF_MAX_BYTES: process.env.MANUAL_PAYMENT_PROOF_MAX_BYTES,
  BILLING_CHECKOUT_URL: process.env.BILLING_CHECKOUT_URL,
  BILLING_CHECKOUT_URL_PRO: process.env.BILLING_CHECKOUT_URL_PRO,
  BILLING_PORTAL_URL: process.env.BILLING_PORTAL_URL,
  STRIPE_CUSTOMER_PORTAL_URL: process.env.STRIPE_CUSTOMER_PORTAL_URL,
  REVENUECAT_CUSTOMER_CENTER_URL: process.env.REVENUECAT_CUSTOMER_CENTER_URL,
  STRIPE_CHECKOUT_URL_PRO: process.env.STRIPE_CHECKOUT_URL_PRO,
  REVENUECAT_CHECKOUT_URL_PRO: process.env.REVENUECAT_CHECKOUT_URL_PRO,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
  BILLING_CHECKOUT_PROVIDER: process.env.BILLING_CHECKOUT_PROVIDER,
  MAYAR_API_KEY: process.env.MAYAR_API_KEY,
  MAYAR_ENV: process.env.MAYAR_ENV,
  MAYAR_SUCCESS_URL: process.env.MAYAR_SUCCESS_URL,
  MAYAR_CHECKOUT_ENABLED: process.env.MAYAR_CHECKOUT_ENABLED,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET_PROOF: process.env.SUPABASE_STORAGE_BUCKET_PROOF,
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

let requestSequence = 0;

function makeReq(overrides: Record<string, unknown> = {}) {
  requestSequence += 1;
  const ip = `198.51.100.${20 + requestSequence}`;
  const baseHeaders = {
    origin: 'http://127.0.0.1:3000',
    'x-forwarded-for': ip,
  };
  return {
    method: 'POST',
    query: {},
    body: {},
    headers: baseHeaders,
    cookies: {},
    socket: {
      remoteAddress: ip,
    },
    ...overrides,
    headers: {
      ...baseHeaders,
      ...((overrides.headers as Record<string, string>) || {}),
    },
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

async function postCheckout(userId = 'runtime_user_trial_review') {
  const token = createToken({
    id: userId,
    email: 'manual.customer@example.com',
    name: 'Manual Customer',
  });
  const req = makeReq({
    cookies: { auth_token: token },
    body: {
      planCode: 'pro',
      duration: 'quarterly',
      currency: 'usd',
      promoCode: 'SAVE10',
    },
  });
  const res = createMockRes();
  await checkoutHandler(req, res as any);
  return { res, body: JSON.parse(res.body), token };
}

let originalFetch: typeof fetch | undefined;
const mockUsers = new Map<string, any>();
const mockAudits: any[] = [];
const mockPaymentReceiptWrites: any[] = [];

test.beforeEach(() => {
  mockUsers.clear();
  mockUsers.set('runtime_user_trial_review', {
    id: 'runtime_user_trial_review',
    email: 'manual.customer@example.com',
    name: 'Manual Customer',
    plan_code: 'free',
    billing: { status: 'none', provider: 'none', paymentActionRequired: false },
  });
  mockAudits.length = 0;
  mockPaymentReceiptWrites.length = 0;

  process.env.JWT_SECRET = 'billing-unit-test-secret-32-chars-min';
  process.env.SUPABASE_JWT_SECRET = 'billing-unit-test-secret-32-chars-min';
  process.env.ADMIN_EMAILS = 'owner@example.com';
  process.env.MANUAL_PAYMENT_ENABLED = '1';
  process.env.MANUAL_PAYMENT_BANK_NAME = 'Unit Bank';
  process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Unit Account';
  process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER = '1234567890';
  process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER = '+673 123 4567';
  process.env.MANUAL_PAYMENT_SUPPORT_EMAIL = 'support@example.com';
  process.env.MANUAL_PAYMENT_PROOF_MAX_BYTES = String(1024 * 1024);
  process.env.SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';
  process.env.SUPABASE_STORAGE_BUCKET_PROOF = 'payment-proofs';
  delete process.env.BILLING_CHECKOUT_URL;
  delete process.env.BILLING_CHECKOUT_URL_PRO;
  delete process.env.BILLING_PORTAL_URL;
  delete process.env.STRIPE_CUSTOMER_PORTAL_URL;
  delete process.env.REVENUECAT_CUSTOMER_CENTER_URL;
  delete process.env.STRIPE_CHECKOUT_URL_PRO;
  delete process.env.REVENUECAT_CHECKOUT_URL_PRO;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.REVENUECAT_API_KEY;
  delete process.env.BILLING_CHECKOUT_PROVIDER;
  delete process.env.MAYAR_API_KEY;
  delete process.env.MAYAR_ENV;
  delete process.env.MAYAR_SUCCESS_URL;
  delete process.env.MAYAR_CHECKOUT_ENABLED;
  resetManualPaymentRequestsForTests();

  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    
    if (url.includes('/storage/v1/object/upload/sign/')) {
      return new Response(JSON.stringify({ url: '/mock-upload-path' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/rest/v1/app_users')) {
      const method = init?.method || 'GET';
      if (method === 'PATCH' || method === 'POST') {
        const bodyStr = typeof init?.body === 'string' ? init.body : '{}';
        const updates = JSON.parse(bodyStr);
        const rows = Array.isArray(updates) ? updates : [updates];
        const match = url.match(/id=eq\.([^&]+)/);
        for (const row of rows) {
          const userId = match ? decodeURIComponent(match[1]) : (row.id || 'runtime_user_trial_review');
          const existing = mockUsers.get(userId) || { id: userId };
          mockUsers.set(userId, {
            ...existing,
            ...row,
            planCode: row.plan_code !== undefined ? row.plan_code : (existing.planCode || existing.plan_code),
          });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      
      const match = url.match(/id=eq\.([^&]+)/);
      const requestedUserId = match ? decodeURIComponent(match[1]) : '';
      const sourceUsers = requestedUserId
        ? (mockUsers.has(requestedUserId) ? [mockUsers.get(requestedUserId)] : [])
        : [...mockUsers.values()];
      const list = sourceUsers.map(u => ({
        ...u,
        plan_code: u.plan_code || u.planCode,
        planCode: u.planCode || u.plan_code,
      }));
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/rest/v1/admin_audit_events')) {
      const method = init?.method || 'GET';
      if (method === 'PATCH' || method === 'POST') {
        const bodyStr = typeof init?.body === 'string' ? init.body : '{}';
        const updates = JSON.parse(bodyStr);
        const events = Array.isArray(updates) ? updates : [updates];
        for (const ev of events) {
          mockAudits.push({
            id: ev.id || `audit-${Date.now()}-${Math.random()}`,
            created_at: ev.created_at || new Date().toISOString(),
            actor_user_id: ev.actor_user_id || ev.actor,
            actor_email: ev.actor_email || ev.actor,
            target_type: ev.target_type || 'platform',
            target_id: ev.target_id || ev.target,
            action: ev.action,
            detail: ev.detail || ev.summary || 'Administrative event recorded.',
            severity: ev.severity || 'info',
          });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      
      return new Response(JSON.stringify(mockAudits), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/rest/v1/payment_receipts')) {
      const method = init?.method || 'GET';
      if (method === 'POST' || method === 'PATCH') {
        mockPaymentReceiptWrites.push(JSON.parse(String(init?.body || 'null')));
        return new Response(JSON.stringify([{ id: 'mocked-receipt-id' }]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/rest/v1/')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

test.afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

test.after(() => {
  resetManualPaymentRequestsForTests();
  restoreEnv();
});

test('manual checkout returns env-configured invoice without granting paid entitlement', async () => {
  const { res, body } = await postCheckout();

  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'manual_invoice');
  assert.equal(body.provider, 'manual');
  assert.equal(body.planCode, 'pro');
  assert.equal(body.duration, 'quarterly');
  assert.equal(body.paymentActionRequired, true);
  assert.equal(body.manualInvoice.status, 'pending_review');
  assert.equal(body.manualInvoice.amountLabel, '$23.99');
  assert.equal(body.manualInvoice.instructions.bankName, 'Unit Bank');
  assert.equal(body.manualInvoice.instructions.accountName, 'Unit Account');
  assert.equal(body.manualInvoice.instructions.accountNumber, '1234567890');
  assert.match(body.manualInvoice.instructions.whatsappUrl, /^https:\/\/wa\.me\/6731234567\?text=/);
  assert.equal(body.manualInvoice.supportMessage.templateType, 'payment_initiated');
  assert.match(body.manualInvoice.supportMessage.text, new RegExp(`Payment ID: ${body.paymentRequestId}`));
  assert.match(body.manualInvoice.supportMessage.text, /User ID: runtime_user_trial_review/);
  assert.match(body.manualInvoice.supportMessage.text, /Email: manual\.customer@example\.com/);
  assert.match(body.manualInvoice.supportMessage.text, /Paket: Barista Pro \(pro\)/);
  assert.match(body.manualInvoice.supportMessage.text, /Durasi: 3 bulan/);
  assert.match(body.manualInvoice.supportMessage.text, /Nominal: \$23\.99/);
  assert.match(decodeURIComponent(body.manualInvoice.instructions.whatsappUrl), /Halo Admin Baristachaw/);
  assert.doesNotMatch(body.manualInvoice.supportMessage.text, /draftToken|uploadUrl|signedUrl|service role/i);
  assert.equal(body.manualInvoice.instructions.notifyWebhookConfigured, false);
  assert.equal(body.manualInvoice.proof.endpoint, '/api/billing/proof');
  assert.match(body.manualInvoice.message, /Invoice is ready/i);
  assert.doesNotMatch(JSON.stringify(body), /STRIPE|REVENUECAT|sk_|service-role/i);

  const userAfterInvoice = mockUsers.get('runtime_user_trial_review');
  assert.equal(userAfterInvoice.payment_action_required ?? false, false);
  assert.equal(userAfterInvoice.billing_status ?? 'none', 'none');
  assert.equal(userAfterInvoice.billing_provider ?? 'none', 'none');
});

test('manual checkout still returns actionable invoice when receipt storage is temporarily unavailable', async () => {
  const activeFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/rest/v1/payment_receipts')) {
      return new Response(JSON.stringify({ message: 'relation payment_receipts unavailable' }), { status: 503 });
    }
    return activeFetch(input, init);
  }) as typeof fetch;

  try {
    const { res, body } = await postCheckout('runtime_user_storage_deferred');

    assert.equal(res.statusCode, 200);
    assert.equal(body.ok, true);
    assert.equal(body.mode, 'manual_invoice');
    assert.equal(body.reviewStorage, 'persisted');
    assert.equal(body.manualInvoice.proof.endpoint, '/api/billing/proof');
    assert.equal(body.manualInvoice.proof.storage, 'persisted');
    assert.match(body.manualInvoice.message, /Invoice is ready/i);
    assert.match(body.manualInvoice.supportLinks.whatsappUrl, /^https:\/\/wa\.me\//);
  } finally {
    globalThis.fetch = activeFetch;
  }
});

test('manual checkout uses support fallback when manual payment env flag is missing', async () => {
  delete process.env.MANUAL_PAYMENT_ENABLED;
  delete process.env.BILLING_CHECKOUT_URL;
  delete process.env.BILLING_CHECKOUT_URL_PRO;
  delete process.env.STRIPE_CHECKOUT_URL_PRO;
  delete process.env.REVENUECAT_CHECKOUT_URL_PRO;

  const { res, body } = await postCheckout('runtime_user_manual_env_missing');

  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'manual_invoice');
  assert.equal(body.provider, 'manual');
  assert.equal(body.manualInvoice.instructions.supportEmail, 'support@example.com');
  assert.match(body.manualInvoice.instructions.whatsappUrl, /^https:\/\/wa\.me\/6731234567\?text=/);
  assert.equal(body.paymentActionRequired, true);
});

test('checkout can create Mayar redirect session when Mayar is selected and required customer fields exist', async () => {
  process.env.BILLING_CHECKOUT_PROVIDER = 'mayar';
  process.env.MAYAR_API_KEY = 'mayar-secret-key';
  process.env.MAYAR_ENV = 'sandbox';
  process.env.MAYAR_SUCCESS_URL = 'https://app.baristachaw.com/billing/success';

  const activeFetch = globalThis.fetch;
  let mayarPayload: any = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('api.mayar.club/hl/v1/invoice/create')) {
      mayarPayload = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({
        statusCode: 200,
        messages: 'success',
        data: {
          id: 'mayar-invoice-id',
          transactionId: 'mayar-transaction-id',
          link: 'https://mayar.example/checkout/mayar-invoice-id',
          expiredAt: Date.parse('2026-07-01T00:00:00.000Z'),
          extraData: mayarPayload.extraData,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return activeFetch(input, init);
  }) as typeof fetch;

  try {
    const token = createToken({
      id: 'runtime_user_mayar_checkout',
      email: 'mayar.customer@example.com',
      name: 'Mayar Customer',
    });
    const req = makeReq({
      cookies: { auth_token: token },
      body: {
        provider: 'mayar',
        planCode: 'pro',
        duration: 'monthly',
        currency: 'idr',
        mobile: '081234567890',
      },
    });
    const res = createMockRes();
    await checkoutHandler(req, res as any);

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'mayar');
    assert.equal(body.mode, 'redirect');
    assert.equal(body.status, 'checkout_created');
    assert.equal(body.checkoutUrl, 'https://mayar.example/checkout/mayar-invoice-id');
    assert.equal(body.mayar.invoiceId, 'mayar-invoice-id');
    assert.equal(body.mayar.webhookSignatureReady, false);
    assert.equal(mayarPayload.mobile, '081234567890');
    assert.equal(mayarPayload.extraData.userId, 'runtime_user_mayar_checkout');
    assert.equal(mayarPayload.extraData.planCode, 'pro');
    assert.doesNotMatch(JSON.stringify(body), /mayar-secret-key/);
  } finally {
    globalThis.fetch = activeFetch;
  }
});

test('manual payment proof accepts allowlisted metadata and rejects unsafe uploads', async () => {
  const { body, token } = await postCheckout();
  const requestId = body.paymentRequestId;

  const proofReq = makeReq({
    cookies: { auth_token: token },
    body: {
      draftToken: body.draftToken,
      requestId,
      mimeType: 'image/png',
      sizeBytes: 12345,
    },
  });
  const proofRes = createMockRes();
  await proofHandler(proofReq, proofRes as any);

  assert.equal(proofRes.statusCode, 200);
  const proofBody = JSON.parse(proofRes.body);
  assert.equal(proofBody.ok, true);
  assert.equal(proofBody.status, 'receipt_received');
  assert.equal(proofBody.paymentActionRequired, true);
  assert.equal(proofBody.entitlement, 'pending_admin_review');
  assert.equal(proofBody.proof.storage, 'supabase_signed_upload');
  assert.equal(proofBody.proof.bucket, 'payment-proofs');
  assert.match(proofBody.proof.objectPath, new RegExp(`^.*${requestId}_proof_\\d+\\.png$`));
  assert.equal(proofBody.proofStorage, 'storage_ready');
  assert.equal(proofBody.deliveryMode, 'direct_upload');
  assert.equal(proofBody.supportMessage.templateType, 'proof_submitted');
  assert.match(proofBody.supportMessage.text, new RegExp(`Payment ID: ${requestId}`));
  assert.match(proofBody.supportMessage.text, /Status bukti: Bukti berhasil diupload/);
  assert.match(proofBody.supportMessage.text, /\.png/);
  assert.match(proofBody.uploadUrl, /^https:\/\/unit-test\.supabase\.co\/storage\/v1\/mock-upload-path/);
  assert.equal(proofBody.proof.mimeType, 'image/png');
  assert.match(proofBody.proof.generatedFileName, new RegExp(`^.*${requestId}_proof_\\d+\\.png$`));
  const latestReceiptWrite = mockPaymentReceiptWrites.at(-1);
  const receiptPayload = Array.isArray(latestReceiptWrite) ? latestReceiptWrite[0] : latestReceiptWrite;
  assert.equal(receiptPayload.metadata.lifecyclePhase, 'receipt_received');
  assert.equal(receiptPayload.metadata.reviewState, 'pending_admin_review');
  assert.equal(receiptPayload.metadata.adminActionRequired, true);
  assert.equal(receiptPayload.metadata.paymentActionRequired, true);
  assert.equal(receiptPayload.metadata.entitlementState, 'not_granted_pending');
  assert.equal(receiptPayload.metadata.proofReceived, true);
  assert.equal(receiptPayload.metadata.proofStorage, 'supabase_signed_upload');
  assert.equal(receiptPayload.metadata.proofBucket, 'payment-proofs');
  assert.match(receiptPayload.metadata.proofObjectPath, new RegExp(`^.*${requestId}_proof_\\d+\\.png$`));

  const badTypeReq = makeReq({
    cookies: { auth_token: token },
    body: {
      draftToken: body.draftToken,
      requestId,
      mimeType: 'text/html',
      sizeBytes: 100,
    },
  });
  const badTypeRes = createMockRes();
  await proofHandler(badTypeReq, badTypeRes as any);
  assert.equal(badTypeRes.statusCode, 415);
  assert.equal(JSON.parse(badTypeRes.body).errorCode, 'invalid_proof_type');

  const tooLargeReq = makeReq({
    cookies: { auth_token: token },
    body: {
      draftToken: body.draftToken,
      requestId,
      mimeType: 'application/pdf',
      sizeBytes: 2 * 1024 * 1024,
    },
  });
  const tooLargeRes = createMockRes();
  await proofHandler(tooLargeReq, tooLargeRes as any);
  assert.equal(tooLargeRes.statusCode, 413);
  assert.equal(JSON.parse(tooLargeRes.body).errorCode, 'payload_too_large');
});

test('manual payment proof blocks duplicate checkout until admin review finishes', async () => {
  const { body, token } = await postCheckout('runtime_user_duplicate_guard');
  const proofReq = makeReq({
    cookies: { auth_token: token },
    body: {
      draftToken: body.draftToken,
      requestId: body.paymentRequestId,
      mimeType: 'image/png',
      sizeBytes: 12345,
    },
  });
  const proofRes = createMockRes();
  await proofHandler(proofReq, proofRes as any);
  assert.equal(proofRes.statusCode, 200);

  const duplicate = await postCheckout('runtime_user_duplicate_guard');
  assert.equal(duplicate.res.statusCode, 403);
  assert.equal(duplicate.body.errorCode, 'pending_invoice_exists');
});

test('manual payment proof falls back to support when signed upload generation fails', async () => {
  const activeFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/storage/v1/object/upload/sign/')) {
      return new Response(JSON.stringify({ message: 'bucket missing' }), { status: 503 });
    }
    return activeFetch(input, init);
  }) as typeof fetch;

  try {
    const { body, token } = await postCheckout('runtime_user_proof_fallback');
    const proofReq = makeReq({
      cookies: { auth_token: token },
      body: {
        draftToken: body.draftToken,
        requestId: body.paymentRequestId,
        mimeType: 'image/jpeg',
        sizeBytes: 32100,
      },
    });
    const proofRes = createMockRes();
    await proofHandler(proofReq, proofRes as any);

    assert.equal(proofRes.statusCode, 200);
    const proofBody = JSON.parse(proofRes.body);
    assert.equal(proofBody.ok, true);
    assert.equal(proofBody.status, 'receipt_received');
    assert.equal(proofBody.proofStorage, 'support_fallback');
    assert.equal(proofBody.proof.storage, 'metadata_only');
    assert.equal(proofBody.deliveryMode, 'manual_support');
    assert.equal(proofBody.uploadUrl, undefined);
    assert.equal(proofBody.supportMessage.templateType, 'proof_upload_failed_support_fallback');
    assert.match(proofBody.supportMessage.text, /upload bukti transfer di aplikasi gagal/);
    assert.match(decodeURIComponent(proofBody.supportLinks.whatsappUrl), /Payment ID:/);
    assert.match(proofBody.supportLinks.whatsappUrl, /^https:\/\/wa\.me\//);
    assert.equal(proofBody.entitlement, 'pending_admin_review');
  } finally {
    globalThis.fetch = activeFetch;
  }
});

test('billing portal returns manual support fallback when provider portal is not configured', async () => {
  const token = createToken({
    id: 'runtime_user_portal_fallback',
    email: 'manual.customer@example.com',
    name: 'Manual Customer',
  });
  const portalReq = makeReq({
    cookies: { auth_token: token },
  });
  const portalRes = createMockRes();
  await portalHandler(portalReq, portalRes as any);

  assert.equal(portalRes.statusCode, 200);
  const portalBody = JSON.parse(portalRes.body);
  assert.equal(portalBody.ok, true);
  assert.equal(portalBody.mode, 'manual_support');
  assert.equal(portalBody.provider, 'manual');
  assert.equal(portalBody.paymentActionRequired, true);
  assert.match(portalBody.supportLinks.whatsappUrl, /^https:\/\/wa\.me\//);
});

test('admin manual payment verification grants entitlement only after verified paid action', async () => {
  const { body, token } = await postCheckout('runtime_user_trial_review');
  const proofReq = makeReq({
    cookies: { auth_token: token },
    body: {
      draftToken: body.draftToken,
      requestId: body.paymentRequestId,
      mimeType: 'application/pdf',
      sizeBytes: 54321,
    },
  });
  const proofRes = createMockRes();
  await proofHandler(proofReq, proofRes as any);
  assert.equal(proofRes.statusCode, 200);

  const adminToken = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const verifyReq = makeReq({
    method: 'PATCH',
    cookies: { auth_token: adminToken },
    body: {
      action: 'update_manual_payment',
      paymentRequestId: body.paymentRequestId,
      manualAction: 'verified_paid',
    },
  });
  const verifyRes = createMockRes();
  await adminManagementHandler(verifyReq, verifyRes as any);

  assert.equal(verifyRes.statusCode, 200);
  const verifyBody = JSON.parse(verifyRes.body);
  const payment = verifyBody.billing.manualPayments.find((item: any) => item.id === body.paymentRequestId);
  const user = verifyBody.users.find((item: any) => item.id === 'runtime_user_trial_review');
  assert.equal(payment.status, 'verified_paid');
  assert.equal(user.planCode, 'pro');
  assert.equal(user.billing.status, 'active');
  assert.equal(user.billing.provider, 'manual');
  assert.equal(user.billing.paymentActionRequired, false);
  assert.match(user.billing.currentPeriodStart, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(user.billing.currentPeriodEnd, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(new Date(user.billing.currentPeriodEnd).getTime() > new Date(user.billing.currentPeriodStart).getTime());
  assert.ok(verifyBody.audit.some((event: any) => (
    event.action === 'manual_payment_verified_paid'
    && event.target === body.paymentRequestId
  )));
  assert.ok(verifyBody.audit.some((event: any) => (
    event.action === 'user_updated'
    && event.target === 'runtime_user_trial_review'
  )));
});

test('persisted manual payment verification accepts legacy manual_review receipt rows', async () => {
  const activeFetch = globalThis.fetch;
  const patchUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    if (url.includes('/rest/v1/payment_receipts') && method === 'GET') {
      return new Response(JSON.stringify([{
        manual_request_id: 'manual_legacy_aabbccddeeff',
        user_id: 'runtime_user_trial_review',
        requested_plan_code: 'pro',
        requested_duration: 'monthly',
        requested_currency: 'usd',
        requested_amount: 19,
        requested_amount_label: '$19.00',
        payer_email: 'manual.customer@example.com',
        status: 'manual_review',
        metadata: {
          manualStatus: 'receipt_received',
          manualRequestId: 'manual_legacy_aabbccddeeff',
          duration: 'monthly',
          currency: 'usd',
          amount: 19,
          amountLabel: '$19.00',
          instructions: readManualPaymentInstructions('usd') || {},
        },
        created_at: '2026-06-27T00:00:00.000Z',
        updated_at: '2026-06-27T00:00:00.000Z',
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/payment_receipts') && method === 'PATCH') {
      patchUrls.push(url);
      return new Response(JSON.stringify([{ manual_request_id: 'manual_legacy_aabbccddeeff' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const request = await updatePersistedManualPaymentStatus(
      'manual_legacy_aabbccddeeff',
      'verified_paid',
      undefined,
      'owner@example.com',
    );

    assert.equal(request?.status, 'verified_paid');
    assert.ok(patchUrls.some((url) => url.includes('status=in.(queued,manual_review,pending_review,receipt_received)')));
  } finally {
    globalThis.fetch = activeFetch;
  }
});

test('manual payment instructions return dynamic banks by currency (BND / IDR)', () => {
  delete process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER;
  const bndInstructions = readManualPaymentInstructions('bnd');
  assert.ok(bndInstructions);
  assert.equal(bndInstructions.banks?.length, 2);
  assert.equal(bndInstructions.banks[0].bankName, 'BIBD');
  assert.equal(bndInstructions.banks[0].accountName, 'NUR HANISAH BINTI MUSLI');
  assert.equal(bndInstructions.banks[0].accountNumber, '00010020260978');
  assert.equal(bndInstructions.banks[1].bankName, 'TAIB');
  assert.equal(bndInstructions.banks[1].accountName, 'NUR HANISAH BINTI MUSLI');
  assert.equal(bndInstructions.banks[1].accountNumber, '005103344301013');

  const idrInstructions = readManualPaymentInstructions('idr');
  assert.ok(idrInstructions);
  assert.equal(idrInstructions.banks?.length, 2);
  assert.equal(idrInstructions.banks[0].bankName, 'BCA');
  assert.equal(idrInstructions.banks[0].accountName, 'AHMAD MUHTAR ALIMUDIN');
  assert.equal(idrInstructions.banks[0].accountNumber, '3480711393');
  assert.equal(idrInstructions.banks[1].bankName, 'SEABANK');
  assert.equal(idrInstructions.banks[1].accountName, 'AHMAD MUHTAR ALIMUDIN');
  assert.equal(idrInstructions.banks[1].accountNumber, '901080204855');

  assert.equal(bndInstructions.whatsappNumber, '6738270092');
  assert.equal(bndInstructions.instagramHandle, '@baristachaw');
  assert.equal(bndInstructions.instagramUrl, 'https://instagram.com/baristachaw');
});

test('manual payment checkout honors idempotency key and returns existing request', async () => {
  const tokenPayload = {
    id: 'idempotent-user',
    email: 'idempotent@example.com',
    name: 'Idempotent User',
  };
  const token = createToken(tokenPayload);

  let insertCount = 0;
  let generatedRequestId = '';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';

    if (url.includes('/rest/v1/payment_receipts') && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/payment_receipts') && method === 'POST') {
      if (insertCount > 0) {
        return new Response(JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      insertCount++;
      return new Response(JSON.stringify([{ id: 'mock-id' }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/payment_receipts') && method === 'PATCH') {
      return new Response(JSON.stringify([{ id: 'mock-id' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Also mock app_users so the first request doesn't throw
    if (url.includes('/rest/v1/app_users') && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/app_users') && method === 'POST') {
      return new Response(JSON.stringify([{ id: tokenPayload.id }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/app_users') && method === 'PATCH') {
      return new Response(JSON.stringify([{ id: tokenPayload.id }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/user_entitlements') || url.includes('/rest/v1/app_plans') || url.includes('/rest/v1/app_feature_flags') || url.includes('/rest/v1/admin_audit_events') || url.includes('/rest/v1/plan_prices')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  }) as typeof fetch;

  const req1 = makeReq({
    cookies: { auth_token: token },
    body: {
      planCode: 'pro',
      duration: 'yearly',
      idempotencyKey: 'idem-test-key-1',
    },
  });
  const res1 = createMockRes();
  await checkoutHandler(req1, res1 as any);
  assert.equal(res1.statusCode, 200);
  const body1 = JSON.parse(res1.body);
  generatedRequestId = body1.paymentRequestId;
  assert.match(generatedRequestId, /^manual_/);

  // Change fetch to return existing record for the next request
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';
    console.log(`[TEST FETCH MOCK] ${method} ${url}`);

    if (url.includes('/rest/v1/payment_receipts') && method === 'GET') {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl.includes('select=manual_request_id,metadata')) {
        console.log(`[TEST FETCH MOCK] Returning existing request id: ${generatedRequestId}`);
        return new Response(JSON.stringify([{ manual_request_id: generatedRequestId, metadata: { manualRequestId: generatedRequestId } }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (decodedUrl.includes('select=*')) {
        console.log(`[TEST FETCH MOCK] Returning full request record`);
        return new Response(JSON.stringify([{
          manual_request_id: generatedRequestId,
          user_id: tokenPayload.id,
          requested_plan_code: 'pro',
          requested_duration: 'yearly',
          requested_currency: 'usd',
          amount: 12000,
          status: 'queued',
          metadata: { manualRequestId: generatedRequestId, amount: 12000 }
        }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      console.log(`[TEST FETCH MOCK] Returning empty array for GET payment_receipts`);
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (url.includes('/rest/v1/')) {
      console.log(`[TEST FETCH MOCK] Returning empty array for catch-all`);
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  }) as typeof fetch;

  const req2 = makeReq({
    cookies: { auth_token: token },
    body: {
      planCode: 'pro',
      duration: 'yearly',
      idempotencyKey: 'idem-test-key-1',
    },
  });
  const res2 = createMockRes();
  await checkoutHandler(req2, res2 as any);
  assert.equal(res2.statusCode, 403);
  const body2 = JSON.parse(res2.body);
  assert.equal(body2.ok, false);
  assert.equal(body2.errorCode, 'pending_invoice_exists');
});
