import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LANGUAGE_META,
  getLanguageDirection,
  getLanguageLocale,
} from '../../apps/web/src/constants.ts';
import type { Language } from '../../apps/web/src/types.ts';

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_META) as Language[];

test('language direction contract keeps Arabic as rtl and others as ltr', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const direction = getLanguageDirection(language);
    if (language === 'ar') {
      assert.equal(direction, 'rtl', 'Arabic must stay rtl');
      continue;
    }
    assert.equal(direction, 'ltr', `${language} must stay ltr`);
  }
});

test('language locale contract stays non-empty and stable for formatting', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const locale = getLanguageLocale(language);
    assert.equal(typeof locale, 'string');
    assert.ok(locale.trim().length > 0, `${language} locale must not be empty`);
    assert.ok(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale), `${language} locale must be BCP-47 like, received "${locale}"`);
  }
});
