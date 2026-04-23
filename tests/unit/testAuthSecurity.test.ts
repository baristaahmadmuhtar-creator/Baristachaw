import test from 'node:test';
import assert from 'node:assert/strict';
import loginHandler from '../../server-api/test-auth/login.ts';
import logoutHandler from '../../server-api/test-auth/logout.ts';
import {
  applyTestAuthCors,
  getAllowedTestAuthOrigins,
  guardTestAuthRequest,
} from '../../lib/test-auth/shared.ts';

const ENV_KEYS = [
  'NODE_ENV',
  'VERCEL',
  'VERCEL_ENV',
  'ENABLE_TEST_AUTH_ENDPOINT',
  'TEST_AUTH_TOKEN',
  'JWT_SECRET',
  'QA_ALLOWED_ORIGINS',
] as const;

const ENV_BACKUP = new Map<string, string | undefined>();
for (const key of ENV_KEYS) ENV_BACKUP.set(key, process.env[key]);

function resetEnv() {
  for (const key of ENV_KEYS) {
    const value = ENV_BACKUP.get(key);
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function setBaseTestEnv() {
  delete process.env.NODE_ENV;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.QA_ALLOWED_ORIGINS;
  process.env.ENABLE_TEST_AUTH_ENDPOINT = '1';
  process.env.TEST_AUTH_TOKEN = 'local-test-token';
  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: {
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
      'x-test-token': 'local-test-token',
    },
    body: {},
    query: {},
    cookies: {},
    socket: {
      remoteAddress: '203.0.113.42',
    },
    ...overrides,
  } as any;
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: new Map<string, string | string[]>(),
    body: '',
    writableEnded: false,
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
      this.writableEnded = true;
      return this;
    },
    end(payload?: string) {
      if (typeof payload === 'string') this.body += payload;
      this.writableEnded = true;
      return this;
    },
  };
}

test.beforeEach(() => {
  resetEnv();
  setBaseTestEnv();
});

test.after(() => {
  resetEnv();
});

test('guardTestAuthRequest rejects browser origins outside the allowlist', () => {
  const req = makeReq({
    headers: {
      host: '127.0.0.1:3000',
      origin: 'https://evil.example',
      'x-test-token': 'local-test-token',
    },
  });

  const result = guardTestAuthRequest(req);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.error, 'Forbidden');
  }
});

test('guardTestAuthRequest allows same-origin browser requests without QA_ALLOWED_ORIGINS', () => {
  const req = makeReq({
    headers: {
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
      'x-test-token': 'local-test-token',
    },
  });

  const result = guardTestAuthRequest(req);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.ipHash.length, 16);
    assert.ok(result.requestId.length >= 16);
  }
});

test('getAllowedTestAuthOrigins includes explicit allowlist and request host origin', () => {
  process.env.QA_ALLOWED_ORIGINS = 'https://qa.example, https://preview.example';

  const origins = getAllowedTestAuthOrigins(makeReq({
    headers: {
      host: '127.0.0.1:3000',
      origin: 'https://qa.example',
      'x-test-token': 'local-test-token',
    },
  }));

  assert.deepEqual(
    origins.sort(),
    ['http://127.0.0.1:3000', 'https://preview.example', 'https://qa.example'].sort(),
  );
});

test('applyTestAuthCors only reflects origins that pass validation', () => {
  const res = createMockRes();
  applyTestAuthCors(makeReq({
    headers: {
      host: '127.0.0.1:3000',
      origin: 'https://evil.example',
      'x-test-token': 'local-test-token',
    },
  }), res as any);

  assert.equal(res.headers.get('access-control-allow-origin'), undefined);
  assert.equal(res.headers.get('access-control-allow-credentials'), undefined);
  assert.equal(res.headers.get('vary'), 'Origin');
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'Content-Type, x-test-token, x-request-id');
});

test('test-auth login handler rejects disallowed browser origin without issuing a cookie', () => {
  const req = makeReq({
    headers: {
      host: '127.0.0.1:3000',
      origin: 'https://evil.example',
      'x-test-token': 'local-test-token',
    },
  });
  const res = createMockRes();

  loginHandler(req, res as any);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(JSON.parse(res.body), { error: 'Forbidden' });
  assert.equal(res.headers.get('set-cookie'), undefined);
});

test('test-auth login handler still succeeds for allowed same-origin QA login', () => {
  const req = makeReq({
    body: {
      id: 'qa-user',
      email: 'qa@example.com',
      name: 'QA User',
    },
  });
  const res = createMockRes();

  loginHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.user.id, 'qa-user');

  const cookie = res.headers.get('set-cookie');
  assert.ok(Array.isArray(cookie));
  assert.match(cookie[0], /auth_token=/);
  assert.match(cookie[0], /HttpOnly/);
  assert.match(cookie[0], /SameSite=Lax/);
});

test('test-auth login handler answers allowed preflight with credentials CORS headers', () => {
  const req = makeReq({
    method: 'OPTIONS',
  });
  const res = createMockRes();

  loginHandler(req, res as any);

  assert.equal(res.statusCode, 204);
  assert.equal(res.body, '');
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

test('test-auth logout handler clears cookie for allowed same-origin QA logout', () => {
  const req = makeReq();
  const res = createMockRes();

  logoutHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.ok, true);
  assert.ok(typeof payload.requestId === 'string');
  assert.ok(payload.requestId.length >= 16);

  const cookie = res.headers.get('set-cookie');
  assert.ok(Array.isArray(cookie));
  assert.equal(cookie[0], 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
});
