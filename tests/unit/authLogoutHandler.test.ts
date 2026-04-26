import test from 'node:test';
import assert from 'node:assert/strict';
import logoutHandler from '../../server-api/auth/logout.ts';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_VERCEL = process.env.VERCEL;

function resetEnv() {
  if (typeof ORIGINAL_NODE_ENV === 'string') process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  else delete process.env.NODE_ENV;

  if (typeof ORIGINAL_VERCEL === 'string') process.env.VERCEL = ORIGINAL_VERCEL;
  else delete process.env.VERCEL;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: {
      origin: 'http://127.0.0.1:3000',
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
  resetEnv();
  delete process.env.NODE_ENV;
  delete process.env.VERCEL;
});

test.after(() => {
  resetEnv();
});

test('auth logout handler returns preflight response', () => {
  const req = makeReq({ method: 'OPTIONS' });
  const res = createMockRes();

  logoutHandler(req, res as any);

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

test('auth logout handler clears auth and oauth cookies in development', () => {
  const req = makeReq();
  const res = createMockRes();

  logoutHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.success, true);
  assert.equal(typeof body.requestId, 'string');

  const cookies = res.headers.get('set-cookie');
  assert.ok(Array.isArray(cookies));
  assert.deepEqual(cookies, [
    'auth_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
    'oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
    'oauth_return_to=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
  ]);
});

test('auth logout handler keeps secure cookie attributes in production', () => {
  process.env.NODE_ENV = 'production';

  const req = makeReq({
    headers: {
      host: 'baristaclaw.vercel.app',
      origin: 'https://baristaclaw.vercel.app',
      'x-forwarded-proto': 'https',
    },
  });
  const res = createMockRes();

  logoutHandler(req, res as any);

  const cookies = res.headers.get('set-cookie');
  assert.ok(Array.isArray(cookies));
  assert.deepEqual(cookies, [
    'auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None',
    'oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    'oauth_return_to=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  ]);
});
