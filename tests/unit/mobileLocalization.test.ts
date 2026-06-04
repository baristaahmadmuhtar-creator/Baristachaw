import test from 'node:test';
import assert from 'node:assert/strict';

import { getMobileLocalization, resolveMobileLanguage } from '../../apps/mobile/src/utils/localization.ts';

test('mobile localization resolves supported language tags', () => {
  assert.equal(resolveMobileLanguage('en-US'), 'en');
  assert.equal(resolveMobileLanguage('id_ID'), 'id');
  assert.equal(resolveMobileLanguage('fr-FR'), 'en');
  assert.equal(resolveMobileLanguage('ar-SA'), 'en');
});

test('mobile localization falls back unsupported store-shell languages to safe English copy', () => {
  const localization = getMobileLocalization('ar-SA');

  assert.equal(localization.language, 'en');
  assert.equal(localization.locale, 'en-US');
  assert.equal(localization.direction, 'ltr');
  assert.equal(localization.copy.home.sections.quickPathsTitle, 'Quick paths');
  assert.equal(localization.web.language, 'Language');
});

test('mobile localization exposes localized chat sheet labels', () => {
  const localization = getMobileLocalization('id-ID');

  assert.equal(localization.copy.chat.sheets.memoryTitle, 'Memori & Identitas');
  assert.equal(localization.copy.chat.helpers.useEnglish, 'Pakai bahasa Inggris');
});
