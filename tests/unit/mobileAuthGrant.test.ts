import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __getMobileAuthGrantForTests,
  __resetMobileAuthGrantsForTests,
  consumeMobileAuthGrant,
  createMobileAuthGrant,
} from '../../server-api/auth/mobile/grants.ts';

test.beforeEach(() => {
  __resetMobileAuthGrantsForTests();
});

test('mobile auth grant can be consumed exactly once', () => {
  const grant = createMobileAuthGrant({
    id: 'user-1',
    email: 'user-1@example.com',
    name: 'User One',
    picture: 'https://example.com/u1.png',
    provider: 'google',
  });

  const first = consumeMobileAuthGrant(grant.id);
  assert.equal(first.ok, true);

  const second = consumeMobileAuthGrant(grant.id);
  assert.deepEqual(second, { ok: false, error: 'used_grant' });
});

test('mobile auth grant returns expired error after ttl', () => {
  const grant = createMobileAuthGrant({
    id: 'user-2',
    email: 'user-2@example.com',
    name: 'User Two',
    picture: 'https://example.com/u2.png',
    provider: 'google',
  });

  const record = __getMobileAuthGrantForTests(grant.id);
  assert.ok(record);
  if (record) {
    record.expiresAt = Date.now() - 1;
  }

  const result = consumeMobileAuthGrant(grant.id);
  assert.deepEqual(result, { ok: false, error: 'expired_grant' });
});

test('mobile auth grant rejects unknown id', () => {
  const result = consumeMobileAuthGrant('missing-grant');
  assert.deepEqual(result, { ok: false, error: 'invalid_grant' });
});

