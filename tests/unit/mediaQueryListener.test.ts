import test from 'node:test';
import assert from 'node:assert/strict';

import { subscribeMediaQueryChange } from '../../apps/web/src/utils/mediaQuery.ts';

test('subscribeMediaQueryChange uses addEventListener when available', () => {
  const calls: string[] = [];
  const listener = () => {};
  const media = {
    addEventListener: (_name: string, fn: (event: MediaQueryListEvent) => void) => {
      if (fn === listener) calls.push('addEventListener');
    },
    removeEventListener: (_name: string, fn: (event: MediaQueryListEvent) => void) => {
      if (fn === listener) calls.push('removeEventListener');
    },
  } as unknown as MediaQueryList;

  const unsubscribe = subscribeMediaQueryChange(media, listener);
  unsubscribe();

  assert.deepEqual(calls, ['addEventListener', 'removeEventListener']);
});

test('subscribeMediaQueryChange falls back to addListener/removeListener', () => {
  const calls: string[] = [];
  const listener = () => {};
  const media = {
    addListener: (fn: (event: MediaQueryListEvent) => void) => {
      if (fn === listener) calls.push('addListener');
    },
    removeListener: (fn: (event: MediaQueryListEvent) => void) => {
      if (fn === listener) calls.push('removeListener');
    },
  } as unknown as MediaQueryList;

  const unsubscribe = subscribeMediaQueryChange(media, listener);
  unsubscribe();

  assert.deepEqual(calls, ['addListener', 'removeListener']);
});

