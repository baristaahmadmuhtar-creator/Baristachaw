import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('apps/web/src/pages/AdminManagement.tsx', 'utf8').replace(/\r\n/g, '\n');

test('admin UI excludes open manual payment users from billing attention filters', () => {
  assert.match(SOURCE, /function buildOpenManualPaymentUserIds\(payments: AdminManualPaymentRequest\[\]\): Set<string>/);
  assert.match(SOURCE, /OPEN_MANUAL_PAYMENT_STATUSES = new Set<ManualPaymentStatus>\(\['pending_review', 'receipt_received'\]\)/);
  assert.match(SOURCE, /matchesUserQueue\(user, userQueueFilter, openManualPaymentUserIds\)/);
  assert.match(SOURCE, /billingUsers: users\.filter\(\(user\) => isBillingAttentionUser\(user, openManualPaymentUserIds\)\)/);
  assert.match(SOURCE, /if \(openManualPaymentUserIds\?\.has\(user\.id\)\) return false;/);
});

test('admin UI only treats a manual payment as open once proof has actually been submitted', () => {
  // A brand new invoice is tagged 'pending_review' from the moment it is created, before the
  // user has paid or uploaded anything. Without this check every fresh checkout would
  // immediately (and incorrectly) show up as needing admin attention.
  assert.match(SOURCE, /function isOpenManualPayment\(payment: AdminManualPaymentRequest\): boolean \{\s*\n\s*if \(!OPEN_MANUAL_PAYMENT_STATUSES\.has\(payment\.status\)\) return false;\s*\n(?:.*\n)*?\s*return Boolean\(payment\.proof\);\s*\n\}/);
});
