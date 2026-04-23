import test from 'node:test';
import assert from 'node:assert/strict';

import { LANGUAGE_META } from '../../apps/web/src/constants.ts';

test('language native labels keep readable unicode for non-latin locales', () => {
  assert.equal(LANGUAGE_META.ar.nativeLabel, 'العربية');
  assert.equal(LANGUAGE_META.zh.nativeLabel, '中文');
  assert.equal(LANGUAGE_META.ja.nativeLabel, '日本語');
  assert.equal(LANGUAGE_META.ko.nativeLabel, '한국어');
  assert.equal(LANGUAGE_META.th.nativeLabel, 'ไทย');
  assert.equal(LANGUAGE_META.vi.nativeLabel, 'Tiếng Việt');
});

