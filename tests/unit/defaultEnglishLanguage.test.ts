import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LANGUAGE,
  getTranslations,
} from '../../apps/web/src/constants.ts';
import {
  DEFAULT_LANGUAGE as MOBILE_DEFAULT_LANGUAGE,
  getTranslations as getMobileSharedTranslations,
} from '../../apps/mobile/src/web-shared/constants.ts';

const INDONESIAN_LEAK_PATTERNS = [
  /\bAlat\b/i,
  /\bKalkulator\b/i,
  /\bRasio\b/i,
  /\bUkuran\b/i,
  /\bGiling/i,
  /\bSangrai\b/i,
  /\bTerang\b/i,
  /\bGelap\b/i,
  /\bSedang\b/i,
  /\bSasaran\b/i,
  /\bMetode\b/i,
  /\bEspreso\b/i,
  /\bPanci\b/i,
  /\bSkor\b/i,
  /\blarutan\b/i,
  /\bDosis\b/i,
  /\bSimpan\b/i,
  /\bHapus\b/i,
  /\bKoleksi\b/i,
  /\bCatatan\b/i,
  /\bTugas\b/i,
  /\bPanduan\b/i,
  /\bSeduh\b/i,
  /\bGilingan\b/i,
  /\bAir\b/i,
];

const ENGLISH_CRITICAL_KEYS = [
  'toolsTitle',
  'toolsSubtitle',
  'toolsBrewMethodPresets',
  'toolsModeBasic',
  'toolsModeAdvanced',
  'toolsGrindSizeTitle',
  'toolsGrindSizeSubtitle',
  'toolsGrindSizeGrinder',
  'toolsRoastProfile',
  'toolsRoastLight',
  'toolsRoastMediumLight',
  'toolsRoastMedium',
  'toolsRoastMediumDark',
  'toolsRoastDark',
  'toolsAgtronPlaceholder',
  'toolsDoseLabel',
  'toolsWaterLabel',
  'toolsTdsLabel',
  'toolsExtractionTarget',
  'toolsMethodEspresso',
  'toolsMethodChemex',
  'toolsMethodKalitaWave',
  'toolsMethodAeropress',
  'toolsMethodCleverDripper',
  'toolsMethodOrigami',
  'toolsMethodApril',
  'toolsMethodKono',
  'toolsMethodMokaPot',
  'toolsShotEspresso',
] as const;

test('fresh app language defaults to English on web and mobile shared runtime', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(MOBILE_DEFAULT_LANGUAGE, 'en');
});

test('English critical tools copy has no Indonesian leakage', () => {
  const webTranslations = getTranslations('en');
  for (const key of ENGLISH_CRITICAL_KEYS) {
    const value = webTranslations[key];
    assert.equal(typeof value, 'string', `${key} must be a string`);
    for (const pattern of INDONESIAN_LEAK_PATTERNS) {
      assert.equal(pattern.test(value), false, `${key} leaks Indonesian copy: ${value}`);
    }
  }

  const mobileSharedTranslations = getMobileSharedTranslations('en');
  for (const [key, value] of Object.entries(mobileSharedTranslations)) {
    if (!key.startsWith('tools') || typeof value !== 'string') continue;
    for (const pattern of INDONESIAN_LEAK_PATTERNS) {
      assert.equal(pattern.test(value), false, `${key} leaks Indonesian copy: ${value}`);
    }
  }
});

test('Indonesian roast copy uses barista roast terms instead of literal light/dark color words', () => {
  for (const translations of [getTranslations('id'), getMobileSharedTranslations('id')]) {
    assert.match(translations.toolsRoastProfile, /roast/i);
    assert.match(translations.toolsRoastLight, /light roast/i);
    assert.match(translations.toolsRoastMediumLight, /medium-light/i);
    assert.match(translations.toolsRoastMedium, /medium roast/i);
    assert.match(translations.toolsRoastMediumDark, /medium-dark/i);
    assert.match(translations.toolsRoastDark, /dark roast/i);

    for (const key of ['toolsRoastLight', 'toolsRoastMediumLight', 'toolsRoastMediumDark', 'toolsRoastDark'] as const) {
      assert.doesNotMatch(translations[key], /Terang|Gelap/i, `${key} should not use literal color translation`);
    }
  }
});
