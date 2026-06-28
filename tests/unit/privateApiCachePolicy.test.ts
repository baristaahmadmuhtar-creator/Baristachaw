import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  applyPrivateApiNoStoreHeaders,
  isPrivateApiPath,
  PRIVATE_API_NO_STORE_PREFIXES,
  PUBLIC_API_CACHE_EXCEPTIONS,
} from '../../server-api/_shared.ts';

test('private API cache policy marks sensitive route families as no-store', () => {
  for (const prefix of PRIVATE_API_NO_STORE_PREFIXES) {
    assert.equal(isPrivateApiPath(prefix), true, `${prefix} should be private`);
    assert.equal(isPrivateApiPath(`${prefix}/nested`), true, `${prefix}/nested should be private`);
    assert.equal(isPrivateApiPath(`https://baristachaw.com${prefix}/nested?x=1`), true, `${prefix} absolute URL should be private`);
  }
});

test('private API cache policy leaves safe public API routes cacheable', () => {
  for (const path of [
    '/api/waters/search',
    '/api/waters/water_public_1',
    '/api/drippers/search',
    '/api/grinders/search',
    '/api/suggestions/brand',
    '/api/health',
    '/api/geo',
    ...PUBLIC_API_CACHE_EXCEPTIONS,
  ]) {
    assert.equal(isPrivateApiPath(path), false, `${path} should not use private no-store policy`);
  }
});

test('private API cache helper writes no-store headers only for private paths', () => {
  const headers = new Map<string, string>();
  const privateApplied = applyPrivateApiNoStoreHeaders('/api/admin/management', {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  });

  assert.equal(privateApplied, true);
  assert.equal(headers.get('Cache-Control'), 'no-store');
  assert.equal(headers.get('Pragma'), 'no-cache');
  assert.equal(headers.get('Expires'), '0');

  headers.clear();
  const publicApplied = applyPrivateApiNoStoreHeaders('/api/billing/pricing', {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  });

  assert.equal(publicApplied, false);
  assert.equal(headers.size, 0);
});

test('production and local private API gateways apply shared no-store policy', () => {
  for (const file of [
    'api/[...route].ts',
    'api/account.ts',
    'api/admin.ts',
    'api/auth.ts',
    'api/billing.ts',
    'api/library.ts',
    'api/monitoring.ts',
    'api/test-auth.ts',
    'server.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /applyPrivateApiNoStoreHeaders/, `${file} should apply private API no-store headers`);
  }

  for (const publicGateway of ['api/waters.ts', 'api/drippers.ts', 'api/grinders.ts', 'api/suggestions.ts']) {
    const source = readFileSync(publicGateway, 'utf8');
    assert.doesNotMatch(source, /applyPrivateApiNoStoreHeaders/, `${publicGateway} should stay cache-policy neutral`);
  }
});
