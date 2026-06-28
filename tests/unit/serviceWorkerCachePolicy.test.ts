import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SOURCE = readFileSync('apps/web/public/sw.js', 'utf8');

test('service worker keeps AI Brew catalog data network-first to avoid stale production menus', () => {
  assert.match(SOURCE, /baristachaw-shell-v24/);
  assert.match(SOURCE, /baristachaw-api-v24/);
  assert.match(SOURCE, /url\.pathname\.startsWith\('\/data\/ai-brew\/'\)/);
  assert.match(SOURCE, /url\.pathname\.startsWith\('\/data\/catalog\/'\)/);
  assert.match(SOURCE, /event\.respondWith\(networkFirstStatic\(request\)\)/);
});

test('service worker does not precache large AI Brew or catalog data assets', () => {
  const shellAssetsMatch = SOURCE.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(shellAssetsMatch, 'SHELL_ASSETS should be declared as a static array');
  const shellAssets = shellAssetsMatch[1];
  assert.doesNotMatch(shellAssets, /\/data\/ai-brew\//);
  assert.doesNotMatch(shellAssets, /\/data\/catalog\//);
  assert.doesNotMatch(shellAssets, /grinder-settings\.v2026-06\.json/);
});

test('service worker only caches explicitly safe public API GET routes', () => {
  assert.match(SOURCE, /API_CACHE_ALLOWLIST/);
  assert.match(SOURCE, /API_CACHE_DENYLIST/);
  assert.match(SOURCE, /isSafeApiCacheRequest\(url\)/);
  assert.match(SOURCE, /\/api\/waters\/search/);
  assert.match(SOURCE, /\/api\/drippers\/search/);
  assert.match(SOURCE, /\/api\/grinders\/search/);
  for (const unsafeRoute of [
    '/api/account',
    '/api/admin',
    '/api/auth',
    '/api/billing',
    '/api/chat',
    '/api/ai',
    '/api/health',
    '/api/geo',
    '/api/library',
    '/api/payment',
  ]) {
    assert.match(SOURCE, new RegExp(unsafeRoute.replaceAll('/', '\\/')));
  }
  assert.match(SOURCE, /&& isSafeApiCacheRequest\(url\)/);
  assert.match(SOURCE, /request\.method === 'GET' && isSafeApiCacheRequest\(url\)/);
  assert.match(SOURCE, /'Cache-Control': 'no-store'/);
});
