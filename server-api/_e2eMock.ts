import type { StructuredSearchSource } from './_contracts.js';

export const E2E_MOCK_PROVIDER = 'QA_E2E';
export const E2E_MOCK_MODEL = 'qa_e2e_mock';

const E2E_MOCK_SOURCES: StructuredSearchSource[] = [
  { uri: 'https://example.com/qa-e2e-brew', title: 'QA E2E Brew Source', domain: 'example.com' },
  { uri: 'https://example.org/qa-e2e-chat', title: 'QA E2E Chat Source', domain: 'example.org' },
];

const E2E_MOCK_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

function normalizeLanguage(value: string | undefined): string {
  return String(value || '').trim().toLowerCase().slice(0, 8);
}

function fastTextForLanguage(language: string): string {
  if (language === 'es') {
    return 'Respuesta breve: usa una molienda un poco más fina para ganar dulzor en el espresso.';
  }
  if (language === 'ja') {
    return '短い回答です。エスプレッソの甘さを増やすには、挽き目を少し細かくしてください。';
  }
  return 'Grind slightly finer to increase sweetness in the espresso shot.';
}

function chatTextForLanguage(language: string): string {
  if (language === 'es') {
    return 'Hola, usa una molienda un poco más fina si la taza sale agria y delgada.';
  }
  if (language === 'ja') {
    return '酸味が強くて薄いなら、挽き目を少し細かくしてください。';
  }
  return 'Use a slightly finer grind if the cup tastes sour and thin.';
}

function balancedTextForLanguage(language: string): string {
  if (language === 'es') {
    return '## Normal Mode\nRespuesta: fija una receta base, ajusta una sola variable y compara dulzor, acidez y final.';
  }
  if (language === 'ja') {
    return '## Normal Mode\n回答: 基準レシピを固定し、変数を一つずつ調整して甘さと後味を比較してください。';
  }
  return '## Normal Mode\nLock a baseline recipe, change one variable at a time, and compare sweetness, acidity, and finish.';
}

function deepText(): string {
  return [
    '## TL;DR',
    'Use a stable baseline recipe first, then adjust one extraction variable at a time so each change produces feedback you can trust.',
    '',
    '## Core Analysis',
    'The fastest way to improve a V60 without adding noise is to freeze the dose, ratio, filter prep, and pour height before changing grind or temperature. When multiple variables move together, the cup may improve or worsen for the wrong reason, and the next correction becomes guesswork instead of process control. A strong deep-mode answer should reduce uncertainty, connect the sensory result to extraction behavior, and leave the user with a repeatable next brew plan.',
    '',
    '## Options & Tradeoffs',
    'Option 1: grind finer to increase extraction and sweetness, but bitterness and stalled drawdown can rise if fines build up too quickly.',
    'Option 2: raise water temperature to improve solubility, but delicate florals may flatten if the coffee is already highly developed or brittle.',
    'Option 3: keep grind stable and tighten pour structure, which is slower to learn but usually creates the most reliable improvement path.',
    '',
    '## Recommended Action Plan',
    '1. Run one control brew with your current ratio, kettle flow, and bloom so you have a clean baseline for comparison.',
    '2. Adjust only grind one step finer, then compare sweetness, acidity, and drawdown against the baseline in the same tasting window.',
    '3. If bitterness climbs faster than sweetness, return to the baseline grind and reduce agitation while keeping total contact time similar.',
    '',
    '## Risks & Validation',
    'Validate the conclusion with at least two repeat brews and record drawdown time, slurry behavior, and final cup notes. If the result still swings cup to cup, inspect grinder retention, pour consistency, and filter seating before making another recipe change.',
    '',
    '## Sources',
    '- [QA E2E Brew Source](https://example.com/qa-e2e-brew)',
    '- [QA E2E Chat Source](https://example.org/qa-e2e-chat)',
  ].join('\n');
}

export function buildE2eMockChatText(language?: string): string {
  return chatTextForLanguage(normalizeLanguage(language));
}

export function buildE2eMockAiPayload(action: string, language?: string) {
  const normalizedLanguage = normalizeLanguage(language);
  const provider = E2E_MOCK_PROVIDER;
  const model = E2E_MOCK_MODEL;

  switch (action) {
    case 'search':
      return {
        ok: true,
        action,
        text: '## Search Result\n- Stable brew baseline\n- One-variable adjustments\n- QA E2E sources available',
        chunks: E2E_MOCK_SOURCES.map((source) => ({ web: { uri: source.uri, title: source.title } })),
        sources: E2E_MOCK_SOURCES,
        sourceCount: E2E_MOCK_SOURCES.length,
        provider,
        model,
      };
    case 'fast':
      return {
        ok: true,
        action,
        text: fastTextForLanguage(normalizedLanguage),
        provider,
        model,
        degraded: false,
      };
    case 'balanced':
      return {
        ok: true,
        action,
        text: balancedTextForLanguage(normalizedLanguage),
        provider,
        model,
        degraded: false,
      };
    case 'deep_think':
      return {
        ok: true,
        action,
        text: deepText(),
        provider,
        model,
        degraded: false,
        details: undefined,
        chunks: E2E_MOCK_SOURCES.map((source) => ({ web: { uri: source.uri, title: source.title } })),
        sources: E2E_MOCK_SOURCES,
        sourceCount: E2E_MOCK_SOURCES.length,
        deepMeta: {
          mode: 'deep' as const,
          grounded: true,
          degraded: false,
          fallbackUsed: false,
          qualityPass: true,
          latencyMs: 15,
          sourceCount: E2E_MOCK_SOURCES.length,
        },
      };
    case 'generate_image':
    case 'edit_latte_art':
      return {
        ok: true,
        action,
        imageDataUrl: E2E_MOCK_IMAGE_DATA_URL,
        provider,
        model,
      };
    case 'generate_speech':
    case 'transcribe':
      return {
        ok: true,
        action,
        text: 'Mock transcription for QA E2E validation.',
        audioDataUrl: 'data:audio/wav;base64,ZmFrZQ==',
        provider,
        model,
      };
    case 'analyze_text':
    case 'analyze_image':
    case 'analyze_attachment':
      return {
        ok: true,
        action,
        text: '## Mock Analysis\n- QA E2E path validated.\n- Attachment and analysis routing stayed operational.',
        provider,
        model,
      };
    default:
      return {
        ok: true,
        action,
        text: 'Mock QA E2E response completed successfully.',
        provider,
        model,
      };
  }
}
