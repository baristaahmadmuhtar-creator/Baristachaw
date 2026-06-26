import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('scripts/check-mobile-auth-env.mjs', 'utf8');

test('mobile auth env check reads the same production server env chain as launch readiness', () => {
  assert.match(source, /loadEnvFiles/);
  assert.match(source, /'\.vercel\/\.env\.production\.local'/);
  assert.match(source, /'\.env\.production\.local'/);
  assert.match(source, /'\.env\.local'/);
  assert.match(source, /'\.env'/);
});

test('mobile auth env check includes mobile production-local overrides before app env', () => {
  assert.match(source, /'apps\/mobile\/\.env\.production\.local'/);
  assert.match(source, /'apps\/mobile\/\.env\.local'/);
  assert.match(source, /'apps\/mobile\/\.env'/);
});
