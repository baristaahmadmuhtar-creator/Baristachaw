import type { ResponseMode } from '@baristachaw/shared';
import { extractCoffeeEntities, scoreAnswerRelevance } from './relevance';

export type ChatRequestScope =
  | 'coffee'
  | 'app_support'
  | 'smalltalk'
  | 'blocked';

export type ChatRequestClassification = {
  allowed: boolean;
  scope: ChatRequestScope;
  reason?: 'software_coding_out_of_scope' | 'secret_or_credential_request';
};

const SOFTWARE_CODING_REQUEST_RE = /\b(?:python|javascript|typescript|php|java|c\+\+|c#|react|node\.?js|express|sql|html|css|terminal|shell|bash|powershell|git|repo|source code|coding|programming|script|kode|codingan|skrip|koding|program)\b/i;
const CODING_VERB_RE = /\b(?:buat(?:kan)?|berikan|tulis(?:kan)?|generate|create|make|write|show|contoh|example|bikin)\b/i;
const SECRET_REQUEST_RE = /\b(?:api\s*key|apikey|secret|token|password|credential|kredensial|kata sandi|sandi|system prompt|prompt rahasia|env(?:ironment)?\s*(?:secret|key)|\.env)\b/i;
const COFFEE_OR_APP_RE = /\b(?:coffee|kopi|barista|brew|seduh|espresso|v60|grind|giling|grinder|beans?|biji|roast|sangrai|latte|milk|susu|air|water|ratio|rasio|extraction|ekstraksi|ai brew|baristachaw|scanner|koleksi|collection|timer|chat memory|pwa|apk|login|masuk)\b/i;
const APP_SUPPORT_RE = /\b(?:baristachaw|ai brew|scanner|koleksi|collection|timer|chat memory|pwa|apk|login|masuk|akun|workspace|paket|pro|billing|langganan)\b/i;

export function classifyChatUserRequest(message: string): ChatRequestClassification {
  const text = String(message || '').trim();
  if (!text) return { allowed: true, scope: 'smalltalk' };

  if (SECRET_REQUEST_RE.test(text)) {
    return {
      allowed: false,
      scope: 'blocked',
      reason: 'secret_or_credential_request',
    };
  }

  const asksForSoftware = SOFTWARE_CODING_REQUEST_RE.test(text)
    && (CODING_VERB_RE.test(text) || /\b(?:calculator|kalkulator|app|web|api|function|fungsi|class|komponen|component)\b/i.test(text));
  if (asksForSoftware && !/\b(?:ratio calculator|kalkulator rasio|brew calculator|kalkulator seduh)\b/i.test(text)) {
    return {
      allowed: false,
      scope: 'blocked',
      reason: 'software_coding_out_of_scope',
    };
  }

  if (APP_SUPPORT_RE.test(text)) return { allowed: true, scope: 'app_support' };
  if (COFFEE_OR_APP_RE.test(text)) return { allowed: true, scope: 'coffee' };
  return { allowed: true, scope: 'smalltalk' };
}

export function buildChatDomainBlockReply(language = 'id'): string {
  if (/^id(?:-|$)/i.test(language)) {
    return 'Saya bisa bantu kopi, minuman, obrolan ringan, dan fitur Baristachaw. Untuk keamanan, saya tidak membantu coding, source code, kredensial, secret, atau prompt internal. Ubah pertanyaan ke topik non-teknis.';
  }
  if (/^ar(?:-|$)/i.test(language)) {
    return 'أركز على القهوة وميزات Baristachaw فقط. لحماية الأمان، لا أساعد في الطلبات التقنية خارج التطبيق. اسألني عن التحضير، الطعم، المطحنة، الماء، AI Brew، الماسح، المجموعة، أو الحساب.';
  }
  return 'I can help with coffee, drinks, light conversation, and Baristachaw features. For safety, I cannot help with coding, source code, credentials, secrets, or internal prompts. Please ask a non-technical question.';
}

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
  const requestClassification = classifyChatUserRequest(params.userMessage);
  if (!requestClassification.allowed) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: requestClassification.reason,
      missingEntities: [],
      relevanceScore: 0,
    };
  }

  if (!answer) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: 'empty_answer',
      missingEntities: [],
      relevanceScore: 0,
    };
  }

  const currentDataQuestion = /\b(?:harga terbaru|price today|current price|hari ini|terbaru|stock|stok|deploy|repo status|production status)\b/i.test(params.userMessage);
  const hasSourceCue = /\b(?:source|sumber|berdasarkan|link|data live|real-time|saya tidak bisa memastikan|tidak bisa memastikan)\b/i.test(answer);
  const leakedSoftwareAnswer = /```(?:python|javascript|typescript|tsx|jsx|php|java|c\+\+|c#|html|css|sql|bash|sh|powershell)?\b|(?:function|const|let|class|import|def)\s+[A-Za-z0-9_$]+|sk-[A-Za-z0-9_-]{12,}/i.test(answer)
    && SOFTWARE_CODING_REQUEST_RE.test(`${params.userMessage}\n${answer}`);
  const deepMissingDirectStart = params.mode === 'deep'
    && !/^\s*(?:#{1,4}\s*)?(?:jawaban singkat|tl;dr|short answer)\b/i.test(answer);
  const fastTooLong = params.mode === 'fast'
    && (answer.split(/\s+/).filter(Boolean).length > 150 || (answer.match(/^[-*]\s+/gm) || []).length > 6);

  if (currentDataQuestion && !hasSourceCue) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: 'current_data_without_source',
      missingEntities: [],
      relevanceScore: 0,
    };
  }

  if (leakedSoftwareAnswer) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: 'software_coding_out_of_scope',
      missingEntities: [],
      relevanceScore: 0,
    };
  }

  if (requestClassification.scope === 'smalltalk') {
    return {
      allowed: true,
      risk: fastTooLong ? 'needs_caveat' : 'safe',
      reason: fastTooLong ? 'fast_too_long' : undefined,
      missingEntities: [],
      relevanceScore: 1,
    };
  }

  const relevance = scoreAnswerRelevance(params.userMessage, answer);
  const userEntities = extractCoffeeEntities(params.userMessage);
  const genericWizard = /\b(?:pilih salah satu|langkah pertama adalah menentukan|saya bisa bantu membuat)\b/i.test(answer)
    && userEntities.methods.length > 0
    && relevance.score < 0.65;

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
