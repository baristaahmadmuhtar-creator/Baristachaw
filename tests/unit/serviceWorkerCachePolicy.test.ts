import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SOURCE = readFileSync('apps/web/public/sw.js', 'utf8');

test('service worker keeps AI Brew catalog data network-first to avoid stale production menus', () => {
  assert.match(SOURCE, /baristachaw-shell-v21/);
  assert.match(SOURCE, /baristachaw-api-v21/);
  assert.match(SOURCE, /url\.pathname\.startsWith\('\/data\/ai-brew\/'\)/);
  assert.match(SOURCE, /url\.pathname\.startsWith\('\/data\/catalog\/'\)/);
  assert.match(SOURCE, /event\.respondWith\(networkFirstStatic\(request\)\)/);
});
