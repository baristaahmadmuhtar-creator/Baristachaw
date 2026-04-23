import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeepTemplatePrompt,
  evaluateDeepQualityGate,
  shouldUseDeepGrounding,
} from '../../server-api/ai.ts';

const GOOD_DEEP_RESPONSE = [
  '## TL;DR',
  'Use a consistent baseline recipe, then optimize one variable at a time to improve extraction and repeatability.',
  '',
  '## Core Analysis',
  'The current cup profile suggests uneven extraction due to grind inconsistency and unstable pour cadence. ',
  'When channeling risk rises, sweetness drops while acidity becomes sharp and finish short. ',
  'Stabilizing grind distribution and flow control usually improves clarity and balance in two to three iterations.',
  '',
  '## Options & Tradeoffs',
  'Option 1: grind finer for higher extraction, but risk bitterness and slower drawdown.',
  'Option 2: increase water temperature for better solubility, but volatility can hide subtle florals.',
  'Option 3: improve pouring structure and agitation control, slower to learn but most repeatable long term.',
  '',
  '## Recommended Action Plan',
  '1. Lock dose and ratio, then run two controlled brews to establish a stable baseline.',
  '2. Adjust grind one notch finer and compare sweetness, clarity, and finish side by side.',
  '3. If bitterness spikes, revert grind and reduce agitation while keeping total contact time stable.',
  '',
  '## Risks & Validation',
  'Validate with blind tasting and log TDS or extraction estimates where possible. ',
  'Watch for drawdown drift across brews and keep kettle and filter prep consistent to reduce noise.',
].join('\n');

test('shouldUseDeepGrounding triggers for time-sensitive and source-intent queries', () => {
  assert.equal(shouldUseDeepGrounding('latest espresso machine release today'), true);
  assert.equal(shouldUseDeepGrounding('berita terbaru harga kopi hari ini'), true);
  assert.equal(shouldUseDeepGrounding('tolong kasih sumber dan link referensi'), true);
  assert.equal(shouldUseDeepGrounding('explain brew ratio basics'), false);
});

test('evaluateDeepQualityGate fails when required sections are missing', () => {
  const result = evaluateDeepQualityGate('## TL;DR\nSingkat.\n## Core Analysis\nIsi.', 'jelaskan detail');
  assert.equal(result.pass, false);
  assert.ok(result.issues.includes('deep_sections_missing'));
});

test('evaluateDeepQualityGate fails when action plan has fewer than 3 steps', () => {
  const almost = GOOD_DEEP_RESPONSE.replace(
    /## Recommended Action Plan[\s\S]*## Risks & Validation/m,
    '## Recommended Action Plan\n1. Step one.\n2. Step two.\n\n## Risks & Validation',
  );
  const result = evaluateDeepQualityGate(almost, 'beri analisis detail');
  assert.equal(result.pass, false);
  assert.ok(result.issues.includes('deep_action_plan_steps_lt3'));
});

test('evaluateDeepQualityGate fails when deep response is too short', () => {
  const shortResponse = [
    '## TL;DR',
    'Jawaban singkat.',
    '## Core Analysis',
    'Analisis singkat.',
    '## Options & Tradeoffs',
    'Opsi singkat.',
    '## Recommended Action Plan',
    '1. A',
    '2. B',
    '3. C',
    '## Risks & Validation',
    'Risiko singkat.',
  ].join('\n');
  const result = evaluateDeepQualityGate(shortResponse, 'beri analisis teknis');
  assert.equal(result.pass, false);
  assert.ok(result.issues.includes('deep_too_short'));
});

test('evaluateDeepQualityGate passes for complete deep template output', () => {
  const result = evaluateDeepQualityGate(GOOD_DEEP_RESPONSE, 'please provide deep analysis');
  assert.equal(result.pass, true);
  assert.equal(result.issues.includes('deep_too_short'), false);
});

test('evaluateDeepQualityGate marks explicit short requests as degraded but quality-pass', () => {
  const concise = [
    '## TL;DR',
    'Jawaban singkat sesuai permintaan user.',
    '## Core Analysis',
    'Analisis dibuat pendek untuk menjaga format ringkas.',
    '## Options & Tradeoffs',
    'Opsinya ada tapi dijelaskan secara minimal.',
    '## Recommended Action Plan',
    '1. Langkah satu.',
    '2. Langkah dua.',
    '3. Langkah tiga.',
    '## Risks & Validation',
    'Validasi tetap dilakukan secara ringkas.',
  ].join('\n');
  const result = evaluateDeepQualityGate(concise, 'jawab singkat maksimal 80 kata');
  assert.equal(result.pass, true);
  assert.ok(result.issues.includes('short_by_user_request'));
});

test('buildDeepTemplatePrompt includes mandatory section headings', () => {
  const prompt = buildDeepTemplatePrompt('analyze espresso extraction', { grounded: true });
  assert.match(prompt, /## TL;DR/);
  assert.match(prompt, /## Core Analysis/);
  assert.match(prompt, /## Options & Tradeoffs/);
  assert.match(prompt, /## Recommended Action Plan/);
  assert.match(prompt, /## Risks & Validation/);
});
