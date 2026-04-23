import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mobileAuthHandler from '../../server-api/auth/mobile/[...route].ts';

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
    send(payload: string) {
      this.body = payload;
      return this;
    },
    json(payload: unknown) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end() {
      return this;
    },
  };
}

test('mobile auth start uses the Google-registered web callback redirect', async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalMobileScheme = process.env.MOBILE_APP_SCHEME;

  process.env.APP_URL = 'https://baristaclaw.vercel.app';
  process.env.JWT_SECRET = 'unit-test-secret-32-chars-minimum';
  process.env.GOOGLE_CLIENT_ID = 'unit-test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'unit-test-google-client-secret';
  process.env.MOBILE_APP_SCHEME = 'baristaclaw';

  const req = {
    method: 'GET',
    query: { route: ['start'] },
    headers: {
      host: 'baristaclaw.vercel.app',
      'x-forwarded-proto': 'https',
    },
    socket: {
      remoteAddress: '203.0.113.59',
    },
  } as any;
  const res = createMockRes() as any;

  try {
    await mobileAuthHandler(req, res);
  } finally {
    if (typeof originalAppUrl === 'string') process.env.APP_URL = originalAppUrl;
    else delete process.env.APP_URL;
    if (typeof originalJwtSecret === 'string') process.env.JWT_SECRET = originalJwtSecret;
    else delete process.env.JWT_SECRET;
    if (typeof originalGoogleClientId === 'string') process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
    if (typeof originalGoogleClientSecret === 'string') process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
    else delete process.env.GOOGLE_CLIENT_SECRET;
    if (typeof originalMobileScheme === 'string') process.env.MOBILE_APP_SCHEME = originalMobileScheme;
    else delete process.env.MOBILE_APP_SCHEME;
  }

  const body = JSON.parse(res.body);
  const googleUrl = new URL(body.url);
  const decodedState = jwt.verify(String(body.state).replace(/^mobile\./, ''), 'unit-test-secret-32-chars-minimum') as { purpose?: string };

  assert.equal(res.statusCode, 200);
  assert.equal(body.redirectUri, 'https://baristaclaw.vercel.app/api/auth/callback');
  assert.equal(googleUrl.searchParams.get('redirect_uri'), 'https://baristaclaw.vercel.app/api/auth/callback');
  assert.equal(String(body.state).startsWith('mobile.'), true);
  assert.equal(decodedState.purpose, 'mobile_oauth');
});

test('mobile auth callback page includes deep link and android intent fallback', async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalMobileScheme = process.env.MOBILE_APP_SCHEME;
  const originalAndroidPackage = process.env.MOBILE_APP_ANDROID_PACKAGE;
  const originalFetch = globalThis.fetch;
  let tokenRequestBody = '';

  process.env.APP_URL = 'https://baristaclaw.vercel.app';
  process.env.JWT_SECRET = 'unit-test-secret-32-chars-minimum';
  process.env.GOOGLE_CLIENT_ID = 'unit-test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'unit-test-google-client-secret';
  process.env.MOBILE_APP_SCHEME = 'baristaclaw';
  process.env.MOBILE_APP_ANDROID_PACKAGE = 'com.baristaclaw.mobile';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === 'https://oauth2.googleapis.com/token') {
      tokenRequestBody = String(init?.body || '');
      return {
        ok: true,
        json: async () => ({ access_token: 'unit-access-token' }),
      } as Response;
    }
    if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
      return {
        ok: true,
        json: async () => ({
          id: 'google-user-1',
          email: 'user@example.com',
          name: 'Unit User',
          picture: 'https://example.com/avatar.png',
        }),
      } as Response;
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  const req = {
    method: 'GET',
    query: {
      route: ['callback'],
      code: 'oauth-code-123',
    },
    headers: {
      host: 'baristaclaw.vercel.app',
      'x-forwarded-proto': 'https',
    },
    socket: {
      remoteAddress: '203.0.113.60',
    },
  } as any;
  const res = createMockRes() as any;

  try {
    await mobileAuthHandler(req, res);
  } finally {
    if (typeof originalAppUrl === 'string') process.env.APP_URL = originalAppUrl;
    else delete process.env.APP_URL;
    if (typeof originalJwtSecret === 'string') process.env.JWT_SECRET = originalJwtSecret;
    else delete process.env.JWT_SECRET;
    if (typeof originalGoogleClientId === 'string') process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
    if (typeof originalGoogleClientSecret === 'string') process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
    else delete process.env.GOOGLE_CLIENT_SECRET;
    if (typeof originalMobileScheme === 'string') process.env.MOBILE_APP_SCHEME = originalMobileScheme;
    else delete process.env.MOBILE_APP_SCHEME;
    if (typeof originalAndroidPackage === 'string') process.env.MOBILE_APP_ANDROID_PACKAGE = originalAndroidPackage;
    else delete process.env.MOBILE_APP_ANDROID_PACKAGE;
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 200);
  assert.match(tokenRequestBody, /redirect_uri=https%3A%2F%2Fbaristaclaw\.vercel\.app%2Fapi%2Fauth%2Fmobile%2Fcallback/);
  assert.match(res.body, /baristaclaw:\/\/auth\?grant=/);
  assert.match(res.body, /intent:\/\/auth\?grant=/);
  assert.match(res.body, /package=com\.baristaclaw\.mobile/);
  assert.match(res.body, /open installed app/i);
});

test('mobile auth exchanges a verified Supabase session for API JWT', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const originalFetch = globalThis.fetch;
  let userInfoAuthorization = '';
  let userInfoApiKey = '';

  process.env.JWT_SECRET = 'unit-test-secret-32-chars-minimum';
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'unit-publishable-key';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === 'https://unit-project.supabase.co/auth/v1/user') {
      const headers = new Headers(init?.headers);
      userInfoAuthorization = headers.get('Authorization') || '';
      userInfoApiKey = headers.get('apikey') || '';
      return {
        ok: true,
        json: async () => ({
          id: 'supabase-user-1',
          email: 'supabase@example.com',
          app_metadata: { provider: 'google' },
          user_metadata: {
            full_name: 'Supabase User',
            avatar_url: 'https://example.com/avatar.png',
          },
        }),
      } as Response;
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  const req = {
    method: 'POST',
    query: { route: ['supabase', 'exchange'] },
    body: { accessToken: 'supabase-access-token' },
    headers: {
      host: 'baristaclaw.vercel.app',
      'x-forwarded-proto': 'https',
    },
    socket: {
      remoteAddress: '203.0.113.61',
    },
  } as any;
  const res = createMockRes() as any;

  try {
    await mobileAuthHandler(req, res);
  } finally {
    if (typeof originalJwtSecret === 'string') process.env.JWT_SECRET = originalJwtSecret;
    else delete process.env.JWT_SECRET;
    if (typeof originalSupabaseUrl === 'string') process.env.SUPABASE_URL = originalSupabaseUrl;
    else delete process.env.SUPABASE_URL;
    if (typeof originalSupabaseKey === 'string') process.env.SUPABASE_PUBLISHABLE_KEY = originalSupabaseKey;
    else delete process.env.SUPABASE_PUBLISHABLE_KEY;
    globalThis.fetch = originalFetch;
  }

  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(userInfoAuthorization, 'Bearer supabase-access-token');
  assert.equal(userInfoApiKey, 'unit-publishable-key');
  assert.equal(body.ok, true);
  assert.equal(body.user.id, 'supabase-user-1');
  assert.equal(body.user.provider, 'google');
  assert.equal(typeof body.accessToken, 'string');
});
