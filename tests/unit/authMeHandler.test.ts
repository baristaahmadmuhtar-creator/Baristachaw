import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import authMeHandler from '../../server-api/auth/me.ts';

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

function resetEnv() {
  if (typeof ORIGINAL_JWT_SECRET === 'string') process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  else delete process.env.JWT_SECRET;
}

function createToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    query: {},
    headers: {
      origin: 'http://127.0.0.1:3000',
    },
    cookies: {},
    socket: {
      remoteAddress: '203.0.113.44',
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
  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
});

test.after(() => {
  resetEnv();
});

test('auth me handler answers preflight with CORS headers', () => {
  const req = makeReq({ method: 'OPTIONS' });
  const res = createMockRes();

  authMeHandler(req, res as any);

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
});

test('auth me handler returns soft unauthenticated envelope when auth is absent', () => {
  const req = makeReq({
    query: { soft: '1' },
  });
  const res = createMockRes();

  authMeHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    authenticated: false,
    user: null,
  });
});

test('auth me handler returns auth_required envelope when auth is absent', () => {
  const req = makeReq();
  const res = createMockRes();

  authMeHandler(req, res as any);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(JSON.parse(res.body), {
    error: 'Not authenticated',
    errorCode: 'auth_required',
  });
});

test('auth me handler returns authenticated user from cookie token', () => {
  const token = createToken({
    user: {
      id: 'qa-me-user',
      email: 'qa-me@example.com',
      name: 'QA Me User',
    },
  });
  const req = makeReq({
    cookies: {
      auth_token: token,
    },
  });
  const res = createMockRes();

  authMeHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.authenticated, true);
  assert.equal(body.user.id, 'qa-me-user');
  assert.equal(body.user.email, 'qa-me@example.com');
  assert.equal(body.user.name, 'QA Me User');
  assert.equal(typeof body.user.sessionIssuedAt, 'number');
  assert.equal(typeof body.user.sessionExpiresAt, 'number');
  assert.equal(body.session.issuedAt, body.user.sessionIssuedAt);
  assert.equal(body.session.expiresAt, body.user.sessionExpiresAt);
});

test('auth me handler accepts a guest session token', () => {
  const guestUser = {
    id: 'guest_me_session',
    name: 'Guest Barista',
    role: 'user',
    provider: 'guest',
    planCode: 'free',
    isGuest: true,
  };
  const token = createToken({ user: guestUser });
  const req = makeReq({
    cookies: {
      auth_token: token,
    },
  });
  const res = createMockRes();

  authMeHandler(req, res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.authenticated, true);
  assert.equal(body.user.id, guestUser.id);
  assert.equal(body.user.provider, 'guest');
  assert.equal(typeof body.user.sessionIssuedAt, 'number');
  assert.equal(typeof body.user.sessionExpiresAt, 'number');
});
