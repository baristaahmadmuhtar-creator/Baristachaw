import test from 'node:test';
import assert from 'node:assert/strict';

import { getMobileLocalization, resolveMobileLanguage } from '../../apps/mobile/src/utils/localization.ts';

test('mobile localization resolves supported language tags', () => {
  assert.equal(resolveMobileLanguage('ar-SA'), 'ar');
  assert.equal(resolveMobileLanguage('id_ID'), 'id');
  assert.equal(resolveMobileLanguage('fr-FR'), 'en');
});

test('mobile localization keeps arabic rtl, locale, and localized home copy', () => {
  const localization = getMobileLocalization('ar-SA');

  assert.equal(localization.locale, 'ar');
  assert.equal(localization.direction, 'rtl');
  assert.equal(localization.copy.home.sections.quickPathsTitle, '\u0645\u0633\u0627\u0631\u0627\u062a \u0633\u0631\u064a\u0639\u0629');
  assert.equal(localization.web.language, '\u0644\u063a\u0629');
});

test('mobile localization exposes localized chat sheet labels', () => {
  const localization = getMobileLocalization('id-ID');

  assert.equal(localization.copy.chat.sheets.memoryTitle, 'Memori & Identitas');
  assert.equal(localization.copy.chat.helpers.useEnglish, 'Pakai bahasa Inggris');
});
