import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateResponseTaskAlignment,
  buildOrchestratedPrompt as buildServerOrchestratedPrompt,
  buildResponseOrchestration as buildServerResponseOrchestration,
} from '../../server-api/_orchestration.ts';

test('server orchestration does not let stale recipe context override a new question', () => {
  const input = 'berapa modal buka coffee cart kecil?';
  const conversationContext = {
    sessionTitle: 'Resep V60 Gayo',
    summary: 'Diskusi sebelumnya fokus pada resep V60, rasio, dan bloom.',
    recentMessages: [
      { role: 'user' as const, text: 'buatkan resep V60 15 gram' },
      { role: 'assistant' as const, text: 'Berikut resep V60 15 gram...' },
    ],
  };

  const resolved = buildServerResponseOrchestration(input, 'normal', undefined, undefined, conversationContext);
  const prompt = buildServerOrchestratedPrompt(input, 'normal', resolved, conversationContext);

  assert.match(prompt, /Detected intent: question/i);
  assert.match(prompt, /Primary task: answer the latest user request/i);
  assert.doesNotMatch(prompt, /Compact recipe template:/);
});

test('server orchestration keeps older topic only for explicit continuation cues', () => {
  const input = 'lanjutkan yang tadi';
  const conversationContext = {
    sessionTitle: 'Resep V60 Gayo',
    summary: 'Diskusi sebelumnya fokus pada resep V60, rasio, dan bloom.',
    recentMessages: [
      { role: 'user' as const, text: 'buatkan resep V60 15 gram' },
      { role: 'assistant' as const, text: 'Berikut resep V60 15 gram...' },
    ],
  };

  const resolved = buildServerResponseOrchestration(input, 'normal', undefined, undefined, conversationContext);
  const prompt = buildServerOrchestratedPrompt(input, 'normal', resolved, conversationContext);

  assert.match(prompt, /Detected intent: recipe_request/i);
});

test('server orchestration routes beverage recipe asks away from milk steaming defaults', () => {
  const input = 'buat gula aren kopi susu';
  const resolved = buildServerResponseOrchestration(input, 'normal');
  const prompt = buildServerOrchestratedPrompt(input, 'normal', resolved);

  assert.match(prompt, /Detected intent: recipe_request/i);
  assert.match(prompt, /Compact recipe template:|Balanced recipe template:/i);
  assert.doesNotMatch(prompt, /milk steaming and latte art/i);
});

test('server alignment guard catches manual-brew drift for beverage recipes', () => {
  const alignment = evaluateResponseTaskAlignment(
    'buat gula aren kopi susu',
    'Gunakan V60, bloom 40 g, lalu lanjutkan spiral pour sampai 320 g.',
  );

  assert.equal(alignment.ok, false);
  assert.ok(alignment.issues.includes('manual_brew_topic_drift'));
});
