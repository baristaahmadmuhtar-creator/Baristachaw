import type { ResponseMode } from '@baristachaw/shared';
import { extractCoffeeEntities, scoreAnswerRelevance } from './relevance';

export function guardChatAnswer(params: {
  userMessage: string;
  answer: string;
  mode: ResponseMode;
}): {
  allowed: boolean;
  risk: 'safe' | 'needs_caveat' | 'irrelevant' | 'blocked';
  reason?: string;
  missingEntities?: string[];
  relevanceScore: number;
} {
  const answer = String(params.answer || '').trim();
  if (!answer) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: 'empty_answer',
      missingEntities: [],
      relevanceScore: 0,
    };
  }

  const relevance = scoreAnswerRelevance(params.userMessage, answer);
  const userEntities = extractCoffeeEntities(params.userMessage);
  const currentDataQuestion = /\b(?:harga terbaru|price today|current price|hari ini|terbaru|stock|stok|deploy|repo status|production status)\b/i.test(params.userMessage);
  const hasSourceCue = /\b(?:source|sumber|berdasarkan|link|data live|real-time|saya tidak bisa memastikan|tidak bisa memastikan)\b/i.test(answer);
  const genericWizard = /\b(?:pilih salah satu|langkah pertama adalah menentukan|saya bisa bantu membuat)\b/i.test(answer)
    && userEntities.methods.length > 0
    && relevance.score < 0.65;
  const deepMissingDirectStart = params.mode === 'deep'
    && !/^\s*(?:#{1,4}\s*)?(?:jawaban singkat|tl;dr|short answer)\b/i.test(answer);
  const fastTooLong = params.mode === 'fast'
    && (answer.split(/\s+/).filter(Boolean).length > 150 || (answer.match(/^[-*]\s+/gm) || []).length > 6);

  if (currentDataQuestion && !hasSourceCue) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: 'current_data_without_source',
      missingEntities: relevance.missingRequiredEntities,
      relevanceScore: relevance.score,
    };
  }

  if (relevance.risk === 'high' || genericWizard || deepMissingDirectStart) {
    return {
      allowed: false,
      risk: 'irrelevant',
      reason: deepMissingDirectStart ? 'deep_missing_direct_start' : genericWizard ? 'generic_wizard' : 'missing_required_entities',
      missingEntities: relevance.missingRequiredEntities,
      relevanceScore: relevance.score,
    };
  }

  if (fastTooLong || relevance.risk === 'medium') {
    return {
      allowed: true,
      risk: 'needs_caveat',
      reason: fastTooLong ? 'fast_too_long' : 'low_relevance_margin',
      missingEntities: relevance.missingRequiredEntities,
      relevanceScore: relevance.score,
    };
  }

  return {
    allowed: true,
    risk: 'safe',
    missingEntities: relevance.missingRequiredEntities,
    relevanceScore: relevance.score,
  };
}
