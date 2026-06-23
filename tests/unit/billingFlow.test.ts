import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BILLING_PENDING_STORAGE_KEY,
  getMvpUpgradeOptions,
  isBillingPlanAtLeast,
  minimumMvpPlanForFeature,
  normalizeBillingPlanCode,
  parsePendingManualPaymentMarker,
  shouldBlockDuplicateManualPayment,
} from '../../packages/shared/src/billingFlow.ts';

test('billing flow normalizes legacy plus to starter and rejects non-MVP paid plans', () => {
  assert.equal(normalizeBillingPlanCode('plus'), 'starter');
  assert.equal(normalizeBillingPlanCode('Starter'), 'starter');
  assert.equal(normalizeBillingPlanCode('pro'), 'pro');
  assert.equal(normalizeBillingPlanCode('team'), 'team');
  assert.equal(normalizeBillingPlanCode('enterprise'), 'enterprise');
  assert.equal(normalizeBillingPlanCode('unknown'), '');
});

test('MVP upgrade options only expose starter and pro forward upgrades', () => {
  assert.deepEqual(getMvpUpgradeOptions('free'), ['starter', 'pro']);
  assert.deepEqual(getMvpUpgradeOptions('starter'), ['pro']);
  assert.deepEqual(getMvpUpgradeOptions('pro'), []);
  assert.deepEqual(getMvpUpgradeOptions('team'), []);
  assert.deepEqual(getMvpUpgradeOptions('enterprise'), []);
  assert.deepEqual(getMvpUpgradeOptions('free', 'pro'), ['pro']);
  assert.deepEqual(getMvpUpgradeOptions('starter', 'pro'), ['pro']);
  assert.deepEqual(getMvpUpgradeOptions('pro', 'pro'), []);
});

test('feature-specific billing gates can require Pro only', () => {
  assert.equal(minimumMvpPlanForFeature('scanner-latte'), 'pro');
  assert.equal(minimumMvpPlanForFeature('chat_image_generation'), 'pro');
  assert.equal(minimumMvpPlanForFeature('ai_brew_pro'), 'pro');
  assert.equal(minimumMvpPlanForFeature('scanner'), 'starter');
  assert.equal(isBillingPlanAtLeast('starter', 'pro'), false);
  assert.equal(isBillingPlanAtLeast('pro', 'pro'), true);
  assert.equal(isBillingPlanAtLeast('team', 'pro'), true);
});

test('pending manual payment marker validates shape, status, and expiry', () => {
  const now = 1_700_000_000_000;
  const valid = JSON.stringify({
    paymentRequestId: 'manual_abc_123456789abc',
    planCode: 'starter',
    status: 'pending_admin_review',
    updatedAt: now,
  });

  assert.equal(BILLING_PENDING_STORAGE_KEY, 'BARISTACHAW_MANUAL_PAYMENT_PENDING_V1');
  assert.deepEqual(parsePendingManualPaymentMarker(valid, now), {
    paymentRequestId: 'manual_abc_123456789abc',
    planCode: 'starter',
    status: 'pending_admin_review',
    updatedAt: now,
  });
  assert.equal(parsePendingManualPaymentMarker('', now), null);
  assert.equal(parsePendingManualPaymentMarker('{bad json', now), null);
  assert.equal(parsePendingManualPaymentMarker(JSON.stringify({ ...JSON.parse(valid), status: 'verified_paid' }), now), null);
  assert.equal(parsePendingManualPaymentMarker(JSON.stringify({ ...JSON.parse(valid), updatedAt: now - 15 * 24 * 60 * 60 * 1000 }), now), null);
});

test('pending marker and billing snapshot both block duplicate manual checkout', () => {
  const now = Date.now();
  const marker = JSON.stringify({
    paymentRequestId: 'manual_xyz_abcdef123456',
    planCode: 'pro',
    status: 'receipt_received',
    updatedAt: now,
  });

  assert.equal(shouldBlockDuplicateManualPayment({
    markerRaw: marker,
    now,
    billing: { provider: 'none', paymentActionRequired: false, paymentAction: 'none', message: '' },
  }), true);

  assert.equal(shouldBlockDuplicateManualPayment({
    markerRaw: null,
    now,
    billing: {
      provider: 'manual',
      paymentActionRequired: true,
      paymentAction: 'contact_support',
      message: 'Your payment proof is waiting for admin review.',
    },
  }), true);

  assert.equal(shouldBlockDuplicateManualPayment({
    markerRaw: null,
    now,
    billing: { provider: 'none', paymentActionRequired: false, paymentAction: 'checkout', message: '' },
  }), false);

  assert.equal(shouldBlockDuplicateManualPayment({
    markerRaw: null,
    now,
    billing: {
      provider: 'manual',
      paymentActionRequired: false,
      paymentAction: 'none',
      message: 'Manual payments are reviewed by admin support.',
    },
  }), false);
});
