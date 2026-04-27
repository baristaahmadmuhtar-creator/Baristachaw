import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import accountDeleteHandler from '../../server-api/account/delete.ts';
import accountExportHandler from '../../server-api/account/export.ts';

const TEST_ENV = {
  JWT_SECRET: 'account-privacy-secret-32-chars-min',
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

function createToken(user: Record<string, unknown>) {
  return jwt.sign({ user }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

let requestSequence = 0;

function makeReq(overrides: Record<string, unknown> = {}) {
  requestSequence += 1;
  const ip = `203.0.113.${120 + requestSequence}`;
  const baseHeaders = {
    origin: 'http://127.0.0.1:3000',
    'x-forwarded-for': ip,
  };
  return {
    method: 'GET',
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

test('account export returns own account data and writes audit', async () => {
  await withEnv(TEST_ENV, async () => {
    const originalFetch = globalThis.fetch;
    const auditWrites: any[] = [];
    const token = createToken({
      id: 'user-privacy-1',
      email: 'privacy@example.com',
      name: 'Privacy User',
      provider: 'email',
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('admin_audit_events') && init?.method === 'POST') {
        auditWrites.push(JSON.parse(String(init.body))[0]);
        return new Response('', { status: 201 });
      }
      if (url.includes('app_users?id=eq.user-privacy-1')) {
        return new Response(JSON.stringify([{ id: 'user-privacy-1', email: 'privacy@example.com', plan_code: 'pro' }]), { status: 200 });
      }
      if (url.includes('app_usage_daily?')) {
        return new Response(JSON.stringify([{ user_id: 'user-privacy-1', ai_requests: 3 }]), { status: 200 });
      }
      if (url.includes('user_entitlements?')) {
        return new Response(JSON.stringify([{ user_id: 'user-privacy-1', plan_code: 'pro', status: 'active' }]), { status: 200 });
      }
      if (url.includes('payment_receipts?')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes('admin_audit_events?')) {
        return new Response(JSON.stringify([{ action: 'user_updated', target_id: 'user-privacy-1' }]), { status: 200 });
      }
      throw new Error(`Unexpected fetch ${url}`);
    }) as typeof fetch;
    const req = makeReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();

    try {
      await accountExportHandler(req, res as any);
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.data.profile.id, 'user-privacy-1');
    assert.equal(body.data.usageDaily[0].ai_requests, 3);
    assert.match(String(res.headers.get('content-disposition')), /baristachaw-account-export-user-privacy-1/);
    assert.equal(auditWrites[0].action, 'account_exported');
    assert.equal(auditWrites[0].target_id, 'user-privacy-1');
  });
});

test('account delete soft-blocks user, writes critical audit, and clears cookies', async () => {
  await withEnv(TEST_ENV, async () => {
    const originalFetch = globalThis.fetch;
    const writes: Array<{ path: string; body: any }> = [];
    const token = createToken({
      id: 'user-delete-1',
      email: 'delete@example.com',
      name: 'Delete User',
      provider: 'google',
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      writes.push({ path: url, body: JSON.parse(String(init?.body || '[]')) });
      return new Response('', { status: 201 });
    }) as typeof fetch;
    const req = makeReq({
      method: 'POST',
      cookies: { auth_token: token },
      body: { reason: 'I want a clean reset.' },
    });
    const res = createMockRes();

    try {
      await accountDeleteHandler(req, res as any);
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    const userWrite = writes.find((item) => item.path.includes('app_users?on_conflict=id'))!;
    assert.equal(userWrite.body[0].status, 'deleted');
    assert.equal(userWrite.body[0].plan_code, 'free');
    assert.equal(userWrite.body[0].metadata.deletionMode, 'soft_delete_pending_retention_review');
    const auditWrite = writes.find((item) => item.path.includes('admin_audit_events'))!;
    assert.equal(auditWrite.body[0].action, 'account_deletion_requested');
    assert.equal(auditWrite.body[0].severity, 'critical');
    assert.ok(Array.isArray(res.headers.get('set-cookie')));
  });
});
