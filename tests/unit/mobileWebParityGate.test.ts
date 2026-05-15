import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const REQUIRED_MATRIX_AREAS = [
  'Home / landing',
  'Navigation / bottom nav',
  'Barista Tools',
  'AI Brew input quick',
  'AI Brew input pro',
  'AI Brew result summary',
  'AI Brew Panduan Seduh',
  'AI Brew Detail Tambahan',
  'AI Brew Panduan AI / AI Coach',
  'AI Brew Cek Rasa',
  'AI Brew saved recipe',
  'Timer',
  'Calculator / Rasio',
  'Ukuran Giling / Grind Size',
  'Tasks',
  'Coffee collection / saved items',
  'Settings',
  'Language switch',
  'Auth login',
  'Auth logout',
  'Guest mode',
  'Saved data restore',
  'Offline / poor network',
  'Error boundary',
  'Loading states',
  'Empty states',
  'Toast/notification',
  'Profile/account',
  'Privacy/support links',
  'About/version',
] as const;

test('mobile web parity gate documents every required exposed surface without blocker rows', () => {
  const doc = read('docs/mobile-web-parity-gate.md');

  assert.match(doc, /Production mobile policy: the store candidate uses the Expo WebView web-parity shell/);
  assert.match(doc, /Full language claim: English \+ Bahasa Indonesia only\./);

  for (const area of REQUIRED_MATRIX_AREAS) {
    assert.match(doc, new RegExp(`\\| ${escapeRegex(area)} \\|`), `Missing parity matrix row: ${area}`);
  }

  const matrixRows = doc
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('---') && !line.startsWith('| Area |'));

  assert.equal(matrixRows.length, REQUIRED_MATRIX_AREAS.length, 'matrix row count must match required areas');
  for (const row of matrixRows) {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    assert.equal(cells.length, 7, `matrix row must have seven decision cells: ${row}`);
    assert.doesNotMatch(cells.join(' '), /\bBROKEN\b|\bBLOCKER\b/, `gate rows must not classify exposed features as broken: ${row}`);
    assert.ok(cells[3] === 'FULL PARITY' || cells[3] === 'MOBILE ADAPTED PARITY' || cells[3] === 'INTENTIONALLY HIDDEN', `unexpected parity level: ${row}`);
  }
});

test('production EAS mobile profile is locked to web parity shell without native fallback', () => {
  const eas = JSON.parse(read('apps/mobile/eas.json'));
  const production = eas.build?.production;

  assert.equal(eas.cli?.appVersionSource, 'remote');
  assert.equal(production?.distribution, 'store');
  assert.equal(production?.env?.EXPO_PUBLIC_API_BASE_URL, 'https://baristaclaw.vercel.app');
  assert.equal(production?.env?.EXPO_PUBLIC_WEB_APP_URL, 'https://baristaclaw.vercel.app');
  assert.equal(production?.env?.EXPO_PUBLIC_MOBILE_UI_MODE, 'web_parity');
  assert.equal(production?.env?.EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED, 'false');
  assert.equal(production?.env?.EXPO_PUBLIC_ENABLE_GUEST_MODE, 'true');
  assert.equal(production?.android?.buildType, 'app-bundle');
  assert.equal(production?.android?.autoIncrement, 'versionCode');
  assert.equal(production?.ios?.autoIncrement, 'buildNumber');
  assert.equal(Object.hasOwn(production?.android || {}, 'versionCode'), false, 'do not pin or decrement remote Android versionCode');
  assert.equal(Object.hasOwn(production?.ios || {}, 'buildNumber'), false, 'do not pin or decrement remote iOS buildNumber');
});

test('mobile env defaults and app config keep store builds on web parity source of truth', () => {
  const envSource = read('apps/mobile/src/config/env.ts');
  const appConfig = read('apps/mobile/app.config.ts');
  const appSource = read('apps/mobile/App.tsx');

  assert.match(envSource, /const DEFAULT_MOBILE_UI_MODE = 'web_parity'/);
  assert.match(envSource, /const DEFAULT_ENABLE_PARITY_FALLBACK = false/);
  assert.match(envSource, /runtimePolicy = resolveRuntimePolicy/);
  assert.match(appConfig, /slug: 'baristaclaw-mobile'/);
  assert.match(appConfig, /const DEFAULT_ANDROID_PACKAGE = 'com\.baristachaw\.mobile'/);
  assert.match(appConfig, /const DEFAULT_BUNDLE_ID = 'com\.baristachaw\.app'/);
  assert.match(appConfig, /mobileUiMode/);
  assert.match(appSource, /rootMode === 'web_parity'/);
  assert.match(appSource, /if \(mobileEnv\.webParityFallbackEnabled\) \{\s*setRootMode\('native'\);/s);
});

test('WebParityScreen sends native shell parity params, language, safe area, guest mode, and auth bridge', () => {
  const source = read('apps/mobile/src/screens/WebParityScreen.tsx');

  for (const required of [
    "url.searchParams.set('runtime', 'web_parity')",
    "url.searchParams.set('ui_profile', 'native_shell')",
    "url.searchParams.set('native_shell', platform)",
    "url.searchParams.set('host_safe_bottom', String(safeBottom))",
    "url.searchParams.set('language', language)",
    "url.searchParams.set('guest_mode', '1')",
    "parsed.origin === window.location.origin",
    "parsed.pathname.indexOf('/api/') === 0",
    "headers.set('Authorization', 'Bearer ' + nativeSession.accessToken)",
    'BARISTA_NATIVE_LOGOUT',
    'BARISTA_NATIVE_AUTH_EXPIRED',
    'accounts.google.com',
    'oauth2.googleapis.com',
    'appleid.apple.com',
    'setSupportMultipleWindows={false}',
  ]) {
    assert.match(source, new RegExp(escapeRegex(required)), `missing WebView parity contract: ${required}`);
  }

  assert.match(source, /case 'id':\s*return \{\s*loading: 'Memuat tampilan paritas web\.\.\.'/s);
  assert.match(source, /default:\s*return \{\s*loading: 'Loading web parity\.\.\.'/s);
});

test('mobile parity gate does not claim unsupported Asia locales as full readiness', () => {
  const doc = read('docs/mobile-web-parity-gate.md');

  assert.match(doc, /Full language claim: English \+ Bahasa Indonesia only\./);
  assert.doesNotMatch(doc, /Full language claim:.*(Thai|Vietnamese|Arabic|Malay|Chinese|Japanese|Korean)/i);
});
