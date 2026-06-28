import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SOURCE = readFileSync('apps/mobile/src/screens/CollectionScreen.tsx', 'utf8');

test('mobile collection keeps guest mode local-editable for notes and folders', () => {
  assert.match(SOURCE, /const guestLocalMode = guestModeEnabled && !session;/);
  assert.doesNotMatch(SOURCE, /guestReadOnly/);
  assert.doesNotMatch(SOURCE, /if \(guestLocalMode\)\s*\{\s*setListError\(copy\.readOnlyBody\)/);
  assert.doesNotMatch(SOURCE, /if \(!folderForm \|\| guestLocalMode\) return;/);
  assert.doesNotMatch(SOURCE, /if \(guestLocalMode\) return;/);
  assert.match(SOURCE, /bottomDock=\{!dockHidden \?/);
  assert.match(SOURCE, /trackEvent\('local_collection_seen'/);
});

test('mobile collection guest copy describes local notes instead of sign-in lockout', () => {
  assert.match(SOURCE, /browseOnly: 'Local notes\.'/);
  assert.match(SOURCE, /browseOnly: 'Catatan lokal\.'/);
  assert.match(SOURCE, /Notes and folders are saved locally on this device/);
  assert.match(SOURCE, /Catatan dan folder disimpan lokal di perangkat ini/);
  assert.doesNotMatch(SOURCE, /Sign in to create or edit Collection/);
  assert.doesNotMatch(SOURCE, /Masuk untuk membuat atau mengedit Koleksi/);
});
