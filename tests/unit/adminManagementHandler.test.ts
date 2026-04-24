import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import adminManagementHandler from '../../server-api/admin/management.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
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
      remoteAddress: '203.0.113.88',
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
  process.env.JWT_SECRET = 'admin-unit-test-secret-32-chars-min';
  process.env.ADMIN_EMAILS = 'owner@example.com';
  delete process.env.ADMIN_USER_IDS;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  assert.ok(body.plans.some((plan: any) => plan.code === 'pro'));
  assert.ok(body.featureFlags.some((flag: any) => flag.key === 'chat'));
  assert.ok(body.checks.some((check: any) => check.id === 'database_persistence' && check.status === 'fail'));
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
        planCode: 'pro',
        status: 'active',
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
  assert.ok(body.audit.some((event: any) => event.action === 'user_updated'));
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
