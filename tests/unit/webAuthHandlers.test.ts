import test from 'node:test';
import assert from 'node:assert/strict';
import callbackHandler from '../../server-api/auth/callback.ts';
import authUrlHandler from '../../server-api/auth/url.ts';

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

test('auth callback error page points to public callback script and preserves safe returnTo', async () => {
  const originalConsoleError = console.error;
  const req = {
    method: 'GET',
    query: {},
    headers: {
      cookie: `oauth_return_to=${encodeURIComponent('/chat?draft=1')}`,
    },
    cookies: {
      oauth_return_to: '/chat?draft=1',
    },
    socket: {
      remoteAddress: '203.0.113.40',
    },
  } as any;
  const res = createMockRes() as any;

  console.error = () => undefined;
  try {
    await callbackHandler(req, res);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.match(res.body, /<script src="\/auth-callback\.js" defer><\/script>/);
  assert.match(res.body, /data-return-to="%2Fchat%3Fdraft%3D1"/);
  assert.doesNotMatch(res.body, /auth-callback\.ts/);
});

test('auth url stores a sanitized returnTo cookie', async () => {
  const req = {
    method: 'GET',
    query: {
      returnTo: '//evil.example/steal',
    },
    headers: {},
    socket: {
      remoteAddress: '203.0.113.41',
    },
  } as any;
  const res = createMockRes() as any;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;

  process.env.GOOGLE_CLIENT_ID = 'unit-test-google-client-id';
  try {
    authUrlHandler(req, res);
  } finally {
    if (typeof originalGoogleClientId === 'string') process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }

  assert.equal(res.statusCode, 200);
  const cookies = res.headers.get('set-cookie');
  assert.ok(Array.isArray(cookies));
  if (Array.isArray(cookies)) {
    assert.ok(cookies.some((value) => value.startsWith('oauth_state=')));
    assert.ok(cookies.some((value) => value.startsWith('oauth_return_to=%2F;')));
  }
});

test('auth url uses the active request host when APP_URL and VERCEL_URL are missing', async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalVercelUrl = process.env.VERCEL_URL;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const req = {
    method: 'GET',
    query: {},
    headers: {
      host: 'preview.baristaclaw.local:3100',
      'x-forwarded-proto': 'https',
    },
    socket: {
      remoteAddress: '203.0.113.42',
    },
  } as any;
  const res = createMockRes() as any;

  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;
  process.env.GOOGLE_CLIENT_ID = 'unit-test-google-client-id';

  try {
    authUrlHandler(req, res);
  } finally {
    if (typeof originalAppUrl === 'string') process.env.APP_URL = originalAppUrl;
    else delete process.env.APP_URL;
    if (typeof originalVercelUrl === 'string') process.env.VERCEL_URL = originalVercelUrl;
    else delete process.env.VERCEL_URL;
    if (typeof originalGoogleClientId === 'string') process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body) as { url: string };
  assert.equal(
    new URL(payload.url).searchParams.get('redirect_uri'),
    'https://preview.baristaclaw.local:3100/api/auth/callback',
  );
});

test('auth url falls back to the active local host with http when forwarded proto is absent', async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalVercelUrl = process.env.VERCEL_URL;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const req = {
    method: 'GET',
    query: {},
    headers: {
      host: '127.0.0.1:3100',
    },
    socket: {
      remoteAddress: '203.0.113.43',
    },
  } as any;
  const res = createMockRes() as any;

  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;
  process.env.GOOGLE_CLIENT_ID = 'unit-test-google-client-id';

  try {
    authUrlHandler(req, res);
  } finally {
    if (typeof originalAppUrl === 'string') process.env.APP_URL = originalAppUrl;
    else delete process.env.APP_URL;
    if (typeof originalVercelUrl === 'string') process.env.VERCEL_URL = originalVercelUrl;
    else delete process.env.VERCEL_URL;
    if (typeof originalGoogleClientId === 'string') process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
  }

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body) as { url: string };
  assert.equal(
    new URL(payload.url).searchParams.get('redirect_uri'),
    'http://127.0.0.1:3100/api/auth/callback',
  );
});

test('auth callback success page uses the active request host when APP_URL and VERCEL_URL are missing', async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalVercelUrl = process.env.VERCEL_URL;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalFetch = globalThis.fetch;
  let tokenRequestBody = '';
  const req = {
    method: 'GET',
    query: {
      code: 'oauth-code-123',
      state: 'oauth-state-123',
    },
    headers: {
      host: 'preview.baristaclaw.local:3100',
      'x-forwarded-proto': 'https',
      cookie: `oauth_state=${encodeURIComponent('oauth-state-123')}; oauth_return_to=${encodeURIComponent('/chat?draft=1')}`,
    },
    cookies: {
      oauth_state: 'oauth-state-123',
      oauth_return_to: '/chat?draft=1',
    },
    socket: {
      remoteAddress: '203.0.113.44',
    },
  } as any;
  const res = createMockRes() as any;

  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;
  process.env.JWT_SECRET = 'unit-test-secret-32-chars-minimum';
  process.env.GOOGLE_CLIENT_ID = 'unit-test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'unit-test-google-client-secret';
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

  try {
    await callbackHandler(req, res);
  } finally {
    if (typeof originalAppUrl === 'string') process.env.APP_URL = originalAppUrl;
    else delete process.env.APP_URL;
    if (typeof originalVercelUrl === 'string') process.env.VERCEL_URL = originalVercelUrl;
    else delete process.env.VERCEL_URL;
    if (typeof originalJwtSecret === 'string') process.env.JWT_SECRET = originalJwtSecret;
    else delete process.env.JWT_SECRET;
    if (typeof originalGoogleClientId === 'string') process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    else delete process.env.GOOGLE_CLIENT_ID;
    if (typeof originalGoogleClientSecret === 'string') process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
    else delete process.env.GOOGLE_CLIENT_SECRET;
    globalThis.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 200);
  assert.match(tokenRequestBody, /redirect_uri=https%3A%2F%2Fpreview\.baristaclaw\.local%3A3100%2Fapi%2Fauth%2Fcallback/);
  assert.match(res.body, /data-target-origin="https%3A%2F%2Fpreview\.baristaclaw\.local%3A3100"/);
  assert.match(res.body, /data-return-to="%2Fchat%3Fdraft%3D1"/);
});
