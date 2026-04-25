import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import accountStatusHandler from '../../server-api/account/status.ts';

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
  assert.ok(body.maintenance.some((flag: any) => flag.key === 'scanner' && flag.status === 'maintenance'));
  assert.equal(body.appAccess.status, 'limited');
});
