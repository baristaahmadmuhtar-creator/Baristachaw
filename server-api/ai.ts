import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CHAT_INPUT_MAX_CHARS,
  STRUCTURED_AI_PROMPT_MAX_CHARS,
  type AgentProfileMemory,
  type AiAction,
  type ResponseProfile,
  type StructuredSearchSource,
} from './_contracts.js';
import {
  type AgentProfileInput,
  buildTaskAlignmentRepairPrompt,
  buildOrchestratedPrompt,
  buildResponseOrchestration,
  evaluateResponseTaskAlignment,
  type ConversationContextInput,
  type ResolvedResponseProfile,
  type ResponseMode,
} from './_orchestration.js';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  classifyProviderError,
  createApiError,
  createRequestId,
  enforceTrustedRequestOrigin,
  isE2eMockRequest,
  isEnvFlagEnabled,
  isApiOperationalError,
  parseClientContext,
  parseConversationContext,
  parseAgentProfile,
  parseResponseProfile,
  requireAuth,
  sanitizeErrorDetails,
} from './_shared.js';
import {
  buildE2eMockAiPayload,
  E2E_MOCK_MODEL,
  E2E_MOCK_PROVIDER,
} from './_e2eMock.js';
import { requirePaidAiAccess, type PaidAiFeature } from './account/aiAccess.js';
import {
  aiProviderDisabledMessage,
  getAiProviderKeys,
  getEnabledAiProviderConfigs,
  isAiProviderAvailable,
  parseAiProviderId,
  estimateAiTokenCount,
  recordAiProviderFailure,
  recordAiProviderUsage,
  registerAiProviderResult,
} from './_aiProviderControl.js';

type StructuredAiAction = AiAction;

const keyCounters: Record<string, number> = {};

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]);

const FALLBACK_MESSAGE = 'Sorry, I could not process your request right now. Please try again.';
export const VERCEL_JSON_BODY_SOFT_LIMIT_BYTES = 4_250_000;
export const INLINE_ATTACHMENT_MAX_BYTES = 2_500_000;
export const INLINE_ATTACHMENT_MAX_BASE64_CHARS = Math.ceil(INLINE_ATTACHMENT_MAX_BYTES / 3) * 4;
const GEMINI_TEXT_PROVIDER_TIMEOUT_MS = 24_000;
const GEMINI_DEEP_PROVIDER_TIMEOUT_MS = 45_000;
const GEMINI_DEEP_REPAIR_TIMEOUT_MS = 32_000;
const CHAT_PROXY_DEEP_TIMEOUT_MS = 45_000;
const VISION_PROVIDER_TIMEOUT_MS = 45_000;
const JSON_HEARTBEAT_INTERVAL_MS = 8_000;
const ATTACHMENT_URL_FETCH_TIMEOUT_MS = 10_000;

function aiUsageFeatureFromContext(feature: string, surface?: string): 'ai_brew' | 'ai_chat' | 'ai_search' | 'scanner' | 'vision' | 'unknown' {
  const normalizedFeature = String(feature || '').trim().toLowerCase();
  const normalizedSurface = String(surface || '').trim().toLowerCase();
  if (normalizedFeature === 'ai_brew' || normalizedFeature === 'brew' || normalizedSurface === 'tools') return 'ai_brew';
  if (normalizedFeature === 'search' || normalizedFeature === 'ai_search' || normalizedSurface === 'home') return 'ai_search';
  if (normalizedFeature === 'scanner') return 'scanner';
  if (normalizedFeature === 'vision' || normalizedFeature === 'image') return 'vision';
  if (normalizedFeature === 'chat' || normalizedFeature === 'ai_chat' || normalizedSurface === 'chat') return 'ai_chat';
  return 'unknown';
}
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']);
const AI_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 5,
  burstWindowMs: 10 * 1000,
} as const;

const MAX_TEXT_RESPONSE_CHARS = 18000;
const SEARCH_MIN_SOURCES = 2;
const SEARCH_MIN_UNIQUE_DOMAINS = 2;
const SEARCH_MIN_AUTHORITY_SCORE = 2;
const SEARCH_MIN_AUTHORITY_SCORE_TIME_SENSITIVE = 3;
const DEEP_MIN_WORDS = 120;
const DEEP_MIN_SECTION_COUNT = 4;
const DEEP_MIN_ACTION_STEPS = 3;
const DEEP_FALLBACK_MAX_TOKENS = 1200;

const DEEP_SECTION_TLDR = /(^|\n)##\s*TL;DR\s*$/im;
const DEEP_SECTION_CORE_ANALYSIS = /(^|\n)##\s*Core Analysis\s*$/im;
const DEEP_SECTION_OPTIONS = /(^|\n)##\s*Options\s*&\s*Tradeoffs\s*$/im;
const DEEP_SECTION_ACTION_PLAN = /(^|\n)##\s*Recommended Action Plan\s*$/im;
const DEEP_SECTION_RISKS = /(^|\n)##\s*Risks\s*&\s*Validation\s*$/im;

const DEEP_TEMPORAL_KEYWORDS = [
  'latest',
  'today',
  'yesterday',
  'tomorrow',
  'current',
  'now',
  'update',
  'news',
  'price',
  'pricing',
  'release',
  'version',
  'realtime',
  'real-time',
  'breaking',
  'terbaru',
  'hari ini',
  'kemarin',
  'besok',
  'terkini',
  'update',
  'pembaruan',
  'berita',
  'harga',
  'rilis',
  'versi',
  'real time',
  'waktu nyata',
];

const DEEP_SOURCE_INTENT_KEYWORDS = [
  'source',
  'sources',
  'reference',
  'references',
  'citation',
  'citations',
  'link',
  'links',
  'url',
  'sumber',
  'referensi',
  'tautan',
];

const SEARCH_PRIMARY_SOURCE_HINTS = /(docs?|support|help|developer|developers|api|reference|manual|research|official|newsroom|press|release|releases)/i;
const SEARCH_HIGH_AUTHORITY_HOST_HINTS = /(^|\.)(docs|support|help|developer|developers|api)\./i;
const SEARCH_HIGH_AUTHORITY_PATH_HINTS = /(^|\/)(docs?|support|help|developer|developers|api|reference|manual)(\/|$)/i;
const SEARCH_HIGH_AUTHORITY_DOMAIN_PATTERNS = [
  /\.gov$/i,
  /\.edu$/i,
  /\.mil$/i,
  /(^|\.)who\.int$/i,
  /(^|\.)europa\.eu$/i,
  /(^|\.)un\.org$/i,
  /(^|\.)iso\.org$/i,
];
const SEARCH_REPUTABLE_NEWS_DOMAIN_PATTERNS = [
  /(^|\.)reuters\.com$/i,
  /(^|\.)apnews\.com$/i,
  /(^|\.)bloomberg\.com$/i,
  /(^|\.)ft\.com$/i,
  /(^|\.)wsj\.com$/i,
  /(^|\.)nytimes\.com$/i,
  /(^|\.)theverge\.com$/i,
  /(^|\.)techcrunch\.com$/i,
  /(^|\.)wired\.com$/i,
  /(^|\.)cnbc\.com$/i,
];
const SEARCH_LOW_AUTHORITY_DOMAIN_PATTERNS = [
  /(^|\.)medium\.com$/i,
  /(^|\.)substack\.com$/i,
  /(^|\.)blogspot\.com$/i,
  /(^|\.)wordpress\.com$/i,
  /(^|\.)tumblr\.com$/i,
  /(^|\.)quora\.com$/i,
  /(^|\.)pinterest\.com$/i,
];
const SEARCH_USER_GENERATED_DOMAIN_PATTERNS = [
  /(^|\.)reddit\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)linkedin\.com$/i,
];

const DEEP_EXPLICIT_SHORT_KEYWORDS = [
  'singkat',
  'ringkas',
  'pendek',
  'short',
  'brief',
  'one sentence',
  'two sentences',
  'satu kalimat',
  'dua kalimat',
  '1 kalimat',
  '2 kalimat',
];

const SEARCH_DEFAULT_RESPONSE_PROFILE: Required<Pick<ResponseProfile, 'verbosity' | 'format' | 'tone' | 'ambiguityPolicy'>> = {
  verbosity: 'comprehensive',
  format: 'steps',
  tone: 'professional',
  ambiguityPolicy: 'assume',
};

const DEFAULT_MODE_PROFILES: Record<ResponseMode, ResolvedResponseProfile> = {
  fast: {
    language: 'en',
    expectation: {
      verbosity: 'short',
      format: 'bullets',
      domainDepth: 'basic',
      tone: 'neutral',
      ambiguityRisk: 'low',
      ambiguityPolicy: 'assume',
    },
  },
  normal: {
    language: 'en',
    expectation: {
      verbosity: 'balanced',
      format: 'plain',
      domainDepth: 'basic',
      tone: 'neutral',
      ambiguityRisk: 'low',
      ambiguityPolicy: 'assume',
    },
  },
  deep: {
    language: 'en',
    expectation: {
      verbosity: 'comprehensive',
      format: 'steps',
      domainDepth: 'advanced',
      tone: 'professional',
      ambiguityRisk: 'low',
      ambiguityPolicy: 'ask_first',
    },
  },
};

function actionToResponseMode(action: StructuredAiAction): ResponseMode {
  if (action === 'fast') return 'fast';
  if (action === 'deep_think') return 'deep';
  return 'normal';
}

function hasBalancedCodeFences(text: string): boolean {
  const matches = text.match(/```/g);
  return (matches?.length || 0) % 2 === 0;
}

function hasSemanticContent(text: string): boolean {
  return text.replace(/[^\p{L}\p{N}]+/gu, '').length >= 8;
}

function isLikelyUtf8Clean(text: string): boolean {
  return !text.includes('\uFFFD');
}

function countWords(text: string): number {
  return (String(text || '').match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;
}

function looksLikelyTruncated(text: string): boolean {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/[.!?ã€‚ï¼ï¼Ÿ:)]$/.test(value)) return false;
  if (/```$/.test(value)) return false;
  if (/\n\s*[-*]\s*$/.test(value)) return true;
  if (/\n\s*\d+\.\s*$/.test(value)) return true;
  if (/[,:;(\-â€“â€”/]$/.test(value)) return true;
  if (/\b(?:and|or|because|karena|dan|atau|dengan|untuk)\s*$/i.test(value)) return true;
  return value.length >= 80;
}

function hasExplicitShortRequest(prompt: string): boolean {
  const value = String(prompt || '').toLowerCase();
  if (!value) return false;
  if (DEEP_EXPLICIT_SHORT_KEYWORDS.some(keyword => value.includes(keyword))) return true;
  return /(max(?:imum)?\s*\d+\s*(?:kata|words))/i.test(value)
    || /(under\s*\d+\s*words)/i.test(value)
    || /(\d+\s*(?:kata|words)\s*max)/i.test(value);
}

function sectionText(text: string, headingPattern: RegExp): string {
  const value = String(text || '');
  const match = headingPattern.exec(value);
  if (!match || typeof match.index !== 'number') return '';
  const start = match.index + match[0].length;
  const nextHeadingMatch = /(^|\n)##\s+\S+/g.exec(value.slice(start));
  const end = nextHeadingMatch && typeof nextHeadingMatch.index === 'number'
    ? start + nextHeadingMatch.index
    : value.length;
  return value.slice(start, end).trim();
}

type DeepQualityEvaluation = {
  pass: boolean;
  issues: string[];
  sectionCount: number;
  wordCount: number;
  shortByUserRequest: boolean;
};

export function evaluateDeepQualityGate(text: string, originalPrompt: string): DeepQualityEvaluation {
  const value = String(text || '').trim();
  const issues: string[] = [];
  const hasTldr = DEEP_SECTION_TLDR.test(value);
  const hasCore = DEEP_SECTION_CORE_ANALYSIS.test(value);
  const hasOptions = DEEP_SECTION_OPTIONS.test(value);
  const hasPlan = DEEP_SECTION_ACTION_PLAN.test(value);
  const hasRisks = DEEP_SECTION_RISKS.test(value);
  const sectionCount = [hasTldr, hasCore, hasOptions, hasPlan, hasRisks].filter(Boolean).length;
  const wordCount = countWords(value);
  const shortByUserRequest = hasExplicitShortRequest(originalPrompt) && wordCount < DEEP_MIN_WORDS;

  if (sectionCount < DEEP_MIN_SECTION_COUNT) issues.push('deep_sections_missing');
  if (!hasOptions) issues.push('deep_options_tradeoffs_missing');

  const actionPlan = sectionText(value, DEEP_SECTION_ACTION_PLAN);
  const actionSteps = (actionPlan.match(/(^|\n)\s*\d+\.\s+\S+/g) || []).length;
  if (actionSteps < DEEP_MIN_ACTION_STEPS) issues.push('deep_action_plan_steps_lt3');

  if (wordCount < DEEP_MIN_WORDS) {
    if (shortByUserRequest) issues.push('short_by_user_request');
    else issues.push('deep_too_short');
  }

  const blockingIssues = issues.filter(issue => issue !== 'short_by_user_request');
  return {
    pass: blockingIssues.length === 0,
    issues,
    sectionCount,
    wordCount,
    shortByUserRequest,
  };
}

export function shouldUseDeepGrounding(prompt: string): boolean {
  const value = String(prompt || '').toLowerCase();
  if (!value) return false;
  const temporal = DEEP_TEMPORAL_KEYWORDS.some(keyword => value.includes(keyword));
  const sourceIntent = DEEP_SOURCE_INTENT_KEYWORDS.some(keyword => value.includes(keyword));
  return temporal || sourceIntent;
}

export function buildDeepTemplatePrompt(promptForModel: string, options?: { grounded?: boolean }): string {
  const grounded = Boolean(options?.grounded);
  return [
    'You are Baristachaw in Deep mode.',
    'Deliver a high-quality, deeply reasoned answer with minimal user mental effort.',
    'Always keep the response practical and decision-oriented.',
    'Output MUST use this exact section order and headings:',
    '## TL;DR',
    '## Core Analysis',
    '## Options & Tradeoffs',
    '## Recommended Action Plan',
    '## Risks & Validation',
    grounded ? '## Sources' : '(Do not include a Sources section unless grounded evidence is available.)',
    '',
    'Hard requirements:',
    '- Include at least 4 section headings from the template.',
    '- Include explicit options and tradeoffs.',
    '- Recommended Action Plan must have at least 3 numbered steps.',
    '- Target at least 120 words unless user explicitly asked for a very short answer.',
    '- Keep the user language and keep the original meaning.',
    '- Respect any AI chat flow contract, recipe/troubleshooting template, and App tool routing included in the user request.',
    grounded
      ? '- Use grounding evidence from live web search and provide 2-5 source links in ## Sources.'
      : '- If web grounding is not available, do not fabricate citations.',
    '',
    `User request: ${promptForModel}`,
  ].join('\n');
}

function sanitizeModelText(text: string): string {
  let next = String(text || '').replace(/\uFFFD/g, '').trim();
  if (!next) return '';
  if (!hasBalancedCodeFences(next)) next = `${next}\n\`\`\``;
  if (next.length > MAX_TEXT_RESPONSE_CHARS) next = next.slice(0, MAX_TEXT_RESPONSE_CHARS).trimEnd();
  return next;
}

function evaluateIntegrity(text: string, mode: ResponseMode, originalPrompt = ''): {
  ok: boolean;
  deepQualityPass: boolean;
  issues: string[];
  deepQuality?: DeepQualityEvaluation;
} {
  const issues: string[] = [];
  if (!text.trim()) issues.push('empty');
  if (!hasSemanticContent(text)) issues.push('semantic_empty');
  if (!isLikelyUtf8Clean(text)) issues.push('utf8_corrupt');
  if (!hasBalancedCodeFences(text)) issues.push('markdown_unbalanced');
  if (looksLikelyTruncated(text)) issues.push('likely_truncated');
  if (text.length > MAX_TEXT_RESPONSE_CHARS) issues.push('truncated_by_guard');
  const deepQuality = mode === 'deep' ? evaluateDeepQualityGate(text, originalPrompt) : undefined;
  const deepQualityPass = mode !== 'deep' || Boolean(deepQuality?.pass);
  if (mode === 'deep' && deepQuality) {
    for (const issue of deepQuality.issues) {
      if (!issues.includes(issue)) issues.push(issue);
    }
  }
  const blockingIssues = issues.filter(issue => issue !== 'short_by_user_request');
  return { ok: blockingIssues.length === 0, deepQualityPass, issues, deepQuality };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeSourceUri(rawUri: unknown): string | null {
  if (typeof rawUri !== 'string') return null;
  const trimmed = rawUri.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function toDomain(uri: string): string | undefined {
  try {
    const host = new URL(uri).hostname.replace(/^www\./, '').trim();
    return host || undefined;
  } catch {
    return undefined;
  }
}

export function normalizeSearchSources(chunks: unknown[]): StructuredSearchSource[] {
  if (!Array.isArray(chunks)) return [];
  const sources: StructuredSearchSource[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    if (!isRecord(chunk) || !isRecord(chunk.web)) continue;
    const uri = normalizeSourceUri(chunk.web.uri);
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const title = typeof chunk.web.title === 'string' ? chunk.web.title.trim().slice(0, 220) : '';
    sources.push({
      uri,
      title: title || undefined,
      domain: toDomain(uri),
    });
  }
  return sources;
}

export function scoreSearchSourceAuthority(source: StructuredSearchSource): number {
  const domain = String(source.domain || toDomain(source.uri) || '').toLowerCase();
  const title = String(source.title || '').toLowerCase();
  let pathname = '';
  try {
    pathname = new URL(source.uri).pathname.toLowerCase();
  } catch {
    pathname = '';
  }

  let score = 0;
  if (pathname && pathname !== '/') score += 1;
  if (
    SEARCH_PRIMARY_SOURCE_HINTS.test(domain)
    || SEARCH_PRIMARY_SOURCE_HINTS.test(pathname)
    || SEARCH_PRIMARY_SOURCE_HINTS.test(title)
  ) {
    score += 1;
  }
  if (SEARCH_HIGH_AUTHORITY_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))) score += 2;
  if (SEARCH_REPUTABLE_NEWS_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))) score += 2;
  if (SEARCH_LOW_AUTHORITY_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))) score -= 1;
  if (SEARCH_USER_GENERATED_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))) score -= 2;

  return Math.max(-2, Math.min(4, score));
}

function isHighAuthoritySearchSource(source: StructuredSearchSource): boolean {
  const domain = String(source.domain || toDomain(source.uri) || '').toLowerCase();
  let pathname = '';
  try {
    pathname = new URL(source.uri).pathname.toLowerCase();
  } catch {
    pathname = '';
  }

  return SEARCH_HIGH_AUTHORITY_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))
    || SEARCH_REPUTABLE_NEWS_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))
    || SEARCH_HIGH_AUTHORITY_HOST_HINTS.test(domain)
    || SEARCH_HIGH_AUTHORITY_PATH_HINTS.test(pathname);
}

export function rankSearchSources(sources: StructuredSearchSource[]): StructuredSearchSource[] {
  return [...sources].sort((left, right) => {
    const scoreDelta = scoreSearchSourceAuthority(right) - scoreSearchSourceAuthority(left);
    if (scoreDelta !== 0) return scoreDelta;

    const domainDelta = String(left.domain || '').localeCompare(String(right.domain || ''));
    if (domainDelta !== 0) return domainDelta;

    return left.uri.localeCompare(right.uri);
  });
}

type SearchGroundingDetails =
  | 'insufficient_source_count'
  | 'insufficient_domain_diversity'
  | 'low_authority_sources'
  | 'missing_high_authority_source';

type SearchGroundingEvaluation = {
  ok: boolean;
  reason?: 'empty_text' | 'insufficient_sources';
  details?: SearchGroundingDetails;
  sourceCount: number;
  uniqueDomainCount: number;
  authorityScore: number;
  highAuthoritySourceCount: number;
  freshnessSensitive: boolean;
};

export function evaluateSearchGrounding(
  text: string,
  sources: StructuredSearchSource[],
  options: number | { minSources?: number; prompt?: string } = SEARCH_MIN_SOURCES,
): SearchGroundingEvaluation {
  const minSources = typeof options === 'number' ? options : options.minSources ?? SEARCH_MIN_SOURCES;
  const prompt = typeof options === 'number' ? '' : String(options.prompt || '');
  const freshnessSensitive = shouldUseDeepGrounding(prompt);
  const rankedSources = rankSearchSources(sources);
  const uniqueDomains = new Set(
    rankedSources
      .map(source => String(source.domain || toDomain(source.uri) || '').toLowerCase())
      .filter(Boolean),
  );
  const authorityScores = rankedSources.map(scoreSearchSourceAuthority);
  const authorityScore = authorityScores.reduce((sum, score) => sum + Math.max(0, score), 0);
  const highAuthoritySourceCount = rankedSources.filter(isHighAuthoritySearchSource).length;

  if (!String(text || '').trim()) {
    return {
      ok: false,
      reason: 'empty_text',
      sourceCount: rankedSources.length,
      uniqueDomainCount: uniqueDomains.size,
      authorityScore,
      highAuthoritySourceCount,
      freshnessSensitive,
    };
  }
  if (rankedSources.length < minSources) {
    return {
      ok: false,
      reason: 'insufficient_sources',
      details: 'insufficient_source_count',
      sourceCount: rankedSources.length,
      uniqueDomainCount: uniqueDomains.size,
      authorityScore,
      highAuthoritySourceCount,
      freshnessSensitive,
    };
  }

  if (uniqueDomains.size < Math.min(SEARCH_MIN_UNIQUE_DOMAINS, minSources)) {
    return {
      ok: false,
      reason: 'insufficient_sources',
      details: 'insufficient_domain_diversity',
      sourceCount: rankedSources.length,
      uniqueDomainCount: uniqueDomains.size,
      authorityScore,
      highAuthoritySourceCount,
      freshnessSensitive,
    };
  }

  const minimumAuthorityScore = freshnessSensitive
    ? SEARCH_MIN_AUTHORITY_SCORE_TIME_SENSITIVE
    : SEARCH_MIN_AUTHORITY_SCORE;
  if (authorityScore < minimumAuthorityScore) {
    return {
      ok: false,
      reason: 'insufficient_sources',
      details: 'low_authority_sources',
      sourceCount: rankedSources.length,
      uniqueDomainCount: uniqueDomains.size,
      authorityScore,
      highAuthoritySourceCount,
      freshnessSensitive,
    };
  }

  if (freshnessSensitive && highAuthoritySourceCount < 1) {
    return {
      ok: false,
      reason: 'insufficient_sources',
      details: 'missing_high_authority_source',
      sourceCount: rankedSources.length,
      uniqueDomainCount: uniqueDomains.size,
      authorityScore,
      highAuthoritySourceCount,
      freshnessSensitive,
    };
  }
  return {
    ok: true,
    sourceCount: rankedSources.length,
    uniqueDomainCount: uniqueDomains.size,
    authorityScore,
    highAuthoritySourceCount,
    freshnessSensitive,
  };
}

export function getDefaultSearchResponseProfile(): ResponseProfile {
  return { ...SEARCH_DEFAULT_RESPONSE_PROFILE };
}

function withSearchDefaults(
  responseProfile?: ReturnType<typeof parseResponseProfile>,
): ReturnType<typeof parseResponseProfile> {
  return {
    ...SEARCH_DEFAULT_RESPONSE_PROFILE,
    ...(responseProfile || {}),
  };
}

export function buildWebSearchPrompt(promptForModel: string): string {
  return [
    'You are a real-time web research AI assistant.',
    'Use live web search results and grounding evidence from the internet.',
    'Goal: deliver an accurate, up-to-date, practical answer with low user mental effort.',
    'Response requirements:',
    '- Use concise markdown headings and numbered steps.',
    '- Synthesize findings, do not just list links.',
    '- Base every material claim only on grounded live evidence. If evidence is weak, say so instead of guessing.',
    '- Use at least 2 unique domains and prefer primary or official sources whenever available.',
    '- Prioritize sources from the last 12 months for time-sensitive topics.',
    '- For historical/reference topics, use the most authoritative sources even if older.',
    '- If claims conflict, state uncertainty briefly and note the stronger source.',
    '- Do not ask clarifying questions unless absolutely necessary.',
    '',
    `User request: ${promptForModel}`,
  ].join('\n');
}

function buildWebSearchRecoveryPrompt(promptForModel: string, quality: SearchGroundingEvaluation): string {
  const recoveryDirectives: string[] = [];
  if (quality.details === 'insufficient_domain_diversity') {
    recoveryDirectives.push('- Deliberately diversify the evidence across different domains.');
  }
  if (quality.details === 'low_authority_sources' || quality.details === 'missing_high_authority_source') {
    recoveryDirectives.push('- Include at least one stronger primary or authoritative source when one exists.');
  }

  return [
    'You are retrying a live web search because the first grounded answer did not meet source quality requirements.',
    'Search goals:',
    '- Use at least 2 unique domains.',
    '- Prefer official documentation, vendor help centers, government, education, standards bodies, or major news outlets.',
    '- Avoid duplicate domains, user-generated content, and thin SEO articles unless no stronger evidence exists.',
    '- If evidence is still weak, state that clearly instead of guessing.',
    '- Use concise markdown headings and numbered steps.',
    ...recoveryDirectives,
    '',
    `User request: ${promptForModel}`,
  ].join('\n');
}

type PromptOrchestrationResult = {
  prompt: string;
  resolved: ResolvedResponseProfile;
  mode: ResponseMode;
  enforced: boolean;
};

type OpenAiCompatProvider = 'GROQ' | 'DEEPSEEK' | 'MISTRAL' | 'OPENAI' | 'OPENROUTER';
type StructuredFallbackProvider = OpenAiCompatProvider | 'LOCAL' | 'CHAT_PROXY';

interface OpenAiCompatConfig {
  provider: OpenAiCompatProvider;
  url: string;
  model: string;
  timeoutMs: number;
}

type OpenAiImageOutputFormat = 'png' | 'jpeg' | 'webp';
type OpenAiImageQuality = 'low' | 'medium' | 'high' | 'auto';
type OpenAiImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
type OpenAiImageInputFidelity = 'low' | 'high';

type OpenAiImageEditConfig = {
  model: string;
  quality: OpenAiImageQuality;
  size: OpenAiImageSize;
  outputFormat: OpenAiImageOutputFormat;
  outputCompression: number;
  inputFidelity: OpenAiImageInputFidelity;
};

const OPENAI_COMPAT_FALLBACKS: OpenAiCompatConfig[] = [
  {
    provider: 'GROQ',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    timeoutMs: 15000,
  },
  {
    provider: 'DEEPSEEK',
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    timeoutMs: 15000,
  },
  {
    provider: 'MISTRAL',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    timeoutMs: 15000,
  },
  {
    provider: 'OPENROUTER',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    timeoutMs: 15000,
  },
  {
    provider: 'OPENAI',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    timeoutMs: 15000,
  },
];

const BREW_SEQUENCE_PROVIDER_CHAIN: OpenAiCompatConfig[] = [
  {
    provider: 'GROQ',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    timeoutMs: 4200,
  },
  {
    provider: 'DEEPSEEK',
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    timeoutMs: 4200,
  },
  {
    provider: 'MISTRAL',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    timeoutMs: 5200,
  },
  {
    provider: 'OPENROUTER',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    timeoutMs: 5200,
  },
];

const BREW_OPTIMIZE_PROVIDER_CHAIN: OpenAiCompatConfig[] = [
  {
    provider: 'GROQ',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    timeoutMs: 3800,
  },
  {
    provider: 'DEEPSEEK',
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    timeoutMs: 4200,
  },
  {
    provider: 'MISTRAL',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    timeoutMs: 4800,
  },
  {
    provider: 'OPENROUTER',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    timeoutMs: 4800,
  },
];

const OPENAI_IMAGE_EDIT_URL = 'https://api.openai.com/v1/images/edits';
const OPENAI_IMAGE_EDIT_DEFAULTS: OpenAiImageEditConfig = {
  model: (process.env.OPENAI_IMAGE_EDIT_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2').trim() || 'gpt-image-2',
  quality: 'high',
  size: 'auto',
  outputFormat: 'jpeg',
  outputCompression: 90,
  inputFidelity: 'high',
};

let geminiTextFallbackDisabledUntil = 0;

function isGeminiTextDisabled(): boolean {
  return Date.now() < geminiTextFallbackDisabledUntil;
}

function disableGeminiTextTemporarily(ms = 10 * 60 * 1000): void {
  geminiTextFallbackDisabledUntil = Date.now() + ms;
}

function getKeys(provider: string): string[] {
  const providerId = parseAiProviderId(provider);
  return providerId ? getAiProviderKeys(providerId) : [];
}

function getNextKey(provider: string): string | null {
  const keys = getKeys(provider);
  if (keys.length === 0) return null;
  const idx = (keyCounters[provider] || 0) % keys.length;
  keyCounters[provider] = idx + 1;
  return keys[idx];
}

export type InlineAttachmentPayload = {
  data: string;
  mimeType: string;
  byteLength: number;
  base64Length: number;
  source: 'base64' | 'data_url' | 'url';
};

export type InlineAttachmentNormalization =
  | { ok: true; payload: InlineAttachmentPayload }
  | { ok: false; error: string; statusCode: 400 | 413 };

type JsonHeartbeatStream = {
  end: (payload: unknown) => void;
};

function normalizeMimeType(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase().split(';')[0]?.trim() || '';
  if (normalized === 'image/jpg') return 'image/jpeg';
  return normalized;
}

export function estimateBase64DecodedBytes(base64Data: string): number {
  const data = String(base64Data || '').replace(/\s/g, '');
  if (!data) return 0;
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
}

function readContentLength(req: VercelRequest): number {
  const raw = req.headers['content-length'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function isSupportedInlineAttachmentMime(mimeType: string): boolean {
  const mime = normalizeMimeType(mimeType);
  if (!mime) return false;
  if (mime === 'application/pdf') return true;
  if (mime.startsWith('image/')) return SUPPORTED_IMAGE_MIME_TYPES.has(mime);
  return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
}

function inferMimeTypeFromUrl(url: URL): string {
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.heic')) return 'image/heic';
  if (path.endsWith('.heif')) return 'image/heif';
  if (path.endsWith('.pdf')) return 'application/pdf';
  if (path.endsWith('.mp3')) return 'audio/mpeg';
  if (path.endsWith('.m4a')) return 'audio/m4a';
  if (path.endsWith('.wav')) return 'audio/wav';
  if (path.endsWith('.mp4')) return 'video/mp4';
  if (path.endsWith('.mov')) return 'video/quicktime';
  if (path.endsWith('.webm')) return 'video/webm';
  return '';
}

function parsePublicAttachmentUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host === '::1' ||
      host === '0:0:0:0:0:0:0:1'
    ) {
      return null;
    }
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const octets = ipv4.slice(1).map(Number);
      const [a, b] = octets;
      const invalid = octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255);
      const privateAddress =
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254) ||
        a === 0;
      if (invalid || privateAddress) return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isLikelyAttachmentUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

async function fetchInlineAttachmentUrl(
  url: URL,
  rawMimeType: unknown,
  options: { expectedMimePrefix?: string; allowAnySupportedAttachment?: boolean } = {},
): Promise<InlineAttachmentNormalization> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATTACHMENT_URL_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const finalUrl = parsePublicAttachmentUrl(response.url || url.toString());
    if (!finalUrl) {
      return { ok: false, statusCode: 400, error: 'attachment URL must be public HTTPS' };
    }
    if (!response.ok) {
      return { ok: false, statusCode: 400, error: `attachment URL fetch failed with HTTP ${response.status}` };
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') || '', 10);
    if (Number.isFinite(contentLength) && contentLength > INLINE_ATTACHMENT_MAX_BYTES) {
      return {
        ok: false,
        statusCode: 413,
        error: 'attachment payload too large for inline AI analysis (max 2.5MB decoded)',
      };
    }

    const mimeType =
      normalizeMimeType(rawMimeType) ||
      normalizeMimeType(response.headers.get('content-type')) ||
      inferMimeTypeFromUrl(finalUrl);

    if (!mimeType) {
      return { ok: false, statusCode: 400, error: 'attachment URL response is missing a supported mimeType' };
    }
    if (options.expectedMimePrefix && !mimeType.startsWith(options.expectedMimePrefix)) {
      return { ok: false, statusCode: 400, error: `attachment mimeType must be ${options.expectedMimePrefix}*` };
    }
    if (options.allowAnySupportedAttachment && !isSupportedInlineAttachmentMime(mimeType)) {
      return { ok: false, statusCode: 400, error: 'Unsupported mimeType for inline attachment analysis' };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return { ok: false, statusCode: 400, error: 'attachment URL returned an empty payload' };
    }
    if (buffer.length > INLINE_ATTACHMENT_MAX_BYTES) {
      return {
        ok: false,
        statusCode: 413,
        error: 'attachment payload too large for inline AI analysis (max 2.5MB decoded)',
      };
    }

    const data = buffer.toString('base64');
    return {
      ok: true,
      payload: {
        data,
        mimeType,
        byteLength: buffer.length,
        base64Length: data.length,
        source: 'url',
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      statusCode: 400,
      error: aborted ? 'attachment URL fetch timed out' : 'attachment URL could not be fetched',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeInlineAttachmentPayload(
  rawData: unknown,
  rawMimeType: unknown,
  options: { expectedMimePrefix?: string; allowAnySupportedAttachment?: boolean } = {},
): InlineAttachmentNormalization {
  if (typeof rawData !== 'string' || !rawData.trim()) {
    return { ok: false, statusCode: 400, error: 'attachment payload must be a non-empty base64 string' };
  }

  const input = rawData.trim();
  const dataUrlMatch = input.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/is);
  const source = dataUrlMatch ? 'data_url' : 'base64';
  const dataUrlMime = dataUrlMatch ? normalizeMimeType(dataUrlMatch[1]) : '';
  const mimeType = normalizeMimeType(rawMimeType) || dataUrlMime;
  let data = dataUrlMatch ? dataUrlMatch[2] : input;

  data = data.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const remainder = data.length % 4;
  if (remainder === 1) {
    return { ok: false, statusCode: 400, error: 'attachment base64 payload is malformed' };
  }
  if (remainder > 0) {
    data = `${data}${'='.repeat(4 - remainder)}`;
  }

  if (!mimeType || !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(mimeType)) {
    return { ok: false, statusCode: 400, error: 'attachment mimeType is required and must be valid' };
  }
  if (options.expectedMimePrefix && !mimeType.startsWith(options.expectedMimePrefix)) {
    return { ok: false, statusCode: 400, error: `attachment mimeType must be ${options.expectedMimePrefix}*` };
  }
  if (options.allowAnySupportedAttachment && !isSupportedInlineAttachmentMime(mimeType)) {
    return { ok: false, statusCode: 400, error: 'Unsupported mimeType for inline attachment analysis' };
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    return { ok: false, statusCode: 400, error: 'attachment base64 payload contains invalid characters' };
  }
  if (data.length > INLINE_ATTACHMENT_MAX_BASE64_CHARS) {
    return {
      ok: false,
      statusCode: 413,
      error: 'attachment payload too large for inline AI analysis (max 2.5MB decoded)',
    };
  }

  const byteLength = estimateBase64DecodedBytes(data);
  if (byteLength <= 0) {
    return { ok: false, statusCode: 400, error: 'attachment payload could not be decoded' };
  }
  if (byteLength > INLINE_ATTACHMENT_MAX_BYTES) {
    return {
      ok: false,
      statusCode: 413,
      error: 'attachment payload too large for inline AI analysis (max 2.5MB decoded)',
    };
  }

  return {
    ok: true,
    payload: {
      data,
      mimeType,
      byteLength,
      base64Length: data.length,
      source,
    },
  };
}

async function resolveInlineAttachmentPayload(
  rawData: unknown,
  rawMimeType: unknown,
  options: { expectedMimePrefix?: string; allowAnySupportedAttachment?: boolean } = {},
): Promise<InlineAttachmentNormalization> {
  if (isLikelyAttachmentUrl(rawData)) {
    const url = parsePublicAttachmentUrl(rawData.trim());
    if (!url) {
      return { ok: false, statusCode: 400, error: 'attachment URL must be public HTTPS' };
    }
    return fetchInlineAttachmentUrl(url, rawMimeType, options);
  }
  return normalizeInlineAttachmentPayload(rawData, rawMimeType, options);
}

export function resolveGeminiVisionModel(requestedModel?: string): string {
  const envModel = String(process.env.GEMINI_VISION_MODEL || '').trim();
  const defaultModel = ALLOWED_GEMINI_MODELS.has(envModel) ? envModel : 'gemini-2.5-flash';
  const normalized = String(requestedModel || '').trim();
  if (normalized && ALLOWED_GEMINI_MODELS.has(normalized)) return normalized;
  return defaultModel;
}

export function buildGeminiInlineContents(prompt: string, payload: InlineAttachmentPayload) {
  return [
    {
      role: 'user' as const,
      parts: [
        { text: prompt },
        { inlineData: { mimeType: payload.mimeType, data: payload.data } },
      ],
    },
  ];
}

function startJsonHeartbeatStream(res: VercelResponse): JsonHeartbeatStream {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write(' ');

  const timer = setInterval(() => {
    if (!res.writableEnded) {
      try {
        res.write(' ');
      } catch {
        clearInterval(timer);
      }
    }
  }, JSON_HEARTBEAT_INTERVAL_MS);

  return {
    end(payload: unknown) {
      clearInterval(timer);
      if (!res.writableEnded) {
        res.end(JSON.stringify(payload));
      }
    },
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(createApiError('provider_timeout', 'Provider request timed out', 504, true, provider));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callGemini(
  key: string,
  prompt: string,
  model = 'gemini-2.5-flash',
  config: Record<string, unknown> = {},
  timeoutMs = GEMINI_TEXT_PROVIDER_TIMEOUT_MS,
): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const response: any = await withTimeout(
    (ai as any).models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7,
        ...config,
      },
    }),
    timeoutMs,
    'GEMINI',
  );
  return response.text || '';
}

async function callGeminiImage(key: string, prompt: string): Promise<string | null> {
  const { GoogleGenAI, Modality } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const response: any = await withTimeout(
    (ai as any).models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    }),
    30000,
    'GEMINI',
  );

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data && part.inlineData?.mimeType) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  return null;
}

async function callGeminiImageEdit(
  key: string,
  prompt: string,
  base64Image: string,
  imageMimeType: string,
): Promise<string | null> {
  const { GoogleGenAI, Modality } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const response: any = await withTimeout(
    (ai as any).models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: imageMimeType,
                data: base64Image.replace(/^data:[^;]+;base64,/, ''),
              },
            },
          ],
        },
      ],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    }),
    45000,
    'GEMINI',
  );

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data && part.inlineData?.mimeType) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  return null;
}

async function callGeminiSpeech(key: string, text: string): Promise<string | null> {
  const { GoogleGenAI, Modality } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const response: any = await withTimeout(
    (ai as any).models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      },
    }),
    30000,
    'GEMINI',
  );

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;
  return `data:audio/pcm;rate=24000;base64,${base64Audio}`;
}

async function callGeminiWithInlineData(
  key: string,
  prompt: string,
  base64Data: string,
  mimeType: string,
  model = 'gemini-2.5-flash',
): Promise<string> {
  const normalized = await resolveInlineAttachmentPayload(base64Data, mimeType, {
    allowAnySupportedAttachment: true,
  });
  if (normalized.ok === false) {
    throw createApiError(
      normalized.statusCode === 413 ? 'bad_request' : 'validation_error',
      normalized.error,
      normalized.statusCode,
      false,
      'GEMINI',
    );
  }
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const response: any = await withTimeout(
    (ai as any).models.generateContent({
      model: resolveGeminiVisionModel(model),
      contents: buildGeminiInlineContents(prompt, normalized.payload),
      config: { temperature: 0.4 },
    }),
    VISION_PROVIDER_TIMEOUT_MS,
    'GEMINI',
  );
  return response.text || '';
}

async function callOpenAiVision(
  key: string,
  prompt: string,
  base64Data: string,
  mimeType: string,
  model = 'gpt-4o-mini',
): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.4,
      }),
    }),
    VISION_PROVIDER_TIMEOUT_MS,
    'OPENAI',
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OPENAI Vision HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await response.json().catch(() => ({}));
  const text = normalizeCompatText(data?.choices?.[0]?.message?.content);
  if (!text) {
    throw createApiError('provider_error', 'Empty response from OpenAI Vision', 502, true, 'OPENAI');
  }
  return text;
}

async function callGeminiSearch(
  key: string,
  prompt: string,
  model = 'gemini-2.5-flash',
): Promise<{ text: string; chunks: unknown[] }> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const response: any = await withTimeout(
    (ai as any).models.generateContent({
      model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    }),
    28000,
    'GEMINI',
  );
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ||
    response.groundingMetadata?.groundingChunks ||
    [];
  return {
    text: response.text || '',
    chunks: Array.isArray(groundingChunks) ? groundingChunks : [],
  };
}

function normalizeCompatText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const chunks = value
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item && typeof (item as any).text === 'string') {
          return (item as any).text;
        }
        return '';
      })
      .filter(Boolean);
    return chunks.join('\n').trim();
  }
  return '';
}

async function callOpenAiCompatibleText(
  key: string,
  config: OpenAiCompatConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
  if (config.provider === 'OPENROUTER') {
    headers['HTTP-Referer'] = process.env.APP_URL || 'https://app.baristachaw.com';
    headers['X-Title'] = 'Baristachaw AI';
  }

  const response = await withTimeout(
    fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        temperature: 0.6,
        max_tokens: maxTokens,
      }),
    }),
    config.timeoutMs,
    config.provider,
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`${config.provider} HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await response.json().catch(() => ({}));
  const text = normalizeCompatText(data?.choices?.[0]?.message?.content);
  const finishReason = typeof data?.choices?.[0]?.finish_reason === 'string'
    ? data.choices[0].finish_reason
    : '';
  if (!text) {
    throw createApiError('provider_error', `Empty text response from ${config.provider}`, 502, true, config.provider);
  }
  if (finishReason === 'length') {
    throw createApiError('provider_error', `Truncated text response from ${config.provider}`, 502, true, config.provider);
  }
  return text;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeOpenAiImageQuality(value: string | undefined): OpenAiImageQuality {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'auto') {
    return normalized;
  }
  return OPENAI_IMAGE_EDIT_DEFAULTS.quality;
}

function normalizeOpenAiImageSize(value: string | undefined): OpenAiImageSize {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === '1024x1024' || normalized === '1536x1024' || normalized === '1024x1536' || normalized === 'auto') {
    return normalized;
  }
  return OPENAI_IMAGE_EDIT_DEFAULTS.size;
}

function normalizeOpenAiImageOutputFormat(value: string | undefined): OpenAiImageOutputFormat {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'png' || normalized === 'jpeg' || normalized === 'webp') {
    return normalized;
  }
  return OPENAI_IMAGE_EDIT_DEFAULTS.outputFormat;
}

function normalizeOpenAiImageInputFidelity(value: string | undefined): OpenAiImageInputFidelity {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'low' || normalized === 'high') {
    return normalized;
  }
  return OPENAI_IMAGE_EDIT_DEFAULTS.inputFidelity;
}

function getOpenAiImageEditConfig(): OpenAiImageEditConfig {
  const rawCompression = String(process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION || process.env.OPENAI_IMAGE_COMPRESSION || '').trim();
  const compression = rawCompression ? Number(rawCompression) : Number.NaN;
  return {
    model: (process.env.OPENAI_IMAGE_EDIT_MODEL || process.env.OPENAI_IMAGE_MODEL || OPENAI_IMAGE_EDIT_DEFAULTS.model).trim() || OPENAI_IMAGE_EDIT_DEFAULTS.model,
    quality: normalizeOpenAiImageQuality(process.env.OPENAI_IMAGE_QUALITY),
    size: normalizeOpenAiImageSize(process.env.OPENAI_IMAGE_SIZE),
    outputFormat: normalizeOpenAiImageOutputFormat(process.env.OPENAI_IMAGE_OUTPUT_FORMAT || process.env.OPENAI_IMAGE_FORMAT),
    outputCompression: Number.isFinite(compression)
      ? clampNumber(Math.round(compression), 0, 100)
      : OPENAI_IMAGE_EDIT_DEFAULTS.outputCompression,
    inputFidelity: normalizeOpenAiImageInputFidelity(process.env.OPENAI_IMAGE_INPUT_FIDELITY),
  };
}

function fileExtensionForMimeType(mimeType: string): string {
  const normalized = String(mimeType || '').trim().toLowerCase();
  switch (normalized) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'png';
  }
}

function mimeTypeForOutputFormat(format: OpenAiImageOutputFormat): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function buildLatteArtEditPrompt(userPrompt: string): string {
  const normalizedUserPrompt = String(userPrompt || '').replace(/\s+/g, ' ').trim();
  return [
    'You are an elite barista latte-art retouching model.',
    'Transform the uploaded latte photo into a production-quality, photorealistic latte art result.',
    'Primary objective: improve pour clarity, symmetry, crema/milk contrast, foam cleanliness, and cafe-menu presentation while keeping the photo believable.',
    'Improve only the latte art and foam surface while preserving the same cup, same drink, same perspective, same hand/cup placement, same table/background, and overall scene realism.',
    'The final image must look like a real specialty cafe photo, not CGI, not illustration, not painting, and not a fake product render.',
    'Keep believable milk texture, microfoam detail, crema contrast, reflections, and natural lighting.',
    'Respect real pouring physics: tulips should stack from the entry point, rosettas should have a plausible stem and leaves, hearts should have clean rounded lobes.',
    'Do not change the cup size, camera angle, crop, background setting, or add extra objects, text, logos, watermarks, extra cups, extra hands, spoons, saucers, or impossible patterns.',
    'Avoid surreal edits, warped rims, duplicated foam shapes, melted edges, floating elements, broken symmetry, or impossible pouring physics.',
    'Reject impossible or unrelated user instructions silently by keeping the realistic latte-art objective.',
    'Return one finished image only; never add captions, labels, text overlays, borders, or UI elements.',
    'The latte art should feel achievable by a top barista and visually polished enough for a premium cafe menu or social post.',
    normalizedUserPrompt
      ? `User request: ${normalizedUserPrompt}`
      : 'User request: improve the latte art into a clean, balanced, premium tulip or rosetta style while keeping the original photo realistic.',
  ].join('\n');
}

async function callOpenAiImageEdit(
  key: string,
  options: { base64Image: string; mimeType: string; prompt: string },
): Promise<{ imageDataUrl: string; model: string; revisedPrompt?: string }> {
  const config = getOpenAiImageEditConfig();
  const normalizedBase64 = String(options.base64Image || '').trim().replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(normalizedBase64, 'base64');
  if (!buffer.length) {
    throw createApiError('bad_request', 'Image payload could not be decoded', 400, false, 'OPENAI');
  }

  const formData = new FormData();
  formData.append('model', config.model);
  formData.append('prompt', buildLatteArtEditPrompt(options.prompt));
  formData.append(
    'image',
    new Blob([buffer], { type: options.mimeType }),
    `latte-art-input.${fileExtensionForMimeType(options.mimeType)}`,
  );
  formData.append('quality', config.quality);
  formData.append('size', config.size);
  formData.append('output_format', config.outputFormat);
  formData.append('output_compression', String(config.outputCompression));
  if (config.model.startsWith('gpt-image-')) {
    formData.append('input_fidelity', config.inputFidelity);
  }

  const response = await withTimeout(
    fetch(OPENAI_IMAGE_EDIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: formData,
    }),
    45000,
    'OPENAI',
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OPENAI HTTP ${response.status}: ${errText.slice(0, 280)}`);
  }

  const data: any = await response.json().catch(() => ({}));
  const imageEntry = Array.isArray(data?.data) ? data.data[0] : null;
  const base64Image = typeof imageEntry?.b64_json === 'string' ? imageEntry.b64_json.trim() : '';
  if (!base64Image) {
    throw createApiError('provider_error', 'OpenAI image edit returned no image payload', 502, true, 'OPENAI');
  }

  return {
    imageDataUrl: `data:${mimeTypeForOutputFormat(config.outputFormat)};base64,${base64Image}`,
    model: typeof data?.model === 'string' && data.model.trim() ? data.model.trim() : config.model,
    revisedPrompt: typeof imageEntry?.revised_prompt === 'string' ? imageEntry.revised_prompt : undefined,
  };
}

function buildPromptOrchestration(
  action: StructuredAiAction,
  prompt: string,
  responseProfile?: ReturnType<typeof parseResponseProfile>,
  clientContext?: ReturnType<typeof parseClientContext>,
  conversationContext?: ConversationContextInput,
  agentProfile?: AgentProfileInput,
): PromptOrchestrationResult {
  const mode = actionToResponseMode(action);
  const defaultProfile = DEFAULT_MODE_PROFILES[mode];
  if (action === 'edit_latte_art') {
    return {
      prompt,
      resolved: defaultProfile,
      mode,
      enforced: false,
    };
  }
  const languageEnabled = isEnvFlagEnabled('AI_LANGUAGE_ALIGNMENT_ENABLED', true);
  const expectationEnabled = isEnvFlagEnabled('AI_EXPECTATION_PROFILE_ENABLED', true);
  const ambiguityEnabled = isEnvFlagEnabled('AI_AMBIGUITY_ASK_FIRST_ENABLED', true);
  const shouldEnforce = languageEnabled || expectationEnabled || ambiguityEnabled;

  if (action === 'brew_sequence' || action === 'brew_optimize') {
    const resolved = shouldEnforce
      ? buildResponseOrchestration(prompt, mode, responseProfile, clientContext, conversationContext, agentProfile)
      : defaultProfile;
    const effective: ResolvedResponseProfile = {
      language: languageEnabled ? resolved.language : defaultProfile.language,
      expectation: {
        ...resolved.expectation,
        ...(expectationEnabled ? {} : defaultProfile.expectation),
        ambiguityPolicy: ambiguityEnabled
          ? resolved.expectation.ambiguityPolicy
          : defaultProfile.expectation.ambiguityPolicy,
        ambiguityRisk: ambiguityEnabled
          ? resolved.expectation.ambiguityRisk
          : defaultProfile.expectation.ambiguityRisk,
      },
    };
    return {
      prompt,
      resolved: effective,
      mode,
      enforced: false,
    };
  }

  if (!shouldEnforce) {
    return {
      prompt,
      resolved: defaultProfile,
      mode,
      enforced: false,
    };
  }

  const resolved = buildResponseOrchestration(prompt, mode, responseProfile, clientContext, conversationContext, agentProfile);
  const effective: ResolvedResponseProfile = {
    language: languageEnabled ? resolved.language : defaultProfile.language,
    expectation: {
      ...resolved.expectation,
      ...(expectationEnabled ? {} : defaultProfile.expectation),
      ambiguityPolicy: ambiguityEnabled
        ? resolved.expectation.ambiguityPolicy
        : defaultProfile.expectation.ambiguityPolicy,
      ambiguityRisk: ambiguityEnabled
        ? resolved.expectation.ambiguityRisk
        : defaultProfile.expectation.ambiguityRisk,
    },
  };

  return {
    prompt: buildOrchestratedPrompt(prompt, mode, effective, conversationContext, agentProfile),
    resolved: effective,
    mode,
    enforced: true,
  };
}

function normalizeBaseUrl(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch {
    return '';
  }
}

export function resolveInternalBaseUrl(req: Pick<VercelRequest, 'headers'>): string {
  const appUrl = normalizeBaseUrl(process.env.APP_URL || '');
  if (appUrl) return appUrl;

  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  if (vercelUrl) {
    const vercelOrigin = normalizeBaseUrl(`https://${vercelUrl}`);
    if (vercelOrigin) return vercelOrigin;
  }

  const hostHeader = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const host = String(hostHeader || '').trim();
  if (!host) return '';

  const forwardedProtoHeader = Array.isArray(req.headers['x-forwarded-proto'])
    ? req.headers['x-forwarded-proto'][0]
    : req.headers['x-forwarded-proto'];
  const proto = String(forwardedProtoHeader || '').split(',')[0]?.trim().toLowerCase() === 'https'
    ? 'https'
    : 'http';

  return normalizeBaseUrl(`${proto}://${host}`);
}

function buildFallbackPrompts(
  action: 'fast' | 'balanced' | 'deep_think',
  prompt: string,
  resolved: ResolvedResponseProfile,
): { system: string; user: string } {
  const languageLock = `Always respond in ${resolved.language}.`;
  const expectationLock = `Output style: verbosity=${resolved.expectation.verbosity}, format=${resolved.expectation.format}, tone=${resolved.expectation.tone}.`;
  if (action === 'fast') {
    return {
      system: `You are Baristachaw, an expert coffee assistant. Reply concise, practical, and direct. Do not roleplay as a cashier, POS bot, or take a drink order unless the user explicitly asks for an ordering simulation. For greetings or very short openers, greet back briefly and ask what they need. ${languageLock} ${expectationLock}`,
      user: `Answer concisely and actionably:\n${prompt}`,
    };
  }

  if (action === 'balanced') {
    return {
      system: `You are Baristachaw, an expert coffee assistant. Stay tightly aligned to the latest user request, keep the answer practical, and use moderate detail. Do not roleplay as a cashier, POS bot, or take a drink order unless the user explicitly asks for an ordering simulation. For greetings or very short openers, greet back briefly and ask what they need. ${languageLock} ${expectationLock}`,
      user: `Answer clearly and keep the response scoped to the active request. Prefer compact paragraphs or short bullets only when they help:\n${prompt}`,
    };
  }

  return {
    system: `You are Baristachaw, an expert coffee assistant following SCA best practices. Do not roleplay as a cashier, POS bot, or take a drink order unless the user explicitly asks for an ordering simulation. For greetings or very short openers, greet back briefly and ask what they need. ${languageLock} ${expectationLock}`,
    user: `Think deeply, provide structured recommendations and tradeoffs:\n${prompt}`,
  };
}

function buildBrewSequencePrompts(
  prompt: string,
  resolved: ResolvedResponseProfile,
): { system: string; user: string } {
  const language = resolved.language || 'en';
  return {
    system: [
      'You are Baristachaw brew_sequence, a strict specialty-coffee SOP generator.',
      'Use only the deterministic recipe envelope supplied by the app. Never change dose, water, ice, temperature, time, step count, pour volume, cumulative target, method, grinder, water minerals, or bean facts.',
      'Return JSON only. No markdown fences, no apology, no commentary outside JSON.',
      'JSON shape: {"canonicalMarkdown":"...","displayMarkdown":"..."}',
      'canonicalMarkdown must be English markdown with exactly these headings in this order: ## Service Pattern, ## Sequence, ## Watch.',
      'displayMarkdown must keep the same numbers, line order, and operational meaning in the requested UI language. If the requested language is English, displayMarkdown may equal canonicalMarkdown.',
      'Every Sequence step must include the deterministic label, timestamp, pour volume, cumulative target volume, and a short operational cue.',
      'If iced, explicitly preserve the hot-water and ice split. Ice is bypass in the server, not an extra pour through the bed.',
      'If unsure, copy the deterministic values and keep the instruction conservative.',
      `Requested UI language: ${language}.`,
    ].join('\n'),
    user: prompt,
  };
}

async function callBrewSequenceFallback(
  prompt: string,
  resolved: ResolvedResponseProfile,
  requestId: string,
): Promise<{ text: string; provider: OpenAiCompatProvider; model: string }> {
  const prompts = buildBrewSequencePrompts(prompt, resolved);
  let lastError: unknown = null;
  for (const cfg of getEnabledAiProviderConfigs(BREW_SEQUENCE_PROVIDER_CHAIN)) {
    try {
      const text = await withRetry(
        key => callOpenAiCompatibleText(key, cfg, prompts.system, prompts.user, 950),
        { provider: cfg.provider, requestId, action: 'brew_sequence', maxRetries: 1 },
      );
      return { text, provider: cfg.provider, model: cfg.model };
    } catch (error) {
      lastError = error;
      console.error(
        `[api/ai][${requestId}] action=brew_sequence serial_fallback_fail provider=${cfg.provider} details="${sanitizeErrorDetails(error)}"`,
      );
    }
  }

  if (lastError) throw lastError;
  throw createApiError('no_key', 'No brew sequence providers configured', 503, false, 'BREW_SEQUENCE');
}

function buildBrewOptimizePrompts(
  prompt: string,
  resolved: ResolvedResponseProfile,
): { system: string; user: string } {
  const language = resolved.language || 'en';
  return {
    system: [
      'You are Baristachaw brew_optimize, a strict numeric patch generator for a deterministic coffee planner.',
      'Return JSON only. No markdown fences, no apology, no commentary outside JSON.',
      'Never return plain text fallback messages. If unsure, return the smallest safe JSON patch.',
      'Do not change dose, brew mode, brewer, grinder, water minerals, method family, selected step count, or facts not in the prompt.',
      'Allowed output keys only: reason, confidence, recommendedRatio, waterTempC, totalTimeSeconds, hotWaterSharePercent, pourStyleHint, grindGuidance, steps.',
      'steps items may only contain index, stepId, startSeconds, pourVolumeMl, control.',
      'All numeric fields must be finite numbers. Do not use null, NaN, Infinity, comments, or extra prose.',
      'At least one controlled patch key must be present besides reason/confidence.',
      `Step control language: ${language}.`,
    ].join('\n'),
    user: prompt,
  };
}

async function callBrewOptimizeFallback(
  prompt: string,
  resolved: ResolvedResponseProfile,
  requestId: string,
): Promise<{ text: string; provider: OpenAiCompatProvider; model: string }> {
  const prompts = buildBrewOptimizePrompts(prompt, resolved);
  let lastError: unknown = null;
  for (const cfg of getEnabledAiProviderConfigs(BREW_OPTIMIZE_PROVIDER_CHAIN)) {
    try {
      const text = await withRetry(
        key => callOpenAiCompatibleText(key, cfg, prompts.system, prompts.user, 360),
        { provider: cfg.provider, requestId, action: 'brew_optimize', maxRetries: 1 },
      );
      return { text, provider: cfg.provider, model: cfg.model };
    } catch (error) {
      lastError = error;
      console.error(
        `[api/ai][${requestId}] action=brew_optimize serial_fallback_fail provider=${cfg.provider} details="${sanitizeErrorDetails(error)}"`,
      );
    }
  }

  if (lastError) throw lastError;
  throw createApiError('no_key', 'No brew optimize providers configured', 503, false, 'BREW_OPTIMIZE');
}

function isIndonesianLanguage(language: string): boolean {
  const normalized = String(language || '').trim().toLowerCase();
  return normalized === 'id' || normalized.startsWith('id-');
}

function extractLocalFallbackSubject(prompt: string): string {
  const value = String(prompt || '').replace(/\r\n/g, '\n').trim();
  const userRequestMarker = 'User request:';
  const markerIndex = value.lastIndexOf(userRequestMarker);
  const candidate = markerIndex >= 0
    ? value.slice(markerIndex + userRequestMarker.length)
    : value
        .replace(/^Answer concisely and actionably:\s*/i, '')
        .replace(/^Answer clearly[\s\S]*?:\s*/i, '')
        .replace(/^Think deeply, provide structured recommendations and tradeoffs:\s*/i, '');
  const cleaned = candidate.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  return cleaned.slice(0, 320) || 'the current coffee request';
}

function buildLocalStructuredFallback(
  action: 'fast' | 'balanced' | 'deep_think',
  prompt: string,
  resolved: ResolvedResponseProfile,
): string {
  const subject = extractLocalFallbackSubject(prompt);
  const isId = isIndonesianLanguage(resolved.language);

  if (action === 'deep_think') {
    if (isId) {
      return [
        '## TL;DR',
        `Untuk permintaan ini, fokus pada baseline yang terukur: ${subject}. Mulai dari resep stabil, ubah satu variabel saja, lalu validasi dengan rasa dan angka agar keputusan berikutnya tidak spekulatif.`,
        '',
        '## Core Analysis',
        'Masalah kopi biasanya sulit dibaca ketika dosis, grind, suhu, agitasi, dan waktu kontak berubah bersamaan. Pendekatan paling aman adalah mengunci resep dasar, mencatat output, lalu menghubungkan perubahan rasa dengan satu penyebab yang paling mungkin. Untuk espresso, asam tajam biasanya mengarah ke ekstraksi rendah, flow terlalu cepat, atau distribusi puck yang kurang rata. Untuk filter, rasa tipis atau tajam sering terkait grind terlalu kasar, suhu terlalu rendah, atau pouring yang kurang konsisten.',
        '',
        '## Options & Tradeoffs',
        'Opsi 1: grind lebih halus untuk menaikkan ekstraksi. Tradeoff-nya flow bisa melambat, astringency meningkat, dan channeling lebih mudah muncul jika distribusi buruk.',
        'Opsi 2: naikkan suhu atau agitasi untuk membantu pelarutan. Tradeoff-nya karakter aromatik bisa terasa lebih berat jika kopi sudah cukup developed.',
        'Opsi 3: pertahankan resep, perbaiki workflow, dan ulangi brew kontrol. Ini lebih lambat, tetapi paling kuat untuk membedakan masalah teknik dari masalah bahan.',
        '',
        '## Recommended Action Plan',
        '1. Kunci baseline: dosis, yield atau rasio, suhu air, grind setting, waktu kontak, dan teknik distribusi/pouring.',
        '2. Jalankan satu brew kontrol, catat rasa utama, waktu, berat akhir, dan observasi flow seperti channeling, clogging, atau drawdown terlalu cepat.',
        '3. Ubah satu variabel kecil saja: grind sedikit lebih halus jika asam/tipis, lebih kasar jika pahit/kering, atau perbaiki distribusi jika flow tidak rata.',
        '4. Bandingkan dua hasil saat suhu minum sudah stabil, lalu simpan perubahan hanya jika rasa membaik tanpa menambah defect baru.',
        '',
        '## Risks & Validation',
        'Risiko terbesar adalah mengejar rasa dengan terlalu banyak perubahan sekaligus. Validasi minimal dengan dua pengulangan pada setting terbaik, catatan waktu yang konsisten, dan evaluasi rasa setelah kopi sedikit turun suhu. Jika hasil masih berubah-ubah, audit grinder retention, kualitas air, kesegaran biji, dan konsistensi puck atau bed sebelum mengubah resep lagi.',
      ].join('\n');
    }

    return [
      '## TL;DR',
      `For this request, use a measured baseline first: ${subject}. Change one variable at a time, compare the cup against numbers, and keep only adjustments that improve balance without adding a new defect.`,
      '',
      '## Core Analysis',
      'Coffee troubleshooting becomes unreliable when dose, grind, water temperature, agitation, and contact time all move at once. The production-safe approach is to lock a baseline recipe, record the output, and connect each flavor change to one likely cause. In espresso, sharp sourness often points to low extraction, fast flow, or uneven puck prep. In filter brewing, thin acidity often points to a grind that is too coarse, low slurry temperature, weak agitation, or inconsistent pouring.',
      '',
      '## Options & Tradeoffs',
      'Option 1: grind finer to raise extraction. The tradeoff is slower flow, higher risk of astringency, and more channeling sensitivity if puck prep is weak.',
      'Option 2: raise water temperature or agitation to improve solubility. The tradeoff is a heavier cup and more bitterness if the roast is already developed.',
      'Option 3: keep the recipe stable and repeat a control brew. This is slower, but it separates technique noise from a real recipe problem.',
      '',
      '## Recommended Action Plan',
      '1. Lock dose, yield or brew ratio, water temperature, grind setting, contact time, and distribution or pouring method.',
      '2. Run one control brew and record flavor, final weight, total time, and flow signs such as channeling, clogging, or a fast drawdown.',
      '3. Change one small variable: grind finer for sour or thin cups, coarser for dry bitterness, or improve distribution when flow is uneven.',
      '4. Compare the two cups at a consistent drinking temperature, then keep the change only if sweetness and balance improve without a new defect.',
      '',
      '## Risks & Validation',
      'The main risk is changing too many variables and losing the signal. Validate with at least two repeat brews at the best setting, stable timing, and notes taken after the cup cools slightly. If results still drift, audit grinder retention, water quality, coffee age, puck prep, and bed geometry before changing the recipe again.',
    ].join('\n');
  }

  if (action === 'fast') {
    return isId
      ? `Gunakan baseline terukur untuk permintaan ini: ${subject}. Kunci dosis dan yield/rasio dulu, lalu ubah satu variabel kecil. Jika rasa asam atau tipis, coba grind sedikit lebih halus atau naikkan ekstraksi. Jika pahit atau kering, coba grind sedikit lebih kasar atau kurangi agitasi. Catat waktu dan rasa agar perubahan berikutnya punya dasar.`
      : `Use a measured baseline for this request: ${subject}. Lock dose and yield or ratio first, then change one small variable. If the cup is sour or thin, grind slightly finer or raise extraction. If it is bitter or dry, grind slightly coarser or reduce agitation. Track time and taste so the next change has evidence.`;
  }

  return isId
    ? [
        `Untuk permintaan ini: ${subject}.`,
        '',
        'Mulai dari resep kontrol yang bisa diulang. Kunci dosis, yield atau rasio, suhu air, grind setting, dan waktu kontak. Setelah itu, ubah satu variabel kecil berdasarkan defect rasa paling jelas.',
        '',
        'Langkah praktis: jika asam/tipis, naikkan ekstraksi dengan grind sedikit lebih halus, suhu sedikit lebih tinggi, atau kontak lebih lama. Jika pahit/kering, turunkan ekstraksi dengan grind sedikit lebih kasar, agitasi lebih rendah, atau kontak lebih pendek. Validasi dengan minimal satu brew ulang sebelum menyimpan setting baru.',
      ].join('\n')
    : [
        `For this request: ${subject}.`,
        '',
        'Start with a repeatable control recipe. Lock dose, yield or brew ratio, water temperature, grind setting, and contact time. Then adjust one small variable based on the clearest flavor defect.',
        '',
        'Practical path: if the cup is sour or thin, raise extraction with a slightly finer grind, slightly higher temperature, or longer contact time. If it is bitter or dry, lower extraction with a slightly coarser grind, less agitation, or shorter contact time. Validate with at least one repeat brew before saving the new setting.',
      ].join('\n');
}

async function callStructuredTextFallback(
  action: 'fast' | 'balanced' | 'deep_think',
  orchestratedPrompt: string,
  resolved: ResolvedResponseProfile,
  clientContext: ReturnType<typeof parseClientContext> | undefined,
  conversationContext: ConversationContextInput | undefined,
  agentProfile: AgentProfileMemory | undefined,
  requestId: string,
  req: VercelRequest,
): Promise<{ text: string; provider: StructuredFallbackProvider; model: string }> {
  const prompts = buildFallbackPrompts(action, orchestratedPrompt, resolved);
  let lastError: unknown = null;
  const maxTokens = action === 'fast'
    ? 256
    : action === 'balanced'
      ? 700
      : DEEP_FALLBACK_MAX_TOKENS;

  for (const cfg of getEnabledAiProviderConfigs(OPENAI_COMPAT_FALLBACKS)) {
    try {
      const text = await withRetry(
        key => callOpenAiCompatibleText(key, cfg, prompts.system, prompts.user, maxTokens),
        { provider: cfg.provider, requestId, action, maxRetries: 1 },
      );
      return { text, provider: cfg.provider, model: cfg.model };
    } catch (error) {
      lastError = error;
      console.error(
        `[api/ai][${requestId}] action=${action} compat_fallback_fail provider=${cfg.provider} details="${sanitizeErrorDetails(error)}"`,
      );
    }
  }

  if (action === 'deep_think') {
    const baseUrl = resolveInternalBaseUrl(req);
    if (baseUrl) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (typeof req.headers.authorization === 'string' && req.headers.authorization.trim()) {
          headers.Authorization = req.headers.authorization.trim();
        }
        if (typeof req.headers.cookie === 'string' && req.headers.cookie.trim()) {
          headers.Cookie = req.headers.cookie.trim();
        }
        if (typeof req.headers['x-e2e-mock'] === 'string' && req.headers['x-e2e-mock'].trim()) {
          headers['x-e2e-mock'] = req.headers['x-e2e-mock'].trim();
        }

        const chatResponse = await withTimeout(
          fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: buildDeepTemplatePrompt(orchestratedPrompt, { grounded: false }),
              mode: 'race',
              provider: 'AUTO',
              responseProfile: {
                language: resolved.language,
                verbosity: resolved.expectation.verbosity,
                format: resolved.expectation.format,
                tone: resolved.expectation.tone,
                ambiguityPolicy: resolved.expectation.ambiguityPolicy,
              },
              clientContext: {
                platform: clientContext?.platform,
                appLanguage: clientContext?.appLanguage,
                acceptLanguage: clientContext?.acceptLanguage,
              },
              conversationContext,
              agentProfile,
            }),
          }),
          CHAT_PROXY_DEEP_TIMEOUT_MS,
          'CHAT_PROXY',
        );
        if (chatResponse.ok) {
          const text = (await chatResponse.text().catch(() => '')).trim();
          if (text) {
            const proxyProvider = String(chatResponse.headers.get('x-provider') || '').trim().toUpperCase();
            const proxyModel = String(chatResponse.headers.get('x-model') || '').trim();
            return {
              text,
              provider: proxyProvider === 'LOCAL' ? 'LOCAL' : 'CHAT_PROXY',
              model: proxyProvider === 'LOCAL' ? (proxyModel || 'deterministic-fallback') : 'chat_race',
            };
          }
        }
      } catch (error) {
        console.error(
          `[api/ai][${requestId}] action=${action} chat_proxy_fail details="${sanitizeErrorDetails(error)}"`,
        );
      }
    }
  }

  const localText = buildLocalStructuredFallback(action, prompts.user, resolved);
  if (localText) {
    console.warn(
      `[api/ai][${requestId}] action=${action} local_fallback_used details="${sanitizeErrorDetails(lastError || 'no compatible fallback providers', 180)}"`,
    );
    return { text: localText, provider: 'LOCAL', model: 'deterministic-fallback' };
  }

  if (lastError) throw lastError;
  throw createApiError('no_key', 'No compatible fallback providers configured', 503, false, 'FALLBACK');
}

async function withRetry<T>(
  fn: (key: string) => Promise<T>,
  options: { provider: string; requestId: string; action: StructuredAiAction; maxRetries?: number },
): Promise<T> {
  const retries = options.maxRetries ?? 3;
  let last: unknown;
  const providerId = parseAiProviderId(options.provider);

  if (providerId && !isAiProviderAvailable(providerId)) {
    throw createApiError(
      'provider_error',
      aiProviderDisabledMessage(providerId) || `${providerId} disabled by admin`,
      503,
      false,
      providerId,
    );
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const key = getNextKey(options.provider);
    if (!key) {
      if (providerId) {
        registerAiProviderResult({
          provider: providerId,
          ok: false,
          errorCode: 'no_key',
        });
      }
      throw createApiError(
        'no_key',
        `No ${options.provider} API keys available`,
        503,
        false,
        options.provider,
      );
    }

    try {
      const startedAt = Date.now();
      const result = await fn(key);
      if (providerId) {
        registerAiProviderResult({
          provider: providerId,
          ok: true,
          latencyMs: Date.now() - startedAt,
        });
      }
      return result;
    } catch (error) {
      const classified = classifyProviderError(error, options.provider);
      last = classified;
      if (providerId) {
        registerAiProviderResult({
          provider: providerId,
          ok: false,
          errorCode: classified.code,
        });
      }
      console.error(
        `[api/ai][${options.requestId}] action=${options.action} attempt=${attempt}/${retries} code=${classified.code} retryable=${classified.retryable} details="${sanitizeErrorDetails(error)}"`,
      );

      if (!classified.retryable || attempt === retries) {
        throw classified;
      }
    }
  }

  throw (last ?? createApiError('internal_error', 'AI retry loop failed', 500, false, options.provider));
}

async function repairOutputIfNeeded(params: {
  rawText: string;
  mode: ResponseMode;
  originalPrompt: string;
  resolved: ResolvedResponseProfile;
  action: StructuredAiAction;
  requestId: string;
  req: VercelRequest;
  clientContext?: ReturnType<typeof parseClientContext>;
  conversationContext?: ConversationContextInput;
  agentProfile?: AgentProfileMemory;
}): Promise<{
  text: string;
  integrityPass: boolean;
  deepQualityPass: boolean;
  repaired: boolean;
  issues: string[];
  shortByUserRequest: boolean;
}> {
  const firstPassText = sanitizeModelText(params.rawText);
  const firstEval = evaluateIntegrity(firstPassText, params.mode, params.originalPrompt);
  const firstAlignment = evaluateResponseTaskAlignment(params.originalPrompt, firstPassText);
  const firstIssues = [...new Set([...firstEval.issues, ...firstAlignment.issues])];
  const needsRepair =
    !firstEval.ok
    || (params.mode === 'deep' && !firstEval.deepQualityPass)
    || !firstAlignment.ok;
  if (!needsRepair) {
    return {
      text: firstPassText,
      integrityPass: true,
      deepQualityPass: firstEval.deepQualityPass,
      repaired: false,
      issues: firstIssues,
      shortByUserRequest: Boolean(firstEval.deepQuality?.shortByUserRequest),
    };
  }

  const repairPrompt = !firstAlignment.ok
    ? buildTaskAlignmentRepairPrompt({
        userRequest: params.originalPrompt,
        draftAnswer: firstPassText,
        language: params.resolved.language,
        verbosity: params.resolved.expectation.verbosity,
        format: params.resolved.expectation.format,
        tone: params.resolved.expectation.tone,
      })
    : [
        'Repair the answer so it is clean, complete, and keeps the same meaning.',
        `Keep language strictly: ${params.resolved.language}.`,
        `Keep style: verbosity=${params.resolved.expectation.verbosity}, format=${params.resolved.expectation.format}, tone=${params.resolved.expectation.tone}.`,
        params.mode === 'deep'
          ? [
              'For deep mode, preserve meaning and enforce this exact section order:',
              '## TL;DR',
              '## Core Analysis',
              '## Options & Tradeoffs',
              '## Recommended Action Plan',
              '## Risks & Validation',
              'Use at least 3 numbered steps in Recommended Action Plan.',
              'Keep language matching the user request.',
              'Only add ## Sources if grounded evidence is present in the draft.',
            ].join('\n')
          : '',
        '',
        `Original user request:\n${params.originalPrompt}`,
        '',
        `Draft answer:\n${firstPassText}`,
      ].filter(Boolean).join('\n');

  let repairedText = '';
  try {
    if (!isGeminiTextDisabled()) {
      repairedText = await withRetry(
        key => callGemini(
          key,
          repairPrompt,
          'gemini-2.5-flash',
          {},
          params.mode === 'deep' ? GEMINI_DEEP_REPAIR_TIMEOUT_MS : GEMINI_TEXT_PROVIDER_TIMEOUT_MS,
        ),
        { provider: 'GEMINI', requestId: params.requestId, action: params.action, maxRetries: 1 },
      );
    }
  } catch {
    repairedText = '';
  }

  if (!repairedText && (params.mode === 'fast' || params.mode === 'normal' || params.mode === 'deep')) {
    try {
      const fallback = await callStructuredTextFallback(
        params.mode === 'fast' ? 'fast' : params.mode === 'normal' ? 'balanced' : 'deep_think',
        repairPrompt,
        params.resolved,
        params.clientContext,
        params.conversationContext,
        params.agentProfile,
        params.requestId,
        params.req,
      );
      repairedText = fallback.text;
    } catch {
      repairedText = '';
    }
  }

  const finalText = sanitizeModelText(repairedText || firstPassText);
  const finalEval = evaluateIntegrity(finalText, params.mode, params.originalPrompt);
  const finalAlignment = evaluateResponseTaskAlignment(params.originalPrompt, finalText);
  const finalIssues = [...new Set([...finalEval.issues, ...finalAlignment.issues])];
  return {
    text: finalText,
    integrityPass: finalEval.ok && finalAlignment.ok,
    deepQualityPass: finalEval.deepQualityPass,
    repaired: Boolean(repairedText),
    issues: finalIssues,
    shortByUserRequest: Boolean(finalEval.deepQuality?.shortByUserRequest),
  };
}

function normalizeAction(value: unknown): StructuredAiAction | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  const supported: StructuredAiAction[] = [
    'search',
    'analyze_image',
    'analyze_attachment',
    'edit_latte_art',
    'brew_sequence',
    'brew_optimize',
    'fast',
    'balanced',
    'deep_think',
    'transcribe',
    'analyze_text',
    'generate_image',
    'generate_speech',
  ];
  return (supported as string[]).includes(normalized) ? (normalized as StructuredAiAction) : null;
}

function sendBadRequest(
  res: VercelResponse,
  requestId: string,
  action: string,
  error: string,
  errorCode: 'validation_error' | 'unknown_action' | 'unsupported_model' = 'validation_error',
) {
  return res.status(400).json({
    ok: false,
    requestId,
    action,
    error,
    errorCode,
    retryable: false,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  const startedAt = Date.now();
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const actionLabel = typeof req.body?.action === 'string' ? req.body.action.slice(0, 40) : 'unknown';
  const contentLength = readContentLength(req);
  if (contentLength > VERCEL_JSON_BODY_SOFT_LIMIT_BYTES) {
    return res.status(413).json({
      ok: false,
      requestId,
      action: actionLabel,
      error: 'Request body too large for inline AI attachments. Please use a smaller or more compressed file.',
      errorCode: 'validation_error',
      retryable: false,
    });
  }

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      action: actionLabel,
      error: authResult.error,
      errorCode: authResult.errorCode,
      retryable: false,
    });
  }

  const limit = checkRateLimit(req, '/api/ai', authResult.auth.userId, AI_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      action: actionLabel,
      error: 'Rate limit exceeded',
      errorCode: 'rate_limited',
      retryable: true,
    });
  }

  const {
    action: rawAction,
    prompt,
    image,
    mimeType,
    model,
    textContent,
    responseProfile: rawResponseProfile,
    clientContext: rawClientContext,
    conversationContext: rawConversationContext,
    agentProfile: rawAgentProfile,
  } = req.body || {};
  const action = normalizeAction(rawAction);
  if (!action) {
    return sendBadRequest(
      res,
      requestId,
      actionLabel,
      `Unknown action: ${String(rawAction || 'undefined')}`,
      'unknown_action',
    );
  }

  const clientSurface = rawClientContext && typeof rawClientContext === 'object' && typeof (rawClientContext as { surface?: unknown }).surface === 'string'
    ? String((rawClientContext as { surface?: string }).surface).trim().toLowerCase()
    : '';
  const clientFeature = rawClientContext && typeof rawClientContext === 'object' && typeof (rawClientContext as { feature?: unknown }).feature === 'string'
    ? String((rawClientContext as { feature?: string }).feature).trim().toLowerCase()
    : '';
  const usageFeature = aiUsageFeatureFromContext(clientFeature, clientSurface);
  const paidFeature: PaidAiFeature | null = action === 'search'
    ? 'search'
    : action === 'analyze_image' || action === 'edit_latte_art'
      ? 'scanner'
      : action === 'generate_image' || action === 'analyze_attachment' || action === 'analyze_text' || action === 'transcribe'
        ? 'chat'
        : (clientFeature === 'ai_brew' || clientFeature === 'brew' || clientSurface === 'tools'
          ? 'brew'
          : clientSurface === 'chat'
            ? 'chat'
            : clientSurface === 'home'
              ? 'search'
              : null);
  if (paidFeature) {
    const aiAccess = await requirePaidAiAccess({
      requestId,
      auth: authResult.auth,
      rawClientContext,
      feature: paidFeature,
      quotaKind: action === 'deep_think'
        ? 'deep'
        : paidFeature === 'scanner'
          ? 'scanner'
          : 'ai',
    });
    if (aiAccess.ok === false) {
      return res.status(aiAccess.statusCode).json({
        ok: false,
        requestId,
        action,
        error: aiAccess.error,
        errorCode: aiAccess.errorCode,
        retryable: aiAccess.retryable,
        minimumPlan: aiAccess.minimumPlan,
      });
    }
  }

  const openaiKeys = getAiProviderKeys('OPENAI');
  const geminiKeys = getAiProviderKeys('GEMINI');

  if (openaiKeys.length === 0 && geminiKeys.length === 0) {
    return res.status(401).json({
      ok: false,
      requestId,
      action,
      error: 'AI API key is missing on server',
      errorCode: 'no_key',
      retryable: false,
    });
  }

  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 15000) {
    return sendBadRequest(
      res,
      requestId,
      action,
      'prompt must be a non-empty string under 15000 chars',
      'validation_error',
    );
  }

  if ((action === 'fast' || action === 'balanced' || action === 'deep_think' || action === 'brew_sequence' || action === 'brew_optimize') && prompt.trim().length > STRUCTURED_AI_PROMPT_MAX_CHARS) {
    return sendBadRequest(
      res,
      requestId,
      action,
      `prompt too long for ${action} (max ${STRUCTURED_AI_PROMPT_MAX_CHARS} chars)`,
      'validation_error',
    );
  }

  const responseProfile = parseResponseProfile(rawResponseProfile);
  const effectiveResponseProfile = action === 'search'
    ? withSearchDefaults(responseProfile)
    : responseProfile;
  const clientContext = parseClientContext(req, rawClientContext);
  const conversationContext = parseConversationContext(rawConversationContext);
  const agentProfile = parseAgentProfile(rawAgentProfile);
  const promptPlan = buildPromptOrchestration(
    action,
    prompt.trim(),
    effectiveResponseProfile,
    clientContext,
    conversationContext,
    agentProfile,
  );
  const promptForModel = promptPlan.prompt;
  const deepQualityGateEnabled = isEnvFlagEnabled('AI_DEEP_QUALITY_GATE_ENABLED', true);
  res.setHeader('X-Resolved-Language', promptPlan.resolved.language);

  console.info(
    `[api/ai][${requestId}] action=${action} mode=${promptPlan.mode} resolved_language=${promptPlan.resolved.language} verbosity=${promptPlan.resolved.expectation.verbosity} format=${promptPlan.resolved.expectation.format} tone=${promptPlan.resolved.expectation.tone} platform=${clientContext?.platform || 'unknown'}`,
  );

  const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : undefined;
  if (selectedModel && !ALLOWED_GEMINI_MODELS.has(selectedModel)) {
    return sendBadRequest(
      res,
      requestId,
      action,
      `Unsupported model: ${selectedModel}`,
      'unsupported_model',
    );
  }

  if (isE2eMockRequest(req)) {
    const mockPayload = buildE2eMockAiPayload(action, promptPlan.resolved.language);
    if (action === 'deep_think') {
      res.setHeader('X-Deep-Quality-Pass', 'true');
      res.setHeader('X-Deep-Degraded', 'false');
    }
    res.setHeader('X-Provider', E2E_MOCK_PROVIDER);
    res.setHeader('X-Model', E2E_MOCK_MODEL);
    console.info(
      `[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms provider=${E2E_MOCK_PROVIDER} mode=mock grounded=${action === 'deep_think' || action === 'search' ? 1 : 0} fallback_used=0 deep_quality_pass=${action === 'deep_think' ? 1 : 0} source_count=${Array.isArray((mockPayload as { sources?: unknown[] }).sources) ? (mockPayload as { sources?: unknown[] }).sources?.length || 0 : 0} degraded=0`,
    );
    return res.json({
      ...mockPayload,
      requestId,
      provider: E2E_MOCK_PROVIDER,
      model: E2E_MOCK_MODEL,
      ...(action === 'search' ? { retrievedAt: Date.now() } : {}),
    });
  }

  let jsonHeartbeat: JsonHeartbeatStream | null = null;

  try {
    if (typeof image === 'string' && image.length > INLINE_ATTACHMENT_MAX_BASE64_CHARS + 2048) {
      return res.status(413).json({
        ok: false,
        requestId,
        action,
        error: 'attachment payload too large for inline AI analysis (max 2.5MB decoded)',
        errorCode: 'validation_error',
        retryable: false,
      });
    }
    if (textContent && (typeof textContent !== 'string' || textContent.length > 50_000)) {
      return sendBadRequest(res, requestId, action, 'textContent must be a string under 50000 chars');
    }

    if (action === 'brew_sequence') {
      const sequenceStartedAt = Date.now();
      const fallback = await callBrewSequenceFallback(
        promptForModel,
        promptPlan.resolved,
        requestId,
      );
      const text = sanitizeModelText(fallback.text);
      if (!text) {
        throw createApiError('provider_error', 'Brew sequence provider returned empty text', 502, true, fallback.provider);
      }
      const latencyMs = Date.now() - sequenceStartedAt;
      res.setHeader('X-Provider', fallback.provider);
      res.setHeader('X-Model', fallback.model);
      res.setHeader('X-AI-Route', 'serial-brew-sequence');
      console.info(
        `[api/ai][${requestId}] action=brew_sequence ok latency=${Date.now() - startedAt}ms provider=${fallback.provider} model=${fallback.model} route=serial`,
      );
      recordAiProviderUsage({
        provider: fallback.provider,
        model: fallback.model,
        feature: usageFeature,
        route: '/api/ai',
        action,
        mode: 'brew_sequence',
        outcome: 'success',
        inputTokens: estimateAiTokenCount(promptForModel),
        outputTokens: estimateAiTokenCount(text),
        latencyMs,
      });
      return res.json({
        ok: true,
        requestId,
        action,
        text,
        provider: fallback.provider,
        model: fallback.model,
        degraded: false,
      });
    }

    if (action === 'brew_optimize') {
      const optimizeStartedAt = Date.now();
      const fallback = await callBrewOptimizeFallback(
        promptForModel,
        promptPlan.resolved,
        requestId,
      );
      const text = sanitizeModelText(fallback.text);
      if (!text) {
        throw createApiError('provider_error', 'Brew optimize provider returned empty text', 502, true, fallback.provider);
      }
      const latencyMs = Date.now() - optimizeStartedAt;
      res.setHeader('X-Provider', fallback.provider);
      res.setHeader('X-Model', fallback.model);
      res.setHeader('X-AI-Route', 'serial-brew-optimize');
      console.info(
        `[api/ai][${requestId}] action=brew_optimize ok latency=${Date.now() - startedAt}ms provider=${fallback.provider} model=${fallback.model} route=serial`,
      );
      recordAiProviderUsage({
        provider: fallback.provider,
        model: fallback.model,
        feature: usageFeature,
        route: '/api/ai',
        action,
        mode: 'brew_optimize',
        outcome: 'success',
        inputTokens: estimateAiTokenCount(promptForModel),
        outputTokens: estimateAiTokenCount(text),
        latencyMs,
      });
      return res.json({
        ok: true,
        requestId,
        action,
        text,
        provider: fallback.provider,
        model: fallback.model,
        degraded: false,
      });
    }

    if (action === 'analyze_image') {
      const attachment = await resolveInlineAttachmentPayload(image, mimeType, {
        expectedMimePrefix: 'image/',
      });
      if (attachment.ok === false) {
        return res.status(attachment.statusCode).json({
          ok: false,
          requestId,
          action,
          error: attachment.error,
          errorCode: 'validation_error',
          retryable: false,
        });
      }
      if (!isSupportedInlineAttachmentMime(attachment.payload.mimeType)) {
        return sendBadRequest(
          res,
          requestId,
          action,
          'Unsupported image mimeType for analyze_image',
        );
      }

      const openaiKeys = getAiProviderKeys('OPENAI');
      const useOpenAi = openaiKeys.length > 0;

      if (!useOpenAi) {
        throw createApiError('no_key', 'OPENAI_API_KEY or SCANNER_API_KEY is required for analyze_image', 401, false, 'OPENAI');
      }

      const activeProvider = 'OPENAI';
      const activeModel = 'gpt-4o-mini';

      res.setHeader('X-Attachment-Bytes', String(attachment.payload.byteLength));
      res.setHeader('X-Model', activeModel);
      res.setHeader('X-Provider', activeProvider);

      jsonHeartbeat = startJsonHeartbeatStream(res);

      const text = await withRetry(
        key =>
          callOpenAiVision(
            key,
            `As an expert barista AI (Baristachaw) adhering to SCA standards, analyze this image. ${promptForModel}`,
            attachment.payload.data,
            attachment.payload.mimeType,
            activeModel,
          ),
        { provider: 'OPENAI', requestId, action, maxRetries: 1 },
      );

      console.info(`[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms provider=${activeProvider} model=${activeModel}`);
      return jsonHeartbeat.end({ ok: true, requestId, action, text, provider: activeProvider, model: activeModel });
    }

    if (action === 'analyze_attachment') {
      const attachment = await resolveInlineAttachmentPayload(image, mimeType, {
        allowAnySupportedAttachment: true,
      });
      if (attachment.ok === false) {
        return res.status(attachment.statusCode).json({
          ok: false,
          requestId,
          action,
          error: attachment.error,
          errorCode: 'validation_error',
          retryable: false,
        });
      }

      const visionModel = resolveGeminiVisionModel(selectedModel);
      res.setHeader('X-Model', visionModel);
      res.setHeader('X-Attachment-Bytes', String(attachment.payload.byteLength));
      res.setHeader('X-Attachment-Mime', attachment.payload.mimeType);
      jsonHeartbeat = startJsonHeartbeatStream(res);

      const text = await withRetry(
        key =>
          callGeminiWithInlineData(
            key,
            `As Baristachaw, an expert barista AI adhering to SCA standards, analyze this attachment carefully. ${promptForModel}`,
            attachment.payload.data,
            attachment.payload.mimeType,
            visionModel,
          ),
        { provider: 'GEMINI', requestId, action, maxRetries: 1 },
      );

      console.info(`[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms`);
      return jsonHeartbeat.end({ ok: true, requestId, action, text, provider: 'GEMINI', model: visionModel });
    }

    if (action === 'analyze_text') {
      if (typeof textContent !== 'string' || !textContent.trim()) {
        return sendBadRequest(res, requestId, action, 'textContent required for analyze_text');
      }

      const text = await withRetry(
        key =>
          callGemini(
            key,
            `${promptForModel}\n\nDocument content:\n${textContent}`,
            selectedModel || 'gemini-2.5-flash',
          ),
        { provider: 'GEMINI', requestId, action, maxRetries: 1 },
      );

      console.info(`[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms`);
      return res.json({ ok: true, requestId, action, text });
    }

    if (action === 'transcribe') {
      const attachment = await resolveInlineAttachmentPayload(image, mimeType, {
        expectedMimePrefix: 'audio/',
      });
      if (attachment.ok === false) {
        return res.status(attachment.statusCode).json({
          ok: false,
          requestId,
          action,
          error: attachment.error,
          errorCode: 'validation_error',
          retryable: false,
        });
      }

      const visionModel = resolveGeminiVisionModel(selectedModel);
      res.setHeader('X-Model', visionModel);
      res.setHeader('X-Attachment-Bytes', String(attachment.payload.byteLength));
      jsonHeartbeat = startJsonHeartbeatStream(res);

      const text = await withRetry(
        key =>
          callGeminiWithInlineData(
            key,
            'Please transcribe this audio accurately.',
            attachment.payload.data,
            attachment.payload.mimeType,
            visionModel,
          ),
        { provider: 'GEMINI', requestId, action, maxRetries: 1 },
      );

      console.info(`[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms`);
      return jsonHeartbeat.end({ ok: true, requestId, action, text, provider: 'GEMINI', model: visionModel });
    }

    if (action === 'generate_image') {
      const imageDataUrl = await withRetry(
        key => callGeminiImage(key, prompt),
        { provider: 'GEMINI', requestId, action },
      );
      if (!imageDataUrl) {
        throw createApiError('provider_error', 'Image generation returned no image', 502, true, 'GEMINI');
      }

      console.info(`[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms`);
      return res.json({ ok: true, requestId, action, imageDataUrl });
    }

    if (action === 'edit_latte_art') {
      const attachment = await resolveInlineAttachmentPayload(image, mimeType, {
        expectedMimePrefix: 'image/',
      });
      if (attachment.ok === false) {
        return res.status(attachment.statusCode).json({
          ok: false,
          requestId,
          action,
          error: attachment.error,
          errorCode: 'validation_error',
          retryable: false,
        });
      }
      if (!isSupportedInlineAttachmentMime(attachment.payload.mimeType)) {
        return sendBadRequest(
          res,
          requestId,
          action,
          'Unsupported image mimeType for edit_latte_art',
        );
      }

      res.setHeader('X-Attachment-Bytes', String(attachment.payload.byteLength));
      jsonHeartbeat = startJsonHeartbeatStream(res);

      const openaiKeys = getAiProviderKeys('OPENAI');
      const useOpenAi = openaiKeys.length > 0;

      if (!useOpenAi) {
        throw createApiError('no_key', 'OPENAI_API_KEY or SCANNER_API_KEY is required for edit_latte_art', 401, false, 'OPENAI');
      }

      const edited = await withRetry(
        key => callOpenAiImageEdit(key, {
          base64Image: attachment.payload.data,
          mimeType: attachment.payload.mimeType,
          prompt,
        }),
        { provider: 'OPENAI', requestId, action, maxRetries: 1 },
      );

      console.info(
        `[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms provider=OPENAI model=${edited.model}`,
      );
      return jsonHeartbeat.end({
        ok: true,
        requestId,
        action,
        imageDataUrl: edited.imageDataUrl,
        provider: 'OPENAI',
        model: edited.model,
      });
    }

    if (action === 'generate_speech') {
      const audioDataUrl = await withRetry(
        key => callGeminiSpeech(key, prompt),
        { provider: 'GEMINI', requestId, action },
      );
      if (!audioDataUrl) {
        throw createApiError('provider_error', 'Speech generation returned no audio', 502, true, 'GEMINI');
      }

      console.info(`[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms`);
      return res.json({ ok: true, requestId, action, audioDataUrl });
    }

    if (action === 'fast' || action === 'balanced') {
      const canTryGemini = !isGeminiTextDisabled();
      const userPrompt = prompt.trim();
      const isBalancedAction = action === 'balanced';
      const geminiModel = isBalancedAction
        ? (selectedModel || 'gemini-2.5-flash')
        : (selectedModel || 'gemini-2.5-flash');
      const geminiPrompt = isBalancedAction
        ? `As Baristachaw, an expert coffee assistant, answer with practical, scoped guidance and moderate detail. Stay tightly aligned to the latest user request. Do not roleplay as a cashier, POS bot, or take a drink order unless the user explicitly asks for an ordering simulation. For greetings or very short openers, greet back briefly and ask what they need.\n\n${promptForModel}`
        : `As Baristachaw, an expert coffee assistant, answer concisely and helpfully. Do not roleplay as a cashier, POS bot, or take a drink order unless the user explicitly asks for an ordering simulation. For greetings or very short openers, greet back briefly and ask what they need.\n\n${promptForModel}`;
      const responseMode: ResponseMode = isBalancedAction ? 'normal' : 'fast';
      const fallbackAction = isBalancedAction ? 'balanced' : 'fast';
      try {
        if (!canTryGemini) {
          throw createApiError('invalid_key', `Gemini temporarily bypassed for ${action} action`, 401, false, 'GEMINI');
        }
        const rawText = await withRetry(
          key =>
            callGemini(
              key,
              geminiPrompt,
              geminiModel,
              isBalancedAction ? { temperature: 0.45 } : undefined,
              isBalancedAction ? 28_000 : GEMINI_TEXT_PROVIDER_TIMEOUT_MS,
            ),
          { provider: 'GEMINI', requestId, action, maxRetries: isBalancedAction ? 2 : 1 },
        );
        const repaired = await repairOutputIfNeeded({
          rawText,
          mode: responseMode,
          originalPrompt: userPrompt,
          resolved: promptPlan.resolved,
          action,
          requestId,
          req,
          clientContext,
          conversationContext,
          agentProfile,
        });

        console.info(
          `[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms provider=GEMINI fallback_count=0 repaired=${repaired.repaired ? 1 : 0} integrity_pass=${repaired.integrityPass}`,
        );
        recordAiProviderUsage({
          provider: 'GEMINI',
          model: geminiModel,
          feature: usageFeature,
          route: '/api/ai',
          action,
          mode: responseMode,
          outcome: 'success',
          inputTokens: estimateAiTokenCount(geminiPrompt),
          outputTokens: estimateAiTokenCount(repaired.text),
          latencyMs: Date.now() - startedAt,
        });
        return res.json({ ok: true, requestId, action, text: repaired.text, provider: 'GEMINI' });
      } catch (geminiError) {
        const classifiedGemini = classifyProviderError(geminiError, 'GEMINI');
        if (classifiedGemini.code === 'invalid_key' || classifiedGemini.code === 'no_key') {
          disableGeminiTextTemporarily();
        }
        const fallback = await callStructuredTextFallback(
          fallbackAction,
          promptForModel,
          promptPlan.resolved,
            clientContext,
            conversationContext,
            agentProfile,
            requestId,
            req,
          );
        const repaired = await repairOutputIfNeeded({
          rawText: fallback.text,
          mode: responseMode,
          originalPrompt: userPrompt,
          resolved: promptPlan.resolved,
          action,
          requestId,
          req,
          clientContext,
          conversationContext,
          agentProfile,
        });
        console.info(
          `[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms provider=${fallback.provider} mode=fallback fallback_count=1 repaired=${repaired.repaired ? 1 : 0} integrity_pass=${repaired.integrityPass}`,
        );
        recordAiProviderUsage({
          provider: fallback.provider,
          model: fallback.model,
          feature: usageFeature,
          route: '/api/ai',
          action,
          mode: responseMode,
          outcome: 'success',
          inputTokens: estimateAiTokenCount(promptForModel),
          outputTokens: estimateAiTokenCount(repaired.text),
          latencyMs: Date.now() - startedAt,
        });
        return res.json({
          ok: true,
          requestId,
          action,
          text: repaired.text,
          provider: fallback.provider,
          model: fallback.model,
          degraded: true,
          details: `Gemini unavailable: ${sanitizeErrorDetails(geminiError, 120)}`,
        });
      }
    }

    if (action === 'deep_think') {
      const canTryGemini = !isGeminiTextDisabled();
      const userPrompt = prompt.trim();
      const deepPrompt = buildDeepTemplatePrompt(promptForModel, { grounded: false });
      const deepGroundedPrompt = buildDeepTemplatePrompt(promptForModel, { grounded: true });
      const shouldGround = shouldUseDeepGrounding(userPrompt);
      let providerForResponse: string = 'GEMINI';
      let modelForResponse: string = selectedModel || 'gemini-2.5-flash';
      let grounded = false;
      let fallbackUsed = false;
      let sources: StructuredSearchSource[] = [];
      let chunks: unknown[] = [];
      let geminiFallbackDetails = '';
      const degradeReasons = new Set<string>();
      const evaluateDeepOutput = async (rawText: string) => {
        if (deepQualityGateEnabled) {
          return repairOutputIfNeeded({
            rawText,
            mode: 'deep',
            originalPrompt: userPrompt,
            resolved: promptPlan.resolved,
            action,
            requestId,
            req,
            clientContext,
            conversationContext,
            agentProfile,
          });
        }
        const text = sanitizeModelText(rawText);
        const integrity = evaluateIntegrity(text, 'deep', userPrompt);
        return {
          text,
          integrityPass: integrity.ok,
          deepQualityPass: integrity.deepQualityPass,
          repaired: false,
          issues: integrity.issues,
          shortByUserRequest: Boolean(integrity.deepQuality?.shortByUserRequest),
        };
      };
      try {
        if (!canTryGemini) {
          throw createApiError('invalid_key', 'Gemini temporarily bypassed for deep action', 401, false, 'GEMINI');
        }
        let rawText = '';

        if (shouldGround) {
          try {
            const groundedResult = await withRetry(
              key =>
                callGeminiSearch(
                  key,
                  deepGroundedPrompt,
                  selectedModel || 'gemini-2.5-flash',
                ),
              { provider: 'GEMINI', requestId, action, maxRetries: 1 },
            );
            const candidateText = sanitizeModelText(groundedResult.text);
            const candidateChunks = Array.isArray(groundedResult.chunks) ? groundedResult.chunks : [];
            const candidateSources = normalizeSearchSources(candidateChunks);
            if (candidateText && candidateSources.length > 0) {
              rawText = candidateText;
              grounded = true;
              chunks = candidateChunks;
              sources = candidateSources;
            } else {
              degradeReasons.add('grounding_unavailable');
              fallbackUsed = true;
            }
          } catch (groundingError) {
            degradeReasons.add('grounding_unavailable');
            fallbackUsed = true;
            geminiFallbackDetails = sanitizeErrorDetails(groundingError, 120);
          }
        }

        if (!rawText) {
          const { ThinkingLevel } = await import('@google/genai');
          rawText = await withRetry(
            key =>
              callGemini(
                key,
                deepPrompt,
                selectedModel || 'gemini-2.5-flash',
                { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
                GEMINI_DEEP_PROVIDER_TIMEOUT_MS,
              ),
            { provider: 'GEMINI', requestId, action, maxRetries: 1 },
          );
          rawText = sanitizeModelText(rawText);
          grounded = false;
          chunks = [];
          sources = [];
        }

        const quality = await evaluateDeepOutput(rawText);
        const qualityPass = Boolean(quality.deepQualityPass);
        if (!qualityPass) degradeReasons.add('deep_quality_fail');
        if (quality.shortByUserRequest) degradeReasons.add('short_by_user_request');

        const degraded = fallbackUsed || !qualityPass || quality.shortByUserRequest || degradeReasons.size > 0;
        const detailParts: string[] = [];
        if (degradeReasons.size > 0) detailParts.push(Array.from(degradeReasons).join(','));
        if (geminiFallbackDetails) detailParts.push(`grounding_details:${geminiFallbackDetails}`);
        if (!qualityPass && quality.issues.length > 0) detailParts.push(`quality_issues:${quality.issues.join('|')}`);
        const details = detailParts.length > 0 ? detailParts.join('; ') : undefined;
        const sourceCount = grounded ? sources.length : 0;
        const latencyMs = Date.now() - startedAt;
        const deepMeta = {
          mode: 'deep' as const,
          grounded,
          degraded,
          fallbackUsed,
          qualityPass,
          latencyMs,
          sourceCount,
        };
        res.setHeader('X-Deep-Quality-Pass', String(qualityPass));
        res.setHeader('X-Deep-Degraded', String(degraded));

        console.info(
          `[api/ai][${requestId}] action=${action} ok latency=${latencyMs}ms provider=${providerForResponse} grounded=${grounded ? 1 : 0} fallback_used=${fallbackUsed ? 1 : 0} deep_quality_pass=${qualityPass ? 1 : 0} source_count=${sourceCount} degraded=${degraded ? 1 : 0}`,
        );
        recordAiProviderUsage({
          provider: providerForResponse,
          model: modelForResponse,
          feature: usageFeature,
          route: '/api/ai',
          action,
          mode: 'deep',
          outcome: 'success',
          inputTokens: estimateAiTokenCount(grounded ? deepGroundedPrompt : deepPrompt),
          outputTokens: estimateAiTokenCount(quality.text),
          latencyMs,
        });
        return res.json({
          ok: true,
          requestId,
          action,
          text: quality.text,
          provider: providerForResponse,
          model: modelForResponse,
          degraded,
          details,
          chunks: grounded ? chunks : [],
          sources: grounded ? sources : [],
          sourceCount,
          deepMeta,
        });
      } catch (geminiError) {
        const classifiedGemini = classifyProviderError(geminiError, 'GEMINI');
        if (classifiedGemini.code === 'invalid_key' || classifiedGemini.code === 'no_key') {
          disableGeminiTextTemporarily();
        }
        fallbackUsed = true;
        degradeReasons.add('provider_fallback');
        geminiFallbackDetails = sanitizeErrorDetails(geminiError, 120);
        const fallback = await callStructuredTextFallback(
          'deep_think',
          deepPrompt,
          promptPlan.resolved,
          clientContext,
          conversationContext,
          agentProfile,
          requestId,
          req,
        );
        providerForResponse = fallback.provider;
        modelForResponse = fallback.model;
        grounded = false;
        chunks = [];
        sources = [];
        const quality = await evaluateDeepOutput(fallback.text);
        const qualityPass = Boolean(quality.deepQualityPass);
        if (!qualityPass) degradeReasons.add('deep_quality_fail');
        if (quality.shortByUserRequest) degradeReasons.add('short_by_user_request');
        const degraded = true;
        const detailParts: string[] = [Array.from(degradeReasons).join(',')];
        if (geminiFallbackDetails) detailParts.push(`gemini_unavailable:${geminiFallbackDetails}`);
        if (!qualityPass && quality.issues.length > 0) detailParts.push(`quality_issues:${quality.issues.join('|')}`);
        const details = detailParts.filter(Boolean).join('; ');
        const latencyMs = Date.now() - startedAt;
        const deepMeta = {
          mode: 'deep' as const,
          grounded: false,
          degraded,
          fallbackUsed: true,
          qualityPass,
          latencyMs,
          sourceCount: 0,
        };
        res.setHeader('X-Deep-Quality-Pass', String(qualityPass));
        res.setHeader('X-Deep-Degraded', 'true');
        console.info(
          `[api/ai][${requestId}] action=${action} ok latency=${latencyMs}ms provider=${fallback.provider} mode=fallback grounded=0 fallback_used=1 deep_quality_pass=${qualityPass ? 1 : 0} source_count=0 degraded=1`,
        );
        recordAiProviderUsage({
          provider: fallback.provider,
          model: fallback.model,
          feature: usageFeature,
          route: '/api/ai',
          action,
          mode: 'deep',
          outcome: 'success',
          inputTokens: estimateAiTokenCount(deepPrompt),
          outputTokens: estimateAiTokenCount(quality.text),
          latencyMs,
        });
        return res.json({
          ok: true,
          requestId,
          action,
          text: quality.text,
          provider: fallback.provider,
          model: fallback.model,
          degraded,
          details,
          chunks: [],
          sources: [],
          sourceCount: 0,
          deepMeta,
        });
      }
    }

    if (action === 'search') {
      const runSearchPass = async (searchPrompt: string) => {
        const rawResult = await withRetry(
          key =>
            callGeminiSearch(
              key,
              searchPrompt,
              selectedModel || 'gemini-2.5-flash',
            ),
          { provider: 'GEMINI', requestId, action },
        );
        const text = sanitizeModelText(rawResult.text);
        const chunks = Array.isArray(rawResult.chunks) ? rawResult.chunks : [];
        const sources = rankSearchSources(normalizeSearchSources(chunks));
        const quality = evaluateSearchGrounding(text, sources, { prompt: promptForModel });
        return { text, chunks, sources, quality };
      };

      let searchPass = await runSearchPass(buildWebSearchPrompt(promptForModel));
      const retrievedAt = Date.now();
      if (!searchPass.quality.ok && searchPass.quality.reason === 'insufficient_sources') {
        console.warn(
          `[api/ai][${requestId}] action=${action} retrying_search_grounding details=${searchPass.quality.details || searchPass.quality.reason} source_count=${searchPass.quality.sourceCount} unique_domains=${searchPass.quality.uniqueDomainCount}`,
        );
        searchPass = await runSearchPass(buildWebSearchRecoveryPrompt(promptForModel, searchPass.quality));
      }

      const { text, chunks, sources, quality } = searchPass;

      if (!quality.ok) {
        const errorCode = quality.reason === 'insufficient_sources' ? 'insufficient_sources' : 'search_unavailable';
        const error = quality.reason === 'insufficient_sources'
          ? `Insufficient live sources (min ${SEARCH_MIN_SOURCES}).`
          : 'Live web search unavailable. Please retry.';
        console.warn(
          `[api/ai][${requestId}] action=${action} degraded reason=${quality.reason} details=${quality.details || 'n/a'} source_count=${quality.sourceCount} unique_domains=${quality.uniqueDomainCount} authority_score=${quality.authorityScore} latency=${Date.now() - startedAt}ms`,
        );
        recordAiProviderFailure({
          provider: 'GEMINI',
          model: selectedModel || 'gemini-2.5-flash',
          feature: usageFeature,
          route: '/api/ai',
          action,
          mode: 'search',
          inputTokens: estimateAiTokenCount(promptForModel),
          latencyMs: Date.now() - startedAt,
          errorCode,
        });
        return res.status(200).json({
          ok: false,
          requestId,
          action,
          provider: 'GEMINI',
          error,
          errorCode,
          retryable: true,
          degraded: true,
          details: quality.details || quality.reason,
          text: '',
          chunks,
          sources,
          sourceCount: sources.length,
          retrievedAt,
        });
      }

      console.info(
        `[api/ai][${requestId}] action=${action} ok latency=${Date.now() - startedAt}ms source_count=${quality.sourceCount} unique_domains=${quality.uniqueDomainCount} authority_score=${quality.authorityScore}`,
      );
      recordAiProviderUsage({
        provider: 'GEMINI',
        model: selectedModel || 'gemini-2.5-flash',
        feature: usageFeature,
        route: '/api/ai',
        action,
        mode: 'search',
        outcome: 'success',
        inputTokens: estimateAiTokenCount(promptForModel),
        outputTokens: estimateAiTokenCount(text),
        latencyMs: Date.now() - startedAt,
      });
      return res.json({
        ok: true,
        requestId,
        action,
        text,
        chunks,
        sources,
        sourceCount: sources.length,
        retrievedAt,
        provider: 'GEMINI',
      });
    }

    throw createApiError('unknown_action', `Unsupported action flow: ${action}`, 400, false, 'GEMINI');
  } catch (error) {
    const classified = isApiOperationalError(error)
      ? error
      : classifyProviderError(error, 'GEMINI');
    const details = sanitizeErrorDetails(error);

    const imgSize = image && typeof image === 'string' ? Math.round(image.length * 0.75) : 0;
    const imgInfo = imgSize > 0 ? ` mimeType=${mimeType || 'unknown'} imgBytes=${imgSize}` : '';

    console.error(
      `[api/ai][${requestId}] action=${action} failed code=${classified.code} status=${classified.statusCode} retryable=${classified.retryable} latency=${Date.now() - startedAt}ms model=${selectedModel || 'unknown'}${imgInfo} details="${details}"`,
    );
    recordAiProviderFailure({
      provider: classified.provider || 'GEMINI',
      model: selectedModel || undefined,
      feature: usageFeature,
      route: '/api/ai',
      action,
      mode: promptPlan.mode,
      inputTokens: estimateAiTokenCount(promptForModel || ''),
      latencyMs: Date.now() - startedAt,
      errorCode: classified.code,
    });

    if (action === 'search') {
      if (jsonHeartbeat) {
        return jsonHeartbeat.end({
          ok: false,
          requestId,
          action,
          provider: classified.provider || 'GEMINI',
          error: 'Live web search unavailable. Please retry.',
          errorCode: 'search_unavailable',
          retryable: classified.retryable,
          degraded: true,
          details,
          text: '',
          chunks: [],
          sources: [],
          sourceCount: 0,
          retrievedAt: Date.now(),
        });
      }
      return res.status(200).json({
        ok: false,
        requestId,
        action,
        provider: classified.provider || 'GEMINI',
        error: 'Live web search unavailable. Please retry.',
        errorCode: 'search_unavailable',
        retryable: classified.retryable,
        degraded: true,
        details,
        text: '',
        chunks: [],
        sources: [],
        sourceCount: 0,
        retrievedAt: Date.now(),
      });
    }

    if (action === 'deep_think') {
      if (jsonHeartbeat) {
        return jsonHeartbeat.end({
          ok: false,
          requestId,
          action,
          provider: classified.provider || 'GEMINI',
          error: 'Deep mode unavailable. Please retry.',
          errorCode: classified.code,
          retryable: classified.retryable,
          degraded: true,
          details: `provider_fallback:${details}`,
          text: '',
          chunks: [],
          sources: [],
          sourceCount: 0,
          deepMeta: {
            mode: 'deep',
            grounded: false,
            degraded: true,
            fallbackUsed: true,
            qualityPass: false,
            latencyMs: Date.now() - startedAt,
            sourceCount: 0,
          },
        });
      }
      return res.status(200).json({
        ok: false,
        requestId,
        action,
        provider: classified.provider || 'GEMINI',
        error: 'Deep mode unavailable. Please retry.',
        errorCode: classified.code,
        retryable: classified.retryable,
        degraded: true,
        details: `provider_fallback:${details}`,
        text: '',
        chunks: [],
        sources: [],
        sourceCount: 0,
        deepMeta: {
          mode: 'deep',
          grounded: false,
          degraded: true,
          fallbackUsed: true,
          qualityPass: false,
          latencyMs: Date.now() - startedAt,
          sourceCount: 0,
        },
      });
    }

    if (jsonHeartbeat) {
      return jsonHeartbeat.end({
        ok: false,
        requestId,
        action,
        provider: classified.provider || 'GEMINI',
        error: 'AI operation encountered an issue',
        errorCode: classified.code,
        retryable: classified.retryable,
        degraded: true,
        details,
        text: FALLBACK_MESSAGE,
        chunks: [],
      });
    }

    return res.status(200).json({
      ok: false,
      requestId,
      action,
      provider: classified.provider || 'GEMINI',
      error: 'AI operation encountered an issue',
      errorCode: classified.code,
      retryable: classified.retryable,
      degraded: true,
      details,
      text: FALLBACK_MESSAGE,
      chunks: [],
    });
  }
}
