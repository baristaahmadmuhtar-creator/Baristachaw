import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import adminManagementHandler from '../../server-api/admin/management.ts';
import {
  recordAiProviderFailure,
  recordAiProviderUsage,
  resetAiProviderRuntimeStateForTests,
} from '../../server-api/_aiProviderControl.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_RUNTIME_WRITE_FALLBACK: process.env.ADMIN_RUNTIME_WRITE_FALLBACK,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  AI_PAID_OPENAI_API_KEY: process.env.AI_PAID_OPENAI_API_KEY,
  AI_BREW_PAID_GROQ_API_KEY: process.env.AI_BREW_PAID_GROQ_API_KEY,
  REVENUECAT_WEBHOOK_SECRET: process.env.REVENUECAT_WEBHOOK_SECRET,
  GOOGLE_PLAY_PACKAGE_NAME: process.env.GOOGLE_PLAY_PACKAGE_NAME,
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY,
  APP_STORE_CONNECT_ISSUER_ID: process.env.APP_STORE_CONNECT_ISSUER_ID,
  APP_STORE_SHARED_SECRET: process.env.APP_STORE_SHARED_SECRET,
  APPLE_APP_ID: process.env.APPLE_APP_ID,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  BILLING_CHECKOUT_URL: process.env.BILLING_CHECKOUT_URL,
  BILLING_LIVE_MODE: process.env.BILLING_LIVE_MODE,
  BILLING_SYNC_TOKEN: process.env.BILLING_SYNC_TOKEN,
  BILLING_WEBHOOK_SECRET: process.env.BILLING_WEBHOOK_SECRET,
  MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
  MIDTRANS_WEBHOOK_SECRET: process.env.MIDTRANS_WEBHOOK_SECRET,
  XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY,
  XENDIT_WEBHOOK_TOKEN: process.env.XENDIT_WEBHOOK_TOKEN,
  MANUAL_PAYMENT_ENABLED: process.env.MANUAL_PAYMENT_ENABLED,
  MANUAL_PAYMENT_BANK_NAME: process.env.MANUAL_PAYMENT_BANK_NAME,
  MANUAL_PAYMENT_ACCOUNT_NAME: process.env.MANUAL_PAYMENT_ACCOUNT_NAME,
  MANUAL_PAYMENT_ACCOUNT_NUMBER: process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER,
  MANUAL_PAYMENT_WHATSAPP_NUMBER: process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER,
  MANUAL_PAYMENT_SUPPORT_EMAIL: process.env.MANUAL_PAYMENT_SUPPORT_EMAIL,
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
  const ip = `203.0.113.${80 + requestSequence}`;
  const baseHeaders = {
    origin: 'http://127.0.0.1:3000',
    'x-forwarded-for': ip,
  };
  return {
    method: 'GET',
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

test.beforeEach(() => {
  process.env.JWT_SECRET = 'admin-unit-test-secret-32-chars-min';
  process.env.ADMIN_EMAILS = 'owner@example.com';
  delete process.env.ADMIN_USER_IDS;
  delete process.env.SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.ADMIN_RUNTIME_WRITE_FALLBACK;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.AI_PAID_OPENAI_API_KEY;
  delete process.env.AI_BREW_PAID_GROQ_API_KEY;
  delete process.env.REVENUECAT_WEBHOOK_SECRET;
  delete process.env.GOOGLE_PLAY_PACKAGE_NAME;
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  delete process.env.APP_STORE_CONNECT_ISSUER_ID;
  delete process.env.APP_STORE_SHARED_SECRET;
  delete process.env.APPLE_APP_ID;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.BILLING_CHECKOUT_URL;
  delete process.env.BILLING_LIVE_MODE;
  delete process.env.BILLING_SYNC_TOKEN;
  delete process.env.BILLING_WEBHOOK_SECRET;
  delete process.env.MIDTRANS_SERVER_KEY;
  delete process.env.MIDTRANS_WEBHOOK_SECRET;
  delete process.env.XENDIT_SECRET_KEY;
  delete process.env.XENDIT_WEBHOOK_TOKEN;
  delete process.env.MANUAL_PAYMENT_ENABLED;
  delete process.env.MANUAL_PAYMENT_BANK_NAME;
  delete process.env.MANUAL_PAYMENT_ACCOUNT_NAME;
  delete process.env.MANUAL_PAYMENT_ACCOUNT_NUMBER;
  delete process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER;
  delete process.env.MANUAL_PAYMENT_SUPPORT_EMAIL;
  resetAiProviderRuntimeStateForTests();
});

test.after(() => {
  restoreEnv();
});

test('admin management rejects authenticated non-admin users', async () => {
  const token = createToken({
    id: 'regular-user',
    email: 'regular@example.com',
    name: 'Regular User',
  });
  const req = makeReq({
    cookies: { auth_token: token },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'admin_required');
});

test('admin management returns runtime snapshot for allowlisted owner', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
    provider: 'google',
  });
  const req = makeReq({
    cookies: { auth_token: token },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.dataMode, 'runtime_fallback');
  assert.equal(body.admin.email, 'owner@example.com');
  assert.ok(body.users.length >= 1);
  assert.ok(body.users.every((user: any) => typeof user.username === 'string'));
  assert.ok(body.users.every((user: any) => user.billing && typeof user.billing.status === 'string'));
  assert.ok(body.plans.some((plan: any) => plan.code === 'pro'));
  assert.ok(body.plans.some((plan: any) => (
    plan.code === 'pro'
    && plan.billingProvider === 'manual'
    && plan.checkoutMode === 'manual_invoice'
  )));
  assert.equal(body.billing.mode, body.billing.connectedProviders.length > 0 ? 'test' : 'not_configured');
  assert.ok(Array.isArray(body.billing.gaps));
  assert.ok(body.featureFlags.some((flag: any) => flag.key === 'chat'));
  assert.ok(body.featureFlags.some((flag: any) => flag.key === 'ai_brew_fallback' && flag.status === 'available'));
  assert.ok(body.featureFlags.some((flag: any) => flag.key === 'ai_provider_groq' && flag.status === 'available'));
  assert.ok(body.ai && Array.isArray(body.ai.providers));
  assert.ok(body.aiBrewFallbacks && Array.isArray(body.aiBrewFallbacks.recentEvents));
  assert.equal(body.aiBrewFallbacks.totalEvents, 0);
  assert.ok(body.checks.some((check: any) => check.id === 'database_persistence' && check.status === 'fail'));
  assert.ok(body.checks.some((check: any) => check.id === 'paid_ai_quota_failure_policy' && check.status === 'fail'));
});

test('admin management supports section pagination and filters for user tab payloads', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
    provider: 'google',
  });
  const req = makeReq({
    query: {
      section: 'users',
      limit: '2',
      page: '1',
      query: 'runtime',
      sort: 'risk_desc',
      status: 'active',
    },
    cookies: { auth_token: token },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.section, 'users');
  assert.equal(body.pagination.users.limit, 2);
  assert.equal(body.pagination.users.page, 1);
  assert.equal(body.pagination.users.returned <= 2, true);
  assert.equal(body.pagination.users.filters.status, 'active');
  assert.equal(body.appliedFilters.query, 'runtime');
  assert.equal(body.appliedFilters.sort, 'risk_desc');
  assert.equal(typeof body.counts.users, 'number');
  assert.ok(body.users.every((user: any) => user.status === 'active'));
});

test('admin management exposes AI provider inventory without leaking server keys', async () => {
  process.env.GROQ_API_KEY = 'gsk_live_secret_one,gsk_live_secret_two';
  process.env.AI_PAID_OPENAI_API_KEY = 'sk-paid-openai-secret';
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    cookies: { auth_token: token },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const groq = body.ai.providers.find((item: any) => item.provider === 'GROQ');
  const openai = body.ai.providers.find((item: any) => item.provider === 'OPENAI');
  assert.equal(groq.keyCount, 2);
  assert.equal(groq.standardKeyCount, 2);
  assert.equal(openai.paidKeyCount, 1);
  assert.equal(body.ai.configuredProviders >= 2, true);
  assert.equal(JSON.stringify(body).includes('gsk_live_secret_one'), false);
  assert.equal(JSON.stringify(body).includes('sk-paid-openai-secret'), false);
});

test('admin management exposes AI Brew provider usage without prompt or key leakage', async () => {
  recordAiProviderUsage({
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    feature: 'ai_brew',
    route: '/api/chat',
    action: 'race',
    mode: 'precision',
    outcome: 'success',
    inputTokens: 320,
    outputTokens: 140,
    latencyMs: 1250,
  });
  recordAiProviderFailure({
    provider: 'GROQ',
    model: 'llama-3.3-70b-versatile',
    feature: 'ai_brew',
    route: '/api/chat',
    action: 'race',
    mode: 'quick',
    inputTokens: 280,
    errorCode: 'rate_limited',
  });
  recordAiProviderUsage({
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    feature: 'ai_chat',
    route: '/api/chat',
    action: 'race',
    mode: 'normal',
    outcome: 'success',
    inputTokens: 100,
    outputTokens: 40,
  });
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    query: { aiFrom: '2026-01-01', aiTo: '2099-12-31' },
    cookies: { auth_token: token },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ai.usage.source, 'runtime_estimate');
  assert.equal(body.ai.usage.custom.requests, 2);
  assert.equal(body.ai.usage.custom.successes, 1);
  assert.equal(body.ai.usage.custom.rateLimited, 1);
  assert.equal(body.ai.usage.custom.inputTokens, 600);
  assert.equal(body.ai.usage.custom.outputTokens, 140);
  assert.ok(body.ai.usage.custom.estimatedCostUsd >= 0);
  assert.ok(body.ai.usage.custom.providerBreakdown.some((item: any) => item.key === 'GEMINI' && item.requests === 1));
  assert.ok(body.ai.usage.custom.providerBreakdown.some((item: any) => item.key === 'GROQ' && item.rateLimited === 1));
  assert.equal(body.ai.usage.recentEvents.some((event: any) => event.feature === 'ai_chat'), false);
  assert.equal(body.aiBrewFallbacks.totalEvents, 0);
  assert.equal(JSON.stringify(body).includes('gsk_live_secret'), false);
});

test('admin management patch updates runtime users and records audit', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        displayName: 'Review Captain',
        username: 'Review Captain MVP',
        planCode: 'pro',
        status: 'active',
        supportNote: 'Password reset verified by support.',
        accountRecoveryStatus: 'requested',
        passwordResetRequired: true,
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const user = body.users.find((item: any) => item.id === 'runtime_user_trial_review');
  assert.equal(user.name, 'Review Captain');
  assert.equal(user.username, 'review-captain-mvp');
  assert.equal(user.planCode, 'pro');
  assert.equal(user.status, 'active');
  assert.equal(user.supportNote, 'Password reset verified by support.');
  assert.equal(user.accountRecoveryStatus, 'requested');
  assert.equal(user.passwordResetRequired, true);
  assert.ok(user.lastRecoveryRequestAt);
  assert.ok(body.audit.some((event: any) => event.action === 'user_updated'));
  assert.ok(body.audit.some((event: any) => event.action === 'user_updated' && event.detail.includes('Support note: Password reset verified by support.')));
});

test('admin management patch updates runtime billing controls', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        planCode: 'starter',
        billingStatus: 'past_due',
        billingProvider: 'stripe',
        billingMarket: 'indonesia',
        paymentActionRequired: true,
        supportNote: 'Operator reason: moved user into Starter past-due billing review.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const user = body.users.find((item: any) => item.id === 'runtime_user_trial_review');
  assert.equal(user.planCode, 'starter');
  assert.equal(user.status, 'past_due');
  assert.equal(user.billing.status, 'past_due');
  assert.equal(user.billing.provider, 'stripe');
  assert.equal(user.billing.market, 'indonesia');
  assert.equal(user.billing.paymentActionRequired, true);
  assert.ok(body.billing.attentionUsers >= 1);
});

test('admin management applies receipt-received billing as provisional manual review', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        planCode: 'pro',
        status: 'active',
        billingStatus: 'trialing',
        billingProvider: 'manual',
        billingMarket: 'indonesia',
        paymentActionRequired: true,
        supportNote: 'Receipt received: provisional Pro token limits applied. Admin must verify subscription manually.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const user = body.users.find((item: any) => item.id === 'runtime_user_trial_review');
  assert.equal(user.planCode, 'pro');
  assert.equal(user.status, 'active');
  assert.equal(user.billing.status, 'trialing');
  assert.equal(user.billing.provider, 'manual');
  assert.equal(user.billing.market, 'indonesia');
  assert.equal(user.billing.paymentActionRequired, true);
  assert.match(user.supportNote, /Receipt received/);
  assert.ok(body.billing.trialingSubscriptions >= 1);
});

test('admin management requires support note for direct plan overrides', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_team_cafe',
      patch: {
        planCode: 'pro',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'operator_reason_required');
});

test('admin management makes direct paid plan overrides billing coherent', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_team_cafe',
      patch: {
        planCode: 'pro',
        supportNote: 'Operator reason: applied direct Pro review entitlement.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const user = body.users.find((item: any) => item.id === 'runtime_user_team_cafe');
  assert.equal(user.planCode, 'pro');
  assert.equal(user.billing.status, 'trialing');
  assert.equal(user.billing.provider, 'manual');
  assert.equal(user.billing.paymentActionRequired, true);
});

test('admin management requires support note before activating paid billing', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        billingStatus: 'active',
        billingProvider: 'manual',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'operator_reason_required');
});

test('admin management prevents signed-in admin self lockout', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'owner-user',
      patch: {
        status: 'suspended',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'self_protection');
});

test('admin management denies analyst mutations', async () => {
  const token = createToken({
    id: 'analyst-user',
    email: 'analyst@example.com',
    name: 'Analyst User',
    role: 'analyst',
    isAdmin: true,
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        notes: 'Read-only analyst should not write.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'admin_role_forbidden');
});

test('admin management prevents non-owner admins from granting owner access', async () => {
  const token = createToken({
    id: 'admin-user',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    isAdmin: true,
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_pro_barista',
      patch: {
        role: 'owner',
        supportNote: 'Operator reason: unauthorized owner promotion should be blocked.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'admin_role_forbidden');
});

test('admin management keeps support admins out of account status changes', async () => {
  const token = createToken({
    id: 'support-user',
    email: 'support@example.com',
    name: 'Support User',
    role: 'support',
    isAdmin: true,
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        status: 'active',
        supportNote: 'Operator reason: support should not directly change status.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'admin_role_forbidden');
});

test('admin management fails closed when Supabase user write fails', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  globalThis.fetch = (async () => new Response('database unavailable', { status: 500 })) as typeof fetch;
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_trial_review',
      patch: {
        notes: 'Should not fall back to runtime when Supabase is configured.',
      },
    },
  });
  const res = createMockRes();

  try {
    await adminManagementHandler(req, res as any);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 503);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'supabase_update_failed');
});

test('admin management updates runtime plan catalog and records audit', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_plan',
      planCode: 'starter',
      patch: {
        name: 'Starter Indonesia',
        aiDailyLimit: 72,
        displayPrice: 'Rp89k monthly',
        features: ['Higher AI quota', 'AI Brew journal', 'Indonesia launch support'],
        operatorNote: 'Operator reason: align Starter catalog for Indonesia launch.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const plan = body.plans.find((item: any) => item.code === 'starter');
  assert.equal(plan.name, 'Starter Indonesia');
  assert.equal(plan.aiDailyLimit, 72);
  assert.equal(plan.displayPrice, 'Rp89k monthly');
  assert.deepEqual(plan.features, ['Higher AI quota', 'AI Brew journal', 'Indonesia launch support']);
  assert.ok(body.audit.some((event: any) => (
    event.action === 'plan_updated'
    && event.target === 'starter'
    && event.detail.includes('Operator reason: align Starter catalog')
  )));
});

test('admin management requires operator note for plan catalog changes', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_plan',
      planCode: 'pro',
      patch: {
        aiDailyLimit: 220,
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'operator_reason_required');
});

test('admin management denies analyst plan catalog mutations', async () => {
  const token = createToken({
    id: 'analyst-user',
    email: 'analyst@example.com',
    name: 'Analyst User',
    role: 'analyst',
    isAdmin: true,
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_plan',
      planCode: 'team',
      patch: {
        seats: 12,
        operatorNote: 'Operator reason: analyst should not mutate plan catalog.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'admin_role_forbidden');
});

test('admin management fails closed when Supabase plan write fails', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  globalThis.fetch = (async () => new Response('database unavailable', { status: 500 })) as typeof fetch;
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_plan',
      planCode: 'pro',
      patch: {
        displayPrice: 'Rp159k monthly',
        operatorNote: 'Operator reason: verify Supabase failure path for plan catalog.',
      },
    },
  });
  const res = createMockRes();

  try {
    await adminManagementHandler(req, res as any);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 503);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'supabase_update_failed');
});

test('admin management queues runtime catalog database requests', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'create_catalog_request',
      patch: {
        kind: 'grinder',
        title: 'Timemore C3S launch catalog',
        entityId: 'timemore-c3s',
        sourceUrl: 'https://example.com/timemore-c3s',
        payload: {
          brand: 'Timemore',
          model: 'Chestnut C3S',
          region: 'Indonesia',
        },
        operatorNote: 'Operator reason: add popular Indonesia grinder candidate.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.catalog.reviewQueue.queued >= 1, true);
  assert.ok(body.catalog.recentRequests.some((item: any) => (
    item.kind === 'grinder'
    && item.title === 'Timemore C3S launch catalog'
    && item.payloadPreview.includes('Timemore')
  )));
  assert.ok(body.audit.some((event: any) => event.action === 'catalog_request_created'));
});

test('admin management requires operator reason for critical account changes', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_pro_barista',
      patch: {
        status: 'suspended',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'operator_reason_required');
});

test('admin management accepts critical account changes with operator reason', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_pro_barista',
      patch: {
        status: 'suspended',
        supportNote: 'Operator reason: verified abuse report before suspension.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const user = body.users.find((item: any) => item.id === 'runtime_user_pro_barista');
  assert.equal(user.status, 'suspended');
  assert.equal(user.supportNote, 'Operator reason: verified abuse report before suspension.');
  assert.ok(body.audit.some((event: any) => (
    event.action === 'user_updated'
    && event.severity === 'warning'
    && event.detail.includes('Support note: Operator reason: verified abuse report')
  )));
});

test('admin management rejects duplicate usernames', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_team_cafe',
      patch: {
        username: 'pro-barista',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 409);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'username_conflict');
  assert.match(body.details, /pro\.barista@example\.com/);
});

test('admin management accepts unique username changes', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_past_due',
      patch: {
        username: 'billing-watch-launch',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const user = body.users.find((item: any) => item.id === 'runtime_user_past_due');
  assert.equal(user.username, 'billing-watch-launch');
  assert.ok(body.audit.some((event: any) => (
    event.action === 'user_updated'
    && event.detail.includes('username')
  )));
});

test('admin management rejects reserved usernames', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_team_cafe',
      patch: {
        username: 'admin',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'validation_error');
  assert.equal(body.error, 'username is reserved');
  assert.match(body.details, /@admin/);
});

test('admin management rejects invalid role values instead of defaulting them', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_user',
      userId: 'runtime_user_team_cafe',
      patch: {
        role: 'superadmin',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'validation_error');
  assert.equal(body.error, 'role is invalid');
  assert.match(body.details, /owner, admin, support, analyst, user/);
});

test('admin management requires operator message for unavailable feature flags', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_feature_flag',
      key: 'ai_brew',
      patch: {
        status: 'maintenance',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'feature_flag_message_required');
});

test('admin management rejects unknown feature flag keys', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_feature_flag',
      key: 'made_up_flag',
      patch: {
        status: 'maintenance',
        message: 'Unknown feature flag should not be created from admin UI.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'validation_error');
  assert.equal(body.error, 'feature flag key is unknown');
});

test('admin management rejects invalid feature flag statuses', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_feature_flag',
      key: 'scanner',
      patch: {
        status: 'paused',
        message: 'Invalid status must not normalize to available.',
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'validation_error');
  assert.equal(body.error, 'status is invalid');
});

test('admin management accepts disabled feature flags with operator message', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_feature_flag',
      key: 'collection',
      patch: {
        status: 'disabled',
        message: 'Collection disabled during launch data migration.',
        surfaces: ['web', 'pwa'],
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const flag = body.featureFlags.find((item: any) => item.key === 'collection');
  assert.equal(flag.status, 'disabled');
  assert.equal(flag.message, 'Collection disabled during launch data migration.');
  assert.deepEqual(flag.surfaces, ['web', 'pwa']);
  assert.ok(body.audit.some((event: any) => (
    event.action === 'feature_flag_updated'
    && event.severity === 'critical'
    && event.detail.includes('Message: Collection disabled during launch data migration.')
  )));
});

test('admin management can disable an AI provider with a safe audit trail', async () => {
  process.env.GROQ_API_KEY = 'gsk_provider_control_secret';
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_feature_flag',
      key: 'ai_provider_groq',
      patch: {
        status: 'disabled',
        message: 'Groq quota limit reached; use paid fallback providers.',
        surfaces: ['web', 'pwa', 'mobile', 'admin'],
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const provider = body.ai.providers.find((item: any) => item.provider === 'GROQ');
  assert.equal(provider.status, 'disabled');
  assert.equal(provider.keyCount, 1);
  assert.equal(JSON.stringify(body).includes('gsk_provider_control_secret'), false);
  assert.ok(body.audit.some((event: any) => (
    event.action === 'feature_flag_updated'
    && event.target === 'ai_provider_groq'
    && event.severity === 'critical'
  )));
});

test('admin management patch updates runtime maintenance flags', async () => {
  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });
  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_feature_flag',
      key: 'scanner',
      patch: {
        status: 'maintenance',
        message: 'Scanner maintenance window',
        surfaces: ['web', 'pwa', 'mobile'],
      },
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  const flag = body.featureFlags.find((item: any) => item.key === 'scanner');
  assert.equal(flag.status, 'maintenance');
  assert.equal(flag.message, 'Scanner maintenance window');
  assert.ok(body.audit.some((event: any) => event.action === 'feature_flag_updated'));
});

test('admin management ignores atomic update already processed error gracefully', async () => {
  process.env.SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';

  const token = createToken({
    id: 'owner-user',
    email: 'owner@example.com',
    name: 'Owner User',
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';
    if (url.includes('/rest/v1/payment_receipts') && method === 'GET') {
      return new Response(JSON.stringify([{
        manual_request_id: 'pay-123',
        user_id: 'mocked-user',
        requested_plan_code: 'pro',
        requested_duration: 'yearly',
        requested_currency: 'usd',
        amount: 12000,
        status: 'pending_review',
        metadata: { manualRequestId: 'pay-123', duration: 'yearly', currency: 'usd', amount: 12000 },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/payment_receipts') && method === 'PATCH') {
      return new Response(JSON.stringify({
        code: '23505',
        details: 'ATOMIC_UPDATE_FAILED_ALREADY_PROCESSED',
        message: 'The record has already been processed and the precondition failed.',
      }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    // Handle audit logging silently for test
    if (url.includes('/rest/v1/audit_logs')) {
      return new Response(JSON.stringify({}), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  const req = makeReq({
    method: 'PATCH',
    cookies: { auth_token: token },
    body: {
      action: 'update_manual_payment',
      paymentRequestId: 'pay-123',
      manualAction: 'verified_paid',
    },
  });
  const res = createMockRes();

  await adminManagementHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  // It shouldn't crash. It just returns ok: true
});
