import test from 'node:test';
import assert from 'node:assert/strict';

import { getSystemInstructions } from '../../apps/web/src/constants.ts';
import { buildScannerPrompt } from '../../apps/web/src/features/scanner/buildScannerPrompt.ts';

test('arabic system instruction enforces arabic-only response lock', () => {
  const instruction = getSystemInstructions({
    language: 'ar' as any,
    tone: 'Professional',
    name: 'Baristachaw',
  } as any);

  assert.match(instruction, /أجب باللغة العربية بالكامل/);
  assert.match(instruction, /لا تمزج أي لغة أخرى/);
  assert.doesNotMatch(instruction, /Respond in Arabic/);
});

test('scanner prompt switches to arabic instructions when language=ar', () => {
  const prompt = buildScannerPrompt('auto', 'Arabic', 'ar');
  assert.match(prompt, /أنت Baristachaw لتحليل القهوة/);
  assert.match(prompt, /أجب باللغة Arabic/);
  assert.doesNotMatch(prompt, /You are Baristachaw Coffee Analysis/);
});

test('scanner prompt keeps english instructions for non-indonesian and non-arabic languages', () => {
  const prompt = buildScannerPrompt('ocr', 'English', 'en');
  assert.match(prompt, /You are Baristachaw Read Label/);
  assert.match(prompt, /Respond in English/);
});

