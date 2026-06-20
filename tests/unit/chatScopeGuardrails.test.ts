import { describe, test, expect } from 'vitest';
import {
  buildChatDomainBlockReply,
  classifyChatUserRequest,
  guardChatAnswer,
} from '../../apps/web/src/features/chat/antiHallucination.ts';

describe('Chat Scope Guardrails', () => {
  test('chat guardrails block software coding requests before any model answer', () => {
    const classification = classifyChatUserRequest('Buatkan code python kalkulator lengkap');

    expect(classification.allowed).toBe(false);
    expect(classification.reason).toBe('software_coding_out_of_scope');
    expect(buildChatDomainBlockReply('id')).toMatch(/kopi|Baristachaw/i);
    expect(buildChatDomainBlockReply('id')).not.toMatch(/python|kode|API key/i);
  });

  test('chat answer guard blocks code and secret leakage even if a provider returns it', () => {
    const guarded = guardChatAnswer({
      userMessage: 'buatkan script python kalkulator',
      answer: '```python\nprint(1 + 1)\n```',
      mode: 'fast',
    });

    expect(guarded.allowed).toBe(false);
    expect(guarded.risk).toBe('blocked');
    expect(guarded.reason).toBe('software_coding_out_of_scope');
  });

  test('chat guardrails allow coffee and app-support questions', () => {
    expect(classifyChatUserRequest('Kenapa V60 saya pahit?').allowed).toBe(true);
    expect(classifyChatUserRequest('Cara pakai AI Brew di Baristachaw?').allowed).toBe(true);
  });

  test('chat guardrails allow beverage recipes and casual chat while keeping code blocked', () => {
    expect(classifyChatUserRequest('Buatkan recipe kopi gula aren yang enak').allowed).toBe(true);
    expect(classifyChatUserRequest('Bantu buat recipe moktail dari Monin').allowed).toBe(true);
    expect(classifyChatUserRequest('Hai, apa kabar?').allowed).toBe(true);
    expect(classifyChatUserRequest('Buatkan code python kalkulator').allowed).toBe(false);
    expect(classifyChatUserRequest('Kasih contoh isi .env dan API key asli').allowed).toBe(false);

    const mocktailGuard = guardChatAnswer({
      userMessage: 'Bantu buat recipe moktail dari Monin',
      answer: 'Campur 30 ml sirup Monin, 120 ml soda dingin, es, dan jeruk nipis. Aduk pelan lalu koreksi manisnya.',
      mode: 'fast',
    });
    expect(mocktailGuard.allowed).toBe(true);

    const casualGuard = guardChatAnswer({
      userMessage: 'Hai, apa kabar?',
      answer: 'Hai! Saya siap bantu. Mau ngobrol santai atau bahas minuman hari ini?',
      mode: 'fast',
    });
    expect(casualGuard.allowed).toBe(true);
  });

  test('chat guardrails allow Baristachaw internal technical development terms', () => {
    // These should be ALLOWED because they mention allowed terms like 'baristachaw', 'ai brew', etc.
    expect(classifyChatUserRequest('Buatkan prompt AI Brew untuk Baristachaw').allowed).toBe(true);
    expect(classifyChatUserRequest('Generate test case untuk fitur scanner Baristachaw').allowed).toBe(true);
    expect(classifyChatUserRequest('Bagaimana UI UX yang bagus untuk halaman collection?').allowed).toBe(true);
    expect(classifyChatUserRequest('Tulis pseudo-code untuk grinder calculator').allowed).toBe(true);
    expect(classifyChatUserRequest('Apa API endpoint untuk langganan / subscription?').allowed).toBe(true);

    // This one does not mention Baristachaw terms so it should be BLOCKED
    expect(classifyChatUserRequest('Tulis API endpoint express untuk login').allowed).toBe(false);
  });
});
