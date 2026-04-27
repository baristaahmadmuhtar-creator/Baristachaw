import test from 'node:test';
import assert from 'node:assert/strict';
import billingSyncHandler from '../../server-api/billing/sync.ts';

const TEST_ENV = {
  SUPABASE_URL: 'https://unit-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  BILLING_SYNC_TOKEN: 'billing-sync-secret',
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
  const ip = `198.51.100.${20 + requestSequence}`;
  const baseHeaders = {
    'x-forwarded-for': ip,
    'x-billing-sync-token': 'billing-sync-secret',
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

test('billing sync rejects invalid token', async () => {
  await withEnv(TEST_ENV, async () => {
    const req = makeReq({
      headers: { 'x-billing-sync-token': 'wrong-token' },
      body: {
        userId: 'billing-user-1',
        provider: 'stripe',
        status: 'active',
        planCode: 'pro',
      },
    });
    const res = createMockRes();

    await billingSyncHandler(req, res as any);

    assert.equal(res.statusCode, 401);
    assert.equal(JSON.parse(res.body).errorCode, 'billing_sync_unauthorized');
  });
});

test('billing sync mirrors active entitlement into app user and audit', async () => {
  await withEnv(TEST_ENV, async () => {
    const originalFetch = globalThis.fetch;
    const writes: Array<{ path: string; method: string; body: any }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';
      if (url.includes('app_users?id=eq.billing-user-1&select=id')) {
        return new Response(JSON.stringify([{ id: 'billing-user-1' }]), { status: 200 });
      }
      if (url.includes('user_entitlements?external_subscription_id=eq.sub_123')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (method === 'POST' || method === 'PATCH') {
        writes.push({ path: url, method, body: JSON.parse(String(init?.body || 'null')) });
        return new Response('', { status: 201 });
      }
      throw new Error(`Unexpected fetch ${url} ${method}`);
    }) as typeof fetch;
    const req = makeReq({
      body: {
        userId: 'billing-user-1',
        provider: 'xendit',
        status: 'active',
        planCode: 'pro',
        market: 'indonesia',
        customerId: 'cust_123',
        subscriptionId: 'sub_123',
        eventId: 'evt_123',
        currentPeriodStart: '2026-04-01T00:00:00Z',
        currentPeriodEnd: '2026-05-01T00:00:00Z',
      },
    });
    const res = createMockRes();

    try {
      await billingSyncHandler(req, res as any);
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'xendit');
    assert.equal(body.planCode, 'pro');
    const entitlementWrite = writes.find((item) => item.path.includes('user_entitlements'))!;
    assert.equal(entitlementWrite.body[0].source, 'xendit');
    assert.equal(entitlementWrite.body[0].status, 'active');
    const appUserPatch = writes.find((item) => item.path.includes('app_users?id=eq.billing-user-1'))!;
    assert.equal(appUserPatch.body.plan_code, 'pro');
    assert.equal(appUserPatch.body.billing_provider, 'xendit');
    assert.equal(appUserPatch.body.payment_action_required, false);
    const auditWrite = writes.find((item) => item.path.includes('admin_audit_events'))!;
    assert.equal(auditWrite.body[0].action, 'billing_lifecycle_synced');
    assert.equal(auditWrite.body[0].request_id.length > 0, true);
  });
});

test('billing sync moves ended subscriptions back to free', async () => {
  await withEnv(TEST_ENV, async () => {
    const originalFetch = globalThis.fetch;
    let appUserPatch: any = null;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';
      if (url.includes('app_users?id=eq.billing-user-2&select=id')) {
        return new Response(JSON.stringify([{ id: 'billing-user-2' }]), { status: 200 });
      }
      if (url.includes('user_entitlements?external_subscription_id=eq.sub_cancelled')) {
        return new Response(JSON.stringify([{ id: 'entitlement-1' }]), { status: 200 });
      }
      if (url.includes('app_users?id=eq.billing-user-2') && method === 'PATCH') {
        appUserPatch = JSON.parse(String(init?.body || '{}'));
        return new Response(null, { status: 204 });
      }
      if (method === 'POST' || method === 'PATCH') {
        return new Response('', { status: 201 });
      }
      throw new Error(`Unexpected fetch ${url} ${method}`);
    }) as typeof fetch;
    const req = makeReq({
      body: {
        userId: 'billing-user-2',
        provider: 'stripe',
        status: 'cancelled',
        planCode: 'team',
        subscriptionId: 'sub_cancelled',
      },
    });
    const res = createMockRes();

    try {
      await billingSyncHandler(req, res as any);
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(res.statusCode, 200);
    assert.equal(appUserPatch.plan_code, 'free');
    assert.equal(appUserPatch.billing_status, 'cancelled');
    assert.equal(appUserPatch.payment_action_required, false);
  });
});
