import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import authGuestHandler from '../../server-api/auth/guest.ts';

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_VERCEL = process.env.VERCEL;

function restoreEnv() {
  if (typeof ORIGINAL_JWT_SECRET === 'string') process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  else delete process.env.JWT_SECRET;

  if (typeof ORIGINAL_NODE_ENV === 'string') process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  else delete process.env.NODE_ENV;

  if (typeof ORIGINAL_VERCEL === 'string') process.env.VERCEL = ORIGINAL_VERCEL;
  else delete process.env.VERCEL;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {},
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': '203.0.113.80',
    },
    cookies: {},
    socket: {
      remoteAddress: '203.0.113.80',
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

function getCookieToken(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value || '';
  const match = raw.match(/auth_token=([^;]+)/);
  return match?.[1] || '';
}

test.beforeEach(() => {
  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
  process.env.NODE_ENV = 'test';
  delete process.env.VERCEL;
});

test.after(() => {
  restoreEnv();
});

test('guest auth handler answers preflight with CORS headers', () => {
  const req = makeReq({ method: 'OPTIONS' });
  const res = createMockRes();

  authGuestHandler(req, res as any);

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

test('guest auth handler creates a signed guest session cookie', () => {
  const req = makeReq({
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': '203.0.113.81',
    },
    socket: {
      remoteAddress: '203.0.113.81',
    },
  });
  const res = createMockRes();

  authGuestHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.user.provider, 'guest');
  assert.equal(body.user.isGuest, true);
  assert.equal(body.user.planCode, 'free');
  assert.match(body.user.id, /^guest_[a-f0-9]+$/);

  const cookie = res.headers.get('set-cookie');
  const cookieText = Array.isArray(cookie) ? cookie[0] : cookie || '';
  assert.match(cookieText, /auth_token=/);
  assert.match(cookieText, /HttpOnly/);
  assert.match(cookieText, /SameSite=Lax/);

  const token = getCookieToken(cookie);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  assert.equal(decoded.user?.provider, 'guest');
  assert.equal(decoded.user?.id, body.user.id);
});

test('guest auth handler reuses an existing guest identity', () => {
  const existingUser = {
    id: 'guest_existing_session',
    name: 'Guest Barista',
    role: 'user',
    provider: 'guest',
    planCode: 'free',
    isGuest: true,
  };
  const existingToken = jwt.sign({ user: existingUser }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const req = makeReq({
    cookies: {
      auth_token: existingToken,
    },
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': '203.0.113.82',
    },
    socket: {
      remoteAddress: '203.0.113.82',
    },
  });
  const res = createMockRes();

  authGuestHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.user.id, existingUser.id);
  assert.equal(body.user.provider, existingUser.provider);
  assert.equal(body.user.isGuest, true);
  assert.equal(typeof body.user.sessionIssuedAt, 'number');
  assert.equal(typeof body.user.sessionExpiresAt, 'number');
});

test('guest auth handler reports server misconfiguration when JWT secret is absent', () => {
  delete process.env.JWT_SECRET;
  const req = makeReq({
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': '203.0.113.83',
    },
    socket: {
      remoteAddress: '203.0.113.83',
    },
  });
  const res = createMockRes();

  authGuestHandler(req, res as any);

  assert.equal(res.statusCode, 500);
  assert.equal(JSON.parse(res.body).errorCode, 'server_misconfigured');
});
