import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  extractPermissions,
  findBundletool,
  findBlockedPermissions,
} = await import('../../scripts/check-android-release-permissions.mjs');

test('Android permission audit parses packaged aapt output', () => {
  const permissions = extractPermissions(`
package: com.baristachaw.mobile
uses-permission: name='android.permission.CAMERA'
uses-permission: name='android.permission.READ_MEDIA_IMAGES'
uses-permission: name='android.permission.RECORD_AUDIO'
`);

  assert.deepEqual(permissions, [
    'android.permission.CAMERA',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.RECORD_AUDIO',
  ]);
  assert.deepEqual(findBlockedPermissions(permissions), [
    'android.permission.READ_MEDIA_IMAGES',
  ]);
});

test('Android permission audit ignores source-manifest removal directives', () => {
  const permissions = extractPermissions(`
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" tools:node="remove"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO"/>
</manifest>
`);

  assert.deepEqual(permissions, [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
  ]);
  assert.deepEqual(findBlockedPermissions(permissions), []);
});

test('Android permission audit discovers the latest bundletool jar from temp storage', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'baristachaw-bundletool-'));
  try {
    writeFileSync(path.join(tempDir, 'bundletool-all-1.17.2.jar'), '');
    const latest = path.join(tempDir, 'bundletool-all-1.18.3.jar');
    writeFileSync(latest, '');

    assert.equal(findBundletool({
      env: {},
      cwd: path.join(tempDir, 'workspace'),
      sdk: path.join(tempDir, 'sdk'),
      tempDir,
    }), latest);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
});
