import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearFirebaseIdTokenCache,
  consumeGoogleRedirectError,
  getFirebaseIdToken,
  hasCachedFirebaseIdToken,
  saveGoogleRedirectError,
  signOutFirebase,
} from '../../apps/web/src/services/firebaseAuth.ts';

function installThrowingStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() {
        throw new Error('local storage blocked');
      },
      setItem() {
        throw new Error('local storage blocked');
      },
      removeItem() {
        throw new Error('local storage blocked');
      },
    },
  });

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem() {
        throw new Error('session storage blocked');
      },
      setItem() {
        throw new Error('session storage blocked');
      },
      removeItem() {
        throw new Error('session storage blocked');
      },
    },
  });
}

test('firebase auth storage helpers stay crash-free when browser storage throws', async () => {
  installThrowingStorage();

  assert.doesNotThrow(() => clearFirebaseIdTokenCache());
  assert.doesNotThrow(() => saveGoogleRedirectError({ code: 'auth/popup-blocked' }));
  assert.equal(consumeGoogleRedirectError(), '');
  assert.equal(hasCachedFirebaseIdToken(), false);
  assert.equal(await getFirebaseIdToken(), null);
  await assert.doesNotReject(() => signOutFirebase());
});
