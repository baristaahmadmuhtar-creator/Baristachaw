import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import aiHandler from '../../server-api/ai.ts';

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

test('analyze_image falls back from OpenAI to Gemini on OpenAI error', async () => {
  const originalFetch = globalThis.fetch;
  const envBackup = {
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
  process.env.OPENAI_API_KEY = 'mock-openai-key';
  process.env.GEMINI_API_KEY = 'mock-gemini-key';

  const authToken = jwt.sign(
    { user: { id: 'qa-user', email: 'qa@example.com', name: 'QA User', planCode: 'starter' } },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  const fetchCalls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    fetchCalls.push(url);

    if (url.includes('api.openai.com')) {
      // Simulate OpenAI failure (e.g. Unsupported model error)
      return new Response(JSON.stringify({
        error: {
          message: 'The model gpt-4o-mini is not supported or not available',
          type: 'invalid_request_error',
          code: 'model_not_found',
        }
      }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('googleapis.com')) {
      // Simulate Gemini success
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: 'Gemini analyzed coffee scan: extraction looks good, minor channeling.',
            }],
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call to ${url}`);
  }) as typeof fetch;

  try {
    const req = {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      body: {
        action: 'analyze_image',
        image: 'data:image/jpeg;base64,SGVsbG8=',
        mimeType: 'image/jpeg',
        prompt: 'Analyze this coffee extraction.',
      },
      query: {},
      cookies: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    const res = createMockRes() as any;
    await aiHandler(req, res);

    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.action, 'analyze_image');
    assert.equal(payload.provider, 'GEMINI');
    assert.equal(payload.model, 'gemini-2.5-flash');
    assert.match(payload.text, /Gemini analyzed coffee scan/);
    assert.ok(fetchCalls.some(url => url.includes('api.openai.com')));
    assert.ok(fetchCalls.some(url => url.includes('googleapis.com')));
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(envBackup)) {
      if (typeof value === 'string') process.env[key] = value;
      else delete process.env[key];
    }
  }
});

test('edit_latte_art falls back from OpenAI to Gemini on OpenAI error', async () => {
  const originalFetch = globalThis.fetch;
  const envBackup = {
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
  process.env.OPENAI_API_KEY = 'mock-openai-key';
  process.env.GEMINI_API_KEY = 'mock-gemini-key';

  const authToken = jwt.sign(
    { user: { id: 'qa-user', email: 'qa@example.com', name: 'QA User', planCode: 'starter' } },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  const fetchCalls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    fetchCalls.push(url);

    if (url.includes('api.openai.com')) {
      // Simulate OpenAI failure (e.g. Unsupported model error)
      return new Response(JSON.stringify({
        error: {
          message: 'The model gpt-image-2 is not supported',
          type: 'invalid_request_error',
          code: 'model_not_found',
        }
      }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.includes('googleapis.com')) {
      // Simulate Gemini success returning inline image part
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'image/png',
                data: 'SGVsbG8=',
              },
            }],
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call to ${url}`);
  }) as typeof fetch;

  try {
    const req = {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      body: {
        action: 'edit_latte_art',
        image: 'data:image/jpeg;base64,SGVsbG8=',
        mimeType: 'image/jpeg',
        prompt: 'Improve this latte art into a swan.',
      },
      query: {},
      cookies: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    const res = createMockRes() as any;
    await aiHandler(req, res);

    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.ok, true);
    assert.equal(payload.action, 'edit_latte_art');
    assert.equal(payload.provider, 'GEMINI');
    assert.equal(payload.model, 'gemini-2.0-flash-exp');
    assert.equal(payload.imageDataUrl, 'data:image/png;base64,SGVsbG8=');
    assert.ok(fetchCalls.some(url => url.includes('api.openai.com')));
    assert.ok(fetchCalls.some(url => url.includes('googleapis.com')));
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(envBackup)) {
      if (typeof value === 'string') process.env[key] = value;
      else delete process.env[key];
    }
  }
});
