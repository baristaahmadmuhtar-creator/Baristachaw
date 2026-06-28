import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('apps/web/src/pages/AdminManagement.tsx', 'utf8');

test('admin UI excludes open manual payment users from billing attention filters', () => {
  assert.match(SOURCE, /function buildOpenManualPaymentUserIds\(payments: AdminManualPaymentRequest\[\]\): Set<string>/);
  assert.match(SOURCE, /OPEN_MANUAL_PAYMENT_STATUSES = new Set<ManualPaymentStatus>\(\['pending_review', 'receipt_received'\]\)/);
  assert.match(SOURCE, /matchesUserQueue\(user, userQueueFilter, openManualPaymentUserIds\)/);
  assert.match(SOURCE, /billingUsers: users\.filter\(\(user\) => isBillingAttentionUser\(user, openManualPaymentUserIds\)\)/);
  assert.match(SOURCE, /if \(openManualPaymentUserIds\?\.has\(user\.id\)\) return false;/);
});
