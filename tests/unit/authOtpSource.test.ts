import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const OTP_SOURCE = readFileSync('apps/web/src/components/auth/OtpCodeInput.tsx', 'utf8');

test('OTP input keeps 8 digits inside narrow mobile auth modals', () => {
  assert.match(OTP_SOURCE, /max-w-\[21rem\]/);
  assert.match(OTP_SOURCE, /grid-cols-8/);
  assert.match(OTP_SOURCE, /w-full min-w-0/);
  assert.doesNotMatch(OTP_SOURCE, /9vw/);
  assert.doesNotMatch(OTP_SOURCE, /sm:h-14/);
});
