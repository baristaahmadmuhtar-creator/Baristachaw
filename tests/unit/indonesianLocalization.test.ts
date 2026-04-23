import test from 'node:test';
import assert from 'node:assert/strict';

import { TRANSLATIONS, getTranslations } from '../../apps/web/src/constants.ts';

test('indonesian translation map covers all English keys except intentional brand overrides', () => {
  const en = getTranslations('en');
  const idRaw = TRANSLATIONS.id || {};

  const missing = Object.keys(en).filter((key) => !(key in idRaw));
  assert.deepEqual(missing, [], `Missing Indonesian keys: ${missing.join(', ')}`);
});

test('indonesian critical keys are not equal to English fallback copy', () => {
  const en = getTranslations('en');
  const id = getTranslations('id');

  const criticalKeys = [
    'homeSearchPlaceholderGuest',
    'homeLiveSearchUnavailable',
    'scannerVideoSoonError',
    'chatAttachmentPrepareFailed',
    'chatCameraDeniedUsePhotoFile',
    'chatVoiceTranscriptionUnclear',
    'chatVoiceTranscriptionFailedRetry',
    'chatResponseTimeoutRetry',
    'toolsDirectionFiner',
    'toolsDirectionCoarser',
    'toolsGrindBiasGoOneClick',
    'chatWorkspaceTabHistory',
    'chatWorkspaceTabLibrary',
    'chatWorkspaceTabMemory',
  ] as const;

  for (const key of criticalKeys) {
    assert.notEqual(id[key], en[key], `${key} still falls back to English`);
  }
});

test('indonesian merged translations do not silently fall back to English except brand name', () => {
  const en = getTranslations('en');
  const id = getTranslations('id');

  const allowedSame = new Set(['chatBrandName', 'chatAssistantNamePlaceholder', 'chatMemoryDetailBalanced']);
  const sameAsEnglish = Object.keys(en).filter((key) => id[key] === en[key] && !allowedSame.has(key));

  assert.deepEqual(
    sameAsEnglish,
    [],
    `Unexpected Indonesian values still equal English: ${sameAsEnglish.join(', ')}`,
  );
});

