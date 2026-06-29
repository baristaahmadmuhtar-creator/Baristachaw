import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commitPaidAiQuota,
  featureSurfaceFromClientContext,
  refundPaidAiQuota,
  requirePaidAiAccess,
} from '../../server-api/account/aiAccess.ts';
import type { AuthContext } from '../../server-api/_shared.ts';
import type { PlanCode } from '../../server-api/account/status.ts';

const ORIGINAL_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PLAN_ENFORCEMENT_ENABLED: process.env.PLAN_ENFORCEMENT_ENABLED,
  PLAN_QUOTA_STRICT_ENABLED: process.env.PLAN_QUOTA_STRICT_ENABLED,
  AI_QUOTA_OUTAGE_POLICY: process.env.AI_QUOTA_OUTAGE_POLICY,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function makeAuth(planCode: PlanCode = 'free', user: Record<string, unknown> = {}): AuthContext {
  const id = typeof user.id === 'string' ? user.id : `qa-${planCode}-user`;
  return {
    userId: id,
    user: {
      id,
      email: `${id}@example.com`,
      name: `QA ${planCode}`,
      provider: 'email',
      planCode,
      ...user,
    },
    tokenSource: 'bearer',
  };
}

test.beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.PLAN_ENFORCEMENT_ENABLED;
  delete process.env.PLAN_QUOTA_STRICT_ENABLED;
  delete process.env.AI_QUOTA_OUTAGE_POLICY;
});

test.after(() => {
  restoreEnv();
});

test('paid AI access rejects guest sessions before account lookup', async () => {
  const result = await requirePaidAiAccess({
    requestId: 'ai-gate-guest',
    auth: makeAuth('free', { id: 'guest_123', provider: 'guest', isGuest: true }),
    feature: 'chat',
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 401);
  assert.equal(result.errorCode, 'auth_required');
  assert.equal(result.retryable, false);
});

test('paid AI access requires the minimum paid plan for free users', async () => {
  const result = await requirePaidAiAccess({
    requestId: 'ai-gate-free',
    auth: makeAuth('free'),
    rawClientContext: { platform: 'pwa' },
    feature: 'search',
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 402);
  assert.equal(result.errorCode, 'paid_plan_required');
  assert.equal(result.retryable, false);
  assert.equal(result.minimumPlan?.code, 'starter');
  assert.equal(result.minimumPlan?.name, 'Barista Starter');
});

test('paid AI access lets starter and higher plans continue', async () => {
  const result = await requirePaidAiAccess({
    requestId: 'ai-gate-starter',
    auth: makeAuth('starter'),
    rawClientContext: { platform: 'mobile' },
    feature: 'scanner',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.snapshot.user.planCode, 'starter');
    assert.equal(result.snapshot.billing.status, 'trialing');
    assert.equal(result.snapshot.billing.paymentActionRequired, true);
  }
});

test('paid AI access requires Barista Pro or higher for deep quota mode', async () => {
  const starter = await requirePaidAiAccess({
    requestId: 'ai-gate-starter-deep',
    auth: makeAuth('starter'),
    rawClientContext: { platform: 'pwa' },
    feature: 'chat',
    quotaKind: 'deep',
  });

  assert.equal(starter.ok, false);
  assert.equal(starter.statusCode, 402);
  assert.equal(starter.errorCode, 'paid_plan_required');
  assert.equal(starter.retryable, false);
  assert.equal(starter.minimumPlan?.code, 'pro');

  const pro = await requirePaidAiAccess({
    requestId: 'ai-gate-pro-deep',
    auth: makeAuth('pro'),
    rawClientContext: { platform: 'pwa' },
    feature: 'chat',
    quotaKind: 'deep',
  });

  assert.equal(pro.ok, true);
});

test('paid AI quota enforcement requires Supabase account status', async () => {
  process.env.PLAN_ENFORCEMENT_ENABLED = 'true';

  const result = await requirePaidAiAccess({
    requestId: 'ai-gate-quota-no-supabase',
    auth: makeAuth('starter'),
    rawClientContext: { platform: 'web' },
    feature: 'chat',
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 503);
  assert.equal(result.errorCode, 'account_status_unavailable');
  assert.equal(result.retryable, true);
});

test('paid AI quota enforcement blocks exhausted daily reservation', async () => {
  process.env.PLAN_ENFORCEMENT_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.quota-user')) {
      return new Response(JSON.stringify([{
        id: 'quota-user',
        email: 'quota-user@example.com',
        display_name: 'Quota User',
        provider: 'email',
        status: 'active',
        plan_code: 'starter',
        billing_status: 'active',
        billing_provider: 'xendit',
        billing_market: 'indonesia',
        payment_action_required: false,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.quota-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('rpc/reserve_app_quota') && method === 'POST') {
      return new Response(JSON.stringify([{
        allowed: false,
        used: 60,
        daily_limit: 60,
        plan_code: 'starter',
        reason: 'quota_exceeded',
        request_id: 'ai-gate-quota-exhausted',
      }]), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url} ${method}`);
  }) as typeof fetch;

  try {
    const result = await requirePaidAiAccess({
      requestId: 'ai-gate-quota-exhausted',
      auth: makeAuth('starter', { id: 'quota-user' }),
      rawClientContext: { platform: 'pwa' },
      feature: 'chat',
      quotaKind: 'ai',
    });

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 402);
    assert.equal(result.errorCode, 'quota_exceeded');
    assert.equal(result.retryable, false);
    assert.equal(result.quota?.kind, 'ai');
    assert.equal(result.quota?.used, 60);
    assert.equal(result.quota?.limit, 60);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('paid AI quota enforcement reserves first and finalizes with commit or refund helpers', async () => {
  process.env.PLAN_ENFORCEMENT_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const originalFetch = globalThis.fetch;
  const rpcCalls: Array<{ endpoint: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {};
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.reservation-user')) {
      return new Response(JSON.stringify([{
        id: 'reservation-user',
        email: 'reservation-user@example.com',
        display_name: 'Reservation User',
        provider: 'email',
        status: 'active',
        plan_code: 'starter',
        billing_status: 'active',
        billing_provider: 'xendit',
        billing_market: 'indonesia',
        payment_action_required: false,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.reservation-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('rpc/reserve_app_quota') && method === 'POST') {
      rpcCalls.push({ endpoint: 'reserve', body });
      assert.equal(body.p_request_id, 'ai-gate-reservation');
      assert.equal(body.p_user_id, 'reservation-user');
      assert.equal(body.p_feature, 'ai');
      return new Response(JSON.stringify([{
        allowed: true,
        used: 7,
        daily_limit: 60,
        plan_code: 'starter',
        reason: 'reserved',
        request_id: 'ai-gate-reservation',
      }]), { status: 200 });
    }
    if (url.includes('rpc/commit_app_quota') && method === 'POST') {
      rpcCalls.push({ endpoint: 'commit', body });
      assert.equal(body.p_request_id, 'ai-gate-reservation');
      assert.equal(body.p_provider, 'gemini');
      assert.equal(body.p_model, 'gemini-2.5-flash');
      assert.equal(body.p_input_tokens, 12);
      assert.equal(body.p_output_tokens, 34);
      return new Response(JSON.stringify([{ committed: true, request_id: 'ai-gate-reservation', reason: 'committed' }]), { status: 200 });
    }
    if (url.includes('rpc/refund_app_quota') && method === 'POST') {
      rpcCalls.push({ endpoint: 'refund', body });
      assert.equal(body.p_request_id, 'ai-gate-reservation-refund');
      assert.equal(body.p_reason, 'provider_timeout');
      return new Response(JSON.stringify([{ refunded: true, request_id: 'ai-gate-reservation-refund', reason: 'provider_timeout' }]), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url} ${method}`);
  }) as typeof fetch;

  try {
    const result = await requirePaidAiAccess({
      requestId: 'ai-gate-reservation',
      auth: makeAuth('starter', { id: 'reservation-user' }),
      rawClientContext: { platform: 'pwa' },
      feature: 'chat',
      quotaKind: 'ai',
    });

    assert.equal(result.ok, true);
    assert.deepEqual(rpcCalls.map((call) => call.endpoint), ['reserve']);
    if (!result.ok) throw new Error('expected quota reservation');
    assert.equal(result.quotaReservation?.requestId, 'ai-gate-reservation');
    assert.equal(result.quotaReservation?.kind, 'ai');

    await commitPaidAiQuota(result.quotaReservation, {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      inputTokens: 12,
      outputTokens: 34,
      estimatedCostUsd: 0.00025,
      outcome: 'success',
    });
    await refundPaidAiQuota({
      ...result.quotaReservation,
      requestId: 'ai-gate-reservation-refund',
    }, 'provider_timeout');

    assert.deepEqual(rpcCalls.map((call) => call.endpoint), ['reserve', 'commit', 'refund']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('paid AI quota enforcement soft-opens quota RPC outage for verified paid users by default', async () => {
  process.env.PLAN_ENFORCEMENT_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.quota-rpc-user')) {
      return new Response(JSON.stringify([{
        id: 'quota-rpc-user',
        email: 'quota-rpc-user@example.com',
        display_name: 'Quota RPC User',
        provider: 'email',
        status: 'active',
        plan_code: 'starter',
        billing_status: 'active',
        billing_provider: 'xendit',
        billing_market: 'indonesia',
        payment_action_required: false,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.quota-rpc-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('rpc/reserve_app_quota') && method === 'POST') {
      return new Response(JSON.stringify({ message: 'Could not find function public.reserve_app_quota' }), { status: 404 });
    }
    throw new Error(`Unexpected fetch ${url} ${method}`);
  }) as typeof fetch;

  try {
    const result = await requirePaidAiAccess({
      requestId: 'ai-gate-quota-rpc-outage',
      auth: makeAuth('starter', { id: 'quota-rpc-user' }),
      rawClientContext: { platform: 'web' },
      feature: 'chat',
      quotaKind: 'ai',
    });

    assert.equal(result.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('paid AI quota enforcement can fail closed on quota RPC outage in strict mode', async () => {
  process.env.PLAN_ENFORCEMENT_ENABLED = 'true';
  process.env.PLAN_QUOTA_STRICT_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.strict-quota-user')) {
      return new Response(JSON.stringify([{
        id: 'strict-quota-user',
        email: 'strict-quota-user@example.com',
        display_name: 'Strict Quota User',
        provider: 'email',
        status: 'active',
        plan_code: 'starter',
        billing_status: 'active',
        billing_provider: 'xendit',
        billing_market: 'indonesia',
        payment_action_required: false,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.strict-quota-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('rpc/reserve_app_quota') && method === 'POST') {
      return new Response(JSON.stringify({ message: 'Could not find function public.reserve_app_quota' }), { status: 404 });
    }
    throw new Error(`Unexpected fetch ${url} ${method}`);
  }) as typeof fetch;

  try {
    const result = await requirePaidAiAccess({
      requestId: 'ai-gate-strict-quota-rpc-outage',
      auth: makeAuth('starter', { id: 'strict-quota-user' }),
      rawClientContext: { platform: 'web' },
      feature: 'chat',
      quotaKind: 'ai',
    });

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 503);
    assert.equal(result.errorCode, 'account_status_unavailable');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('paid AI quota outage policy flag can fail closed without legacy strict flags', async () => {
  process.env.PLAN_ENFORCEMENT_ENABLED = 'true';
  process.env.AI_QUOTA_OUTAGE_POLICY = 'strict_fail_closed';
  process.env.SUPABASE_URL = 'https://unit-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    if (url.includes('app_users?on_conflict=')) {
      return new Response('', { status: 201 });
    }
    if (url.includes('app_users?id=eq.policy-quota-user')) {
      return new Response(JSON.stringify([{
        id: 'policy-quota-user',
        email: 'policy-quota-user@example.com',
        display_name: 'Policy Quota User',
        provider: 'email',
        status: 'active',
        plan_code: 'starter',
        billing_status: 'active',
        billing_provider: 'manual',
        billing_market: 'brunei',
        payment_action_required: false,
        updated_at: new Date().toISOString(),
      }]), { status: 200 });
    }
    if (url.includes('user_entitlements?user_id=eq.policy-quota-user')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('app_plans?') || url.includes('app_feature_flags?')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes('rpc/reserve_app_quota') && method === 'POST') {
      return new Response(JSON.stringify({ message: 'Could not find function public.reserve_app_quota' }), { status: 404 });
    }
    throw new Error(`Unexpected fetch ${url} ${method}`);
  }) as typeof fetch;

  try {
    const result = await requirePaidAiAccess({
      requestId: 'ai-gate-policy-quota-rpc-outage',
      auth: makeAuth('starter', { id: 'policy-quota-user' }),
      rawClientContext: { platform: 'mobile' },
      feature: 'chat',
      quotaKind: 'ai',
    });

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 503);
    assert.equal(result.errorCode, 'account_status_unavailable');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('paid AI access normalizes client platform surface safely', () => {
  assert.equal(featureSurfaceFromClientContext({ platform: 'mobile' }), 'mobile');
  assert.equal(featureSurfaceFromClientContext({ platform: 'pwa' }), 'pwa');
  assert.equal(featureSurfaceFromClientContext({ platform: 'desktop' }), 'web');
  assert.equal(featureSurfaceFromClientContext(null), 'web');
});
