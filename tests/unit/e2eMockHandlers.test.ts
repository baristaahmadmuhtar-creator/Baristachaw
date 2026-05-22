import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import chatHandler from '../../server-api/chat.ts';
import aiHandler from '../../server-api/ai.ts';
import { isE2eMockRequest } from '../../server-api/_shared.ts';

const ENV_KEYS = ['JWT_SECRET', 'NODE_ENV', 'VERCEL', 'VERCEL_ENV'] as const;
const ENV_BACKUP = new Map<string, string | undefined>();
for (const key of ENV_KEYS) ENV_BACKUP.set(key, process.env[key]);

function resetEnv() {
  for (const key of ENV_KEYS) {
    const value = ENV_BACKUP.get(key);
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function setBaseEnv() {
  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
  delete process.env.NODE_ENV;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
}

function authToken() {
  return jwt.sign(
    { user: { id: 'qa-e2e-mock-user', email: 'qa@example.com', name: 'QA Mock', planCode: 'starter' } },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
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

test.beforeEach(() => {
  resetEnv();
  setBaseEnv();
});

test.after(() => {
  resetEnv();
});

test('isE2eMockRequest is disabled on production runtime', () => {
  process.env.VERCEL_ENV = 'production';
  const req = {
    headers: {
      'x-e2e-mock': '1',
    },
  } as any;

  assert.equal(isE2eMockRequest(req), false);
});

test('chat handler returns non-production e2e mock text in the requested language', async () => {
  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${authToken()}`,
      'x-e2e-mock': '1',
    },
    body: {
      message: 'Please answer in Japanese with one short coffee tip.',
      mode: 'race',
      responseProfile: {
        language: 'ja',
        verbosity: 'short',
        format: 'plain',
        tone: 'neutral',
        ambiguityPolicy: 'assume',
      },
      clientContext: {
        platform: 'web',
        surface: 'chat',
        appLanguage: 'ja',
        acceptLanguage: 'ja-JP,ja;q=0.9',
      },
    },
    cookies: {},
    query: {},
    socket: {
      remoteAddress: '203.0.113.70',
    },
  } as any;
  const res = createMockRes() as any;

  await chatHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /[\u3040-\u30ff]/u);
  assert.equal(res.headers.get('x-provider'), 'QA_E2E');
  assert.equal(res.headers.get('x-model'), 'qa_e2e_mock');
  assert.equal(res.headers.get('x-resolved-language'), 'ja');
});

test('ai handler returns deep e2e mock payload with quality metadata', async () => {
  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${authToken()}`,
      'x-e2e-mock': '1',
    },
    body: {
      action: 'deep_think',
      prompt: 'Analyze V60 brew-ratio tradeoffs and provide a practical plan.',
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
    cookies: {},
    query: {},
    socket: {
      remoteAddress: '203.0.113.71',
    },
  } as any;
  const res = createMockRes() as any;

  await aiHandler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.provider, 'QA_E2E');
  assert.equal(payload.model, 'qa_e2e_mock');
  assert.equal(payload.deepMeta.mode, 'deep');
  assert.equal(payload.deepMeta.qualityPass, true);
  assert.equal(payload.deepMeta.grounded, true);
  assert.equal(payload.sourceCount, 2);
  assert.match(payload.text, /## TL;DR/);
  assert.match(payload.text, /## Recommended Action Plan/);
  assert.equal(res.headers.get('x-deep-quality-pass'), 'true');
  assert.equal(res.headers.get('x-deep-degraded'), 'false');
});

test('ai handler returns language-specific fast e2e mock payload', async () => {
  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${authToken()}`,
      'x-e2e-mock': '1',
    },
    body: {
      action: 'fast',
      prompt: 'Por favor responde en español con un consejo breve para espresso.',
      responseProfile: {
        language: 'es',
        verbosity: 'short',
        format: 'bullets',
        tone: 'neutral',
        ambiguityPolicy: 'assume',
      },
      clientContext: {
        platform: 'web',
        surface: 'chat',
        appLanguage: 'es',
        acceptLanguage: 'es-ES,es;q=0.9',
      },
    },
    cookies: {},
    query: {},
    socket: {
      remoteAddress: '203.0.113.72',
    },
  } as any;
  const res = createMockRes() as any;

  await aiHandler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.provider, 'QA_E2E');
  assert.match(String(payload.text), /\brespuesta\b/i);
});

test('ai handler returns structured brew_sequence e2e mock payload', async () => {
  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${authToken()}`,
      'x-e2e-mock': '1',
    },
    body: {
      action: 'brew_sequence',
      prompt: 'Server action: brew_sequence. Hario V60, 15 g, 140 ml hot / 70 ml ice, 94C, Bloom 40 ml to 40 ml.',
      responseProfile: {
        language: 'id',
        verbosity: 'comprehensive',
        format: 'steps',
        tone: 'professional',
        ambiguityPolicy: 'assume',
      },
      clientContext: {
        platform: 'web',
        surface: 'tools',
        feature: 'ai_brew',
        appLanguage: 'id',
        acceptLanguage: 'id-ID,id;q=0.9',
      },
    },
    cookies: {},
    query: {},
    socket: {
      remoteAddress: '203.0.113.73',
    },
  } as any;
  const res = createMockRes() as any;

  await aiHandler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  const text = String(payload.text || '');
  const structured = JSON.parse(text);
  assert.equal(payload.ok, true);
  assert.equal(payload.action, 'brew_sequence');
  assert.equal(payload.provider, 'QA_E2E');
  assert.match(structured.canonicalMarkdown, /## Service Pattern/);
  assert.match(structured.canonicalMarkdown, /## Sequence/);
  assert.match(structured.canonicalMarkdown, /## Watch/);
  assert.match(structured.displayMarkdown, /## Pola Seduh/);
  assert.match(structured.displayMarkdown, /## Urutan Seduh/);
  assert.equal(res.headers.get('x-provider'), 'QA_E2E');
});

test('ai handler returns JSON brew_optimize e2e mock payload', async () => {
  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${authToken()}`,
      'x-e2e-mock': '1',
    },
    body: {
      action: 'brew_optimize',
      prompt: 'Return JSON only for Hario V60 optimization within the deterministic envelope.',
      responseProfile: {
        language: 'id',
        verbosity: 'short',
        format: 'plain',
        tone: 'professional',
        ambiguityPolicy: 'assume',
      },
      clientContext: {
        platform: 'web',
        surface: 'tools',
        feature: 'ai_brew',
        appLanguage: 'id',
        acceptLanguage: 'id-ID,id;q=0.9',
      },
    },
    cookies: {},
    query: {},
    socket: {
      remoteAddress: '203.0.113.74',
    },
  } as any;
  const res = createMockRes() as any;

  await aiHandler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  const structured = JSON.parse(String(payload.text || ''));
  assert.equal(payload.ok, true);
  assert.equal(payload.action, 'brew_optimize');
  assert.equal(payload.provider, 'QA_E2E');
  assert.equal(typeof structured.reason, 'string');
  assert.equal(structured.pourStyleHint, 'pulse_light');
  assert.ok(Array.isArray(structured.steps));
});
