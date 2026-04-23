import test from 'node:test';
import assert from 'node:assert/strict';

import { TRANSLATIONS, getTranslations } from '../../apps/web/src/constants.ts';

test('arabic translation map covers all English keys except intentional brand overrides', () => {
  const en = getTranslations('en');
  const arRaw = TRANSLATIONS.ar || {};

  const missing = Object.keys(en).filter((key) => !(key in arRaw));
  assert.deepEqual(missing, [], `Missing Arabic keys: ${missing.join(', ')}`);
});

test('arabic critical keys are not equal to English fallback copy', () => {
  const en = getTranslations('en');
  const ar = getTranslations('ar');

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
    'toolsStdInvalidNumericInput',
    'toolsStdRatioOutsideBaseline',
    'toolsStdTdsOutsideTypical',
    'toolsStdDosePositive',
  ] as const;

  for (const key of criticalKeys) {
    assert.notEqual(ar[key], en[key], `${key} still falls back to English`);
  }
});

test('arabic merged translations do not silently fall back to English except brand name', () => {
  const en = getTranslations('en');
  const ar = getTranslations('ar');

  const allowedSame = new Set(['chatBrandName', 'chatAssistantNamePlaceholder']);
  const sameAsEnglish = Object.keys(en).filter((key) => ar[key] === en[key] && !allowedSame.has(key));

  assert.deepEqual(
    sameAsEnglish,
    [],
    `Unexpected Arabic values still equal English: ${sameAsEnglish.join(', ')}`,
  );
});

test('arabic polish guardrails keep critical terminology natural and consistent', () => {
  const ar = getTranslations('ar');

  const bannedPhrases = [
    'منظمة العفو الدولية المشروب',
    'الموقت',
    'مسح الرؤية',
  ];

  const criticalValues = [
    ar.homeAiBrewTitle,
    ar.authSourceAiBrew,
    ar.toolsTabAiBrew,
    ar.toolsLoadingAiBrew,
    ar.homeScannerTitle,
    ar.scannerTitle,
    ar.toolsTabTimer,
    ar.save,
    ar.cancel,
    ar.delete,
    ar.edit,
    ar.close,
    ar.confirm,
  ];

  for (const value of criticalValues) {
    for (const banned of bannedPhrases) {
      assert.equal(value.includes(banned), false, `Arabic copy still contains banned phrase "${banned}": ${value}`);
    }
  }

  assert.equal(ar.homeAiBrewTitle, 'تحضير بالذكاء الاصطناعي');
  assert.equal(ar.authSourceAiBrew, 'تحضير بالذكاء الاصطناعي');
  assert.equal(ar.toolsTabAiBrew, 'تحضير بالذكاء الاصطناعي');
  assert.match(ar.toolsLoadingAiBrew, /الذكاء الاصطناعي/);

  assert.equal(ar.homeScannerTitle, 'المسح البصري');
  assert.equal(ar.scannerTitle, 'المسح البصري');
  assert.equal(ar.toolsTabTimer, 'المؤقت');

  assert.equal(ar.save, 'حفظ');
  assert.equal(ar.cancel, 'إلغاء');
  assert.equal(ar.delete, 'حذف');
  assert.equal(ar.edit, 'تعديل');
  assert.equal(ar.close, 'إغلاق');
  assert.equal(ar.confirm, 'تأكيد');
});

