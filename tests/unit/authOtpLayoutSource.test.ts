import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const OTP_SOURCE = readFileSync('apps/web/src/components/auth/OtpCodeInput.tsx', 'utf8');

test('OTP input uses a responsive eight-cell grid that fits narrow mobile modals', () => {
  assert.match(OTP_SOURCE, /grid-cols-8/);
  assert.match(OTP_SOURCE, /repeat\(8,\s*minmax\(0,\s*clamp\(1\.75rem,\s*9vw,\s*2\.75rem\)\)\)/);
  assert.match(OTP_SOURCE, /w-full max-w-full/);
  assert.doesNotMatch(OTP_SOURCE, /className="flex gap-2 justify-center my-4"/);
  assert.doesNotMatch(OTP_SOURCE, /\bw-12 h-14\b/);
  assert.doesNotMatch(OTP_SOURCE, /currently expects \$\{length\}/);
});
