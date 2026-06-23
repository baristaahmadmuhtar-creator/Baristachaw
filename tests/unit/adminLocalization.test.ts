import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import type { Language } from '../../apps/web/src/types.ts';
import { LANGUAGE_META } from '../../apps/web/src/constants.ts';
import { createAdminCopy, type AdminCopyKey } from '../../apps/web/src/pages/adminLocalization.ts';

const BROKEN_ENCODING_PATTERNS = [
  /\?{3,}/,
  /Ã./,
  /Ø./,
  /â€™|â€œ|â€|â€¢/,
  /�/,
];

const CRITICAL_ADMIN_KEYS: AdminCopyKey[] = [
  'pageTitle',
  'pageSubtitle',
  'tabUsers',
  'tabPlans',
  'accountControl',
  'planQuickControl',
  'planCatalog',
  'operatorNote',
  'catalogOperations',
  'newCatalogRequest',
  'payloadJson',
  'save',
  'refresh',
  'pricingOperations',
  'dynamicPricing',
  'promoCodes',
  'addPrice',
  'addPromo',
  'savePrice',
  'savePromo',
  'deletePriceTitle',
  'deletePromoTitle',
];

test('admin copy exposes localized production-critical labels for every language option', () => {
  const english = createAdminCopy('en');

  for (const language of Object.keys(LANGUAGE_META) as Language[]) {
    const copy = createAdminCopy(language);
    assert.equal(copy.language, language);
    assert.ok(copy.locale.length > 0, `${language} locale must be configured`);

    for (const key of CRITICAL_ADMIN_KEYS) {
      const value = copy.text(key);
      assert.equal(typeof value, 'string', `${language}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `${language}.${key} cannot be empty`);
      for (const pattern of BROKEN_ENCODING_PATTERNS) {
        assert.equal(pattern.test(value), false, `${language}.${key} contains broken encoding artifacts: ${value}`);
      }
    }

    if (language !== 'en') {
      assert.notEqual(copy.text('pageTitle'), english.text('pageTitle'), `${language}.pageTitle must not fall back to English`);
      assert.notEqual(copy.text('tabUsers'), english.text('tabUsers'), `${language}.tabUsers must not fall back to English`);
    }
  }
});

test('Indonesian admin copy replaces raw operational enums with friendly labels', () => {
  const copy = createAdminCopy('id');

  assert.equal(copy.text('pageTitle'), 'Manajemen Admin');
  assert.equal(copy.text('manage'), 'Kelola');
  assert.equal(copy.enumLabel('past_due'), 'Terlambat bayar');
  assert.equal(copy.enumLabel('manual_invoice'), 'Invoice manual');
  assert.equal(copy.format('aiDeepScanLimits', { ai: 120, deep: 12, scans: 40 }), '120 AI / 12 deep / 40 scan AI per hari');
});

test('language-sensitive source files do not contain placeholder mojibake', () => {
  const files = [
    'apps/web/src/features/ai-brew/AiBrewPanel.tsx',
    'apps/web/src/utils/oauthFlow.ts',
    'apps/web/src/pages/adminLocalization.ts',
  ];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of BROKEN_ENCODING_PATTERNS) {
      assert.equal(pattern.test(source), false, `${file} contains broken localization text`);
    }
  }
});

test('AI Brew normal user copy hides provider internals and old engine labels', () => {
  const source = readFileSync('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'utf8');

  assert.doesNotMatch(source, /['"]AI off['"]|['"]AI optimized['"]|['"]AI optimizing['"]/i);
  assert.doesNotMatch(source, /Groq Llama|Gemini 2\.5|DeepSeek Chat|OpenRouter Llama|estimated USD|token count|provider stack/i);
  assert.match(source, /Local planner/);
  assert.match(source, /Rencana lokal/);
  assert.match(source, /Basic Brew/);
  assert.match(source, /Advanced Brew/);
  assert.match(source, /Coming Soon/);
  assert.doesNotMatch(source, /Precision planner|Rencana presisi/);
});
