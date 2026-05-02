import type { AiBrewMethodFamily } from './types.ts';

export interface AiBrewKnowledgeInput {
  coffeeName?: string;
  dripperName?: string;
  methodFamily?: AiBrewMethodFamily;
  process?: string;
  variety?: string;
}

interface AiBrewKnowledgeSeed {
  category: 'origin' | 'hardware';
  keyword: string;
  aliases: string[];
  content: string;
  priority: number;
}

// Seeded from the operator knowledge workbook.
// Keep this small and auditable until the admin knowledge catalog is wired to Supabase.
const AI_BREW_KNOWLEDGE_SEEDS: AiBrewKnowledgeSeed[] = [
  {
    category: 'origin',
    keyword: 'Gayo',
    aliases: ['gayo', 'sumatra gayo', 'aceh gayo'],
    content:
      'Knowledge v1 - Gayo: body cenderung tebal dengan aroma rempah yang kuat; jaga ekstraksi cukup rapi agar body tetap manis, tidak pahit, dan tidak keruh.',
    priority: 3,
  },
  {
    category: 'hardware',
    keyword: 'V60',
    aliases: ['v60', 'hario v60'],
    content:
      'Knowledge v1 - V60: gunakan tuangan spiral atau center-to-mid secara konsisten untuk ekstraksi merata; hindari mengejar dinding filter pada fase akhir.',
    priority: 4,
  },
];

function normalizeKnowledgeText(value?: string) {
  return (value || '').toLowerCase();
}

function buildKnowledgeHaystack(input: AiBrewKnowledgeInput) {
  return [
    input.coffeeName,
    input.dripperName,
    input.methodFamily,
    input.process,
    input.variety,
  ]
    .map(normalizeKnowledgeText)
    .join(' ');
}

export function resolveAiBrewKnowledgeNotes(input: AiBrewKnowledgeInput) {
  const haystack = buildKnowledgeHaystack(input);
  if (!haystack.trim()) return [] as string[];

  return AI_BREW_KNOWLEDGE_SEEDS
    .filter((seed) => seed.aliases.some((alias) => haystack.includes(alias)))
    .sort((left, right) => right.priority - left.priority)
    .map((seed) => seed.content);
}

export function formatAiBrewKnowledgeContext(input: AiBrewKnowledgeInput) {
  const notes = resolveAiBrewKnowledgeNotes(input);
  return notes.length > 0 ? notes.join(' | ') : 'none';
}
