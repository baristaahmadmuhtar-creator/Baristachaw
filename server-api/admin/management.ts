import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  sanitizeErrorDetails,
} from '../_shared.js';
import { requireAdmin, type AdminAccess } from './_access.js';
import {
  buildRuntimeFeatureFlags,
  featureFlagFromSupabase,
  normalizeFeatureFlagKey,
  normalizeFeatureFlagPatch,
  RUNTIME_FEATURE_FLAG_PATCHES,
  type AdminFeatureFlag,
  type FeatureFlagPatch,
} from './_featureFlags.js';

type AdminRole = 'owner' | 'admin' | 'support' | 'analyst' | 'user';
type AccountStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
type PlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
type CheckStatus = 'pass' | 'warn' | 'fail';
type DataMode = 'supabase' | 'runtime_fallback';

type AdminPlan = {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  aiDailyLimit: number;
  deepDailyLimit: number;
  scannerDailyLimit: number;
  storageMb: number;
  seats: number;
  supportSlaHours: number;
  features: string[];
  recommended?: boolean;
  activeUsers: number;
};

type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'apple' | 'email' | 'guest' | 'unknown';
  role: AdminRole;
  status: AccountStatus;
  planCode: PlanCode;
  planName: string;
  createdAt: string;
  lastSeenAt: string;
  locale?: string;
  platform?: 'web' | 'pwa' | 'mobile' | 'unknown';
  country?: string;
  usage: {
    aiRequestsToday: number;
    deepRequestsToday: number;
    scannerRunsToday: number;
    collectionWritesToday: number;
    totalTokensToday: number;
  };
  riskScore: number;
  flags: string[];
  notes?: string;
  isSample?: boolean;
};

type AdminAuditEvent = {
  id: string;
  actor: string;
  target: string;
  action: string;
  createdAt: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
};

type AdminSystemCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  owner: 'Security' | 'Data' | 'Billing' | 'Operations' | 'Mobile' | 'AI' | 'Backend';
  detail: string;
  nextAction?: string;
};

type LaunchChecklistItem = {
  id: string;
  label: string;
  status: CheckStatus;
  due: 'now' | 'this_week' | 'post_launch';
  owner: 'Admin' | 'Backend' | 'Mobile' | 'Growth' | 'Support';
  action: string;
};

type AdminSnapshot = {
  ok: true;
  requestId: string;
  generatedAt: string;
  dataMode: DataMode;
  dataFreshnessSec: number;
  degraded: boolean;
  admin: {
    userId: string;
    email?: string;
    role: AdminRole;
    source: AdminAccess['source'];
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    paidUsers: number;
    trialUsers: number;
    suspendedUsers: number;
    riskAccounts: number;
    aiRequestsToday: number;
    deepRequestsToday: number;
    scannerRunsToday: number;
    collectionWritesToday: number;
    planConversionRate: number;
  };
  plans: AdminPlan[];
  users: AdminUserRecord[];
  audit: AdminAuditEvent[];
  checks: AdminSystemCheck[];
  launchChecklist: LaunchChecklistItem[];
  featureFlags: AdminFeatureFlag[];
  recommendations: string[];
  warnings: string[];
  realtime: {
    strategy: 'polling';
    intervalSec: number;
    sequence: number;
  };
};

type UserPatch = Partial<{
  role: AdminRole;
  status: AccountStatus;
  planCode: PlanCode;
  notes: string;
}>;

type SupabaseConfig = {
  configured: true;
  url: string;
  serviceRoleKey: string;
} | {
  configured: false;
};

const ADMIN_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 20,
  burstWindowMs: 10 * 1000,
} as const;

const LIVE_POLL_INTERVAL_SEC = 12;
const RUNTIME_AUDIT_LIMIT = 80;
let snapshotSequence = 0;
const RUNTIME_USER_PATCHES = new Map<string, UserPatch>();
const RUNTIME_AUDIT: AdminAuditEvent[] = [];

const PLAN_BLUEPRINTS: Omit<AdminPlan, 'activeUsers'>[] = [
  {
    code: 'free',
    name: 'Free',
    description: 'Protected trial surface for new users and app review.',
    priceMonthlyUsd: 0,
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
    priceMonthlyUsd: 4.99,
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
    priceMonthlyUsd: 9.99,
    aiDailyLimit: 180,
    deepDailyLimit: 40,
    scannerDailyLimit: 60,
    storageMb: 2048,
    seats: 1,
    supportSlaHours: 24,
    features: ['Deep mode', 'latte art edit', 'advanced collections', 'priority AI'],
    recommended: true,
  },
  {
    code: 'team',
    name: 'Team',
    description: 'Cafe teams with shared operations and training.',
    priceMonthlyUsd: 29.99,
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
    priceMonthlyUsd: 0,
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

function envEnabled(name: string): boolean {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function normalizeRole(value: unknown): AdminRole {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'owner' || raw === 'admin' || raw === 'support' || raw === 'analyst') return raw;
  return 'user';
}

function normalizeStatus(value: unknown): AccountStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'active' || raw === 'trialing' || raw === 'past_due' || raw === 'suspended' || raw === 'deleted') {
    return raw;
  }
  return 'active';
}

function normalizePlanCode(value: unknown): PlanCode {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'starter' || raw === 'pro' || raw === 'team' || raw === 'enterprise') return raw;
  return 'free';
}

function planName(code: PlanCode): string {
  return PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.name || 'Free';
}

function normalizeProvider(value: unknown): AdminUserRecord['provider'] {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'google' || raw === 'apple' || raw === 'email' || raw === 'guest') return raw;
  return 'unknown';
}

function normalizePlatform(value: unknown): AdminUserRecord['platform'] {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'web' || raw === 'pwa' || raw === 'mobile') return raw;
  return 'unknown';
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

function readUsage(raw: any): AdminUserRecord['usage'] {
  const usage = raw && typeof raw === 'object' ? raw : {};
  return {
    aiRequestsToday: Number(usage.aiRequestsToday ?? usage.ai_requests_today ?? 0) || 0,
    deepRequestsToday: Number(usage.deepRequestsToday ?? usage.deep_requests_today ?? 0) || 0,
    scannerRunsToday: Number(usage.scannerRunsToday ?? usage.scanner_runs_today ?? 0) || 0,
    collectionWritesToday: Number(usage.collectionWritesToday ?? usage.collection_writes_today ?? 0) || 0,
    totalTokensToday: Number(usage.totalTokensToday ?? usage.total_tokens_today ?? 0) || 0,
  };
}

function userFromSupabase(row: any): AdminUserRecord {
  const planCode = normalizePlanCode(row.plan_code || row.planCode);
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    id: normalizeText(row.id || row.user_id, 'unknown-user'),
    email: normalizeText(row.email, 'unknown@example.com'),
    name: normalizeText(row.display_name || row.name, normalizeText(row.email, 'User').split('@')[0]),
    picture: normalizeText(row.avatar_url || row.picture),
    provider: normalizeProvider(row.provider),
    role: normalizeRole(row.role),
    status: normalizeStatus(row.status),
    planCode,
    planName: planName(planCode),
    createdAt: normalizeText(row.created_at, nowIso()),
    lastSeenAt: normalizeText(row.last_seen_at || row.updated_at, nowIso()),
    locale: normalizeText(row.locale || metadata.locale),
    platform: normalizePlatform(row.platform || metadata.platform),
    country: normalizeText(row.country || metadata.country),
    usage: readUsage(row.usage_today || metadata.usageToday),
    riskScore: Math.max(0, Math.min(100, Number(row.risk_score ?? metadata.riskScore ?? 0) || 0)),
    flags: Array.isArray(row.flags) ? row.flags.map((item: unknown) => normalizeText(item)).filter(Boolean) : [],
    notes: normalizeText(row.notes),
  };
}

function planFromSupabase(row: any, activeUsers: number): AdminPlan {
  const code = normalizePlanCode(row.code || row.plan_code);
  return {
    code,
    name: normalizeText(row.name, planName(code)),
    description: normalizeText(row.description, PLAN_BLUEPRINTS.find((plan) => plan.code === code)?.description || ''),
    priceMonthlyUsd: Number(row.price_monthly_usd ?? row.priceMonthlyUsd ?? 0) || 0,
    aiDailyLimit: Number(row.ai_daily_limit ?? row.aiDailyLimit ?? 0) || 0,
    deepDailyLimit: Number(row.deep_daily_limit ?? row.deepDailyLimit ?? 0) || 0,
    scannerDailyLimit: Number(row.scanner_daily_limit ?? row.scannerDailyLimit ?? 0) || 0,
    storageMb: Number(row.storage_mb ?? row.storageMb ?? 0) || 0,
    seats: Number(row.seats ?? 1) || 1,
    supportSlaHours: Number(row.support_sla_hours ?? row.supportSlaHours ?? 72) || 72,
    features: Array.isArray(row.features) ? row.features.map((item: unknown) => normalizeText(item)).filter(Boolean) : [],
    recommended: Boolean(row.recommended),
    activeUsers,
  };
}

function auditFromSupabase(row: any): AdminAuditEvent {
  return {
    id: normalizeText(row.id || row.event_id, `audit_${Date.now()}`),
    actor: normalizeText(row.actor_email || row.actor_user_id || row.actor, 'system'),
    target: normalizeText(row.target_id || row.target, 'platform'),
    action: normalizeText(row.action, 'admin_event'),
    createdAt: normalizeText(row.created_at, nowIso()),
    detail: normalizeText(row.detail || row.summary, 'Administrative event recorded.'),
    severity: row.severity === 'critical' || row.severity === 'warning' ? row.severity : 'info',
  };
}

function currentAuthUser(admin: AdminAccess, rawUser?: Record<string, unknown>): AdminUserRecord {
  const email = admin.email || normalizeText(rawUser?.email, 'admin@baristachaw.local');
  const id = admin.userId || normalizeText(rawUser?.id, email);
  const planCode: PlanCode = admin.role === 'owner' ? 'enterprise' : 'team';
  return {
    id,
    email,
    name: normalizeText(rawUser?.name || rawUser?.displayName, email.split('@')[0]),
    picture: normalizeText(rawUser?.picture || rawUser?.avatarUrl),
    provider: normalizeProvider(rawUser?.provider),
    role: admin.role,
    status: 'active',
    planCode,
    planName: planName(planCode),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeenAt: nowIso(),
    locale: 'id-ID',
    platform: 'web',
    usage: {
      aiRequestsToday: 24,
      deepRequestsToday: 6,
      scannerRunsToday: 3,
      collectionWritesToday: 9,
      totalTokensToday: 45200,
    },
    riskScore: 0,
    flags: ['admin_verified'],
  };
}

function runtimeSeedUsers(admin: AdminAccess, rawUser?: Record<string, unknown>): AdminUserRecord[] {
  const seeds: AdminUserRecord[] = [
    currentAuthUser(admin, rawUser),
    {
      id: 'runtime_user_trial_review',
      email: 'trial.review@example.com',
      name: 'Trial Review',
      provider: 'email',
      role: 'user',
      status: 'trialing',
      planCode: 'free',
      planName: 'Free',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      locale: 'id-ID',
      platform: 'mobile',
      country: 'ID',
      usage: {
        aiRequestsToday: 8,
        deepRequestsToday: 1,
        scannerRunsToday: 2,
        collectionWritesToday: 1,
        totalTokensToday: 9200,
      },
      riskScore: 12,
      flags: ['trial'],
      isSample: true,
    },
    {
      id: 'runtime_user_pro_barista',
      email: 'pro.barista@example.com',
      name: 'Pro Barista',
      provider: 'google',
      role: 'user',
      status: 'active',
      planCode: 'pro',
      planName: 'Pro',
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
      locale: 'en-US',
      platform: 'pwa',
      country: 'SG',
      usage: {
        aiRequestsToday: 84,
        deepRequestsToday: 17,
        scannerRunsToday: 12,
        collectionWritesToday: 22,
        totalTokensToday: 182000,
      },
      riskScore: 4,
      flags: ['power_user'],
      isSample: true,
    },
    {
      id: 'runtime_user_team_cafe',
      email: 'manager.cafe@example.com',
      name: 'Cafe Manager',
      provider: 'google',
      role: 'admin',
      status: 'active',
      planCode: 'team',
      planName: 'Team',
      createdAt: new Date(Date.now() - 74 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 63 * 60 * 1000).toISOString(),
      locale: 'ms-MY',
      platform: 'mobile',
      country: 'MY',
      usage: {
        aiRequestsToday: 196,
        deepRequestsToday: 42,
        scannerRunsToday: 33,
        collectionWritesToday: 41,
        totalTokensToday: 436000,
      },
      riskScore: 8,
      flags: ['team_owner'],
      isSample: true,
    },
    {
      id: 'runtime_user_past_due',
      email: 'billing.watch@example.com',
      name: 'Billing Watch',
      provider: 'email',
      role: 'user',
      status: 'past_due',
      planCode: 'starter',
      planName: 'Starter',
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      locale: 'id-ID',
      platform: 'web',
      country: 'ID',
      usage: {
        aiRequestsToday: 51,
        deepRequestsToday: 8,
        scannerRunsToday: 7,
        collectionWritesToday: 5,
        totalTokensToday: 74000,
      },
      riskScore: 68,
      flags: ['billing_attention'],
      notes: 'Payment retry window open.',
      isSample: true,
    },
  ];

  return seeds.map((user) => {
    const patch = RUNTIME_USER_PATCHES.get(user.id);
    if (!patch) return user;
    const planCode = patch.planCode || user.planCode;
    return {
      ...user,
      ...patch,
      planCode,
      planName: planName(planCode),
      flags: user.flags,
    };
  });
}

function withActiveCounts(users: AdminUserRecord[], plans = PLAN_BLUEPRINTS): AdminPlan[] {
  return plans.map((plan) => ({
    ...plan,
    activeUsers: users.filter((user) => user.planCode === plan.code && user.status !== 'deleted').length,
  }));
}

function metricsFromUsers(users: AdminUserRecord[]): AdminSnapshot['metrics'] {
  const activeUsers = users.filter((user) => user.status === 'active' || user.status === 'trialing').length;
  const paidUsers = users.filter((user) => user.planCode !== 'free' && user.status !== 'deleted').length;
  const totalUsers = users.filter((user) => user.status !== 'deleted').length;
  return {
    totalUsers,
    activeUsers,
    paidUsers,
    trialUsers: users.filter((user) => user.status === 'trialing').length,
    suspendedUsers: users.filter((user) => user.status === 'suspended').length,
    riskAccounts: users.filter((user) => user.riskScore >= 60 || user.status === 'past_due' || user.status === 'suspended').length,
    aiRequestsToday: users.reduce((sum, user) => sum + user.usage.aiRequestsToday, 0),
    deepRequestsToday: users.reduce((sum, user) => sum + user.usage.deepRequestsToday, 0),
    scannerRunsToday: users.reduce((sum, user) => sum + user.usage.scannerRunsToday, 0),
    collectionWritesToday: users.reduce((sum, user) => sum + user.usage.collectionWritesToday, 0),
    planConversionRate: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 1000) / 10 : 0,
  };
}

function buildChecks(dataMode: DataMode): AdminSystemCheck[] {
  const supabase = getSupabaseConfig();
  const adminConfigured = Boolean(readEnv('ADMIN_EMAILS', 'ADMIN_BOOTSTRAP_EMAILS', 'ADMIN_USER_IDS', 'ADMIN_BOOTSTRAP_USER_IDS'));
  const jwtConfigured = Boolean(readEnv('JWT_SECRET'));
  const aiConfigured = Boolean(readEnv('GEMINI_API_KEY', 'GOOGLE_GENAI_API_KEY', 'OPENAI_API_KEY'));
  const billingConfigured = Boolean(readEnv('STRIPE_SECRET_KEY', 'REVENUECAT_API_KEY', 'GOOGLE_PLAY_PACKAGE_NAME'));
  const sentryConfigured = Boolean(readEnv('SENTRY_DSN', 'EXPO_PUBLIC_SENTRY_DSN', 'VITE_SENTRY_DSN'));

  return [
    {
      id: 'jwt_auth',
      label: 'JWT auth guard',
      status: jwtConfigured ? 'pass' : 'fail',
      owner: 'Security',
      detail: jwtConfigured ? 'Server API requires signed JWT for protected endpoints.' : 'JWT_SECRET is missing.',
      nextAction: jwtConfigured ? undefined : 'Set JWT_SECRET in production and rotate test secrets before launch.',
    },
    {
      id: 'admin_allowlist',
      label: 'Admin allowlist',
      status: adminConfigured ? 'pass' : 'fail',
      owner: 'Security',
      detail: adminConfigured ? 'Admin access is restricted by claim/email/user-id allowlist.' : 'No admin allowlist env is configured.',
      nextAction: adminConfigured ? undefined : 'Set ADMIN_EMAILS or ADMIN_USER_IDS for launch admins.',
    },
    {
      id: 'database_persistence',
      label: 'Persistent admin database',
      status: dataMode === 'supabase' && supabase.configured ? 'pass' : 'fail',
      owner: 'Data',
      detail: dataMode === 'supabase' ? 'Admin reads and mutations are backed by Supabase tables.' : 'Admin is running with runtime fallback data.',
      nextAction: dataMode === 'supabase' ? undefined : 'Run supabase/admin_management.sql and set SUPABASE_SERVICE_ROLE_KEY.',
    },
    {
      id: 'audit_trail',
      label: 'Audit trail',
      status: dataMode === 'supabase' ? 'pass' : 'warn',
      owner: 'Operations',
      detail: dataMode === 'supabase' ? 'Admin mutations are written to admin_audit_events.' : 'Runtime audit resets when serverless instances recycle.',
      nextAction: dataMode === 'supabase' ? undefined : 'Enable the admin database migration before managing real accounts.',
    },
    {
      id: 'plan_catalog',
      label: 'Plan catalog',
      status: 'pass',
      owner: 'Billing',
      detail: 'Free, Starter, Pro, Team, and Enterprise plan definitions are available to admin.',
    },
    {
      id: 'feature_flags',
      label: 'Maintenance feature flags',
      status: dataMode === 'supabase' || Boolean(readEnv('MAINTENANCE_FEATURES', 'APP_MAINTENANCE_FEATURES', 'APP_MAINTENANCE_ENABLED')) ? 'pass' : 'warn',
      owner: 'Operations',
      detail: dataMode === 'supabase'
        ? 'Feature availability is read from app_feature_flags.'
        : 'Runtime feature flags are available for preview only.',
      nextAction: dataMode === 'supabase' ? undefined : 'Apply the admin migration so maintenance changes persist across devices.',
    },
    {
      id: 'billing_provider',
      label: 'Billing provider contract',
      status: billingConfigured ? 'pass' : 'warn',
      owner: 'Billing',
      detail: billingConfigured ? 'Billing provider env is present.' : 'No billing provider env detected.',
      nextAction: billingConfigured ? undefined : 'Connect Google Play Billing/RevenueCat/Stripe before paid launch.',
    },
    {
      id: 'ai_capacity',
      label: 'AI provider capacity',
      status: aiConfigured ? 'pass' : 'fail',
      owner: 'AI',
      detail: aiConfigured ? 'AI provider keys are configured for protected AI endpoints.' : 'AI provider key is missing.',
      nextAction: aiConfigured ? undefined : 'Set GEMINI_API_KEY or equivalent provider keys in production.',
    },
    {
      id: 'plan_enforcement',
      label: 'Per-plan enforcement',
      status: envEnabled('PLAN_ENFORCEMENT_ENABLED') ? 'pass' : 'warn',
      owner: 'Backend',
      detail: envEnabled('PLAN_ENFORCEMENT_ENABLED')
        ? 'Plan enforcement flag is enabled.'
        : 'Admin can manage plans, but enforcement must be wired to quota middleware before paid launch.',
      nextAction: envEnabled('PLAN_ENFORCEMENT_ENABLED') ? undefined : 'Gate /api/ai and scanner usage by app_users.plan_code quotas.',
    },
    {
      id: 'telemetry',
      label: 'Crash and error telemetry',
      status: sentryConfigured ? 'pass' : 'warn',
      owner: 'Operations',
      detail: sentryConfigured ? 'Telemetry DSN is configured.' : 'Telemetry DSN is not configured.',
      nextAction: sentryConfigured ? undefined : 'Enable Sentry before Play Store rollout.',
    },
  ];
}

function buildLaunchChecklist(checks: AdminSystemCheck[]): LaunchChecklistItem[] {
  const statusFor = (id: string) => checks.find((check) => check.id === id)?.status || 'warn';
  return [
    {
      id: 'admin_locked',
      label: 'Admin access locked to owners',
      status: statusFor('admin_allowlist'),
      due: 'now',
      owner: 'Admin',
      action: 'Keep only founder/support owner emails in ADMIN_EMAILS for v1 launch.',
    },
    {
      id: 'db_live',
      label: 'User, plan, usage, audit tables live',
      status: statusFor('database_persistence'),
      due: 'now',
      owner: 'Backend',
      action: 'Apply Supabase admin migration and verify REST service role access.',
    },
    {
      id: 'quota_wired',
      label: 'Plan quotas enforced in AI and scanner routes',
      status: statusFor('plan_enforcement'),
      due: 'now',
      owner: 'Backend',
      action: 'Reject or degrade requests when daily plan quotas are exceeded.',
    },
    {
      id: 'maintenance_controls',
      label: 'Maintenance controls visible to users',
      status: statusFor('feature_flags'),
      due: 'now',
      owner: 'Support',
      action: 'Use admin maintenance flags before disabling risky web, PWA, or mobile features.',
    },
    {
      id: 'billing_ready',
      label: 'Billing lifecycle sync',
      status: statusFor('billing_provider'),
      due: 'this_week',
      owner: 'Backend',
      action: 'Sync active, trialing, past_due, cancelled, and refunded events into app_users.',
    },
    {
      id: 'support_ready',
      label: 'Support account workflow',
      status: 'pass',
      due: 'this_week',
      owner: 'Support',
      action: 'Use suspend, restore, note, and audit views for first-launch support.',
    },
    {
      id: 'privacy_controls',
      label: 'Account deletion and export policy',
      status: 'warn',
      due: 'this_week',
      owner: 'Mobile',
      action: 'Expose deletion/export request path in mobile settings before public scale.',
    },
    {
      id: 'telemetry_ready',
      label: 'Crash monitoring and admin audit review',
      status: statusFor('telemetry'),
      due: 'now',
      owner: 'Mobile',
      action: 'Verify release, environment, and user context appear in Sentry.',
    },
  ];
}

function buildRecommendations(snapshot: {
  dataMode: DataMode;
  metrics: AdminSnapshot['metrics'];
  checks: AdminSystemCheck[];
}): string[] {
  const recommendations: string[] = [];
  if (snapshot.dataMode !== 'supabase') {
    recommendations.push('Move admin to Supabase service-role persistence before managing real launch users.');
  }
  if (snapshot.checks.some((check) => check.id === 'plan_enforcement' && check.status !== 'pass')) {
    recommendations.push('Wire plan_code to quota middleware for /api/ai, scanner, image edit, and speech generation.');
  }
  if (snapshot.checks.some((check) => check.id === 'feature_flags' && check.status !== 'pass')) {
    recommendations.push('Persist maintenance flags so user-facing web/PWA/mobile banners match admin changes.');
  }
  if (snapshot.metrics.riskAccounts > 0) {
    recommendations.push('Review past_due and suspended accounts daily during the first launch week.');
  }
  if (snapshot.metrics.planConversionRate < 10) {
    recommendations.push('Keep Free plan useful for Play Store review, but make Pro limits visibly valuable.');
  }
  recommendations.push('Use audit events for every admin mutation: role changes, suspensions, plan overrides, and support notes.');
  return recommendations;
}

async function loadSupabaseUsers(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminUserRecord[]> {
  const rows = await supabaseRest<any[]>(config, 'app_users?select=*&order=updated_at.desc&limit=250');
  return Array.isArray(rows) ? rows.map(userFromSupabase) : [];
}

async function loadSupabasePlans(
  config: Extract<SupabaseConfig, { configured: true }>,
  users: AdminUserRecord[],
): Promise<AdminPlan[]> {
  const rows = await supabaseRest<any[]>(config, 'app_plans?select=*&order=display_order.asc');
  if (!Array.isArray(rows) || rows.length === 0) return withActiveCounts(users);
  const counts = withActiveCounts(users);
  return rows.map((row) => planFromSupabase(row, counts.find((plan) => plan.code === normalizePlanCode(row.code || row.plan_code))?.activeUsers || 0));
}

async function loadSupabaseAudit(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminAuditEvent[]> {
  const rows = await supabaseRest<any[]>(config, 'admin_audit_events?select=*&order=created_at.desc&limit=60');
  return Array.isArray(rows) ? rows.map(auditFromSupabase) : [];
}

async function loadSupabaseFeatureFlags(config: Extract<SupabaseConfig, { configured: true }>): Promise<AdminFeatureFlag[]> {
  const rows = await supabaseRest<any[]>(config, 'app_feature_flags?select=*&order=key.asc');
  return Array.isArray(rows) && rows.length ? rows.map(featureFlagFromSupabase) : buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
}

async function upsertSupabaseAdminUser(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  rawUser?: Record<string, unknown>,
): Promise<void> {
  if (!admin.userId) return;
  const row = {
    id: admin.userId,
    email: admin.email || normalizeText(rawUser?.email),
    display_name: normalizeText(rawUser?.name || rawUser?.displayName),
    avatar_url: normalizeText(rawUser?.picture || rawUser?.avatarUrl),
    provider: normalizeProvider(rawUser?.provider),
    role: admin.role,
    last_seen_at: nowIso(),
    metadata: {
      adminAccessSource: admin.source,
      platform: 'web',
    },
  };
  await supabaseRest(config, 'app_users?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([row]),
  });
}

function buildRuntimeAudit(admin: AdminAccess): AdminAuditEvent[] {
  const base: AdminAuditEvent[] = [
    {
      id: 'runtime_audit_boot',
      actor: admin.email || admin.userId || 'admin',
      target: 'admin_management',
      action: 'snapshot_loaded',
      createdAt: nowIso(),
      detail: 'Runtime fallback snapshot generated. Configure Supabase for persistent audit.',
      severity: 'warning',
    },
  ];
  return [...RUNTIME_AUDIT, ...base].slice(0, 60);
}

async function buildAdminSnapshot(
  requestId: string,
  admin: AdminAccess,
  rawUser?: Record<string, unknown>,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  let dataMode: DataMode = 'runtime_fallback';
  let users: AdminUserRecord[] = [];
  let plans: AdminPlan[] = [];
  let audit: AdminAuditEvent[] = [];
  let featureFlags: AdminFeatureFlag[] = [];
  const warnings: string[] = [];

  if (config.configured) {
    try {
      await upsertSupabaseAdminUser(config, admin, rawUser).catch((error) => {
        warnings.push(`Admin user upsert skipped: ${sanitizeErrorDetails(error, 160)}`);
      });
      users = await loadSupabaseUsers(config);
      if (!users.some((user) => user.id === admin.userId)) {
        users.unshift(currentAuthUser(admin, rawUser));
      }
      plans = await loadSupabasePlans(config, users);
      audit = await loadSupabaseAudit(config);
      featureFlags = await loadSupabaseFeatureFlags(config);
      dataMode = 'supabase';
    } catch (error) {
      warnings.push(`Supabase admin read failed: ${sanitizeErrorDetails(error, 180)}`);
    }
  } else {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not configured; using runtime fallback data.');
  }

  if (dataMode !== 'supabase') {
    users = runtimeSeedUsers(admin, rawUser);
    plans = withActiveCounts(users);
    audit = buildRuntimeAudit(admin);
    featureFlags = buildRuntimeFeatureFlags(RUNTIME_FEATURE_FLAG_PATCHES);
  }

  const metrics = metricsFromUsers(users);
  const checks = buildChecks(dataMode);
  const launchChecklist = buildLaunchChecklist(checks);
  const recommendations = buildRecommendations({ dataMode, metrics, checks });

  return {
    ok: true,
    requestId,
    generatedAt: nowIso(),
    dataMode,
    dataFreshnessSec: 0,
    degraded: dataMode !== 'supabase' || checks.some((check) => check.status === 'fail'),
    admin: {
      userId: admin.userId || 'unknown',
      email: admin.email,
      role: admin.role,
      source: admin.source,
    },
    metrics,
    plans,
    users,
    audit,
    checks,
    launchChecklist,
    featureFlags,
    recommendations,
    warnings,
    realtime: {
      strategy: 'polling',
      intervalSec: LIVE_POLL_INTERVAL_SEC,
      sequence: ++snapshotSequence,
    },
  };
}

function validatePatch(body: any): { ok: true; userId: string; patch: UserPatch } | { ok: false; error: string } {
  const userId = normalizeText(body?.userId);
  if (!userId) return { ok: false, error: 'userId is required' };
  const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
  const patch: UserPatch = {};

  if ('role' in rawPatch) patch.role = normalizeRole(rawPatch.role);
  if ('status' in rawPatch) patch.status = normalizeStatus(rawPatch.status);
  if ('planCode' in rawPatch) patch.planCode = normalizePlanCode(rawPatch.planCode);
  if ('notes' in rawPatch) patch.notes = normalizeText(rawPatch.notes).slice(0, 500);

  if (Object.keys(patch).length === 0) return { ok: false, error: 'patch is empty' };
  return { ok: true, userId, patch };
}

function validateFeatureFlagPatch(body: any): { ok: true; key: string; patch: FeatureFlagPatch } | { ok: false; error: string } {
  const key = normalizeFeatureFlagKey(body?.key);
  if (!key) return { ok: false, error: 'key is required' };
  const patch = normalizeFeatureFlagPatch(body?.patch);
  if (Object.keys(patch).length === 0) return { ok: false, error: 'patch is empty' };
  return { ok: true, key, patch };
}

function auditRuntimeMutation(admin: AdminAccess, userId: string, patch: UserPatch): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: userId,
    action: 'user_updated',
    createdAt: nowIso(),
    detail: `Runtime user patch: ${Object.keys(patch).join(', ')}`,
    severity: patch.status === 'suspended' || patch.role === 'owner' ? 'warning' : 'info',
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

function auditRuntimeFeatureFlagMutation(admin: AdminAccess, key: string, patch: FeatureFlagPatch): void {
  RUNTIME_AUDIT.unshift({
    id: `runtime_audit_flag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actor: admin.email || admin.userId || 'admin',
    target: key,
    action: 'feature_flag_updated',
    createdAt: nowIso(),
    detail: `Runtime feature flag patch: ${Object.keys(patch).join(', ')}`,
    severity: patch.status === 'disabled' || patch.status === 'maintenance' ? 'warning' : 'info',
  });
  RUNTIME_AUDIT.splice(RUNTIME_AUDIT_LIMIT);
}

async function patchSupabaseUser(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  userId: string,
  patch: UserPatch,
): Promise<void> {
  const body: Record<string, unknown> = {
    updated_at: nowIso(),
  };
  if (patch.role) body.role = patch.role;
  if (patch.status) body.status = patch.status;
  if (patch.planCode) body.plan_code = patch.planCode;
  if (typeof patch.notes === 'string') body.notes = patch.notes;

  await supabaseRest(config, `app_users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });

  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'user',
      target_id: userId,
      action: 'user_updated',
      detail: `Updated ${Object.keys(patch).join(', ')}`,
      after: patch,
      severity: patch.status === 'suspended' || patch.role === 'owner' ? 'warning' : 'info',
    }]),
  });
}

async function patchSupabaseFeatureFlag(
  config: Extract<SupabaseConfig, { configured: true }>,
  admin: AdminAccess,
  key: string,
  patch: FeatureFlagPatch,
): Promise<void> {
  const existing = buildRuntimeFeatureFlags().find((flag) => flag.key === key);
  const body: Record<string, unknown> = {
    key,
    label: existing?.label || key.replace(/[_:-]+/g, ' '),
    updated_at: nowIso(),
  };
  if (patch.status) body.status = patch.status;
  if (typeof patch.message === 'string') body.message = patch.message;
  if (patch.surfaces?.length) body.surfaces = patch.surfaces;

  await supabaseRest(config, 'app_feature_flags?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([body]),
  });

  await supabaseRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: admin.userId,
      actor_email: admin.email,
      target_type: 'feature_flag',
      target_id: key,
      action: 'feature_flag_updated',
      detail: `Updated ${Object.keys(patch).join(', ')}`,
      after: patch,
      severity: patch.status === 'disabled' || patch.status === 'maintenance' ? 'warning' : 'info',
    }]),
  });
}

async function updateUser(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  userId: string,
  patch: UserPatch,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_update_${Date.now()}`;
  if (config.configured) {
    try {
      await patchSupabaseUser(config, admin, userId, patch);
      return buildAdminSnapshot(requestId, admin, rawUser);
    } catch (error) {
      RUNTIME_AUDIT.unshift({
        id: `runtime_supabase_failure_${Date.now()}`,
        actor: admin.email || admin.userId || 'admin',
        target: userId,
        action: 'supabase_update_failed',
        createdAt: nowIso(),
        detail: sanitizeErrorDetails(error, 180),
        severity: 'critical',
      });
    }
  }

  const previous = RUNTIME_USER_PATCHES.get(userId) || {};
  RUNTIME_USER_PATCHES.set(userId, { ...previous, ...patch });
  auditRuntimeMutation(admin, userId, patch);
  return buildAdminSnapshot(requestId, admin, rawUser);
}

async function updateFeatureFlag(
  admin: AdminAccess,
  rawUser: Record<string, unknown> | undefined,
  key: string,
  patch: FeatureFlagPatch,
): Promise<AdminSnapshot> {
  const config = getSupabaseConfig();
  const requestId = `admin_flag_${Date.now()}`;
  if (config.configured) {
    try {
      await patchSupabaseFeatureFlag(config, admin, key, patch);
      return buildAdminSnapshot(requestId, admin, rawUser);
    } catch (error) {
      RUNTIME_AUDIT.unshift({
        id: `runtime_supabase_flag_failure_${Date.now()}`,
        actor: admin.email || admin.userId || 'admin',
        target: key,
        action: 'supabase_feature_flag_update_failed',
        createdAt: nowIso(),
        detail: sanitizeErrorDetails(error, 180),
        severity: 'critical',
      });
    }
  }

  const previous = RUNTIME_FEATURE_FLAG_PATCHES.get(key) || {};
  RUNTIME_FEATURE_FLAG_PATCHES.set(key, { ...previous, ...patch });
  auditRuntimeFeatureFlagMutation(admin, key, patch);
  return buildAdminSnapshot(requestId, admin, rawUser);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, PATCH, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const access = requireAdmin(req);
  if (access.ok === false) {
    return res.status(access.statusCode).json({
      ok: false,
      requestId,
      error: access.error,
      errorCode: access.errorCode,
      hint: access.errorCode === 'admin_required'
        ? 'Set ADMIN_EMAILS or ADMIN_USER_IDS for the signed-in owner account.'
        : undefined,
    });
  }

  const limit = checkRateLimit(req, '/api/admin/management', access.auth.userId, ADMIN_RATE_LIMIT);
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
    if (req.method === 'GET') {
      const snapshot = await buildAdminSnapshot(requestId, access.admin, access.auth.user);
      return res.status(200).json(snapshot);
    }

    if (req.method === 'PATCH') {
      const action = normalizeText(req.body?.action);
      if (action !== 'update_user' && action !== 'update_feature_flag') {
        return res.status(400).json({
          ok: false,
          requestId,
          error: 'Unsupported admin action',
          errorCode: 'validation_error',
        });
      }
      if (action === 'update_feature_flag') {
        const validated = validateFeatureFlagPatch(req.body);
        if (validated.ok === false) {
          return res.status(400).json({
            ok: false,
            requestId,
            error: validated.error,
            errorCode: 'validation_error',
          });
        }
        const snapshot = await updateFeatureFlag(access.admin, access.auth.user, validated.key, validated.patch);
        return res.status(200).json({
          ...snapshot,
          requestId,
        });
      }
      const validated = validatePatch(req.body);
      if (validated.ok === false) {
        return res.status(400).json({
          ok: false,
          requestId,
          error: validated.error,
          errorCode: 'validation_error',
        });
      }
      const snapshot = await updateUser(access.admin, access.auth.user, validated.userId, validated.patch);
      return res.status(200).json({
        ...snapshot,
        requestId,
      });
    }

    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Admin management failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
