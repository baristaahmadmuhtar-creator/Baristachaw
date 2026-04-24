import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  requireAuth,
  sanitizeErrorDetails,
  type AuthContext,
} from '../_shared.js';
import {
  activeOperationalFlags,
  buildRuntimeFeatureFlags,
  featureFlagFromSupabase,
  normalizeFeatureSurface,
  RUNTIME_FEATURE_FLAG_PATCHES,
  type AdminFeatureFlag,
  type FeatureSurface,
} from '../admin/_featureFlags.js';

type AccountStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
type DataMode = 'supabase' | 'runtime_fallback';

type AccountPlan = {
  code: PlanCode;
  name: string;
  description: string;
  aiDailyLimit: number;
  deepDailyLimit: number;
  scannerDailyLimit: number;
  storageMb: number;
  seats: number;
  supportSlaHours: number;
  features: string[];
};

type AccountUser = {
  id: string;
  email?: string;
  name: string;
  picture?: string;
  role: string;
  status: AccountStatus;
  planCode: PlanCode;
  planName: string;
  lastSeenAt: string;
};

type AccountStatusResponse = {
  ok: true;
  requestId: string;
  generatedAt: string;
  dataMode: DataMode;
  user: AccountUser;
  plan: AccountPlan;
  featureFlags: AdminFeatureFlag[];
  maintenance: AdminFeatureFlag[];
  appAccess: {
    status: 'ok' | 'limited' | 'blocked';
    message: string;
  };
  warnings: string[];
  realtime: {
    strategy: 'polling';
    intervalSec: number;
  };
};

type SupabaseConfig = {
  configured: true;
  url: string;
  serviceRoleKey: string;
} | {
  configured: false;
};

const ACCOUNT_RATE_LIMIT = {
  maxRequests: 180,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 30,
  burstWindowMs: 10 * 1000,
} as const;

const ACCOUNT_POLL_INTERVAL_SEC = 60;

const PLAN_BLUEPRINTS: AccountPlan[] = [
  {
    code: 'free',
    name: 'Free',
    description: 'Protected trial surface for new users and app review.',
    aiDailyLimit: 12,
    deepDailyLimit: 2,
    scannerDailyLimit: 2,
    storageMb: 64,
    seats: 1,
    supportSlaHours: 72,
    features: ['Chat', 'basic scanner', 'local collection'],
  },
  {
    code: 'starter',
    name: 'Starter',
    description: 'Entry paid plan for serious home baristas.',
    aiDailyLimit: 60,
    deepDailyLimit: 10,
    scannerDailyLimit: 12,
    storageMb: 512,
    seats: 1,
    supportSlaHours: 48,
    features: ['Higher AI quota', 'AI Brew journal', 'scanner history'],
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Full workflow plan for baristas and creators.',
    aiDailyLimit: 180,
    deepDailyLimit: 40,
    scannerDailyLimit: 60,
    storageMb: 2048,
    seats: 1,
    supportSlaHours: 24,
    features: ['Deep mode', 'latte art edit', 'advanced collections', 'priority AI'],
  },
  {
    code: 'team',
    name: 'Team',
    description: 'Cafe teams with shared operations and training.',
    aiDailyLimit: 800,
    deepDailyLimit: 160,
    scannerDailyLimit: 240,
    storageMb: 10240,
    seats: 8,
    supportSlaHours: 12,
    features: ['Team seats', 'training notes', 'manager controls', 'audit export'],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Custom commercial deployment and support.',
    aiDailyLimit: 5000,
    deepDailyLimit: 1000,
    scannerDailyLimit: 1000,
    storageMb: 102400,
    seats: 50,
    supportSlaHours: 4,
    features: ['Custom quota', 'dedicated support', 'SLA review', 'private rollout'],
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SECRET_KEY');
  if (!url || !serviceRoleKey) return { configured: false };
  return { configured: true, url, serviceRoleKey };
}

async function supabaseRest<T>(config: Extract<SupabaseConfig, { configured: true }>, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${path} returned ${response.status}: ${text.slice(0, 180)}`);
  }
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

function normalizeStatus(value: unknown): AccountStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'trialing' || raw === 'past_due' || raw === 'suspended' || raw === 'deleted') return raw;
  return 'active';
}

function normalizePlanCode(value: unknown): PlanCode {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'starter' || raw === 'pro' || raw === 'team' || raw === 'enterprise') return raw;
  return 'free';
}

function normalizeProvider(value: unknown): string {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'google' || raw === 'apple' || raw === 'email' || raw === 'guest') return raw;
  return 'unknown';
}

function planByCode(code: PlanCode): AccountPlan {
  return PLAN_BLUEPRINTS.find((plan) => plan.code === code) || PLAN_BLUEPRINTS[0];
}

function planFromSupabase(row: any): AccountPlan {
  const code = normalizePlanCode(row.code || row.plan_code);
  const fallback = planByCode(code);
  return {
    code,
    name: normalizeText(row.name, fallback.name),
    description: normalizeText(row.description, fallback.description),
    aiDailyLimit: Number(row.ai_daily_limit ?? row.aiDailyLimit ?? fallback.aiDailyLimit) || fallback.aiDailyLimit,
    deepDailyLimit: Number(row.deep_daily_limit ?? row.deepDailyLimit ?? fallback.deepDailyLimit) || fallback.deepDailyLimit,
    scannerDailyLimit: Number(row.scanner_daily_limit ?? row.scannerDailyLimit ?? fallback.scannerDailyLimit) || fallback.scannerDailyLimit,
    storageMb: Number(row.storage_mb ?? row.storageMb ?? fallback.storageMb) || fallback.storageMb,
    seats: Number(row.seats ?? fallback.seats) || fallback.seats,
    supportSlaHours: Number(row.support_sla_hours ?? row.supportSlaHours ?? fallback.supportSlaHours) || fallback.supportSlaHours,
    features: Array.isArray(row.features) ? row.features.map((item: unknown) => normalizeText(item)).filter(Boolean) : fallback.features,
  };
}

function userFromAuth(auth: AuthContext): AccountUser {
  const rawUser = auth.user || {};
  const email = normalizeText(rawUser.email);
  const name = normalizeText(rawUser.name || rawUser.displayName, email ? email.split('@')[0] : 'Baristachaw user');
  return {
    id: auth.userId,
    email: email || undefined,
    name,
    picture: normalizeText(rawUser.picture || rawUser.avatarUrl) || undefined,
    role: normalizeText(rawUser.role, 'user'),
    status: 'active',
    planCode: 'free',
    planName: 'Free',
    lastSeenAt: nowIso(),
  };
}

function userFromSupabase(row: any, auth: AuthContext): AccountUser {
  const fallback = userFromAuth(auth);
  const planCode = normalizePlanCode(row.plan_code || row.planCode);
  const email = normalizeText(row.email, fallback.email || '');
  return {
    id: normalizeText(row.id || row.user_id, fallback.id),
    email: email || undefined,
    name: normalizeText(row.display_name || row.name, fallback.name),
    picture: normalizeText(row.avatar_url || row.picture) || fallback.picture,
    role: normalizeText(row.role, fallback.role),
    status: normalizeStatus(row.status),
    planCode,
    planName: planByCode(planCode).name,
    lastSeenAt: normalizeText(row.last_seen_at || row.updated_at, nowIso()),
  };
}

function surfaceFromRequest(req: VercelRequest): FeatureSurface {
  const querySurface = normalizeFeatureSurface(req.query.surface);
  if (querySurface) return querySurface;
  const queryPlatform = normalizeFeatureSurface(req.query.platform);
  if (queryPlatform === 'mobile' || queryPlatform === 'pwa' || queryPlatform === 'web') return queryPlatform;
  return 'web';
}

async function upsertSupabaseAccountUser(
  config: Extract<SupabaseConfig, { configured: true }>,
  auth: AuthContext,
  surface: FeatureSurface,
): Promise<void> {
  const rawUser = auth.user || {};
  const row = {
    id: auth.userId,
    email: normalizeText(rawUser.email),
    display_name: normalizeText(rawUser.name || rawUser.displayName),
    avatar_url: normalizeText(rawUser.picture || rawUser.avatarUrl),
    provider: normalizeProvider(rawUser.provider),
    platform: surface === 'admin' || surface === 'global' ? 'web' : surface,
    last_seen_at: nowIso(),
    metadata: {
      tokenSource: auth.tokenSource,
      accountStatusSurface: surface,
    },
  };
  await supabaseRest(config, 'app_users?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([row]),
  });
}

async function loadSupabaseAccount(
  config: Extract<SupabaseConfig, { configured: true }>,
  auth: AuthContext,
  surface: FeatureSurface,
): Promise<{ user: AccountUser; plans: AccountPlan[]; flags: AdminFeatureFlag[]; warnings: string[] }> {
  const warnings: string[] = [];
  await upsertSupabaseAccountUser(config, auth, surface).catch((error) => {
    warnings.push(`Account profile upsert skipped: ${sanitizeErrorDetails(error, 160)}`);
  });

  const userRows = await supabaseRest<any[]>(config, `app_users?id=eq.${encodeURIComponent(auth.userId)}&select=*&limit=1`);
  const user = Array.isArray(userRows) && userRows[0] ? userFromSupabase(userRows[0], auth) : userFromAuth(auth);

  const planRows = await supabaseRest<any[]>(config, 'app_plans?select=*&order=display_order.asc').catch((error) => {
    warnings.push(`Plan catalog fallback used: ${sanitizeErrorDetails(error, 140)}`);
    return [];
  });
  const plans = Array.isArray(planRows) && planRows.length ? planRows.map(planFromSupabase) : PLAN_BLUEPRINTS;

  const flagRows = await supabaseRest<any[]>(config, 'app_feature_flags?select=*&order=key.asc').catch((error) => {
    warnings.push(`Feature flag fallback used: ${sanitizeErrorDetails(error, 140)}`);
    return [];
  });
  const flags = Array.isArray(flagRows) && flagRows.length ? flagRows.map(featureFlagFromSupabase) : buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);

  return { user, plans, flags, warnings };
}

function buildAppAccess(user: AccountUser, maintenance: AdminFeatureFlag[]): AccountStatusResponse['appAccess'] {
  if (user.status === 'deleted') {
    return {
      status: 'blocked',
      message: 'This account has been marked deleted. Contact support if this is unexpected.',
    };
  }
  if (user.status === 'suspended') {
    return {
      status: 'blocked',
      message: 'This account is temporarily suspended. Contact support for review.',
    };
  }
  if (maintenance.some((flag) => flag.status === 'disabled' && flag.surfaces.includes('global'))) {
    return {
      status: 'blocked',
      message: 'Baristachaw is temporarily unavailable while maintenance is active.',
    };
  }
  if (user.status === 'past_due' || maintenance.length > 0) {
    return {
      status: 'limited',
      message: user.status === 'past_due'
        ? 'Your billing status needs attention. Some paid limits may be restricted.'
        : 'Some features are temporarily in maintenance.',
    };
  }
  return { status: 'ok', message: '' };
}

async function buildAccountStatus(
  requestId: string,
  auth: AuthContext,
  surface: FeatureSurface,
): Promise<AccountStatusResponse> {
  const config = getSupabaseConfig();
  let dataMode: DataMode = 'runtime_fallback';
  let user = userFromAuth(auth);
  let plans = PLAN_BLUEPRINTS;
  let featureFlags = buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
  const warnings: string[] = [];

  if (config.configured) {
    try {
      const supabaseAccount = await loadSupabaseAccount(config, auth, surface);
      user = supabaseAccount.user;
      plans = supabaseAccount.plans;
      featureFlags = supabaseAccount.flags;
      warnings.push(...supabaseAccount.warnings);
      dataMode = 'supabase';
    } catch (error) {
      warnings.push(`Supabase account status failed: ${sanitizeErrorDetails(error, 180)}`);
    }
  } else {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not configured; using runtime account status.');
  }

  const plan = plans.find((item) => item.code === user.planCode) || planByCode(user.planCode);
  const normalizedUser = { ...user, planName: plan.name };
  const maintenance = activeOperationalFlags(featureFlags, surface);

  return {
    ok: true,
    requestId,
    generatedAt: nowIso(),
    dataMode,
    user: normalizedUser,
    plan,
    featureFlags,
    maintenance,
    appAccess: buildAppAccess(normalizedUser, maintenance),
    warnings,
    realtime: {
      strategy: 'polling',
      intervalSec: ACCOUNT_POLL_INTERVAL_SEC,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/account/status', authResult.auth.userId, ACCOUNT_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Rate limit exceeded',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  try {
    const snapshot = await buildAccountStatus(requestId, authResult.auth, surfaceFromRequest(req));
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Account status failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
