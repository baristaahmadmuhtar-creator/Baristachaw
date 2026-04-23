import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scannerSource = readFileSync(new URL('../../apps/mobile/src/screens/ScannerScreen.tsx', import.meta.url), 'utf8');

const BROKEN_ENCODING_PATTERNS = [
  /Ã./u,
  /Ø./u,
  /â€¢/u,
  /�/u,
];

test('scanner source keeps priority locale strings readable', () => {
  for (const pattern of BROKEN_ENCODING_PATTERNS) {
    assert.equal(pattern.test(scannerSource), false, `ScannerScreen contains broken encoding pattern ${pattern}`);
  }

  for (const expected of [
    'تحليل القهوة',
    '咖啡分析',
    'コーヒー分析',
    '커피 분석',
    'วิเคราะห์กาแฟ',
    'Phân tích cà phê',
    'Analisis Kopi',
  ]) {
    assert.equal(scannerSource.includes(expected), true, `ScannerScreen should include ${expected}`);
  }
});
