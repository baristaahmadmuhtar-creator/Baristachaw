import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import chatHandler from '../../server-api/chat.ts';

const PROVIDER_ENV_KEYS = [
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'MISTRAL_API_KEY',
  'OPENROUTER_API_KEY',
] as const;

function createMockRes() {
  return {
    statusCode: 200,
    headers: new Map<string, string | string[]>(),
    body: '',
    writableEnded: false,
    headersSent: false,
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
      this.headersSent = true;
      return true;
    },
    json(payload: unknown) {
      this.body = JSON.stringify(payload);
      this.headersSent = true;
      this.writableEnded = true;
      return this;
    },
    end(payload?: string) {
      if (typeof payload === 'string') this.body += payload;
      this.headersSent = true;
      this.writableEnded = true;
      return this;
    },
  };
}

test('chat handler returns local text fallback instead of 503 when no providers are configured', async () => {
  const envBackup = new Map<string, string | undefined>();
  for (const key of PROVIDER_ENV_KEYS) envBackup.set(key, process.env[key]);

  process.env.JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.MISTRAL_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  const authToken = jwt.sign(
    { user: { id: 'qa-chat-local-user', email: 'qa-chat-local@example.com', name: 'QA Chat Local', planCode: 'starter' } },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  try {
    const req = {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      body: {
        message: 'Give one concise espresso dialing tip.',
        mode: 'race',
        responseProfile: {
          language: 'en',
          verbosity: 'short',
          format: 'plain',
          tone: 'neutral',
          ambiguityPolicy: 'assume',
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
        remoteAddress: '203.0.113.57',
      },
    } as any;

    const res = createMockRes() as any;
    await chatHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers.get('x-provider'), 'LOCAL');
    assert.equal(res.headers.get('x-model'), 'deterministic-fallback');
    assert.equal(res.headers.get('x-degraded'), 'true');
    assert.equal(res.headers.get('x-error-code'), 'no_key');
    assert.match(res.body, /espresso|grind|dose|yield|ratio/i);
    assert.doesNotMatch(res.body, /All AI providers failed/i);
  } finally {
    for (const [key, value] of envBackup.entries()) {
      if (typeof value === 'string') process.env[key] = value;
      else delete process.env[key];
    }
  }
});
