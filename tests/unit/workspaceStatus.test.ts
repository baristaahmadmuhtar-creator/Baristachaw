import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveWorkspaceStatus } from '../../apps/web/src/utils/workspaceStatus';
import type { AccountStatusSnapshot, AccountFeatureFlag } from '../../apps/web/src/services/accountStatus';

const mockBaseSnapshot: AccountStatusSnapshot = {
  user: {
    id: 'user_1',
    name: 'Test',
    email: 'test@example.com',
    planCode: 'free',
  },
  plan: {
    code: 'free',
    name: 'Free',
    aiDailyLimit: 10,
    deepDailyLimit: 5,
    scannerDailyLimit: 5,
  },
  billing: {
    status: 'none',
    provider: 'none',
    currentPeriodEnd: '',
    paymentActionRequired: false,
    paymentAction: 'checkout',
    message: '',
  },
  appAccess: {
    status: 'ok',
  },
  realtime: {
    intervalSec: 60,
  },
};

describe('resolveWorkspaceStatus', () => {
  it('loading + no snapshot => kind loading', () => {
    const status = resolveWorkspaceStatus({
      snapshot: null,
      loading: true,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'loading');
  });

  it('error/no snapshot => kind unavailable', () => {
    const status = resolveWorkspaceStatus({
      snapshot: null,
      loading: false,
      error: 'Network error',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'unavailable');
  });

  it('free account, billing none/provider none => kind free', () => {
    const status = resolveWorkspaceStatus({
      snapshot: mockBaseSnapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'free');
  });

  it('active paid plan + billing active => kind active', () => {
    const snapshot: AccountStatusSnapshot = {
      ...mockBaseSnapshot,
      user: { ...mockBaseSnapshot.user, planCode: 'pro' },
      billing: {
        ...mockBaseSnapshot.billing,
        status: 'active',
        provider: 'stripe',
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    };
    const status = resolveWorkspaceStatus({
      snapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'active');
    assert.equal(status.action, 'none');
  });

  it('billing manual + paymentActionRequired true => kind pending_review', () => {
    const snapshot: AccountStatusSnapshot = {
      ...mockBaseSnapshot,
      billing: {
        ...mockBaseSnapshot.billing,
        status: 'none',
        provider: 'manual',
        paymentActionRequired: true,
      },
    };
    const status = resolveWorkspaceStatus({
      snapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'pending_review');
    assert.equal(status.action, 'contact_support');
  });

  it('local pending manual marker + free snapshot => kind pending_review hanya jika marker valid dan belum expired', () => {
    const status = resolveWorkspaceStatus({
      snapshot: mockBaseSnapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
      pendingManualPayment: true,
    });
    assert.equal(status.kind, 'pending_review');
  });

  it('billing past_due => kind past_due', () => {
    const snapshot: AccountStatusSnapshot = {
      ...mockBaseSnapshot,
      billing: {
        ...mockBaseSnapshot.billing,
        status: 'past_due',
        provider: 'stripe',
        paymentActionRequired: true,
        paymentAction: 'manage',
      },
    };
    const status = resolveWorkspaceStatus({
      snapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'past_due');
  });

  it('appAccess blocked => kind blocked', () => {
    const snapshot: AccountStatusSnapshot = {
      ...mockBaseSnapshot,
      appAccess: {
        status: 'blocked',
        message: 'Account disabled',
      },
    };
    const status = resolveWorkspaceStatus({
      snapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'blocked');
    assert.equal(status.action, 'contact_support');
  });

  it('maintenance feature flag => kind maintenance', () => {
    const maintenance: AccountFeatureFlag[] = [
      { key: 'global', label: 'Global', status: 'disabled', message: 'Down' },
    ];
    const status = resolveWorkspaceStatus({
      snapshot: mockBaseSnapshot,
      loading: false,
      error: '',
      maintenance,
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'maintenance');
  });

  it('active plan expiring <= 7 days => kind expiring', () => {
    const snapshot: AccountStatusSnapshot = {
      ...mockBaseSnapshot,
      user: { ...mockBaseSnapshot.user, planCode: 'pro' },
      billing: {
        ...mockBaseSnapshot.billing,
        status: 'active',
        provider: 'stripe',
        currentPeriodEnd: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days
      },
    };
    const status = resolveWorkspaceStatus({
      snapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'expiring');
  });

  it('cancelled/expired/refunded => kind inactive', () => {
    const snapshot: AccountStatusSnapshot = {
      ...mockBaseSnapshot,
      billing: {
        ...mockBaseSnapshot.billing,
        status: 'cancelled',
      },
    };
    const status = resolveWorkspaceStatus({
      snapshot,
      loading: false,
      error: '',
      maintenance: [],
      language: 'en',
      locale: 'en-US',
    });
    assert.equal(status.kind, 'inactive');
  });
});
