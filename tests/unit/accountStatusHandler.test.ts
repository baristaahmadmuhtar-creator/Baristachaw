import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import accountStatusHandler from '../../server-api/account/status.ts';
import { getPlanByCode } from '../../packages/shared/src/planCatalog.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MAINTENANCE_FEATURES: process.env.MAINTENANCE_FEATURES,
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
    },
    cookies: {},
    socket: {
      remoteAddress: '203.0.113.91',
    },
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

test.beforeEach(() => {
  process.env.JWT_SECRET = 'account-unit-test-secret-32-chars-min';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.MAINTENANCE_FEATURES;
});

test.after(() => {
  restoreEnv();
});

test('account status rejects anonymous users', async () => {
  const req = makeReq();
  const res = createMockRes();

  await accountStatusHandler(req, res as any);

  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).errorCode, 'auth_required');
});

test('account status returns plan and runtime maintenance flags for mobile', async () => {
  process.env.MAINTENANCE_FEATURES = 'scanner';
  const token = createToken({
    id: 'mobile-user',
    email: 'mobile@example.com',
    name: 'Mobile User',
    provider: 'google',
  });
  const req = makeReq({
    query: { surface: 'mobile' },
    headers: {
      origin: 'http://127.0.0.1:3000',
      authorization: `Bearer ${token}`,
    },
  });
  const res = createMockRes();

  await accountStatusHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.dataMode, 'runtime_fallback');
  assert.equal(body.user.planCode, 'free');
  assert.equal(body.plan.aiDailyLimit, 12);
  assert.ok(Array.isArray(body.plans));
  assert.equal(body.billing.status, 'none');
  assert.equal(body.recommendedUpgrade.planCode, 'pro');
  assert.equal(body.recommendedUpgrade.action, 'checkout');
  const starterPlan = body.plans.find((plan: any) => plan.code === 'starter');
  const proPlan = body.plans.find((plan: any) => plan.code === 'pro');
  assert.equal(starterPlan.name, getPlanByCode('starter').displayName);
  assert.equal(starterPlan.description, getPlanByCode('starter').description);
  assert.equal(proPlan.name, getPlanByCode('pro').displayName);
  assert.equal(proPlan.description, getPlanByCode('pro').description);
  assert.ok(body.featureFlags.some((flag: any) => flag.key === 'ai_brew_fallback' && flag.status === 'available'));
  assert.ok(body.maintenance.some((flag: any) => flag.key === 'scanner' && flag.status === 'maintenance'));
  assert.equal(body.appAccess.status, 'limited');
});

test('account status limits paid plan when billing provider is missing', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const token = createToken({
    id: 'paid-user',
    email: 'paid@example.com',
    name: 'Paid User',
    provider: 'email',
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.paid-user')) {
      return new Response(JSON.stringify([{
        id: 'paid-user',
        email: 'paid@example.com',
        display_name: 'Paid User',
        provider: 'email',
        status: 'active',
        plan_code: 'pro',
        billing_status: 'active',
        billing_provider: 'none',
        billing_market: 'indonesia',
        payment_action_required: false,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url} ${init?.method || 'GET'}`);
  }) as typeof fetch;
  const req = makeReq({
    headers: {
      origin: 'http://127.0.0.1:3000',
      authorization: `Bearer ${token}`,
    },
  });
  const res = createMockRes();

  try {
    await accountStatusHandler(req, res as any);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.dataMode, 'supabase');
  assert.equal(body.user.planCode, 'pro');
  assert.equal(body.billing.status, 'trialing');
  assert.equal(body.billing.paymentAction, 'contact_support');
  assert.equal(body.billing.paymentActionRequired, true);
  assert.equal(body.recommendedUpgrade.action, 'contact_support');
  assert.equal(body.appAccess.status, 'limited');
});

test('account status treats manual proof review as contact support without paid entitlement', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const token = createToken({
    id: 'manual-review-user',
    email: 'manual@example.com',
    name: 'Manual Review User',
    provider: 'email',
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.manual-review-user')) {
      return new Response(JSON.stringify([{
        id: 'manual-review-user',
        email: 'manual@example.com',
        display_name: 'Manual Review User',
        provider: 'email',
        status: 'active',
        plan_code: 'free',
        billing_status: 'trialing',
        billing_provider: 'manual',
        billing_market: 'brunei',
        payment_action_required: true,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.manual-review-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url} ${init?.method || 'GET'}`);
  }) as typeof fetch;
  const req = makeReq({
    headers: {
      origin: 'http://127.0.0.1:3000',
      authorization: `Bearer ${token}`,
    },
  });
  const res = createMockRes();

  try {
    await accountStatusHandler(req, res as any);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.user.planCode, 'free');
  assert.equal(body.billing.provider, 'manual');
  assert.equal(body.billing.status, 'trialing');
  assert.equal(body.billing.paymentAction, 'contact_support');
  assert.equal(body.billing.paymentActionRequired, true);
  assert.match(body.billing.message, /waiting for admin review/i);
  assert.equal(body.recommendedUpgrade.action, 'contact_support');
  assert.equal(body.appAccess.status, 'limited');
});

test('account status ignores stale free manual checkout draft without proof', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const token = createToken({
    id: 'free-checkout-draft-user',
    email: 'draft@example.com',
    name: 'Draft User',
    provider: 'email',
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.free-checkout-draft-user')) {
      return new Response(JSON.stringify([{
        id: 'free-checkout-draft-user',
        email: 'draft@example.com',
        display_name: 'Draft User',
        provider: 'email',
        status: 'active',
        plan_code: 'free',
        billing_status: 'none',
        billing_provider: 'none',
        billing_market: 'brunei',
        payment_action_required: true,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.free-checkout-draft-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url} ${init?.method || 'GET'}`);
  }) as typeof fetch;
  const req = makeReq({
    headers: {
      origin: 'http://127.0.0.1:3000',
      authorization: `Bearer ${token}`,
    },
  });
  const res = createMockRes();

  try {
    await accountStatusHandler(req, res as any);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.user.planCode, 'free');
  assert.equal(body.billing.status, 'none');
  assert.equal(body.billing.provider, 'none');
  assert.equal(body.billing.paymentAction, 'checkout');
  assert.equal(body.billing.paymentActionRequired, false);
  assert.equal(body.recommendedUpgrade.action, 'checkout');
  assert.equal(body.appAccess.status, 'ok');
});

test('account status prefers active provider entitlement over app user fallback', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const token = createToken({
    id: 'entitled-user',
    email: 'entitled@example.com',
    name: 'Entitled User',
    provider: 'email',
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.entitled-user')) {
      return new Response(JSON.stringify([{
        id: 'entitled-user',
        email: 'entitled@example.com',
        display_name: 'Entitled User',
        provider: 'email',
        status: 'active',
        plan_code: 'free',
        billing_status: 'none',
        billing_provider: 'none',
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.entitled-user')) {
      return new Response(JSON.stringify([{
        user_id: 'entitled-user',
        plan_code: 'starter',
        source: 'midtrans',
        status: 'active',
        external_subscription_id: 'midtrans-sub-1',
        metadata: { market: 'indonesia' },
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url} ${init?.method || 'GET'}`);
  }) as typeof fetch;
  const req = makeReq({
    headers: {
      origin: 'http://127.0.0.1:3000',
      authorization: `Bearer ${token}`,
    },
  });
  const res = createMockRes();

  try {
    await accountStatusHandler(req, res as any);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.dataMode, 'supabase');
  assert.equal(body.user.planCode, 'starter');
  assert.equal(body.billing.provider, 'midtrans');
  assert.equal(body.billing.status, 'active');
  assert.equal(body.appAccess.status, 'ok');
});
