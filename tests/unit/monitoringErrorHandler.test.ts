import test from 'node:test';
import assert from 'node:assert/strict';
import monitoringErrorHandler from '../../server-api/monitoring/error.ts';

const TEST_ENV = {
  SUPABASE_URL: 'https://unit-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

async function withEnv<T>(values: Record<string, string>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (typeof value === 'string') process.env[key] = value;
      else delete process.env[key];
    }
  }
}

let requestSequence = 0;

function makeReq(overrides: Record<string, unknown> = {}) {
  requestSequence += 1;
  const ip = `192.0.2.${60 + requestSequence}`;
  const baseHeaders = {
    origin: 'http://127.0.0.1:3000',
    'x-forwarded-for': ip,
  };
  return {
    method: 'POST',
    query: {},
    body: {},
    headers: baseHeaders,
    cookies: {},
    socket: { remoteAddress: ip },
    ...overrides,
    headers: {
      ...baseHeaders,
      ...((overrides.headers as Record<string, string>) || {}),
    },
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

test('monitoring endpoint records sanitized client errors into audit', async () => {
  await withEnv(TEST_ENV, async () => {
    const originalFetch = globalThis.fetch;
    const originalConsoleError = console.error;
    let auditWrite: any = null;
    const consoleLines: string[] = [];
    console.error = (...args: unknown[]) => {
      consoleLines.push(args.map(String).join(' '));
    };
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      auditWrite = JSON.parse(String(init?.body || '[]'))[0];
      return new Response('', { status: 201 });
    }) as typeof fetch;
    const req = makeReq({
      body: {
        source: 'pwa',
        component: 'unhandled_rejection',
        url: 'https://baristaclaw.vercel.app/chat?debug=1&token=secretsecretsecretsecretsecretsecret',
        message: 'Renderer failed with token secretsecretsecretsecretsecretsecret',
        name: 'TypeError',
        stack: 'TypeError: secretsecretsecretsecretsecretsecret at App',
        release: 'unit-release',
      },
    });
    const res = createMockRes();

    try {
      await monitoringErrorHandler(req, res as any);
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalConsoleError;
    }

    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).ok, true);
    assert.equal(auditWrite.target_type, 'client_error');
    assert.equal(auditWrite.action, 'client_error_reported');
    assert.equal(auditWrite.severity, 'warning');
    assert.equal(auditWrite.metadata.source, 'pwa');
    assert.equal(auditWrite.metadata.route, '/chat');
    assert.match(auditWrite.metadata.message, /\[redacted\]/);
    assert.match(auditWrite.metadata.stack, /\[redacted\]/);
    assert.ok(consoleLines.some((line) => line.includes('client_error_reported')));
  });
});
