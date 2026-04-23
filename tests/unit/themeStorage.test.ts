import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureStoredTheme } from '../../apps/web/src/utils/themeStorage.ts';

test('ensureStoredTheme returns persisted light theme', () => {
  const storage = {
    getItem: () => 'light',
    setItem: () => {
      throw new Error('should not be called');
    },
  };

  assert.equal(ensureStoredTheme(storage), 'light');
});

test('ensureStoredTheme seeds dark theme when value is missing or invalid', () => {
  let seeded: string | null = null;
  const storage = {
    getItem: () => 'unexpected',
    setItem: (_key: string, value: string) => {
      seeded = value;
    },
  };

  assert.equal(ensureStoredTheme(storage), 'dark');
  assert.equal(seeded, 'dark');
});

test('ensureStoredTheme returns safe default when storage access throws', () => {
  const storage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };

  assert.equal(ensureStoredTheme(storage), 'dark');
});
