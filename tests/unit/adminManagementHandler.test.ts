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
  assert.ok(body.users.every((user: any) => typeof user.username === 'string'));
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
