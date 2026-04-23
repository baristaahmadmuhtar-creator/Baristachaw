import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  classifyProviderError,
  createRequestId,
  sanitizeErrorDetails,
} from './_shared.js';

type CheckStatus = 'ok' | 'fail' | 'skipped';

const PROVIDERS = ['GEMINI', 'GROQ', 'DEEPSEEK', 'MISTRAL', 'OPENAI', 'OPENROUTER'] as const;

function hasProviderKey(provider: string): boolean {
  const raw = process.env[`${provider}_API_KEY`] || '';
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(value => value.length > 5).length > 0;
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      method: 'GET',
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (response.ok) {
      return { status: 'ok', detail: 'Gemini key is valid for API access', latencyMs };
    }

    const body = await response.text().catch(() => '');
    const classified = classifyProviderError(`HTTP ${response.status}: ${body}`, 'GEMINI');
    return {
      status: 'fail',
      code: classified.code,
      detail: sanitizeErrorDetails(body || classified.message, 160),
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const classified = classifyProviderError(error, 'GEMINI');
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
  for (const provider of PROVIDERS) {
    providers[provider] = hasProviderKey(provider);
  }
  const hasAnyKey = Object.values(providers).some(Boolean);

  const deepRequested = readDeepCheckRequested(req);
  const expectedToken = (process.env.HEALTHCHECK_TOKEN || '').trim();
  const providedToken = readHealthToken(req);

  const checks: Record<string, unknown> = {
    env_keys: {
      status: hasAnyKey ? 'ok' : 'fail',
      configuredProviders: Object.keys(providers).filter(provider => providers[provider]),
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

    const geminiRaw = process.env.GEMINI_API_KEY || '';
    const firstGeminiKey = geminiRaw
      .split(',')
      .map(value => value.trim())
      .find(value => value.length > 5);

    if (!firstGeminiKey) {
      checks.gemini_auth = {
        status: 'skipped',
        detail: 'GEMINI_API_KEY is not configured',
      };
    } else {
      checks.gemini_auth = await probeGeminiKey(firstGeminiKey);
    }
  } else {
    checks.gemini_auth = {
      status: 'skipped',
      detail: 'Deep check disabled. Add ?deep=1 with x-health-token to run provider probe.',
    };
  }

  const geminiCheck = checks.gemini_auth as { status: CheckStatus } | undefined;
  const overallStatus: 'ok' | 'degraded' =
    geminiCheck && geminiCheck.status === 'fail' ? 'degraded' : 'ok';

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
