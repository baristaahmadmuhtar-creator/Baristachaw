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
  warnings: string[];
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

function nowIso(): string {
  return new Date().toISOString();
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

export function resolveAiProviderAdminSnapshot(flags?: AdminFeatureFlag[]): AiProviderAdminSnapshot {
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
    warnings,
  };
}

export function parseAiProviderId(value: string): AiProviderId | null {
  return normalizeProvider(value);
}
