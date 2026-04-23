import test from 'node:test';
import assert from 'node:assert/strict';

import { getSystemInstructions } from '../../apps/web/src/constants.ts';
import { buildScannerPrompt } from '../../apps/web/src/features/scanner/buildScannerPrompt.ts';

test('indonesian system instruction enforces indonesian-only response lock', () => {
  const instruction = getSystemInstructions({
    language: 'id' as any,
    tone: 'Professional',
    name: 'Baristachaw',
  } as any);

  assert.match(instruction, /Bahasa Indonesia/);
  assert.match(instruction, /Jangan campur bahasa lain/);
  assert.doesNotMatch(instruction, /Respond in/);
});

test('scanner prompt switches to indonesian instructions when language=id', () => {
  const prompt = buildScannerPrompt('auto', 'Bahasa Indonesia', 'id');
  assert.match(prompt, /Anda adalah Baristachaw Analisis Kopi/);
  assert.match(prompt, /Jawab dalam Bahasa Indonesia/);
  assert.doesNotMatch(prompt, /You are Baristachaw Coffee Analysis/);
});

test('scanner prompt keeps english instructions for non-indonesian languages', () => {
  const prompt = buildScannerPrompt('ocr', 'English', 'en');
  assert.match(prompt, /You are Baristachaw Read Label/);
  assert.match(prompt, /Respond in English/);
});

