import test from 'node:test';
import assert from 'node:assert/strict';

import type { Language } from '../../apps/web/src/types.ts';
import { LANGUAGE_META, getTranslations } from '../../apps/web/src/constants.ts';

const LANGUAGES = Object.keys(LANGUAGE_META) as Language[];

test('translation placeholders remain intact across locales', () => {
  for (const language of LANGUAGES) {
    const t = getTranslations(language);
    assert.match(t.authModalBody, /\{source\}/, `${language}.authModalBody must preserve {source}`);
    assert.ok(t.homeLiveSearchUnavailable.length > 10, `${language}.homeLiveSearchUnavailable should be meaningful`);
    assert.ok(t.scannerVideoSoonError.length > 10, `${language}.scannerVideoSoonError should be meaningful`);
  }
});

test('search and loading copy stays context-specific across locales', () => {
  for (const language of LANGUAGES) {
    const t = getTranslations(language);
    assert.notEqual(
      t.homeSearchPlaceholderAuth,
      t.homeSearchPlaceholderGuest,
      `${language} auth vs guest search placeholder must be meaningfully different`,
    );

    const loadingPhases = [
      t.homeStatusSearching,
      t.homeStatusAnalyzing,
      t.homeStatusCrossRef,
      t.homeStatusCrafting,
      t.homeStatusBrewing,
    ];

    assert.equal(
      new Set(loadingPhases).size,
      loadingPhases.length,
      `${language} loading phases must not collapse into duplicated wording`,
    );
  }
});

