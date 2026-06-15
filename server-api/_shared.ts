import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import type {
  AgentBaristaSkillFocus,
  AgentProfileMemory,
  AmbiguityPolicy,
  ClientContext,
  ClientPlatform,
  ConversationContext,
  ResponseFormat,
  ResponseProfile,
  ResponseTone,
  ResponseVerbosity,
} from './_contracts.js';

export type AiErrorCode =
  | 'invalid_key'
  | 'quota_exceeded'
  | 'provider_timeout'
  | 'bad_request'
  | 'unsupported_model'
  | 'provider_error'
  | 'internal_error'
  | 'payload_too_large'
  | 'no_key'
  | 'unknown_action'
  | 'validation_error'
  | 'auth_required'
  | 'rate_limited'
  | 'server_misconfigured'
  | 'search_unavailable'
  | 'insufficient_sources';

export interface ApiOperationalError extends Error {
  code: AiErrorCode;
  retryable: boolean;
  statusCode: number;
  provider?: string;
}

const AGENT_PROFILE_MAX_WORDS = 24;
const AGENT_PROFILE_MAX_STYLE_NOTES = 280;
const AGENT_PROFILE_MAX_SKILL_FOCUS = 4;
const BARISTA_SKILL_FOCUS_VALUES: readonly AgentBaristaSkillFocus[] = [
  'espresso_dial_in',
  'brew_recipe_design',
  'sensory_cupping',
  'milk_latte_art',
  'water_chemistry',
  'grinder_equipment',
  'cafe_operations',
  'training_coaching',
  'menu_costing',
  'coffee_origin_roast',
  'troubleshooting',
] as const;

function normalizeLanguageTag(value: string | undefined | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const first = value
    .trim()
    .split(',')[0]
    ?.split(';')[0]
    ?.trim();
  if (!first) return undefined;
  const normalized = first.replace(/_/g, '-');
  const [langRaw, regionRaw] = normalized.split('-');
  const lang = (langRaw || '').toLowerCase();
  if (!/^[a-z]{2,3}$/.test(lang)) return normalized.toLowerCase();
  const region = (regionRaw || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(region)) return `${lang}-${region}`;
  return lang;
}

function normalizeProfileText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLen);
}

function normalizeBlockedWords(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => normalizeProfileText(item, AGENT_PROFILE_MAX_WORDS))
    .filter((item): item is string => Boolean(item));
  if (!cleaned.length) return undefined;
  return [...new Set(cleaned)].slice(0, 12);
}

function normalizeBaristaSkillFocus(value: unknown): AgentBaristaSkillFocus[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
    .filter((item): item is AgentBaristaSkillFocus => (BARISTA_SKILL_FOCUS_VALUES as readonly string[]).includes(item));
  if (!cleaned.length) return undefined;
  return [...new Set(cleaned)].slice(0, AGENT_PROFILE_MAX_SKILL_FOCUS);
}

function normalizeEmojiPolicy(value: unknown): AgentProfileMemory['emojiPolicy'] | undefined {
  if (value === 'default' || value === 'minimal' || value === 'none') return value;
  return undefined;
}

function normalizeAgentProfileMemory(value?: Partial<AgentProfileMemory> | null): AgentProfileMemory {
  const normalized: AgentProfileMemory = {
    updatedAt: Number(value?.updatedAt) > 0 ? Number(value?.updatedAt) : Date.now(),
  };

  const preferredLanguage = normalizeLanguageTag(value?.preferredLanguage);
  if (preferredLanguage) normalized.preferredLanguage = preferredLanguage;
  if (value?.languageSource === 'global' || value?.languageSource === 'manual') {
    normalized.languageSource = value.languageSource;
  }

  const userDisplayName = normalizeProfileText(value?.userDisplayName, 60);
  if (userDisplayName) normalized.userDisplayName = userDisplayName;

  const assistantName = normalizeProfileText(value?.assistantName, 60);
  if (assistantName) normalized.assistantName = assistantName;

  const responseStyle = value?.responseStyle;
  if (responseStyle === 'plain' || responseStyle === 'bullets' || responseStyle === 'steps' || responseStyle === 'table') {
    normalized.responseStyle = responseStyle;
  }

  const tonePreference = value?.tonePreference;
  if (tonePreference === 'neutral' || tonePreference === 'professional' || tonePreference === 'friendly') {
    normalized.tonePreference = tonePreference;
  }

  const detailPreference = value?.detailPreference;
  if (detailPreference === 'short' || detailPreference === 'balanced' || detailPreference === 'comprehensive') {
    normalized.detailPreference = detailPreference;
  }

  const workspaceRole = normalizeProfileText(value?.workspaceRole, 80);
  if (workspaceRole) normalized.workspaceRole = workspaceRole;

  const workflowFocus = normalizeProfileText(value?.workflowFocus, 120);
  if (workflowFocus) normalized.workflowFocus = workflowFocus;

  const skillFocus = normalizeBaristaSkillFocus(value?.skillFocus);
  if (skillFocus?.length) normalized.skillFocus = skillFocus;

  const emojiPolicy = normalizeEmojiPolicy(value?.emojiPolicy);
  if (emojiPolicy) normalized.emojiPolicy = emojiPolicy;

  const blockedWords = normalizeBlockedWords(value?.blockedWords);
  if (blockedWords?.length) normalized.blockedWords = blockedWords;

  const styleNotes = normalizeProfileText(value?.styleNotes, AGENT_PROFILE_MAX_STYLE_NOTES);
  if (styleNotes) normalized.styleNotes = styleNotes;

  return normalized;
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function expandLoopbackOriginVariants(origin: string): string[] {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.trim().toLowerCase();
    const port = parsed.port ? `:${parsed.port}` : '';
    const protocol = parsed.protocol;
    const pathnameSafeOrigin = `${protocol}//${parsed.host}`;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]' && hostname !== '::1') {
      return [pathnameSafeOrigin];
    }

    return [
      `${protocol}//localhost${port}`,
      `${protocol}//127.0.0.1${port}`,
      `${protocol}//[::1]${port}`,
    ];
  } catch {
    return [origin];
  }
}

export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(item => normalizeOrigin(item))
    .filter(Boolean) as string[];

  const base = [
    normalizeOrigin(process.env.APP_URL || ''),
    normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''),
    'https://baristachaw.com',
    'https://www.baristachaw.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ].filter(Boolean) as string[];

  const unique = new Set<string>();
  for (const origin of [...fromEnv, ...base]) {
    for (const variant of expandLoopbackOriginVariants(origin)) {
      unique.add(variant);
    }
  }
  return [...unique];
}

export function isProductionRuntime(): boolean {
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  if (vercelEnv) return vercelEnv === 'production';
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL;
}

export function isE2eMockRequest(req: VercelRequest): boolean {
  if (isProductionRuntime()) return false;
  const value = firstHeaderValue(req.headers['x-e2e-mock']).trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function getAllowedOrigin(req: VercelRequest): string {
  const origin = (req.headers.origin || '').trim();
  const allowed = getAllowedOrigins();
  if (!origin) return allowed[0] || '';
  return allowed.includes(origin) ? origin : '';
}

export function applyCors(req: VercelRequest, res: VercelResponse, methods: string): void {
  const corsOrigin = getAllowedOrigin(req);
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Health-Token, X-Test-Token');
  res.setHeader('Vary', 'Origin');
}

function getRequestHostOrigin(req: VercelRequest): string | null {
  const forwardedHost = firstHeaderValue(req.headers['x-forwarded-host']);
  const host = (forwardedHost || firstHeaderValue(req.headers.host)).trim();
  if (!host) return null;
  const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']).trim().toLowerCase();
  const proto = forwardedProto === 'http' || forwardedProto === 'https'
    ? forwardedProto
    : /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)
      ? 'http'
      : 'https';
  return normalizeOrigin(`${proto}://${host}`);
}

function isTrustedBrowserOrigin(req: VercelRequest): boolean {
  const allowed = new Set(getAllowedOrigins());
  const requestHostOrigin = getRequestHostOrigin(req);
  if (requestHostOrigin) allowed.add(requestHostOrigin);

  const origin = normalizeOrigin(firstHeaderValue(req.headers.origin));
  if (origin) return allowed.has(origin);

  const referer = normalizeOrigin(firstHeaderValue(req.headers.referer) || firstHeaderValue(req.headers.referrer));
  if (referer) return allowed.has(referer);

  const fetchSite = firstHeaderValue(req.headers['sec-fetch-site']).trim().toLowerCase();
  if (fetchSite === 'cross-site') return false;
  return true;
}

export function enforceTrustedRequestOrigin(
  req: VercelRequest,
  res: VercelResponse,
  requestId: string,
): boolean {
  const method = String(req.method || '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (isTrustedBrowserOrigin(req)) return true;

  res.status(403).json({
    ok: false,
    requestId,
    error: 'Untrusted request origin',
    errorCode: 'csrf_origin_denied',
  });
  return false;
}

export function createRequestId(req: VercelRequest): string {
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && incoming.trim()) return incoming.trim().slice(0, 64);
  if (Array.isArray(incoming) && incoming[0]) return incoming[0].trim().slice(0, 64);
  return randomUUID();
}

export function sanitizeErrorDetails(error: unknown, maxLength = 200): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';

  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
    .trim()
    .slice(0, maxLength);
}

export function createApiError(
  code: AiErrorCode,
  message: string,
  statusCode: number,
  retryable: boolean,
  provider?: string,
): ApiOperationalError {
  const err = new Error(message) as ApiOperationalError;
  err.code = code;
  err.retryable = retryable;
  err.statusCode = statusCode;
  err.provider = provider;
  return err;
}

export function isApiOperationalError(error: unknown): error is ApiOperationalError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      'retryable' in error &&
      'statusCode' in error,
  );
}

function parseStatusFromMessage(message: string): number | null {
  const match = message.match(/\b(?:HTTP|status)\s*(\d{3})\b/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyProviderError(
  error: unknown,
  provider = 'GEMINI',
): ApiOperationalError {
  if (isApiOperationalError(error)) return error;

  const details = sanitizeErrorDetails(error, 260).toLowerCase();
  const status = parseStatusFromMessage(details) || 0;

  if (details.includes('timeout') || details.includes('aborted') || details.includes('abort')) {
    return createApiError('provider_timeout', 'Provider request timed out', 504, true, provider);
  }

  if (
    status === 401 ||
    status === 403 ||
    details.includes('invalid api key') ||
    details.includes('permission denied') ||
    details.includes('authentication') ||
    details.includes('api key not valid')
  ) {
    return createApiError('invalid_key', 'Provider API key is invalid or unauthorized', 401, false, provider);
  }

  if (
    status === 429 ||
    status === 402 ||
    details.includes('quota') ||
    details.includes('insufficient balance') ||
    details.includes('insufficient credits') ||
    details.includes('billing_not_active') ||
    details.includes('billing not active') ||
    details.includes('account is not active') ||
    details.includes('payment required') ||
    details.includes('billing') ||
    details.includes('resource exhausted') ||
    details.includes('rate limit')
  ) {
    return createApiError('quota_exceeded', 'Provider quota or rate limit exceeded', 429, true, provider);
  }

  if (status === 413 || details.includes('payload too large') || details.includes('too large')) {
    return createApiError('payload_too_large', 'Image or payload is too large', 413, false, provider);
  }

  if ((status === 400 || status === 404) && details.includes('model')) {
    return createApiError('unsupported_model', 'Unsupported provider model', 400, false, provider);
  }

  if (status === 400) {
    return createApiError('bad_request', 'Invalid provider request payload', 400, false, provider);
  }

  if (status >= 500) {
    return createApiError('provider_error', `Upstream provider error: ${details}`, status, true, provider);
  }

  return createApiError('internal_error', `Unexpected AI provider error: ${details}`, 500, true, provider);
}

type JwtPayload = {
  user?: { id?: string; [key: string]: unknown };
  userId?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
};

export interface AuthContext {
  userId: string;
  user?: Record<string, unknown>;
  tokenSource: 'cookie' | 'bearer';
  sessionIssuedAt?: number;
  sessionExpiresAt?: number;
}

type AuthFailureCode = 'auth_required' | 'server_misconfigured';

export interface AuthFailure {
  ok: false;
  statusCode: 401 | 500;
  error: string;
  errorCode: AuthFailureCode;
}

export interface AuthSuccess {
  ok: true;
  auth: AuthContext;
}

type AuthResult = AuthFailure | AuthSuccess;

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(';')
    .map(pair => pair.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx <= 0) return acc;
      const key = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (!key) return acc;
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function getCookie(req: VercelRequest, name: string): string {
  const fromParsed = req.cookies?.[name];
  if (typeof fromParsed === 'string' && fromParsed.trim()) return fromParsed.trim();
  const parsed = parseCookieHeader(typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined);
  return (parsed[name] || '').trim();
}

function getBearerToken(req: VercelRequest): string {
  const authHeader = req.headers.authorization;
  const raw = Array.isArray(authHeader) ? authHeader[0] || '' : authHeader || '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || '';
}

function getJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || '').trim();
  return secret;
}

function verifyAuthToken(token: string, secret: string, source: 'cookie' | 'bearer'): AuthResult {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const userIdRaw = decoded.user?.id ?? decoded.userId;
    const userId = typeof userIdRaw === 'string' ? userIdRaw.trim() : '';
    if (!userId) {
      return {
        ok: false,
        statusCode: 401,
        error: 'Invalid token payload',
        errorCode: 'auth_required',
      };
    }
    const user = decoded.user && typeof decoded.user === 'object' ? decoded.user : undefined;
    const sessionIssuedAt = typeof decoded.iat === 'number' ? decoded.iat * 1000 : undefined;
    const sessionExpiresAt = typeof decoded.exp === 'number' ? decoded.exp * 1000 : undefined;
    return { ok: true, auth: { userId, user, tokenSource: source, sessionIssuedAt, sessionExpiresAt } };
  } catch {
    return {
      ok: false,
      statusCode: 401,
      error: 'Invalid token',
      errorCode: 'auth_required',
    };
  }
}

export function requireAuth(req: VercelRequest): AuthResult {
  const secret = getJwtSecret();
  if (!secret) {
    return {
      ok: false,
      statusCode: 500,
      error: 'Server authentication is not configured',
      errorCode: 'server_misconfigured',
    };
  }

  const bearerToken = getBearerToken(req);
  if (bearerToken) {
    return verifyAuthToken(bearerToken, secret, 'bearer');
  }

  const cookieToken = getCookie(req, 'auth_token');
  if (cookieToken) {
    return verifyAuthToken(cookieToken, secret, 'cookie');
  }

  return {
    ok: false,
    statusCode: 401,
    error: 'Not authenticated',
    errorCode: 'auth_required',
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeTokenString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function asOneOf<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  const matched = options.find(item => item === normalized);
  return matched;
}

export function parseResponseProfile(raw: unknown): ResponseProfile | undefined {
  if (!isObjectRecord(raw)) return undefined;
  const verbosity = asOneOf<ResponseVerbosity>(raw.verbosity, ['short', 'balanced', 'comprehensive']);
  const format = asOneOf<ResponseFormat>(raw.format, ['plain', 'bullets', 'steps', 'table']);
  const tone = asOneOf<ResponseTone>(raw.tone, ['neutral', 'professional', 'friendly']);
  const ambiguityPolicy = asOneOf<AmbiguityPolicy>(raw.ambiguityPolicy, ['ask_first', 'assume', 'multi_option']);
  const language = normalizeTokenString(raw.language, 24);
  const hasValue = Boolean(language || verbosity || format || tone || ambiguityPolicy);
  if (!hasValue) return undefined;
  return {
    language,
    verbosity,
    format,
    tone,
    ambiguityPolicy,
  };
}

export function parseClientContext(req: VercelRequest, raw?: unknown): ClientContext | undefined {
  const obj = isObjectRecord(raw) ? raw : {};
  const platform = asOneOf<ClientPlatform>(obj.platform, ['web', 'pwa', 'mobile']);
  const surface = asOneOf<NonNullable<ClientContext['surface']>>(obj.surface, ['home', 'chat', 'scanner', 'collection', 'tools', 'auth']);
  const appLanguage = normalizeTokenString(obj.appLanguage, 24);
  const acceptLanguageHeader = firstHeaderValue(req.headers['accept-language']);
  const acceptLanguage = normalizeTokenString(obj.acceptLanguage, 120) || normalizeTokenString(acceptLanguageHeader, 120);
  const hasValue = Boolean(platform || surface || appLanguage || acceptLanguage);
  if (!hasValue) return undefined;
  return {
    platform,
    surface,
    appLanguage,
    acceptLanguage,
  };
}

export function parseConversationContext(raw?: unknown): ConversationContext | undefined {
  if (!isObjectRecord(raw)) return undefined;

  const summary = normalizeTokenString(raw.summary, 6000);
  const preferredLanguage = normalizeTokenString(raw.preferredLanguage, 24);
  const sessionTitle = normalizeTokenString(raw.sessionTitle, 120);
  const recentMessages = Array.isArray(raw.recentMessages)
    ? raw.recentMessages
        .slice(-10)
        .map((item) => {
          if (!isObjectRecord(item)) return null;
          const role = asOneOf<'user' | 'assistant'>(item.role, ['user', 'assistant']);
          const text = normalizeTokenString(item.text, 1200);
          if (!role || !text) return null;
          return { role, text };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  if (!summary && !preferredLanguage && !sessionTitle && recentMessages.length === 0) {
    return undefined;
  }

  return {
    summary,
    preferredLanguage,
    sessionTitle,
    recentMessages,
  };
}

export function parseAgentProfile(raw?: unknown): AgentProfileMemory | undefined {
  if (!isObjectRecord(raw)) return undefined;
  const normalized = normalizeAgentProfileMemory({
    preferredLanguage: normalizeTokenString(raw.preferredLanguage, 24),
    languageSource: asOneOf<NonNullable<AgentProfileMemory['languageSource']>>(raw.languageSource, ['global', 'manual']),
    userDisplayName: normalizeTokenString(raw.userDisplayName, 60),
    assistantName: normalizeTokenString(raw.assistantName, 60),
    responseStyle: asOneOf<ResponseFormat>(raw.responseStyle, ['plain', 'bullets', 'steps', 'table']),
    tonePreference: asOneOf<ResponseTone>(raw.tonePreference, ['neutral', 'professional', 'friendly']),
    detailPreference: asOneOf<ResponseVerbosity>(raw.detailPreference, ['short', 'balanced', 'comprehensive']),
    workspaceRole: normalizeTokenString(raw.workspaceRole, 80),
    workflowFocus: normalizeTokenString(raw.workflowFocus, 120),
    skillFocus: normalizeBaristaSkillFocus(raw.skillFocus),
    emojiPolicy: asOneOf<NonNullable<AgentProfileMemory['emojiPolicy']>>(raw.emojiPolicy, ['default', 'minimal', 'none']),
    blockedWords: Array.isArray(raw.blockedWords)
      ? raw.blockedWords
          .map((item) => normalizeTokenString(item, 24))
          .filter((item): item is string => Boolean(item))
      : undefined,
    styleNotes: normalizeTokenString(raw.styleNotes, 280),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  });

    const hasValue = Boolean(
      normalized.preferredLanguage ||
        normalized.languageSource ||
        normalized.userDisplayName ||
      normalized.assistantName ||
      normalized.responseStyle ||
      normalized.tonePreference ||
      normalized.detailPreference ||
      normalized.workspaceRole ||
      normalized.workflowFocus ||
      normalized.skillFocus?.length ||
      normalized.emojiPolicy ||
      normalized.blockedWords?.length ||
      normalized.styleNotes,
  );

  return hasValue ? normalized : undefined;
}

export function isEnvFlagEnabled(name: string, defaultValue = true): boolean {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false;
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true;
  return defaultValue;
}

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  burstMaxRequests: number;
  burstWindowMs: number;
};

type RateLimitEntry = {
  hits: number[];
  burstHits: number[];
  lastSeenAt: number;
};

const RATE_LIMIT_STATE = new Map<string, RateLimitEntry>();
let lastRateLimitCleanup = 0;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;

function firstHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return '';
}

function getClientIp(req: VercelRequest): string {
  const forwarded = firstHeaderValue(req.headers['x-forwarded-for']);
  const fromForwarded = forwarded.split(',')[0]?.trim();
  const candidate =
    fromForwarded ||
    firstHeaderValue(req.headers['x-real-ip']).trim() ||
    (req.socket?.remoteAddress || '').trim() ||
    'unknown';
  return candidate.replace(/^::ffff:/, '');
}

function cleanupRateLimitState(now: number, windowMs: number, burstWindowMs: number) {
  if (now - lastRateLimitCleanup < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  const staleAfter = Math.max(windowMs, burstWindowMs) * 2;
  for (const [key, entry] of RATE_LIMIT_STATE.entries()) {
    if (now - entry.lastSeenAt > staleAfter) {
      RATE_LIMIT_STATE.delete(key);
    }
  }
  lastRateLimitCleanup = now;
}

export type RateLimitStatus = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(
  req: VercelRequest,
  routeKey: string,
  userId: string,
  config: RateLimitConfig,
): RateLimitStatus {
  const now = Date.now();
  cleanupRateLimitState(now, config.windowMs, config.burstWindowMs);

  const ip = getClientIp(req);
  const key = `${routeKey}:${userId}:${ip}`;
  const entry = RATE_LIMIT_STATE.get(key) || { hits: [], burstHits: [], lastSeenAt: now };
  entry.lastSeenAt = now;

  const windowStart = now - config.windowMs;
  const burstStart = now - config.burstWindowMs;
  entry.hits = entry.hits.filter(ts => ts > windowStart);
  entry.burstHits = entry.burstHits.filter(ts => ts > burstStart);

  const isWindowLimited = entry.hits.length >= config.maxRequests;
  const isBurstLimited = entry.burstHits.length >= config.burstMaxRequests;

  if (isWindowLimited || isBurstLimited) {
    const retryBase = isWindowLimited ? entry.hits[0] + config.windowMs : entry.burstHits[0] + config.burstWindowMs;
    const retryAfterSec = Math.max(1, Math.ceil((retryBase - now) / 1000));
    RATE_LIMIT_STATE.set(key, entry);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      retryAfterSec,
    };
  }

  entry.hits.push(now);
  entry.burstHits.push(now);
  RATE_LIMIT_STATE.set(key, entry);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.hits.length),
    retryAfterSec: 0,
  };
}

export function applyRateLimitHeaders(res: VercelResponse, status: RateLimitStatus): void {
  res.setHeader('X-RateLimit-Limit', String(status.limit));
  res.setHeader('X-RateLimit-Remaining', String(status.remaining));
  if (!status.allowed && status.retryAfterSec > 0) {
    res.setHeader('Retry-After', String(status.retryAfterSec));
  }
}
