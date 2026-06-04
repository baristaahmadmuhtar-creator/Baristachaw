import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scannerSource = readFileSync(new URL('../../apps/mobile/src/screens/ScannerScreen.tsx', import.meta.url), 'utf8');

const BROKEN_ENCODING_PATTERNS = [
  /Ãƒ./u,
  /Ã˜./u,
  /Ã¢â‚¬Â¢/u,
  /ï¿½/u,
];

test('scanner source keeps release scanner locale strings readable and scoped to EN/ID', () => {
  for (const pattern of BROKEN_ENCODING_PATTERNS) {
    assert.equal(pattern.test(scannerSource), false, `ScannerScreen contains broken encoding pattern ${pattern}`);
  }

  for (const expected of [
    'Analisis Kopi',
    'Baca Label',
    'Video Seduh',
    'Coffee Analysis',
    'Read Label',
    'Brew Video',
  ]) {
    assert.equal(scannerSource.includes(expected), true, `ScannerScreen should include ${expected}`);
  }

  for (const removed of [
    "case 'ar'",
    "case 'zh'",
    "case 'ja'",
    "case 'ko'",
    "language === 'ar'",
    'Arabic',
  ]) {
    assert.equal(scannerSource.includes(removed), false, `ScannerScreen should not keep unsupported mobile release locale branch ${removed}`);
  }
});
