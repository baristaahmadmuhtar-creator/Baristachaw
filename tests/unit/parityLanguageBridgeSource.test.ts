import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('mobile web parity URL carries preferred language into the web app', () => {
  const source = readFileSync(path.join(ROOT, 'apps/mobile/src/screens/WebParityScreen.tsx'), 'utf8');

  assert.match(source, /url\.searchParams\.set\('language', language\)/);
  assert.match(source, /language=\$\{languageParam\}/);
  assert.match(source, /buildWebParityUrl\(mobileEnv\.webAppUrl, shellPlatform, hostSafeBottom, language\)/);
});

test('web global language bootstrap accepts parity language query params', () => {
  const source = readFileSync(path.join(ROOT, 'apps/web/src/context/GlobalState.tsx'), 'utf8');

  assert.match(source, /params\.get\('language'\)/);
  assert.match(source, /params\.get\('lang'\)/);
  assert.match(source, /safeSetLocalStorageItem\(LANGUAGE_KEY, short\)/);
});
