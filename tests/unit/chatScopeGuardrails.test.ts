import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildChatDomainBlockReply,
  classifyChatUserRequest,
  guardChatAnswer,
} from '../../apps/web/src/features/chat/antiHallucination.ts';

test('chat guardrails block software coding requests before any model answer', () => {
  const classification = classifyChatUserRequest('Buatkan code python kalkulator lengkap');

  assert.equal(classification.allowed, false);
  assert.equal(classification.reason, 'software_coding_out_of_scope');
  assert.match(buildChatDomainBlockReply('id'), /kopi|Baristachaw/i);
  assert.doesNotMatch(buildChatDomainBlockReply('id'), /python|kode|API key/i);
});

test('chat answer guard blocks code and secret leakage even if a provider returns it', () => {
  const guarded = guardChatAnswer({
    userMessage: 'buatkan script python kalkulator',
    answer: '```python\nprint(1 + 1)\n```',
    mode: 'fast',
  });

  assert.equal(guarded.allowed, false);
  assert.equal(guarded.risk, 'blocked');
  assert.equal(guarded.reason, 'software_coding_out_of_scope');
});

test('chat guardrails allow coffee and app-support questions', () => {
  assert.equal(classifyChatUserRequest('Kenapa V60 saya pahit?').allowed, true);
  assert.equal(classifyChatUserRequest('Cara pakai AI Brew di Baristachaw?').allowed, true);
});

test('chat guardrails allow beverage recipes and casual chat while keeping code blocked', () => {
  assert.equal(classifyChatUserRequest('Buatkan recipe kopi gula aren yang enak').allowed, true);
  assert.equal(classifyChatUserRequest('Bantu buat recipe moktail dari Monin').allowed, true);
  assert.equal(classifyChatUserRequest('Hai, apa kabar?').allowed, true);
  assert.equal(classifyChatUserRequest('Buatkan code python kalkulator').allowed, false);
  assert.equal(classifyChatUserRequest('Kasih contoh isi .env dan API key asli').allowed, false);

  const mocktailGuard = guardChatAnswer({
    userMessage: 'Bantu buat recipe moktail dari Monin',
    answer: 'Campur 30 ml sirup Monin, 120 ml soda dingin, es, dan jeruk nipis. Aduk pelan lalu koreksi manisnya.',
    mode: 'fast',
  });
  assert.equal(mocktailGuard.allowed, true);

  const casualGuard = guardChatAnswer({
    userMessage: 'Hai, apa kabar?',
    answer: 'Hai! Saya siap bantu. Mau ngobrol santai atau bahas minuman hari ini?',
    mode: 'fast',
  });
  assert.equal(casualGuard.allowed, true);
});
