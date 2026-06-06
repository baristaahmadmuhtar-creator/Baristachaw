import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Language } from '../../apps/web/src/types.ts';
import { LANGUAGE_META, getTranslations } from '../../apps/web/src/constants.ts';

const EN = getTranslations('en');
const NON_EN_LANGUAGES = (Object.keys(LANGUAGE_META) as Language[]).filter((language) => language !== 'en');

const LOCALIZED_KEYS = [
  'chatAttachmentPrepareFailed',
  'chatCameraDeniedUsePhotoFile',
  'chatVoiceNoteLabel',
  'chatVoiceTranscriptionUnclear',
  'chatVoiceTranscriptionFailedRetry',
  'chatAttachmentLabel',
  'chatFileFallbackName',
  'chatResponseTimeoutRetry',
  'toolsDirectionFiner',
  'toolsDirectionCoarser',
] as const;

const CRITICAL_UI_KEYS = [
  'language',
  'selectLanguage',
  'openLanguageMenu',
  'homePrompt',
  'scannerTitle',
  'toolsTitle',
  'collectionSubtitle',
] as const;

const ENGLISH_FALLBACK_PATTERNS = [
  /attachment prep failed/i,
  /camera denied/i,
  /voice message/i,
  /attachment item/i,
  /response took too long/i,
  /^file$/i,
  /^finer$/i,
  /^coarser$/i,
];

const BROKEN_ENCODING_PATTERNS = [
  /\?{2,}/,
  /Ã./,
  /Ø./,
  /â€™|â€œ|â€|â€¢/,
  /�/,
];

test('non-English locales keep critical chat/tool copy localized', () => {
  for (const language of NON_EN_LANGUAGES) {
    const translations = getTranslations(language);

    for (const key of LOCALIZED_KEYS) {
      const value = translations[key];
      const englishValue = EN[key];

      assert.equal(typeof value, 'string', `${language}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `${language}.${key} cannot be empty`);
      assert.notEqual(value, englishValue, `${language}.${key} must not fall back to English copy`);

      for (const pattern of ENGLISH_FALLBACK_PATTERNS) {
        assert.equal(pattern.test(value), false, `${language}.${key} contains English fallback phrase: ${value}`);
      }
      for (const pattern of BROKEN_ENCODING_PATTERNS) {
        assert.equal(pattern.test(value), false, `${language}.${key} contains broken encoding artifacts: ${value}`);
      }
    }

    for (const key of CRITICAL_UI_KEYS) {
      const value = translations[key];
      assert.equal(typeof value, 'string', `${language}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `${language}.${key} cannot be empty`);
      for (const pattern of BROKEN_ENCODING_PATTERNS) {
        assert.equal(pattern.test(value), false, `${language}.${key} contains broken encoding artifacts: ${value}`);
      }
    }
  }
});

test('Indonesian guest auth errors never expose the English API fallback', () => {
  const translations = getTranslations('id');
  const source = readFileSync(resolve(process.cwd(), 'apps/web/src/context/AuthModalContext.tsx'), 'utf8');

  assert.match(translations.authGuestUnavailable, /mode tamu|sementara|coba lagi/i);
  assert.doesNotMatch(translations.authGuestUnavailable, /Guest mode is unavailable/i);
  assert.doesNotMatch(source, /payload\?\.(?:error|message).+Guest mode is unavailable/i);
  assert.match(source, /throw new Error\(copy\.authGuestUnavailable \|\| copy\.error\)/);
});

