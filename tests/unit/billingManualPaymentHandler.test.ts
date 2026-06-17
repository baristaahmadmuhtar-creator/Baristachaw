import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import checkoutHandler from '../../server-api/billing/checkout.ts';
import proofHandler from '../../server-api/billing/proof.ts';
import adminManagementHandler from '../../server-api/admin/management.ts';
import { resetManualPaymentRequestsForTests, readManualPaymentInstructions } from '../../server-api/billing/manualPayments.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
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
  STRIPE_CHECKOUT_URL_PRO: process.env.STRIPE_CHECKOUT_URL_PRO,
  REVENUECAT_CHECKOUT_URL_PRO: process.env.REVENUECAT_CHECKOUT_URL_PRO,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
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

test.beforeEach(() => {
  process.env.JWT_SECRET = 'billing-unit-test-secret-32-chars-min';
  process.env.ADMIN_EMAILS = 'owner@example.com';
  process.env.MANUAL_PAYMENT_ENABLED = '1';
  process.env.MANUAL_PAYMENT_BANK_NAME = 'Unit Bank';
  process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Unit Account';
  process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER = '1234567890';
  process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER = '+673 123 4567';
  process.env.MANUAL_PAYMENT_SUPPORT_EMAIL = 'support@example.com';
  process.env.MANUAL_PAYMENT_PROOF_MAX_BYTES = String(1024 * 1024);
  delete process.env.BILLING_CHECKOUT_URL;
  delete process.env.BILLING_CHECKOUT_URL_PRO;
  delete process.env.STRIPE_CHECKOUT_URL_PRO;
  delete process.env.REVENUECAT_CHECKOUT_URL_PRO;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.REVENUECAT_API_KEY;
  resetManualPaymentRequestsForTests();
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
  assert.equal(body.manualInvoice.instructions.notifyWebhookConfigured, false);
  assert.equal(body.manualInvoice.proof.endpoint, '/api/billing/proof');
  assert.match(body.manualInvoice.message, /not granted until the payment is verified/i);
  assert.doesNotMatch(JSON.stringify(body), /STRIPE|REVENUECAT|sk_|service-role/i);
});

test('manual payment proof accepts allowlisted metadata and rejects unsafe uploads', async () => {
  const { body, token } = await postCheckout();
  const requestId = body.paymentRequestId;

  const proofReq = makeReq({
    cookies: { auth_token: token },
    body: {
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
  assert.equal(proofBody.proof.storage, 'metadata_only');
  assert.equal(proofBody.proof.mimeType, 'image/png');
  assert.match(proofBody.proof.generatedFileName, new RegExp(`^${requestId}_[a-f0-9]{16}\\.png$`));

  const badTypeReq = makeReq({
    cookies: { auth_token: token },
    body: {
      requestId,
      mimeType: 'text/html',
      sizeBytes: 100,
    },
  });
  const badTypeRes = createMockRes();
  await proofHandler(badTypeReq, badTypeRes as any);
  assert.equal(badTypeRes.statusCode, 400);
  assert.equal(JSON.parse(badTypeRes.body).errorCode, 'invalid_proof_type');

  const tooLargeReq = makeReq({
    cookies: { auth_token: token },
    body: {
      requestId,
      mimeType: 'application/pdf',
      sizeBytes: 2 * 1024 * 1024,
    },
  });
  const tooLargeRes = createMockRes();
  await proofHandler(tooLargeReq, tooLargeRes as any);
  assert.equal(tooLargeRes.statusCode, 413);
  assert.equal(JSON.parse(tooLargeRes.body).errorCode, 'proof_too_large');
});

test('admin manual payment verification grants entitlement only after verified paid action', async () => {
  const { body, token } = await postCheckout('runtime_user_trial_review');
  const proofReq = makeReq({
    cookies: { auth_token: token },
    body: {
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
  assert.ok(verifyBody.audit.some((event: any) => (
    event.action === 'manual_payment_verified_paid'
    && event.target === body.paymentRequestId
  )));
  assert.ok(verifyBody.audit.some((event: any) => (
    event.action === 'user_updated'
    && event.target === 'runtime_user_trial_review'
  )));
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
