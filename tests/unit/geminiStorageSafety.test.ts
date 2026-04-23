import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearAuthSession,
  getAuthMode,
  getStoredUserName,
  getUserBio,
  saveUserBio,
  saveUserName,
  setAuthMode,
} from '../../apps/web/src/services/gemini.ts';

function installThrowingLocalStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() {
        throw new Error('storage blocked');
      },
      setItem() {
        throw new Error('storage blocked');
      },
      removeItem() {
        throw new Error('storage blocked');
      },
    },
  });
}

test('gemini auth/profile storage helpers stay crash-free when localStorage throws', () => {
  installThrowingLocalStorage();

  assert.doesNotThrow(() => setAuthMode('server'));
  assert.equal(getAuthMode(), 'server');

  assert.doesNotThrow(() => saveUserName('  Alpha  '));
  assert.equal(getStoredUserName(), '');

  assert.doesNotThrow(() => saveUserBio('  QA lead  '));
  assert.equal(getUserBio(), '');

  assert.doesNotThrow(() => clearAuthSession());
  assert.equal(getAuthMode(), null);
});

test('getAuthMode ignores corrupted stored auth mode values', () => {
  let storedValue = 'invalid-mode';
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() {
        return storedValue;
      },
      setItem(_key: string, value: string) {
        storedValue = value;
      },
      removeItem() {
        storedValue = '';
      },
    },
  });

  clearAuthSession();
  assert.equal(getAuthMode(), null);

  setAuthMode('firebase');
  clearAuthSession();
  assert.equal(getAuthMode(), null);

  storedValue = 'openai';
  assert.equal(getAuthMode(), 'openai');
});
