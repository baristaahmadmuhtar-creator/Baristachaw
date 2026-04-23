import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import aiHandler from '../../server-api/ai.ts';

const GOOD_DEEP_RESPONSE = [
  '## TL;DR',
  'Use a stable baseline recipe first, then adjust one extraction variable at a time to improve repeatability and cup balance.',
  '',
  '## Core Analysis',
  'The brew needs a controlled recipe structure so drawdown time, sweetness, and clarity can be compared across runs with less noise. ',
  'When grind, pour cadence, and kettle agitation all move at once, the feedback becomes ambiguous and the next adjustment is harder to trust. ',
  'A deep answer should explain how contact time, extraction yield, and flow resistance interact so the next brew change is both practical and measurable.',
  '',
  '## Options & Tradeoffs',
  'Option 1: grind finer for higher extraction, but bitterness and stalled flow can increase if fines pile up.',
  'Option 2: increase water temperature for easier solubility, but delicate aromatics can flatten when the coffee is already developed.',
  'Option 3: keep the grind stable and tighten pouring structure, which is slower to learn but improves consistency across repeated brews.',
  '',
  '## Recommended Action Plan',
  '1. Lock the dose, ratio, and filter prep so only one extraction variable changes between brews.',
  '2. Run one control brew, then adjust grind slightly finer and compare sweetness, acidity, and drawdown side by side.',
  '3. If bitterness rises faster than sweetness, return to the original grind and reduce agitation while keeping total contact time consistent.',
  '',
  '## Risks & Validation',
  'Validate with repeated brews, note drawdown time, and compare tasting notes only after temperature drops into a consistent tasting window. ',
  'If the result changes cup to cup without recipe changes, check grinder retention, pour path, and filter seating before changing the recipe again.',
].join('\n');

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
    write(chunk: string) {
      this.body += chunk;
      return true;
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

test('deep_think falls back to internal chat proxy when compat providers are unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const envBackup = {
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    APP_URL: process.env.APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };

  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.MISTRAL_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;

  const authToken = jwt.sign(
    { user: { id: 'qa-deep-fallback-user', email: 'qa@example.com', name: 'QA Deep Fallback' } },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    fetchCalls.push({ url, init });

    assert.equal(url, 'http://127.0.0.1:3000/api/chat');
    return new Response(GOOD_DEEP_RESPONSE, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }) as typeof fetch;

  try {
    const req = {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
        host: '127.0.0.1:3000',
        'x-e2e-mock': 'trace-only',
      },
      body: {
        action: 'deep_think',
        prompt: 'Analyze V60 brew-ratio tradeoffs and provide practical recommendations.',
        responseProfile: {
          language: 'en',
          verbosity: 'comprehensive',
          format: 'steps',
          tone: 'professional',
          ambiguityPolicy: 'ask_first',
        },
        clientContext: {
          platform: 'web',
          surface: 'chat',
          appLanguage: 'en',
          acceptLanguage: 'en-US,en;q=0.9',
        },
      },
      query: {},
      cookies: {},
      socket: {
        remoteAddress: '203.0.113.55',
      },
    } as any;

    const res = createMockRes() as any;
    await aiHandler(req, res);

    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.action, 'deep_think');
    assert.equal(payload.provider, 'GROQ');
    assert.equal(payload.model, 'chat_race');
    assert.equal(payload.degraded, true);
    assert.match(payload.text, /## TL;DR/);
    assert.match(payload.text, /## Recommended Action Plan/);
    assert.equal(payload.deepMeta?.fallbackUsed, true);
    assert.equal(payload.deepMeta?.grounded, false);
    assert.equal(payload.deepMeta?.qualityPass, true);
    assert.equal(res.headers.get('x-deep-quality-pass'), 'true');
    assert.equal(res.headers.get('x-deep-degraded'), 'true');
    assert.ok(fetchCalls.length >= 1);
    for (const call of fetchCalls) {
      assert.equal(call.url, 'http://127.0.0.1:3000/api/chat');
      const forwardedHeaders = (call.init?.headers || {}) as Record<string, string>;
      assert.equal(forwardedHeaders.Authorization, `Bearer ${authToken}`);
      assert.equal(forwardedHeaders['x-e2e-mock'], 'trace-only');

      const forwardedBody = JSON.parse(String(call.init?.body || '{}'));
      assert.equal(forwardedBody.mode, 'race');
      assert.match(forwardedBody.message, /## TL;DR/);
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(envBackup)) {
      if (typeof value === 'string') process.env[key] = value;
      else delete process.env[key];
    }
  }
});
