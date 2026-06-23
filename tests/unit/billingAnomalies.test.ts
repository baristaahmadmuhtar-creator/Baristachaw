import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceStatus } from '../../apps/web/src/utils/workspaceStatus.ts';
import type { AccountStatusSnapshot, AccountFeatureFlag } from '../../apps/web/src/services/accountStatus.ts';

function createMockSnapshot(overrides: Partial<AccountStatusSnapshot> = {}): AccountStatusSnapshot {
  const base: AccountStatusSnapshot = {
    ok: true,
    requestId: 'req-1',
    generatedAt: new Date().toISOString(),
    dataMode: 'runtime_fallback',
    user: {
      id: 'usr-1',
      name: 'Test User',
      role: 'user',
      status: 'active',
      planCode: 'free',
      planName: 'Free',
      lastSeenAt: new Date().toISOString(),
    },
    plan: {
      code: 'free',
      name: 'Free',
      description: '',
      aiDailyLimit: 0,
      deepDailyLimit: 0,
      scannerDailyLimit: 0,
      storageMb: 0,
      seats: 1,
      supportSlaHours: 0,
      features: [],
      priceMonthlyUsd: 0,
      displayPrice: '',
      checkoutMode: 'external',
    },
    plans: [],
    billing: {
      status: 'none',
      provider: 'none',
      market: 'unknown',
      paymentAction: 'checkout',
      paymentActionRequired: false,
      message: '',
    },
    recommendedUpgrade: {
      planCode: 'pro',
      planName: 'Pro',
      ctaLabel: 'Upgrade',
      reason: 'Upgrade reason',
      action: 'checkout',
    },
    featureFlags: [],
    maintenance: [],
    appAccess: {
      status: 'ok',
      message: '',
    },
    warnings: [],
    realtime: {
      strategy: 'polling',
      intervalSec: 60,
    },
  };

  return {
    ...base,
    ...overrides,
    user: { ...base.user, ...(overrides.user || {}) },
    billing: { ...base.billing, ...(overrides.billing || {}) },
    appAccess: { ...base.appAccess, ...(overrides.appAccess || {}) },
  };
}

function resolve(snapshot: AccountStatusSnapshot, maintenance: AccountFeatureFlag[] = []) {
  return resolveWorkspaceStatus({
    snapshot,
    loading: false,
    error: '',
    maintenance,
    language: 'id',
    locale: 'id-ID',
  });
}

function resolveWithPendingMarker(snapshot: AccountStatusSnapshot) {
  return resolveWorkspaceStatus({
    snapshot,
    loading: false,
    error: '',
    maintenance: [],
    language: 'id',
    locale: 'id-ID',
    pendingManualPayment: true,
  });
}

test('Billing Anomalies & Workspace Status Resolution', async (t) => {
  await t.test('Active free plan -> free', () => {
    const snap = createMockSnapshot();
    const result = resolve(snap);
    assert.equal(result.kind, 'free');
  });

  await t.test('Active paid plan -> active', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'starter', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'active', provider: 'stripe', market: 'unknown', paymentAction: 'manage', paymentActionRequired: false, message: '' },
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'active');
  });

  await t.test('Active paid plan with informational review copy but no billing action -> active', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'pro', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: {
        status: 'active',
        provider: 'manual',
        market: 'unknown',
        paymentAction: 'none',
        paymentActionRequired: false,
        message: 'Manual payments are reviewed by admin support.',
      },
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'active');
  });

  await t.test('Active free plan with manual upgrade pending -> pending_review', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'free', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'trialing', provider: 'manual', market: 'unknown', paymentAction: 'contact_support', paymentActionRequired: true, message: 'waiting for admin review' },
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'pending_review');
    assert.equal(result.severity, 'info'); // Should be info (blue), not danger
  });

  await t.test('Local pending manual payment marker blocks duplicate checkout on otherwise free snapshot', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'free', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'none', provider: 'none', market: 'unknown', paymentAction: 'checkout', paymentActionRequired: false, message: '' },
    });
    const result = resolveWithPendingMarker(snap);
    assert.equal(result.kind, 'pending_review');
    assert.equal(result.action, 'contact_support');
  });

  await t.test('Active paid plan with manual upgrade pending -> pending_review', () => {
    // This is the specific bug we fixed: user is already active on starter, but submitted a manual payment for Pro
    const snap = createMockSnapshot({
      user: { planCode: 'starter', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'active', provider: 'manual', market: 'unknown', paymentAction: 'contact_support', paymentActionRequired: true, message: 'waiting for admin verification' },
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'pending_review');
    assert.equal(result.severity, 'info');
  });

  await t.test('Past due plan with NO pending manual review -> past_due', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'starter', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' }, // status could still be active in user row while billing fails
      billing: { status: 'past_due', provider: 'stripe', market: 'unknown', paymentAction: 'manage', paymentActionRequired: true, message: 'Card declined' },
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'past_due');
    assert.equal(result.severity, 'danger');
  });

  await t.test('Past due plan WITH pending manual review -> pending_review', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'starter', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'past_due', provider: 'manual', market: 'unknown', paymentAction: 'manage', paymentActionRequired: true, message: 'waiting for admin review' },
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'pending_review');
    assert.equal(result.severity, 'info');
  });

  await t.test('Blocked app access overrides pending review', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'starter', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'active', provider: 'manual', market: 'unknown', paymentAction: 'contact_support', paymentActionRequired: true, message: 'waiting for admin review' },
      appAccess: { status: 'blocked', message: 'Suspended' }
    });
    const result = resolve(snap);
    assert.equal(result.kind, 'blocked');
  });

  await t.test('Maintenance overrides active but not blocked', () => {
    const snap = createMockSnapshot({
      user: { planCode: 'starter', status: 'active', name: '', role: '', planName: '', id: '', lastSeenAt: '' },
      billing: { status: 'active', provider: 'stripe', market: 'unknown', paymentAction: 'manage', paymentActionRequired: false, message: '' },
    });
    const maintenance: AccountFeatureFlag[] = [{
      key: 'm1', label: 'System Maintenance', status: 'disabled', message: '', surfaces: ['web'], updatedAt: ''
    }];
    const result = resolve(snap, maintenance);
    assert.equal(result.kind, 'maintenance');
  });
});
