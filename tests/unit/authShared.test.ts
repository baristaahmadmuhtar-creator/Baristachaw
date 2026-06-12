import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  applyCors,
  checkRateLimit,
  enforceTrustedRequestOrigin,
  getAllowedOrigin,
  getAllowedOrigins,
  requireAuth,
} from '../../server-api/_shared.ts';

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const ORIGINAL_APP_URL = process.env.APP_URL;
const ORIGINAL_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
const ORIGINAL_VERCEL_URL = process.env.VERCEL_URL;

test.beforeEach(() => {
  process.env.JWT_SECRET = 'unit-test-secret-32-chars-minimum';
  delete process.env.APP_URL;
  delete process.env.ALLOWED_ORIGINS;
  delete process.env.VERCEL_URL;
});

test.after(() => {
  if (typeof ORIGINAL_JWT_SECRET === 'string') {
    process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
    return;
  }
  delete process.env.JWT_SECRET;

  if (typeof ORIGINAL_APP_URL === 'string') process.env.APP_URL = ORIGINAL_APP_URL;
  else delete process.env.APP_URL;

  if (typeof ORIGINAL_ALLOWED_ORIGINS === 'string') process.env.ALLOWED_ORIGINS = ORIGINAL_ALLOWED_ORIGINS;
  else delete process.env.ALLOWED_ORIGINS;

  if (typeof ORIGINAL_VERCEL_URL === 'string') process.env.VERCEL_URL = ORIGINAL_VERCEL_URL;
  else delete process.env.VERCEL_URL;
});

test('requireAuth accepts bearer token', () => {
  const token = jwt.sign({ user: { id: 'bearer-user', email: 'bearer@example.com' } }, process.env.JWT_SECRET!, { expiresIn: '1h' });

  const req = {
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
  } as any;

  const result = requireAuth(req);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.auth.userId, 'bearer-user');
    assert.equal(result.auth.tokenSource, 'bearer');
  }
});

test('requireAuth falls back to cookie token', () => {
  const token = jwt.sign({ user: { id: 'cookie-user' } }, process.env.JWT_SECRET!, { expiresIn: '1h' });

  const req = {
    headers: {},
    cookies: { auth_token: token },
  } as any;

  const result = requireAuth(req);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.auth.userId, 'cookie-user');
    assert.equal(result.auth.tokenSource, 'cookie');
  }
});

test('requireAuth rejects invalid bearer token', () => {
  const req = {
    headers: { authorization: 'Bearer not-a-real-token' },
    cookies: {},
  } as any;

  const result = requireAuth(req);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.statusCode, 401);
    assert.equal(result.errorCode, 'auth_required');
  }
});

test('checkRateLimit throttles repeated anonymous auth requests on same route and ip', () => {
  const req = {
    headers: { 'x-forwarded-for': '203.0.113.20' },
    socket: { remoteAddress: '203.0.113.20' },
  } as any;

  const config = {
    maxRequests: 2,
    windowMs: 60_000,
    burstMaxRequests: 2,
    burstWindowMs: 60_000,
  } as const;

  const first = checkRateLimit(req, '/api/auth/url/unit', 'anonymous', config);
  const second = checkRateLimit(req, '/api/auth/url/unit', 'anonymous', config);
  const third = checkRateLimit(req, '/api/auth/url/unit', 'anonymous', config);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSec >= 1);
});

test('checkRateLimit keeps separate buckets per route key', () => {
  const req = {
    headers: { 'x-forwarded-for': '203.0.113.21' },
    socket: { remoteAddress: '203.0.113.21' },
  } as any;

  const config = {
    maxRequests: 1,
    windowMs: 60_000,
    burstMaxRequests: 1,
    burstWindowMs: 60_000,
  } as const;

  const limitedA = checkRateLimit(req, '/api/auth/url/unit/a', 'anonymous', config);
  const blockedA = checkRateLimit(req, '/api/auth/url/unit/a', 'anonymous', config);
  const allowedB = checkRateLimit(req, '/api/auth/url/unit/b', 'anonymous', config);

  assert.equal(limitedA.allowed, true);
  assert.equal(blockedA.allowed, false);
  assert.equal(allowedB.allowed, true);
});

test('getAllowedOrigins expands localhost app url into loopback aliases', () => {
  process.env.APP_URL = 'http://localhost:3000';

  const origins = getAllowedOrigins();

  assert.ok(origins.includes('http://localhost:3000'));
  assert.ok(origins.includes('http://127.0.0.1:3000'));
  assert.ok(origins.includes('http://[::1]:3000'));
});

test('getAllowedOrigin accepts 127 loopback request when app url is localhost', () => {
  process.env.APP_URL = 'http://localhost:3000';

  const result = getAllowedOrigin({
    headers: {
      origin: 'http://127.0.0.1:3000',
    },
  } as any);

  assert.equal(result, 'http://127.0.0.1:3000');
});

test('getAllowedOrigin returns empty string for disallowed origin', () => {
  process.env.APP_URL = 'http://localhost:3000';

  const result = getAllowedOrigin({
    headers: {
      origin: 'https://evil.example',
    },
  } as any);

  assert.equal(result, '');
});

test('applyCors does not reflect disallowed origin', () => {
  process.env.APP_URL = 'http://localhost:3000';

  const headers = new Map<string, string>();
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  } as any;

  applyCors(
    {
      headers: {
        origin: 'https://evil.example',
      },
    } as any,
    res,
    'GET,OPTIONS',
  );

  assert.equal(headers.has('Access-Control-Allow-Origin'), false);
  assert.equal(headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(headers.get('Access-Control-Allow-Methods'), 'GET,OPTIONS');
  assert.equal(headers.get('Vary'), 'Origin');
});

test('enforceTrustedRequestOrigin allows same host origin without explicit APP_URL', () => {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };

  const allowed = enforceTrustedRequestOrigin(
    {
      method: 'POST',
      headers: {
        host: 'app.baristachaw.com',
        origin: 'https://app.baristachaw.com',
        'x-forwarded-proto': 'https',
      },
    } as any,
    res as any,
    'req_same_host',
  );

  assert.equal(allowed, true);
  assert.equal(res.statusCode, 0);
});

test('enforceTrustedRequestOrigin rejects cross-site browser writes', () => {
  process.env.APP_URL = 'https://app.baristachaw.com';
  const res = {
    statusCode: 0,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };

  const allowed = enforceTrustedRequestOrigin(
    {
      method: 'POST',
      headers: {
        host: 'app.baristachaw.com',
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
        'x-forwarded-proto': 'https',
      },
    } as any,
    res as any,
    'req_blocked',
  );

  assert.equal(allowed, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.errorCode, 'csrf_origin_denied');
});
