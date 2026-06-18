import test from 'node:test';
import assert from 'node:assert/strict';
import { runSmoke } from '../../scripts/smoke-runner.mjs';

function toHeaderRecord(headersInit: HeadersInit | undefined): Record<string, string> {
  const record: Record<string, string> = {};
  const headers = new Headers(headersInit || {});
  for (const [key, value] of headers.entries()) {
    record[key.toLowerCase()] = value;
  }
  return record;
}

test('runSmoke uses QA test-auth cookie flow when bearer token is absent', async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalError = console.error;
  const calls: Array<{ path: string; method: string; headers: Record<string, string>; body: string }> = [];

  console.log = () => {};
  console.error = () => {};

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    const method = String(init?.method || 'GET').toUpperCase();
    const headers = toHeaderRecord(init?.headers);
    const body = String(init?.body || '');
    calls.push({ path, method, headers, body });

    if (path === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'same-origin',
          'permissions-policy': 'camera=()',
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'",
        },
      });
    }

    if (path === '/api/health?deep=1' && method === 'GET') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/chat' && method === 'POST' && !headers.cookie) {
      return new Response(JSON.stringify({ errorCode: 'auth_required' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/ai' && method === 'POST' && !headers.cookie) {
      return new Response(JSON.stringify({ errorCode: 'auth_required' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/test-auth/login' && method === 'POST') {
      return new Response(JSON.stringify({ ok: true, user: { id: 'smoke-local-qa' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=fake.jwt.token; Path=/; HttpOnly; SameSite=Lax',
        },
      });
    }

    if (path === '/api/auth/guest' && method === 'POST') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'guest-smoke-user', isGuest: true, provider: 'guest' },
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=guest.jwt.token; Path=/; HttpOnly; SameSite=Lax',
        },
      });
    }

    if (path === '/api/auth/me?soft=1' && method === 'GET' && headers.cookie === 'auth_token=guest.jwt.token') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'guest-smoke-user', isGuest: true, provider: 'guest' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/me' && method === 'GET' && headers.cookie === 'auth_token=fake.jwt.token') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'smoke-local-qa', email: 'smoke-local@example.com', planCode: 'pro' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/account/status' && method === 'GET' && headers.cookie === 'auth_token=fake.jwt.token') {
      return new Response(JSON.stringify({
        ok: true,
        user: { id: 'smoke-local-qa', planCode: 'pro' },
        plan: { code: 'pro' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/me' && method === 'GET' && headers.cookie === 'auth_token=') {
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/me' && method === 'GET' && headers.cookie === 'auth_token=; oauth_state=; oauth_return_to=') {
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/chat' && method === 'POST' && headers.cookie === 'auth_token=fake.jwt.token') {
      return new Response('Use a slightly finer grind if the cup tastes sour.', {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    if (path === '/api/ai' && method === 'POST' && headers.cookie === 'auth_token=fake.jwt.token') {
      const payload = body ? JSON.parse(body) : {};
      if (payload.action === 'deep_think') {
        return new Response(JSON.stringify({
          ok: true,
          action: 'deep_think',
          text: [
            '## TL;DR',
            'Use a stable baseline recipe first, then adjust one extraction variable at a time so each change is measurable and repeatable.',
            '',
            '## Core Analysis',
            'The brew should be evaluated with a fixed ratio, dose, and pour height before changing grind size or water temperature. When multiple variables move together, the cup can improve for the wrong reason and the next change becomes unreliable. A strong deep answer needs enough structure to connect the sensory result to extraction behavior and leave the operator with a clear next test.',
            '',
            '## Options & Tradeoffs',
            'Option 1: grind finer for higher extraction, but bitterness and stalled flow may increase.',
            'Option 2: raise temperature for easier solubility, but delicate aromas can flatten.',
            'Option 3: keep grind stable and tighten pouring structure for higher repeatability.',
            '',
            '## Recommended Action Plan',
            '1. Lock dose, ratio, and bloom for a clean control brew.',
            '2. Adjust grind one step finer and compare sweetness, acidity, and drawdown.',
            '3. If bitterness rises too quickly, return to the baseline grind and reduce agitation.',
            '',
            '## Risks & Validation',
            'Validate with repeated brews, record drawdown time, and inspect grinder retention before making another recipe change.',
          ].join('\n'),
          deepMeta: {
            mode: 'deep',
            grounded: true,
            degraded: false,
            fallbackUsed: false,
            qualityPass: true,
            latencyMs: 10,
            sourceCount: 2,
          },
          sources: [
            { uri: 'https://example.com/qa-e2e-brew', title: 'QA Source 1', domain: 'example.com' },
            { uri: 'https://example.org/qa-e2e-chat', title: 'QA Source 2', domain: 'example.org' },
          ],
          sourceCount: 2,
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-deep-quality-pass': 'true',
          },
        });
      }

      if (payload.action === 'search') {
        return new Response(JSON.stringify({
          ok: true,
          text: '## Search Result\n- QA source 1\n- QA source 2',
          sources: [
            { uri: 'https://example.com/qa-e2e-brew', title: 'QA Source 1', domain: 'example.com' },
            { uri: 'https://example.org/qa-e2e-chat', title: 'QA Source 2', domain: 'example.org' },
          ],
          sourceCount: 2,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, text: 'Tighten the shot by grinding a touch finer.' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (
      path === '/api/test-auth/logout'
      && method === 'POST'
      && (headers.cookie === 'auth_token=fake.jwt.token' || headers.cookie === 'auth_token=; oauth_state=; oauth_return_to=')
    ) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        },
      });
    }

    if (path === '/api/auth/logout' && method === 'POST' && headers.cookie === 'auth_token=fake.jwt.token') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': [
            'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
            'oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
            'oauth_return_to=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
          ],
        },
      });
    }

    if (path === '/api/auth/logout' && method === 'POST' && headers.cookie === 'auth_token=guest.jwt.token') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        },
      });
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  }) as typeof fetch;

  try {
    await runSmoke({
      baseUrl: 'http://127.0.0.1:3000',
      label: 'unit-local',
      testAuthToken: 'local-test-token',
      useE2eMock: true,
      samples: '1',
      aiDelayMs: '1',
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
  }

  const loginCall = calls.find(call => call.path === '/api/test-auth/login');
  assert.ok(loginCall);
  assert.equal(loginCall.headers['x-test-token'], 'local-test-token');
  assert.equal(loginCall.headers.origin, 'http://127.0.0.1:3000');

  const protectedCalls = calls.filter(call =>
    call.path === '/api/auth/me'
    || call.path === '/api/account/status'
    || call.path === '/api/auth/logout'
    || (call.path === '/api/chat' && call.headers.cookie)
    || (call.path === '/api/ai' && call.headers.cookie)
    || call.path === '/api/test-auth/logout',
  );

  assert.ok(protectedCalls.length >= 6);
  for (const call of protectedCalls) {
    if (
      (call.path === '/api/auth/me' || call.path === '/api/test-auth/logout')
      && call.headers.cookie === 'auth_token=; oauth_state=; oauth_return_to='
    ) {
      continue;
    }
    if (call.headers.cookie === 'auth_token=guest.jwt.token') continue;
    assert.equal(call.headers.cookie, 'auth_token=fake.jwt.token');
  }

  const mockedAiCalls = calls.filter(call => (call.path === '/api/chat' || call.path === '/api/ai') && call.headers.cookie);
  assert.ok(mockedAiCalls.length >= 4);
  for (const call of mockedAiCalls) {
    assert.equal(call.headers['x-e2e-mock'], '1');
  }

  const appLogoutCall = calls.find(call => call.path === '/api/auth/logout' && call.headers.cookie === 'auth_token=fake.jwt.token');
  assert.ok(appLogoutCall);

  const postLogoutMeCall = calls.find(call => call.path === '/api/auth/me' && call.headers.cookie === 'auth_token=; oauth_state=; oauth_return_to=');
  assert.ok(postLogoutMeCall);

  const qaCleanupCall = calls.find(call => call.path === '/api/test-auth/logout' && call.headers.cookie === 'auth_token=; oauth_state=; oauth_return_to=');
  assert.ok(qaCleanupCall);
});

test('runSmoke auto-skips QA test-auth probe when local endpoint is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalError = console.error;
  const calls: Array<{ path: string; method: string; headers: Record<string, string> }> = [];

  console.log = () => {};
  console.error = () => {};

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    const method = String(init?.method || 'GET').toUpperCase();
    const headers = toHeaderRecord(init?.headers);
    calls.push({ path, method, headers });

    if (path === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'same-origin',
          'permissions-policy': 'camera=()',
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'",
        },
      });
    }

    if (path === '/api/health?deep=1' && method === 'GET') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    if ((path === '/api/chat' || path === '/api/ai') && method === 'POST') {
      return new Response(JSON.stringify({ errorCode: 'auth_required' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/test-auth/login' && method === 'POST') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/guest' && method === 'POST') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'guest-smoke-user', isGuest: true, provider: 'guest' },
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=guest.jwt.token; Path=/; HttpOnly; SameSite=Lax',
        },
      });
    }

    if (path === '/api/auth/me?soft=1' && method === 'GET' && headers.cookie === 'auth_token=guest.jwt.token') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'guest-smoke-user', isGuest: true, provider: 'guest' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/logout' && method === 'POST' && headers.cookie === 'auth_token=guest.jwt.token') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        },
      });
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  }) as typeof fetch;

  try {
    await runSmoke({
      baseUrl: 'http://127.0.0.1:3000',
      label: 'unit-local',
      testAuthToken: 'local-test-token',
      allowUnavailableTestAuth: true,
      useE2eMock: true,
      samples: '1',
      aiDelayMs: '1',
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
  }

  const loginCall = calls.find(call => call.path === '/api/test-auth/login');
  assert.ok(loginCall);
  assert.equal(loginCall.headers['x-test-token'], 'local-test-token');

  const protectedCalls = calls.filter(call =>
    (call.path === '/api/auth/me' && call.headers.cookie !== 'auth_token=guest.jwt.token')
    || (call.path === '/api/account/status' && call.headers.cookie)
    || (call.path === '/api/chat' && call.headers.cookie)
    || (call.path === '/api/ai' && call.headers.cookie)
    || call.path === '/api/test-auth/logout',
  );
  assert.equal(protectedCalls.length, 0);
});

test('runSmoke fails when strict authenticated production smoke is skipped', async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalError = console.error;

  console.log = () => {};
  console.error = () => {};

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    const method = String(init?.method || 'GET').toUpperCase();
    const headers = toHeaderRecord(init?.headers);

    if (path === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'same-origin',
          'permissions-policy': 'camera=()',
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'",
        },
      });
    }

    if (path === '/api/health?deep=1' && method === 'GET') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    if ((path === '/api/chat' || path === '/api/ai') && method === 'POST') {
      return new Response(JSON.stringify({ errorCode: 'auth_required' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/test-auth/login' && method === 'POST') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/guest' && method === 'POST') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'guest-smoke-user', isGuest: true, provider: 'guest' },
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=guest.jwt.token; Path=/; HttpOnly; SameSite=Lax',
        },
      });
    }

    if (path === '/api/auth/me?soft=1' && method === 'GET' && headers.cookie === 'auth_token=guest.jwt.token') {
      return new Response(JSON.stringify({
        authenticated: true,
        user: { id: 'guest-smoke-user', isGuest: true, provider: 'guest' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (path === '/api/auth/logout' && method === 'POST' && headers.cookie === 'auth_token=guest.jwt.token') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        },
      });
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => runSmoke({
        baseUrl: 'http://127.0.0.1:3000',
        label: 'unit-prod',
        expectTestAuthDisabled: true,
        requireAuthenticatedChecks: true,
        samples: '1',
        aiDelayMs: '1',
      }),
      /Smoke test failed/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
  }
});
