import assert from 'node:assert/strict';
import test from 'node:test';
import { syncAiBrewLibraryToCloud } from '../../apps/web/src/features/ai-brew/cloudSync.ts';

test('AI Brew cloud sync skips localhost before making a network call', async () => {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const originalNavigator = (globalThis as typeof globalThis & { navigator?: unknown }).navigator;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { hostname: 'localhost' } },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: true },
  });
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error('fetch should not run on localhost');
  }) as typeof fetch;

  try {
    const result = await syncAiBrewLibraryToCloud({ aiBrewJournal: [{} as never] });

    assert.equal(fetchCalled, false);
    assert.equal(result.ok, true);
    assert.equal(result.synced, false);
    assert.equal(result.reason, 'local_dev');
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    globalThis.fetch = originalFetch;
  }
});
