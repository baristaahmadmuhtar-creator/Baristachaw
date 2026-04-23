import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureStoredTheme } from '../../apps/web/src/utils/themeStorage.ts';

function withSystemTheme(isDark: boolean, run: () => void) {
  const originalWindow = globalThis.window;
  globalThis.window = {
    matchMedia: () => ({ matches: isDark }),
  } as any;
  try {
    run();
  } finally {
    if (originalWindow) globalThis.window = originalWindow;
    else delete (globalThis as any).window;
  }
}

test('ensureStoredTheme returns persisted light theme', () => {
  const storage = {
    getItem: () => 'light',
    setItem: () => {
      throw new Error('should not be called');
    },
  };

  assert.equal(ensureStoredTheme(storage), 'light');
});

test('ensureStoredTheme seeds the current system theme when value is missing or invalid', () => {
  let seeded: string | null = null;
  const storage = {
    getItem: () => 'unexpected',
    setItem: (_key: string, value: string) => {
      seeded = value;
    },
  };

  withSystemTheme(false, () => {
    assert.equal(ensureStoredTheme(storage), 'light');
    assert.equal(seeded, 'light');
  });
});

test('ensureStoredTheme can prefer system appearance over stored values for native shells', () => {
  const storage = {
    getItem: () => 'light',
    setItem: () => {
      throw new Error('should not be called');
    },
  };

  withSystemTheme(true, () => {
    assert.equal(ensureStoredTheme(storage, { preferSystem: true }), 'dark');
  });
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
