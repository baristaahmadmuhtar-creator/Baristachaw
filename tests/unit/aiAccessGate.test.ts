import test from 'node:test';
import assert from 'node:assert/strict';
import { featureSurfaceFromClientContext, requirePaidAiAccess } from '../../server-api/account/aiAccess.ts';
import type { AuthContext } from '../../server-api/_shared.ts';

const ORIGINAL_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function makeAuth(planCode: 'free' | 'starter' = 'free', user: Record<string, unknown> = {}): AuthContext {
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
  assert.equal(result.minimumPlan?.name, 'Starter');
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

test('paid AI access normalizes client platform surface safely', () => {
  assert.equal(featureSurfaceFromClientContext({ platform: 'mobile' }), 'mobile');
  assert.equal(featureSurfaceFromClientContext({ platform: 'pwa' }), 'pwa');
  assert.equal(featureSurfaceFromClientContext({ platform: 'desktop' }), 'web');
  assert.equal(featureSurfaceFromClientContext(null), 'web');
});
