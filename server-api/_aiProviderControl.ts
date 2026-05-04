import {
  buildRuntimeFeatureFlags,
  RUNTIME_FEATURE_FLAG_PATCHES,
  type AdminFeatureFlag,
  type FeatureFlagStatus,
  type FeatureSurface,
} from './admin/_featureFlags.js';

export type AiProviderId = 'GEMINI' | 'GROQ' | 'DEEPSEEK' | 'MISTRAL' | 'OPENROUTER' | 'OPENAI';
export type AiProviderHealthStatus = 'unknown' | 'ok' | 'error' | 'rate_limited' | 'disabled' | 'unconfigured';
export type AiProviderKeyClass = 'standard' | 'paid_credit';
export type AiUsageFeature = 'ai_brew' | 'ai_chat' | 'ai_search' | 'scanner' | 'vision' | 'unknown';
export type AiUsageOutcome = 'success' | 'error' | 'rate_limited' | 'blocked';

export type AiProviderRegistryItem = {
  provider: AiProviderId;
  label: string;
  primaryModel: string;
  fallbackModels: string[];
  priority: number;
  tier: 'free_tier' | 'paid_credit_ready' | 'paid_credit';
  recommendedFor: Array<'ai_chat' | 'ai_brew' | 'deep_search' | 'structured_fallback' | 'vision'>;
  featureFlagKey: string;
};

export type AiProviderHealth = {
  status: AiProviderHealthStatus;
  lastCheckedAt: string;
  lastLatencyMs?: number;
  errorCode?: string;
  attempts: number;
  successes: number;
  failures: number;
};

export type AiProviderAdminStatus = AiProviderRegistryItem & {
  status: FeatureFlagStatus;
  configured: boolean;
  keyCount: number;
  standardKeyCount: number;
  paidKeyCount: number;
  health: AiProviderHealth;
  message: string;
  surfaces: FeatureSurface[];
};

export type AiProviderAdminSnapshot = {
  ready: boolean;
  enabledProviders: number;
  configuredProviders: number;
  paidCreditProviders: number;
  fallbackPolicy: 'admin_controlled_provider_chain';
  securityNote: string;
  providers: AiProviderAdminStatus[];
  usage: AiBrewProviderUsageSnapshot;
  warnings: string[];
};

export type AiUsageRangeInput = {
  from?: string;
  to?: string;
};

export type AiUsageBreakdown = {
  key: string;
  label: string;
  requests: number;
  successes: number;
  failures: number;
  rateLimited: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs?: number;
};

export type AiUsageAggregate = {
  label: 'today' | 'month' | 'custom';
  range: {
    from: string;
    to: string;
  };
  requests: number;
  successes: number;
  failures: number;
  rateLimited: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs?: number;
  providerBreakdown: AiUsageBreakdown[];
  modelBreakdown: AiUsageBreakdown[];
  actionBreakdown: AiUsageBreakdown[];
};

export type AiUsageEventPublic = {
  id: string;
  createdAt: string;
  provider: AiProviderId;
  providerLabel: string;
  model: string;
  feature: AiUsageFeature;
  route: '/api/ai' | '/api/chat' | 'unknown';
  action: string;
  mode: string;
  outcome: AiUsageOutcome;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs?: number;
  errorCode?: string;
};

export type AiBrewProviderUsageSnapshot = {
  source: 'runtime_estimate';
  currency: 'USD';
  estimationNote: string;
  retainedEvents: number;
  today: AiUsageAggregate;
  month: AiUsageAggregate;
  custom: AiUsageAggregate;
  recentEvents: AiUsageEventPublic[];
};

type AiUsageEvent = AiUsageEventPublic & {
  createdAtMs: number;
};

const AI_PROVIDER_REGISTRY: AiProviderRegistryItem[] = [
  {
    provider: 'GROQ',
    label: 'Groq',
    primaryModel: 'llama-3.3-70b-versatile',
    fallbackModels: ['llama-3.1-8b-instant'],
    priority: 1,
    tier: 'free_tier',
    recommendedFor: ['ai_chat', 'ai_brew', 'structured_fallback'],
    featureFlagKey: 'ai_provider_groq',
  },
  {
    provider: 'GEMINI',
    label: 'Gemini',
    primaryModel: 'gemini-2.5-flash',
    fallbackModels: ['gemini-2.5-flash-lite-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    priority: 2,
    tier: 'free_tier',
    recommendedFor: ['ai_chat', 'ai_brew', 'deep_search', 'vision'],
    featureFlagKey: 'ai_provider_gemini',
  },
  {
    provider: 'DEEPSEEK',
    label: 'DeepSeek',
    primaryModel: 'deepseek-chat',
    fallbackModels: [],
    priority: 3,
    tier: 'free_tier',
    recommendedFor: ['ai_chat', 'ai_brew', 'structured_fallback'],
    featureFlagKey: 'ai_provider_deepseek',
  },
  {
    provider: 'MISTRAL',
    label: 'Mistral',
    primaryModel: 'mistral-large-latest',
    fallbackModels: [],
    priority: 4,
    tier: 'free_tier',
    recommendedFor: ['ai_chat', 'ai_brew', 'structured_fallback'],
    featureFlagKey: 'ai_provider_mistral',
  },
  {
    provider: 'OPENAI',
    label: 'OpenAI',
    primaryModel: 'gpt-4o-mini',
    fallbackModels: [],
    priority: 5,
    tier: 'paid_credit_ready',
    recommendedFor: ['ai_chat', 'ai_brew', 'structured_fallback', 'vision'],
    featureFlagKey: 'ai_provider_openai',
  },
  {
    provider: 'OPENROUTER',
    label: 'OpenRouter',
    primaryModel: 'meta-llama/llama-3.2-3b-instruct:free',
    fallbackModels: [],
    priority: 6,
    tier: 'free_tier',
    recommendedFor: ['ai_chat', 'ai_brew', 'structured_fallback'],
    featureFlagKey: 'ai_provider_openrouter',
  },
];

const HEALTH_STATE = new Map<AiProviderId, AiProviderHealth>();
const AI_USAGE_EVENTS: AiUsageEvent[] = [];
const AI_USAGE_EVENT_LIMIT = 2500;

const DEFAULT_COST_RATES_USD_PER_1M: Record<string, { input: number; output: number }> = {
  'GEMINI:gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'GEMINI:gemini-2.5-flash-lite-latest': { input: 0.1, output: 0.4 },
  'GEMINI:gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'GEMINI:gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'GROQ:llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'GROQ:llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'DEEPSEEK:deepseek-chat': { input: 0.27, output: 1.1 },
  'MISTRAL:mistral-large-latest': { input: 2, output: 6 },
  'OPENAI:gpt-4o-mini': { input: 0.15, output: 0.6 },
  'OPENROUTER:meta-llama/llama-3.2-3b-instruct:free': { input: 0, output: 0 },
};

function nowIso(): string {
  return new Date().toISOString();
}

function usageTimezoneOffsetMs(): number {
  const minutes = envNumber('AI_USAGE_TIMEZONE_OFFSET_MINUTES') ?? envNumber('APP_TIMEZONE_OFFSET_MINUTES') ?? 480;
  return Math.round(minutes) * 60 * 1000;
}

function dateStartUtc(date: Date, mode: 'day' | 'month'): Date {
  const offsetMs = usageTimezoneOffsetMs();
  const shifted = new Date(date.getTime() + offsetMs);
  if (mode === 'month') {
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1, 0, 0, 0, 0) - offsetMs);
  }
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, 0, 0, 0) - offsetMs);
}

function parseRangeDate(value: string | undefined, fallback: Date): Date {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map((part) => Number(part));
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - usageTimezoneOffsetMs());
  }
  const dateOnly = raw;
  const parsed = new Date(dateOnly);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function parseRangeEndDate(value: string | undefined, fallback: Date): Date {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map((part) => Number(part));
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - usageTimezoneOffsetMs());
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function sanitizeUsageLabel(value: unknown, fallback = ''): string {
  const text = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, 96);
}

function normalizeUsageFeature(value: unknown): AiUsageFeature {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'ai_brew' || raw === 'brew' || raw === 'tools') return 'ai_brew';
  if (raw === 'chat' || raw === 'ai_chat') return 'ai_chat';
  if (raw === 'search' || raw === 'ai_search' || raw === 'deep_search') return 'ai_search';
  if (raw === 'scanner') return 'scanner';
  if (raw === 'vision' || raw === 'image') return 'vision';
  return 'unknown';
}

function usageOutcomeFromError(errorCode?: string): AiUsageOutcome {
  const code = String(errorCode || '').toLowerCase();
  if (code === 'quota_exceeded' || code === 'rate_limited' || code === 'resource_exhausted') return 'rate_limited';
  if (code === 'provider_disabled' || code === 'feature_disabled' || code === 'blocked') return 'blocked';
  return 'error';
}

function envNumber(name: string): number | undefined {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function costEnvModelKey(provider: AiProviderId, model: string, direction: 'INPUT' | 'OUTPUT'): string {
  const modelKey = model.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `AI_COST_${provider}_${modelKey}_${direction}_USD_PER_1M`;
}

function estimateCostUsd(provider: AiProviderId, model: string, inputTokens: number, outputTokens: number): number {
  const normalizedModel = sanitizeUsageLabel(model, providerConfig(provider).primaryModel);
  const specific = DEFAULT_COST_RATES_USD_PER_1M[`${provider}:${normalizedModel}`];
  const providerInput = envNumber(`AI_COST_${provider}_INPUT_USD_PER_1M`);
  const providerOutput = envNumber(`AI_COST_${provider}_OUTPUT_USD_PER_1M`);
  const inputRate = envNumber(costEnvModelKey(provider, normalizedModel, 'INPUT'))
    ?? providerInput
    ?? specific?.input
    ?? envNumber('AI_COST_DEFAULT_INPUT_USD_PER_1M')
    ?? 0;
  const outputRate = envNumber(costEnvModelKey(provider, normalizedModel, 'OUTPUT'))
    ?? providerOutput
    ?? specific?.output
    ?? envNumber('AI_COST_DEFAULT_OUTPUT_USD_PER_1M')
    ?? 0;
  const inputCost = Math.max(0, inputTokens) / 1_000_000 * inputRate;
  const outputCost = Math.max(0, outputTokens) / 1_000_000 * outputRate;
  return Number((inputCost + outputCost).toFixed(8));
}

function emptyAggregate(label: AiUsageAggregate['label'], from: Date, to: Date): AiUsageAggregate {
  return {
    label,
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    requests: 0,
    successes: 0,
    failures: 0,
    rateLimited: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    providerBreakdown: [],
    modelBreakdown: [],
    actionBreakdown: [],
  };
}

function buildBreakdown(events: AiUsageEvent[], getKey: (event: AiUsageEvent) => { key: string; label: string }): AiUsageBreakdown[] {
  const grouped = new Map<string, AiUsageBreakdown & { latencyTotal: number; latencyCount: number }>();
  for (const event of events) {
    const itemKey = getKey(event);
    const current = grouped.get(itemKey.key) || {
      key: itemKey.key,
      label: itemKey.label,
      requests: 0,
      successes: 0,
      failures: 0,
      rateLimited: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyTotal: 0,
      latencyCount: 0,
    };
    current.requests += 1;
    current.successes += event.outcome === 'success' ? 1 : 0;
    current.failures += event.outcome === 'success' ? 0 : 1;
    current.rateLimited += event.outcome === 'rate_limited' ? 1 : 0;
    current.inputTokens += event.inputTokens;
    current.outputTokens += event.outputTokens;
    current.totalTokens += event.totalTokens;
    current.estimatedCostUsd = Number((current.estimatedCostUsd + event.estimatedCostUsd).toFixed(8));
    if (typeof event.latencyMs === 'number') {
      current.latencyTotal += event.latencyMs;
      current.latencyCount += 1;
    }
    grouped.set(itemKey.key, current);
  }
  return Array.from(grouped.values())
    .sort((a, b) => b.requests - a.requests || a.label.localeCompare(b.label))
    .map(({ latencyTotal, latencyCount, ...item }) => ({
      ...item,
      estimatedCostUsd: Number(item.estimatedCostUsd.toFixed(8)),
      avgLatencyMs: latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : undefined,
    }));
}

function buildAggregate(label: AiUsageAggregate['label'], from: Date, to: Date, events: AiUsageEvent[]): AiUsageAggregate {
  const selected = events.filter((event) => event.createdAtMs >= from.getTime() && event.createdAtMs <= to.getTime());
  const base = emptyAggregate(label, from, to);
  let latencyTotal = 0;
  let latencyCount = 0;
  for (const event of selected) {
    base.requests += 1;
    base.successes += event.outcome === 'success' ? 1 : 0;
    base.failures += event.outcome === 'success' ? 0 : 1;
    base.rateLimited += event.outcome === 'rate_limited' ? 1 : 0;
    base.inputTokens += event.inputTokens;
    base.outputTokens += event.outputTokens;
    base.totalTokens += event.totalTokens;
    base.estimatedCostUsd = Number((base.estimatedCostUsd + event.estimatedCostUsd).toFixed(8));
    if (typeof event.latencyMs === 'number') {
      latencyTotal += event.latencyMs;
      latencyCount += 1;
    }
  }
  base.avgLatencyMs = latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : undefined;
  base.providerBreakdown = buildBreakdown(selected, (event) => ({ key: event.provider, label: event.providerLabel }));
  base.modelBreakdown = buildBreakdown(selected, (event) => ({ key: `${event.provider}:${event.model}`, label: `${event.providerLabel} / ${event.model}` }));
  base.actionBreakdown = buildBreakdown(selected, (event) => ({ key: `${event.route}:${event.action}:${event.mode}`, label: `${event.action}${event.mode ? ` / ${event.mode}` : ''}` }));
  return base;
}

function resolveAiBrewProviderUsageSnapshot(range?: AiUsageRangeInput): AiBrewProviderUsageSnapshot {
  const now = new Date();
  const todayStart = dateStartUtc(now, 'day');
  const monthStart = dateStartUtc(now, 'month');
  const defaultCustomStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const customStart = parseRangeDate(range?.from, dateStartUtc(defaultCustomStart, 'day'));
  const customEnd = parseRangeEndDate(range?.to, now);
  const safeCustomStart = customStart.getTime() <= customEnd.getTime() ? customStart : dateStartUtc(defaultCustomStart, 'day');
  const safeCustomEnd = customStart.getTime() <= customEnd.getTime() ? customEnd : now;
  const events = AI_USAGE_EVENTS.filter((event) => event.feature === 'ai_brew');
  return {
    source: 'runtime_estimate',
    currency: 'USD',
    estimationNote: 'Runtime estimate for online AI provider calls used by AI Brew. Token and cost values are approximate; exact billing remains in each provider dashboard. Day/month boundaries use APP_TIMEZONE_OFFSET_MINUTES or AI_USAGE_TIMEZONE_OFFSET_MINUTES, default UTC+8.',
    retainedEvents: events.length,
    today: buildAggregate('today', todayStart, now, events),
    month: buildAggregate('month', monthStart, now, events),
    custom: buildAggregate('custom', safeCustomStart, safeCustomEnd, events),
    recentEvents: events.slice(-20).reverse().map(({ createdAtMs: _createdAtMs, ...event }) => event),
  };
}

export function estimateAiTokenCount(text: string): number {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function splitKeys(raw: string): string[] {
  return raw
    .split(/[\n,;]+/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 5)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function readEnvList(names: string[]): string[] {
  return names.flatMap((name) => splitKeys(String(process.env[name] || '')));
}

function keyEnvNames(provider: AiProviderId, keyClass: AiProviderKeyClass): string[] {
  if (keyClass === 'paid_credit') {
    return [
      `AI_PAID_${provider}_API_KEY`,
      `AI_BREW_PAID_${provider}_API_KEY`,
      `PAID_${provider}_API_KEY`,
    ];
  }
  return [
    `${provider}_API_KEY`,
    `AI_${provider}_API_KEY`,
    `AI_BREW_${provider}_API_KEY`,
    ...(provider === 'GEMINI' ? ['GOOGLE_GENAI_API_KEY', 'GOOGLE_API_KEY'] : []),
  ];
}

function normalizeProvider(value: string): AiProviderId | null {
  const upper = value.trim().toUpperCase();
  return AI_PROVIDER_REGISTRY.some((item) => item.provider === upper)
    ? upper as AiProviderId
    : null;
}

function getFeatureFlagStatus(provider: AiProviderId, flags?: AdminFeatureFlag[]): AdminFeatureFlag | undefined {
  const key = providerConfig(provider).featureFlagKey;
  const source = flags || buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
  return source.find((flag) => flag.key === key);
}

export function providerConfig(provider: AiProviderId): AiProviderRegistryItem {
  const config = AI_PROVIDER_REGISTRY.find((item) => item.provider === provider);
  if (!config) throw new Error(`Unknown AI provider: ${provider}`);
  return config;
}

export function listAiProviderConfigs(): AiProviderRegistryItem[] {
  return AI_PROVIDER_REGISTRY.map((item) => ({ ...item, fallbackModels: [...item.fallbackModels], recommendedFor: [...item.recommendedFor] }));
}

export function getAiProviderKeys(provider: AiProviderId): string[] {
  const standard = readEnvList(keyEnvNames(provider, 'standard'));
  const paid = readEnvList(keyEnvNames(provider, 'paid_credit'));
  return [...new Set([...standard, ...paid])];
}

export function getAiProviderKeyCounts(provider: AiProviderId): { standardKeyCount: number; paidKeyCount: number; keyCount: number } {
  const standard = readEnvList(keyEnvNames(provider, 'standard'));
  const paid = readEnvList(keyEnvNames(provider, 'paid_credit'));
  return {
    standardKeyCount: standard.length,
    paidKeyCount: paid.length,
    keyCount: new Set([...standard, ...paid]).size,
  };
}

export function isAiProviderAvailable(provider: AiProviderId, flags?: AdminFeatureFlag[]): boolean {
  const flag = getFeatureFlagStatus(provider, flags);
  return (flag?.status || 'available') === 'available';
}

export function getEnabledAiProviderConfigs<T extends { provider: AiProviderId }>(configs: T[], flags?: AdminFeatureFlag[]): T[] {
  return configs.filter((config) => isAiProviderAvailable(config.provider, flags));
}

export function aiProviderDisabledMessage(provider: AiProviderId): string {
  const flag = getFeatureFlagStatus(provider);
  const message = String(flag?.message || '').replace(/\s+/g, ' ').trim();
  if (flag?.status === 'disabled') {
    return message || `${providerConfig(provider).label} dimatikan dari Admin.`;
  }
  if (flag?.status === 'maintenance') {
    return message || `${providerConfig(provider).label} sedang maintenance.`;
  }
  return '';
}

export function registerAiProviderResult(params: {
  provider: AiProviderId;
  ok: boolean;
  latencyMs?: number;
  errorCode?: string;
}): void {
  const previous = HEALTH_STATE.get(params.provider) || {
    status: 'unknown' as const,
    lastCheckedAt: nowIso(),
    attempts: 0,
    successes: 0,
    failures: 0,
  };
  const normalizedError = String(params.errorCode || '').replace(/[^a-z0-9_:-]+/gi, '').slice(0, 48);
  const nextStatus: AiProviderHealthStatus = params.ok
    ? 'ok'
    : normalizedError === 'quota_exceeded' || normalizedError === 'rate_limited'
      ? 'rate_limited'
      : 'error';
  HEALTH_STATE.set(params.provider, {
    status: nextStatus,
    lastCheckedAt: nowIso(),
    lastLatencyMs: typeof params.latencyMs === 'number' && Number.isFinite(params.latencyMs)
      ? Math.max(0, Math.round(params.latencyMs))
      : previous.lastLatencyMs,
    errorCode: params.ok ? undefined : normalizedError || 'provider_error',
    attempts: previous.attempts + 1,
    successes: previous.successes + (params.ok ? 1 : 0),
    failures: previous.failures + (params.ok ? 0 : 1),
  });
}

export function recordAiProviderUsage(params: {
  provider: AiProviderId | string;
  model?: string;
  feature?: AiUsageFeature | string;
  route?: '/api/ai' | '/api/chat' | 'unknown';
  action?: string;
  mode?: string;
  outcome: AiUsageOutcome;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorCode?: string;
}): void {
  const provider = typeof params.provider === 'string' ? normalizeProvider(params.provider) : params.provider;
  if (!provider) return;
  const config = providerConfig(provider);
  const model = sanitizeUsageLabel(params.model, config.primaryModel);
  const inputTokens = Math.max(0, Math.round(Number(params.inputTokens) || 0));
  const outputTokens = Math.max(0, Math.round(Number(params.outputTokens) || 0));
  const totalTokens = inputTokens + outputTokens;
  const createdAtMs = Date.now();
  const errorCode = sanitizeUsageLabel(params.errorCode, '').replace(/[^a-z0-9_:-]+/gi, '').slice(0, 48) || undefined;
  const event: AiUsageEvent = {
    id: `ai_usage_${createdAtMs}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date(createdAtMs).toISOString(),
    createdAtMs,
    provider,
    providerLabel: config.label,
    model,
    feature: normalizeUsageFeature(params.feature),
    route: params.route || 'unknown',
    action: sanitizeUsageLabel(params.action, 'unknown'),
    mode: sanitizeUsageLabel(params.mode, ''),
    outcome: params.outcome,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd(provider, model, inputTokens, outputTokens),
    latencyMs: typeof params.latencyMs === 'number' && Number.isFinite(params.latencyMs)
      ? Math.max(0, Math.round(params.latencyMs))
      : undefined,
    errorCode,
  };
  AI_USAGE_EVENTS.push(event);
  if (AI_USAGE_EVENTS.length > AI_USAGE_EVENT_LIMIT) {
    AI_USAGE_EVENTS.splice(0, AI_USAGE_EVENTS.length - AI_USAGE_EVENT_LIMIT);
  }
}

export function recordAiProviderFailure(params: {
  provider: AiProviderId | string;
  model?: string;
  feature?: AiUsageFeature | string;
  route?: '/api/ai' | '/api/chat' | 'unknown';
  action?: string;
  mode?: string;
  inputTokens?: number;
  latencyMs?: number;
  errorCode?: string;
}): void {
  recordAiProviderUsage({
    ...params,
    outputTokens: 0,
    outcome: usageOutcomeFromError(params.errorCode),
  });
}

export function resetAiProviderRuntimeStateForTests(): void {
  HEALTH_STATE.clear();
  AI_USAGE_EVENTS.splice(0);
}

export function resolveAiProviderAdminSnapshot(flags?: AdminFeatureFlag[], usageRange?: AiUsageRangeInput): AiProviderAdminSnapshot {
  const providers = AI_PROVIDER_REGISTRY.map((config) => {
    const flag = getFeatureFlagStatus(config.provider, flags);
    const status = flag?.status || 'available';
    const keyCounts = getAiProviderKeyCounts(config.provider);
    const defaultSurfaces: FeatureSurface[] = ['global', 'web', 'pwa', 'mobile', 'admin'];
    const health = HEALTH_STATE.get(config.provider) || {
      status: status !== 'available'
        ? 'disabled'
        : keyCounts.keyCount > 0
          ? 'unknown'
          : 'unconfigured',
      lastCheckedAt: new Date(0).toISOString(),
      attempts: 0,
      successes: 0,
      failures: 0,
    };
    const tier = keyCounts.paidKeyCount > 0 ? 'paid_credit' : config.tier;
    return {
      ...config,
      tier,
      status,
      configured: keyCounts.keyCount > 0,
      ...keyCounts,
      health,
      message: flag?.message || '',
      surfaces: flag?.surfaces?.length ? flag.surfaces : defaultSurfaces,
    };
  });
  const enabledProviders = providers.filter((item) => item.status === 'available').length;
  const configuredProviders = providers.filter((item) => item.configured).length;
  const paidCreditProviders = providers.filter((item) => item.paidKeyCount > 0).length;
  const warnings: string[] = [];
  if (configuredProviders === 0) warnings.push('Tidak ada provider AI server yang punya API key aktif.');
  if (enabledProviders === 0) warnings.push('Semua provider AI sedang dimatikan atau maintenance dari Admin.');
  if (providers.some((item) => item.health.status === 'rate_limited')) {
    warnings.push('Ada provider AI terkena rate limit/quota. Siapkan paid credit key atau ubah prioritas sementara.');
  }
  return {
    ready: enabledProviders > 0 && configuredProviders > 0,
    enabledProviders,
    configuredProviders,
    paidCreditProviders,
    fallbackPolicy: 'admin_controlled_provider_chain',
    securityNote: 'Admin hanya melihat status, jumlah key, model, dan error code tersanitasi. Nilai API key tidak pernah dikirim ke browser.',
    providers,
    usage: resolveAiBrewProviderUsageSnapshot(usageRange),
    warnings,
  };
}

export function parseAiProviderId(value: string): AiProviderId | null {
  return normalizeProvider(value);
}
