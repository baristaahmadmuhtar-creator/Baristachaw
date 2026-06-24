import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import authEmailHandler from '../../server-api/auth/email.ts';
import { OTP_CODE_LENGTH } from '../../packages/shared/src/domain.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  APP_URL: process.env.APP_URL,
};
const ORIGINAL_FETCH = globalThis.fetch;

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {
      path: 'email/signin',
    },
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 180) + 20}`,
    },
    cookies: {},
    socket: {
      remoteAddress: '203.0.113.190',
    },
    body: {
      email: 'owner@example.com',
      password: 'correct-password',
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

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
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
  process.env.APP_URL = 'https://app.baristachaw.com';
  process.env.SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';
});

test.after(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  restoreEnv();
});

test('email sign-in maps invalid_credentials to email_not_registered if email does not exist', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/v1/token')) {
      return jsonResponse({
        error: 'invalid_credentials',
        error_description: 'Invalid login credentials',
      }, 400);
    }
    // Simulate lookup returning empty result
    if (url.includes('/rest/v1/app_users')) {
      return jsonResponse([]);
    }
    if (url.includes('/auth/v1/admin/users')) {
      return jsonResponse([]);
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/signin' },
    body: {
      email: 'notfound@example.com',
      password: 'wrong-password',
    },
  }), res as any);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'email_not_registered');
});

test('email sign-in keeps invalid_credentials if email exists', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/v1/token')) {
      return jsonResponse({
        error: 'invalid_credentials',
        error_description: 'Invalid login credentials',
      }, 400);
    }
    // Simulate lookup returning existing user
    if (url.includes('/rest/v1/app_users')) {
      return jsonResponse([{ id: 'existing-id' }]);
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/signin' },
    body: {
      email: 'owner@example.com',
      password: 'wrong-password',
    },
  }), res as any);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'invalid_credentials');
});

test('email sign-in exchanges Supabase password auth for the app session cookie', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('/auth/v1/token')) {
      return jsonResponse({
        access_token: 'supabase-access-token',
        user: { id: 'supabase-user-1', email: 'owner@example.com' },
      });
    }
    if (url.includes('/auth/v1/user')) {
      return jsonResponse({
        id: 'supabase-user-1',
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner Barista' },
        app_metadata: { provider: 'email' },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq(), res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.user.provider, 'email');
  assert.equal(body.user.planCode, 'free');

  assert.equal(calls[0].url, 'https://unit-test.supabase.co/auth/v1/token?grant_type=password');
  assert.equal((calls[0].init?.headers as Record<string, string>).apikey, 'publishable-test-key');

  const cookie = res.headers.get('set-cookie');
  const cookieText = Array.isArray(cookie) ? cookie[0] : cookie || '';
  assert.match(cookieText, /auth_token=/);
  assert.match(cookieText, /HttpOnly/);
  assert.match(cookieText, /SameSite=Lax/);

  const token = getCookieToken(cookie);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  assert.equal(decoded.user?.provider, 'email');
  assert.equal(decoded.user?.id, 'supabase-user-1');
});

test('email signup returns confirmation required when Supabase does not issue a session yet', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    assert.match(url, /\/auth\/v1\/signup\?redirect_to=/);
    return jsonResponse({
      id: 'pending-user',
      email: 'new@example.com',
    });
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/signup' },
    body: {
      email: 'new@example.com',
      password: 'correct-password',
      displayName: 'New Barista',
    },
  }), res as any);

  assert.equal(res.statusCode, 202);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, false);
  assert.equal(body.emailConfirmationRequired, true);
  assert.equal(body.email, 'new@example.com');
  assert.equal(res.headers.has('set-cookie'), false);
});

test('email password reset sends Supabase recovery email without creating a session', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return jsonResponse({});
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/reset' },
    body: {
      email: 'owner@example.com',
    },
  }), res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.resetEmailSent, true);
  assert.equal(body.email, 'owner@example.com');
  assert.match(calls[0].url, /^https:\/\/unit-test\.supabase\.co\/auth\/v1\/recover\?redirect_to=/);
  const redirectTo = new URL(calls[0].url).searchParams.get('redirect_to') || '';
  const redirectUrl = new URL(redirectTo);
  assert.match(redirectUrl.origin, /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i);
  assert.equal(redirectUrl.pathname, '/masuk');
  assert.equal(redirectUrl.searchParams.get('recovery'), '1');
  assert.equal((calls[0].init?.headers as Record<string, string>).apikey, 'publishable-test-key');
  assert.equal(res.headers.has('set-cookie'), false);
});

test('email recovery token can update password and receive an app session cookie', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('/auth/v1/user') && init?.method === 'PUT') {
      assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer recovery-access-token');
      assert.equal(JSON.parse(String(init.body)).password, 'new-password-123');
      return jsonResponse({ id: 'supabase-user-1' });
    }
    if (url.includes('/auth/v1/user')) {
      return jsonResponse({
        id: 'supabase-user-1',
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner Barista' },
        app_metadata: { provider: 'email' },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/update-password' },
    body: {
      accessToken: 'recovery-access-token',
      password: 'new-password-123',
    },
  }), res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.passwordUpdated, true);
  assert.equal(body.user.id, 'supabase-user-1');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://unit-test.supabase.co/auth/v1/user');
  assert.equal(calls[1].url, 'https://unit-test.supabase.co/auth/v1/user');
  assert.match(String(res.headers.get('set-cookie')), /auth_token=/);
});

test('email sign-in maps invalid Supabase credentials to a generic auth error', async () => {
  globalThis.fetch = (async () => jsonResponse({ message: 'Invalid login credentials' }, 400)) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq(), res as any);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'invalid_credentials');
  assert.equal(body.error, 'Invalid email or password');
});

test('email verify OTP validates token length correctly', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('/auth/v1/verify')) {
      return jsonResponse({
        access_token: 'valid-verify-token',
        user: { id: 'supabase-user-1', email: 'owner@example.com' },
      });
    }
    if (url.includes('/auth/v1/user')) {
      return jsonResponse({
        id: 'supabase-user-1',
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner Barista' },
        app_metadata: { provider: 'email' },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const res = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/otp/verify' },
    body: {
      email: 'owner@example.com',
      token: '1'.repeat(OTP_CODE_LENGTH),
    },
  }), res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.accessToken, 'valid-verify-token');
});

test('email verify OTP rejects incorrect token length', async () => {
  // Too short
  const resShort = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/otp/verify' },
    body: {
      email: 'owner@example.com',
      token: '1'.repeat(OTP_CODE_LENGTH - 1),
    },
  }), resShort as any);

  assert.equal(resShort.statusCode, 400);
  const bodyShort = JSON.parse(resShort.body);
  assert.equal(bodyShort.ok, false);
  assert.equal(bodyShort.errorCode, 'otp_invalid');
  assert.equal(bodyShort.error, 'The verification code looks incomplete. Please enter the full code from your email.');

  // Too long
  const resLong = createMockRes();
  await authEmailHandler(makeReq({
    query: { path: 'email/otp/verify' },
    body: {
      email: 'owner@example.com',
      token: '1'.repeat(OTP_CODE_LENGTH + 2),
    },
  }), resLong as any);

  assert.equal(resLong.statusCode, 400);
  const bodyLong = JSON.parse(resLong.body);
  assert.equal(bodyLong.ok, false);
  assert.equal(bodyLong.errorCode, 'otp_invalid');
  assert.equal(bodyLong.error, 'The verification code looks incomplete. Please enter the full code from your email.');
});

test('email verify OTP normalizes non-numeric token correctly', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/v1/verify')) {
      return jsonResponse({
        access_token: 'valid-verify-token',
        user: { id: 'supabase-user-1', email: 'owner@example.com' },
      });
    }
    if (url.includes('/auth/v1/user')) {
      return jsonResponse({
        id: 'supabase-user-1',
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner Barista' },
        app_metadata: { provider: 'email' },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const res = createMockRes();
  // Build a token with spaces and hyphens, but correct digit length
  const rawToken = '1234-5678';
  // Let's make sure it has the expected length when cleaned
  const cleanedLength = rawToken.replace(/\D/g, '').length;
  assert.equal(cleanedLength, OTP_CODE_LENGTH);

  await authEmailHandler(makeReq({
    query: { path: 'email/otp/verify' },
    body: {
      email: 'owner@example.com',
      token: rawToken,
    },
  }), res as any);

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
});
