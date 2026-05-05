import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  classifyProviderError,
  createRequestId,
  sanitizeErrorDetails,
} from './_shared.js';
import {
  getAiProviderKeys,
  registerAiProviderResult,
  type AiProviderId,
} from './_aiProviderControl.js';

type CheckStatus = 'ok' | 'fail' | 'skipped';

const PROVIDERS: readonly AiProviderId[] = ['GEMINI', 'GROQ', 'DEEPSEEK', 'MISTRAL', 'OPENAI', 'OPENROUTER'];

function providerKeys(provider: AiProviderId): string[] {
  return getAiProviderKeys(provider);
}

function firstProviderKey(provider: AiProviderId): string {
  return providerKeys(provider)[0] || '';
}

function hasProviderKey(provider: AiProviderId): boolean {
  return providerKeys(provider).length > 0;
}

function readEnvList(...names: string[]): Set<string> {
  const raw = names.map(name => process.env[name] || '').join(',');
  return new Set(
    raw
      .split(/[\n,;]+/)
      .map(value => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isProviderDisabled(provider: string): boolean {
  const providerKey = provider.trim().toLowerCase();
  const disabled = readEnvList('DISABLED_FEATURES', 'APP_DISABLED_FEATURES');
  return disabled.has(providerKey) || disabled.has(`ai_provider_${providerKey}`);
}

function readDeepCheckRequested(req: VercelRequest): boolean {
  const queryValue = req.query.deep;
  const headerValue = req.headers['x-health-deep'];
  const queryText = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  const headerText = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const merged = `${queryText || ''}`.toLowerCase() || `${headerText || ''}`.toLowerCase();
  return merged === '1' || merged === 'true' || merged === 'yes';
}

function readHealthToken(req: VercelRequest): string {
  const queryValue = req.query.token;
  const headerValue = req.headers['x-health-token'];
  if (Array.isArray(headerValue)) return (headerValue[0] || '').trim();
  if (typeof headerValue === 'string') return headerValue.trim();
  if (Array.isArray(queryValue)) return (queryValue[0] || '').trim();
  return typeof queryValue === 'string' ? queryValue.trim() : '';
}

async function probeGeminiKey(key: string): Promise<{
  status: CheckStatus;
  code?: string;
  detail: string;
  latencyMs: number;
}> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (response.ok) {
      registerAiProviderResult({ provider: 'GEMINI', ok: true, latencyMs });
      return { status: 'ok', detail: 'Gemini key is valid for API access', latencyMs };
    }

    const body = await response.text().catch(() => '');
    const classified = classifyProviderError(`HTTP ${response.status}: ${body}`, 'GEMINI');
    registerAiProviderResult({ provider: 'GEMINI', ok: false, errorCode: classified.code, latencyMs });
    return {
      status: 'fail',
      code: classified.code,
      detail: sanitizeErrorDetails(body || classified.message, 160),
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const classified = classifyProviderError(error, 'GEMINI');
    registerAiProviderResult({ provider: 'GEMINI', ok: false, errorCode: classified.code, latencyMs });
    return {
      status: 'fail',
      code: classified.code,
      detail: sanitizeErrorDetails(error, 160),
      latencyMs,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function providerProbeRequest(provider: AiProviderId, key: string): {
  url: string;
  headers?: Record<string, string>;
} {
  if (provider === 'GEMINI') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    };
  }

  const authHeaders = { Authorization: `Bearer ${key}` };
  if (provider === 'GROQ') {
    return { url: 'https://api.groq.com/openai/v1/models', headers: authHeaders };
  }
  if (provider === 'DEEPSEEK') {
    return { url: 'https://api.deepseek.com/models', headers: authHeaders };
  }
  if (provider === 'MISTRAL') {
    return { url: 'https://api.mistral.ai/v1/models', headers: authHeaders };
  }
  if (provider === 'OPENAI') {
    return { url: 'https://api.openai.com/v1/models', headers: authHeaders };
  }
  return { url: 'https://openrouter.ai/api/v1/models', headers: authHeaders };
}

async function probeProviderKey(provider: AiProviderId, key: string): Promise<{
  status: CheckStatus;
  code?: string;
  detail: string;
  latencyMs: number;
}> {
  if (provider === 'GEMINI') return probeGeminiKey(key);

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const request = providerProbeRequest(provider, key);
    const response = await fetch(request.url, {
      method: 'GET',
      headers: request.headers,
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (response.ok) {
      registerAiProviderResult({ provider, ok: true, latencyMs });
      return { status: 'ok', detail: `${provider} key is valid for API access`, latencyMs };
    }

    const body = await response.text().catch(() => '');
    const classified = classifyProviderError(`HTTP ${response.status}: ${body}`, provider);
    registerAiProviderResult({ provider, ok: false, errorCode: classified.code, latencyMs });
    return {
      status: 'fail',
      code: classified.code,
      detail: sanitizeErrorDetails(body || classified.message, 160),
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const classified = classifyProviderError(error, provider);
    registerAiProviderResult({ provider, ok: false, errorCode: classified.code, latencyMs });
    return {
      status: 'fail',
      code: classified.code,
      detail: sanitizeErrorDetails(error, 160),
      latencyMs,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function hasFailedDeepCheck(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if ((value as { status?: unknown }).status === 'fail') return true;
  return Object.values(value as Record<string, unknown>).some((item) => {
    return Boolean(item && typeof item === 'object' && (item as { status?: unknown }).status === 'fail');
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, OPTIONS');
  res.setHeader('X-Request-Id', requestId);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const providers: Record<string, boolean> = {};
  const disabledProviders: string[] = [];
  for (const provider of PROVIDERS) {
    providers[provider] = hasProviderKey(provider);
    if (isProviderDisabled(provider)) disabledProviders.push(provider);
  }
  const hasAnyKey = Object.values(providers).some(Boolean);

  const deepRequested = readDeepCheckRequested(req);
  const expectedToken = (process.env.HEALTHCHECK_TOKEN || '').trim();
  const providedToken = readHealthToken(req);

  const checks: Record<string, unknown> = {
    env_keys: {
      status: hasAnyKey ? 'ok' : 'fail',
      configuredProviders: Object.keys(providers).filter(provider => providers[provider]),
      disabledProviders,
    },
  };

  if (deepRequested) {
    if (!expectedToken || providedToken !== expectedToken) {
      return res.status(403).json({
        ok: false,
        requestId,
        error: 'Forbidden deep health check',
        errorCode: 'forbidden',
      });
    }

    const providerAuthPairs = await Promise.all(PROVIDERS.map(async (provider) => {
      if (isProviderDisabled(provider)) {
        return [provider, {
          status: 'skipped',
          detail: `${provider} provider is disabled by launch feature flag.`,
        }] as const;
      }

      const key = firstProviderKey(provider);
      if (!key) {
        return [provider, {
          status: 'skipped',
          detail: `${provider}_API_KEY is not configured`,
        }] as const;
      }

      return [provider, await probeProviderKey(provider, key)] as const;
    }));
    const providerAuth = Object.fromEntries(providerAuthPairs);
    checks.provider_auth = providerAuth;
    checks.gemini_auth = providerAuth.GEMINI || {
      status: 'skipped',
      detail: 'GEMINI_API_KEY is not configured',
    };
  } else {
    checks.gemini_auth = {
      status: 'skipped',
      detail: 'Deep check disabled. Add ?deep=1 with x-health-token to run provider probe.',
    };
  }

  const overallStatus: 'ok' | 'degraded' =
    Object.values(checks).some(hasFailedDeepCheck) ? 'degraded' : 'ok';

  return res.json({
    ok: true,
    requestId,
    status: overallStatus,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.npm_package_version || 'unknown',
    timestamp: Date.now(),
    timestampIso: new Date().toISOString(),
    providers,
    hasAnyKey,
    checks,
  });
}
