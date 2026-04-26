import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  AtSign,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Copy,
  Database,
  Download,
  Gauge,
  KeyRound,
  ListChecks,
  Lock,
  Mail,
  Moon,
  PanelRightOpen,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UserCog,
  Users,
  WalletCards,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthModal } from '../context/AuthModalContext';
import { isDisplayableAvatarUrl } from '../utils/avatarUrl';
import { subscribeMediaQueryChange } from '../utils/mediaQuery';
import {
  AdminApiError,
  fetchAdminSnapshot,
  updateAdminUser,
  updateFeatureFlag,
  type AccountRecoveryStatus,
  type AccountStatus,
  type AdminFeatureFlag,
  type AdminFeatureFlagPatch,
  type AdminPlan,
  type AdminRole,
  type AdminSnapshot,
  type AdminSystemCheck,
  type AdminUserPatch,
  type AdminUserRecord,
  type BillingMarket,
  type BillingProvider,
  type BillingStatus,
  type CheckStatus,
  type FeatureFlagStatus,
  type FeatureSurface,
  type LaunchChecklistItem,
  type PlanCode,
} from '../services/adminApi';

const TABS = [
  { id: 'overview', label: 'Command', icon: Gauge },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'plans', label: 'Plans', icon: WalletCards },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'audit', label: 'Audit', icon: BookOpenCheck },
  { id: 'launch', label: 'Launch', icon: ListChecks },
] as const;

type AdminTab = (typeof TABS)[number]['id'];
type UserQueueFilter = 'all' | 'risk' | 'recovery' | 'billing' | 'paid' | 'sample';
type UserMutationRiskLevel = 'warning' | 'critical';

type UserMutationRisk = {
  level: UserMutationRiskLevel;
  title: string;
  detail: string;
  confirmLabel: string;
  requiresReason: boolean;
  impacts: string[];
};

type PendingUserPatch = {
  user: AdminUserRecord;
  patch: AdminUserPatch;
  changes: string[];
  risk: UserMutationRisk;
};

type PendingFeatureFlagPatch = {
  flag: AdminFeatureFlag;
  patch: AdminFeatureFlagPatch;
  changes: string[];
};

const TAB_IDS = new Set<string>(TABS.map((tab) => tab.id));
const ROLE_OPTIONS: AdminRole[] = ['owner', 'admin', 'support', 'analyst', 'user'];
const STATUS_OPTIONS: AccountStatus[] = ['active', 'trialing', 'past_due', 'suspended', 'deleted'];
const RECOVERY_OPTIONS: AccountRecoveryStatus[] = ['none', 'requested', 'verified', 'resolved', 'rejected'];
const USER_QUEUE_OPTIONS: Array<{ value: UserQueueFilter; label: string }> = [
  { value: 'all', label: 'All queues' },
  { value: 'risk', label: 'Risk queue' },
  { value: 'recovery', label: 'Recovery queue' },
  { value: 'billing', label: 'Billing attention' },
  { value: 'paid', label: 'Paid users' },
  { value: 'sample', label: 'Preview data' },
];
const PLAN_OPTIONS: PlanCode[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
const BILLING_STATUS_OPTIONS: BillingStatus[] = ['none', 'active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded'];
const BILLING_PROVIDER_OPTIONS: BillingProvider[] = ['none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual'];
const BILLING_MARKET_OPTIONS: BillingMarket[] = ['indonesia', 'brunei', 'global', 'unknown'];
const FEATURE_STATUS_OPTIONS: FeatureFlagStatus[] = ['available', 'maintenance', 'disabled'];
const FEATURE_SURFACE_OPTIONS: FeatureSurface[] = ['global', 'web', 'pwa', 'mobile', 'admin'];
const ROLE_WEIGHT: Record<AdminRole, number> = {
  owner: 5,
  admin: 4,
  support: 3,
  analyst: 2,
  user: 1,
};
const PLAN_WEIGHT: Record<PlanCode, number> = {
  enterprise: 5,
  team: 4,
  pro: 3,
  starter: 2,
  free: 1,
};

function tabFromSearch(search: string): AdminTab {
  const requested = new URLSearchParams(search).get('tab') || 'overview';
  return TAB_IDS.has(requested) ? requested as AdminTab : 'overview';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
}

function formatUsd(value: number): string {
  if (value <= 0) return 'Custom';
  return new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatShortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 7)}...${value.slice(-5)}`;
}

function statusTone(status: string): string {
  if (status === 'pass' || status === 'active' || status === 'verified' || status === 'resolved') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'warn' || status === 'trialing' || status === 'past_due' || status === 'requested') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (status === 'fail' || status === 'suspended' || status === 'deleted' || status === 'rejected' || status === 'cancelled' || status === 'expired' || status === 'refunded') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  if (status === 'supabase') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
  return 'bg-surface-alpha text-secondary';
}

function csvEscape(value: unknown): string {
  const normalized = Array.isArray(value)
    ? value.join('; ')
    : value === null || value === undefined
      ? ''
      : String(value);
  const singleLine = normalized.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return /[",\r\n]/.test(singleLine) ? `"${singleLine}"` : singleLine;
}

function makeCsv(rows: unknown[][]): string {
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

function exportStamp(value: string): string {
  const date = new Date(value);
  const source = Number.isNaN(date.getTime()) ? new Date() : date;
  return source.toISOString().replace(/[:.]/g, '-');
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  return true;
}

function usersToCsv(snapshot: AdminSnapshot): string {
  return makeCsv([
    [
      'id',
      'email',
      'username',
      'display_name',
      'provider',
      'role',
      'status',
      'plan_code',
      'plan_name',
      'billing_status',
      'billing_provider',
      'billing_market',
      'payment_action_required',
      'recovery_status',
      'password_reset_required',
      'risk_score',
      'flags',
      'ai_requests_today',
      'deep_requests_today',
      'scanner_runs_today',
      'collection_writes_today',
      'total_tokens_today',
      'created_at',
      'last_seen_at',
      'locale',
      'platform',
      'country',
      'sample_data',
      'notes',
      'support_note',
    ],
    ...snapshot.users.map((user) => [
      user.id,
      user.email,
      user.username,
      user.name,
      user.provider,
      user.role,
      user.status,
      user.planCode,
      user.planName,
      user.billing.status,
      user.billing.provider,
      user.billing.market,
      user.billing.paymentActionRequired ? 'yes' : 'no',
      user.accountRecoveryStatus || 'none',
      Boolean(user.passwordResetRequired),
      user.riskScore,
      user.flags,
      user.usage.aiRequestsToday,
      user.usage.deepRequestsToday,
      user.usage.scannerRunsToday,
      user.usage.collectionWritesToday,
      user.usage.totalTokensToday,
      user.createdAt,
      user.lastSeenAt,
      user.locale || '',
      user.platform || '',
      user.country || '',
      Boolean(user.isSample),
      user.notes || '',
      user.supportNote || '',
    ]),
  ]);
}

function auditToCsv(snapshot: AdminSnapshot): string {
  return makeCsv([
    ['id', 'created_at', 'severity', 'actor', 'target', 'action', 'detail'],
    ...snapshot.audit.map((event) => [
      event.id,
      event.createdAt,
      event.severity,
      event.actor,
      event.target,
      event.action,
      event.detail,
    ]),
  ]);
}

function buildLaunchSummary(snapshot: AdminSnapshot): string {
  const users = snapshot.users;
  const riskUsers = users.filter(isRiskUser);
  const recoveryUsers = users.filter(isRecoveryUser);
  const maintenanceFlags = snapshot.featureFlags.filter((flag) => flag.status !== 'available');
  const criticalChecks = snapshot.checks.filter((check) => check.status === 'fail');
  const warningChecks = snapshot.checks.filter((check) => check.status === 'warn');
  const handoffUsers = [...recoveryUsers, ...riskUsers]
    .filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index)
    .slice(0, 5);

  return [
    'Baristachaw admin launch handoff',
    `Generated: ${snapshot.generatedAt}`,
    `Request: ${snapshot.requestId}`,
    `Mode: ${snapshot.dataMode}${snapshot.degraded ? ' (degraded)' : ''}`,
    '',
    `Users: ${snapshot.metrics.totalUsers} total / ${snapshot.metrics.activeUsers} active / ${snapshot.metrics.paidUsers} paid`,
    `Queues: ${riskUsers.length} risk / ${recoveryUsers.length} recovery / ${maintenanceFlags.length} maintenance flags`,
    `Launch gate: ${criticalChecks.length} critical / ${warningChecks.length} warnings`,
    '',
    'Urgent users:',
    ...(handoffUsers.length
      ? handoffUsers.map((user) => `- ${user.name} <${user.email}> / ${user.status} / ${user.planName} / recovery ${user.accountRecoveryStatus || 'none'} / risk ${user.riskScore}`)
      : ['- none']),
    '',
    'Maintenance flags:',
    ...(maintenanceFlags.length
      ? maintenanceFlags.map((flag) => `- ${flag.label}: ${flag.status} on ${flag.surfaces.join(', ')}${flag.message ? ` / ${flag.message}` : ''}`)
      : ['- none']),
    '',
    'Warnings:',
    ...(snapshot.warnings.length ? snapshot.warnings.map((warning) => `- ${warning}`) : ['- none']),
  ].join('\n');
}

function isRiskUser(user: AdminUserRecord): boolean {
  return user.riskScore >= 60 || user.status === 'past_due' || user.status === 'suspended';
}

function isRecoveryUser(user: AdminUserRecord): boolean {
  return Boolean(user.passwordResetRequired) || (user.accountRecoveryStatus || 'none') === 'requested';
}

function isBillingAttentionUser(user: AdminUserRecord): boolean {
  return Boolean(user.billing.paymentActionRequired)
    || user.billing.status === 'past_due'
    || user.billing.status === 'refunded'
    || user.billing.status === 'expired'
    || user.status === 'past_due';
}

function matchesUserQueue(user: AdminUserRecord, queue: UserQueueFilter): boolean {
  if (queue === 'risk') return isRiskUser(user);
  if (queue === 'recovery') return isRecoveryUser(user);
  if (queue === 'billing') return isBillingAttentionUser(user);
  if (queue === 'paid') return user.planCode !== 'free' && user.status !== 'deleted';
  if (queue === 'sample') return Boolean(user.isSample);
  return true;
}

function describeUserPatch(user: AdminUserRecord, patch: AdminUserPatch): string[] {
  const changes: string[] = [];
  if (patch.status && patch.status !== user.status) changes.push(`Status: ${user.status} -> ${patch.status}`);
  if (patch.role && patch.role !== user.role) changes.push(`Role: ${user.role} -> ${patch.role}`);
  if (patch.planCode && patch.planCode !== user.planCode) changes.push(`Plan: ${user.planName} -> ${patch.planCode}`);
  if (patch.billingStatus && patch.billingStatus !== user.billing.status) changes.push(`Billing: ${user.billing.status} -> ${patch.billingStatus}`);
  if (patch.billingProvider && patch.billingProvider !== user.billing.provider) changes.push(`Provider: ${user.billing.provider} -> ${patch.billingProvider}`);
  if (patch.billingMarket && patch.billingMarket !== user.billing.market) changes.push(`Market: ${user.billing.market} -> ${patch.billingMarket}`);
  if (typeof patch.paymentActionRequired === 'boolean' && patch.paymentActionRequired !== user.billing.paymentActionRequired) {
    changes.push(`Payment action: ${patch.paymentActionRequired ? 'required' : 'cleared'}`);
  }
  if (typeof patch.passwordResetRequired === 'boolean' && patch.passwordResetRequired !== Boolean(user.passwordResetRequired)) {
    changes.push(`Password reset: ${patch.passwordResetRequired ? 'required' : 'cleared'}`);
  }
  if (patch.accountRecoveryStatus && patch.accountRecoveryStatus !== user.accountRecoveryStatus) {
    changes.push(`Recovery: ${user.accountRecoveryStatus || 'none'} -> ${patch.accountRecoveryStatus}`);
  }
  if (patch.username && patch.username !== user.username) changes.push(`Username: @${user.username || 'unassigned'} -> @${patch.username}`);
  if (patch.displayName && patch.displayName !== user.name) changes.push(`Display name: ${user.name} -> ${patch.displayName}`);
  if (typeof patch.supportNote === 'string' && patch.supportNote.trim() !== (user.supportNote || '').trim()) changes.push('Support note updated');
  return changes;
}

function appendOperatorReasonToPatch(
  user: AdminUserRecord,
  patch: AdminUserPatch,
  reason: string,
  changes: string[],
): AdminUserPatch {
  const normalizedReason = reason.trim();
  if (!normalizedReason) return patch;
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const changeSummary = changes.length ? ` Changes: ${changes.join('; ')}.` : '';
  const entry = `[${timestamp}] Operator reason: ${normalizedReason}.${changeSummary}`;
  const baseSupportNote = 'supportNote' in patch
    ? String(patch.supportNote || '').trim()
    : (user.supportNote || '').trim();
  const supportNote = baseSupportNote ? `${entry}\n${baseSupportNote}` : entry;
  return {
    ...patch,
    supportNote: supportNote.slice(0, 800),
  };
}

function classifyUserPatchRisk(user: AdminUserRecord, patch: AdminUserPatch): UserMutationRisk | null {
  const impacts: string[] = [];
  let level: UserMutationRiskLevel | null = null;
  let title = 'Confirm account change';
  let detail = 'This change affects account access or support state.';
  let confirmLabel = 'Confirm change';

  if (patch.status && patch.status !== user.status) {
    if (patch.status === 'deleted') {
      level = 'critical';
      title = 'Confirm account deletion state';
      detail = 'This marks the account as deleted and blocks normal app access.';
      confirmLabel = 'Mark deleted';
      impacts.push('The user may lose access to app workflows immediately.');
      impacts.push('Support should retain an audit reason before this is used for a real customer.');
    } else if (patch.status === 'suspended') {
      level = 'critical';
      title = 'Confirm account suspension';
      detail = 'This blocks the account from normal Baristachaw access until restored.';
      confirmLabel = 'Suspend account';
      impacts.push('The user will be blocked from protected app workflows.');
      impacts.push('The change is written to the admin audit trail.');
    } else if (patch.status === 'past_due') {
      level = level || 'warning';
      impacts.push('Past-due status can degrade or restrict user access depending on enforcement settings.');
    }
  }

  if (patch.role && patch.role !== user.role) {
    const currentWeight = ROLE_WEIGHT[user.role];
    const nextWeight = ROLE_WEIGHT[patch.role];
    if (patch.role === 'owner' || user.role === 'owner') {
      level = 'critical';
      title = 'Confirm privileged role change';
      detail = 'Owner and admin role changes affect who can manage users, plans, and launch controls.';
      confirmLabel = 'Confirm role change';
      impacts.push('A privileged role change can alter access to admin management.');
    } else if (nextWeight >= ROLE_WEIGHT.admin || nextWeight < currentWeight) {
      level = level === 'critical' ? level : 'warning';
      impacts.push('Role changes can grant or remove operational permissions.');
    }
  }

  if (patch.planCode && patch.planCode !== user.planCode) {
    const currentWeight = PLAN_WEIGHT[user.planCode];
    const nextWeight = PLAN_WEIGHT[patch.planCode];
    level = level === 'critical' ? level : 'warning';
    impacts.push(nextWeight < currentWeight
      ? 'Plan downgrade can reduce AI, scanner, storage, and seat limits.'
      : 'Plan upgrade can increase quotas and commercial entitlement.');
  }

  if (patch.billingStatus && patch.billingStatus !== user.billing.status) {
    level = level === 'critical' ? level : 'warning';
    impacts.push('Billing status changes affect user plan access, renewal support, and payment messaging.');
  }

  if (typeof patch.paymentActionRequired === 'boolean' && patch.paymentActionRequired !== user.billing.paymentActionRequired) {
    level = level === 'critical' ? level : 'warning';
    impacts.push('Payment action flags are reflected in the user workspace status.');
  }

  if (patch.passwordResetRequired && !user.passwordResetRequired) {
    level = level === 'critical' ? level : 'warning';
    impacts.push('The user will be forced into account recovery/password reset flow.');
  }

  if (patch.accountRecoveryStatus === 'rejected' && user.accountRecoveryStatus !== 'rejected') {
    level = level === 'critical' ? level : 'warning';
    impacts.push('Rejecting recovery can leave the user unable to regain access without support follow-up.');
  }

  if (!level) return null;
  return {
    level,
    title,
    detail,
    confirmLabel,
    requiresReason: level === 'critical',
    impacts: impacts.length ? impacts : ['This change affects user access and should be reviewed before saving.'],
  };
}

function featureFlagPatchRequiresMessage(flag: AdminFeatureFlag, patch: AdminFeatureFlagPatch): boolean {
  return Boolean(patch.status && patch.status !== flag.status && patch.status !== 'available');
}

function describeFeatureFlagPatch(flag: AdminFeatureFlag, patch: AdminFeatureFlagPatch): string[] {
  const changes: string[] = [];
  if (patch.status && patch.status !== flag.status) changes.push(`Status: ${flag.status} -> ${patch.status}`);
  if (typeof patch.message === 'string' && patch.message.trim() !== (flag.message || '').trim()) changes.push('Message updated');
  if (patch.surfaces?.length && patch.surfaces.join(', ') !== flag.surfaces.join(', ')) {
    changes.push(`Surfaces: ${flag.surfaces.join(', ')} -> ${patch.surfaces.join(', ')}`);
  }
  return changes;
}

function initialFeatureFlagMessage(flag: AdminFeatureFlag, patch: AdminFeatureFlagPatch): string {
  if (typeof patch.message === 'string' && patch.message.trim()) return patch.message.trim();
  return flag.message || '';
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={clsx('inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold capitalize', statusTone(value))}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 size={17} className="text-emerald-500" />;
  if (status === 'warn') return <AlertTriangle size={17} className="text-amber-500" />;
  return <XCircle size={17} className="text-rose-500" />;
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="min-h-[8.25rem] rounded-2xl border border-glass bg-surface-alpha px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">{label}</p>
        <Icon size={18} className="text-blue-500" />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-primary">{value}</p>
      <p className="mt-2 text-xs leading-5 text-secondary">{detail}</p>
    </div>
  );
}

function ProtectedGate({
  error,
  onSignIn,
  onRetry,
}: {
  error: AdminApiError | null;
  onSignIn: () => void;
  onRetry: () => void;
}) {
  const isAuthRequired = error?.status === 401;
  return (
    <div className="flex min-h-[var(--app-height)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[1.6rem] border border-glass bg-[var(--bg-base)]/94 p-6 shadow-[var(--panel-elev-2)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-normal text-primary">Admin access required</h1>
        <p className="mt-3 text-sm leading-6 text-secondary">
          {isAuthRequired
            ? 'Sign in with an owner account to open the management console.'
            : error?.details || 'Your current account is not in ADMIN_EMAILS or ADMIN_USER_IDS.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {isAuthRequired ? (
            <button type="button" onClick={onSignIn} className="glass-button-primary px-4 py-2 text-sm">
              Sign in
            </button>
          ) : null}
          <button type="button" onClick={onRetry} className="glass-button px-4 py-2 text-sm">
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminInlineError({
  error,
  onDismiss,
}: {
  error: AdminApiError;
  onDismiss: () => void;
}) {
  return (
    <section className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              {error.errorCode ? error.errorCode.replace(/_/g, ' ') : 'Admin request failed'}
            </p>
            <p className="mt-1 text-sm leading-6 text-secondary">{error.message}</p>
            {error.details ? <p className="mt-1 text-xs leading-5 text-tertiary">{error.details}</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
          aria-label="Dismiss admin error"
        >
          <X size={16} />
        </button>
      </div>
    </section>
  );
}

function ChecksPanel({ checks }: { checks: AdminSystemCheck[] }) {
  return (
    <div className="rounded-2xl border border-glass bg-surface-alpha">
      {checks.map((check, index) => (
        <div
          key={check.id}
          className={clsx('grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_0.9fr_1.5fr]', index > 0 && 'border-t border-glass')}
        >
          <div className="flex min-w-0 items-center gap-3">
            <CheckIcon status={check.status} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{check.label}</p>
              <p className="text-xs text-tertiary">{check.owner}</p>
            </div>
          </div>
          <div>
            <StatusBadge value={check.status} />
          </div>
          <div className="min-w-0">
            <p className="text-sm leading-5 text-secondary">{check.detail}</p>
            {check.nextAction ? <p className="mt-1 text-xs leading-5 text-tertiary">{check.nextAction}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

type AdminQueueSummary = {
  riskUsers: AdminUserRecord[];
  recoveryUsers: AdminUserRecord[];
  billingUsers: AdminUserRecord[];
  pastDueUsers: AdminUserRecord[];
  paidUsers: AdminUserRecord[];
  maintenanceFlags: AdminFeatureFlag[];
  criticalChecks: AdminSystemCheck[];
  warningChecks: AdminSystemCheck[];
};

function AdminCommandCenter({
  snapshot,
  queues,
  onOpenQueue,
  onOpenMaintenance,
  onOpenUser,
}: {
  snapshot: AdminSnapshot;
  queues: AdminQueueSummary;
  onOpenQueue: (queue: UserQueueFilter) => void;
  onOpenMaintenance: () => void;
  onOpenUser: (userId: string, queue: UserQueueFilter) => void;
}) {
  const handoffUsers = [...queues.billingUsers, ...queues.recoveryUsers, ...queues.riskUsers]
    .filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index)
    .slice(0, 3);

  return (
    <section className="grid gap-3 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">Operations command center</h2>
            <p className="mt-1 text-sm leading-6 text-secondary">
              Prioritized queues for account support, launch blockers, and live maintenance response.
            </p>
          </div>
          <StatusBadge value={snapshot.degraded ? 'warn' : 'pass'} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => onOpenQueue('risk')}
            className="rounded-2xl border border-glass bg-surface-alpha p-4 text-left transition-colors hover:bg-[var(--bg-base)]"
          >
            <AlertTriangle size={18} className="text-rose-500" />
            <p className="mt-3 text-2xl font-semibold text-primary">{queues.riskUsers.length}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">Risk queue</p>
            <p className="mt-2 text-xs leading-5 text-secondary">{queues.pastDueUsers.length} past-due plus suspended or high-risk accounts.</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenQueue('recovery')}
            className="rounded-2xl border border-glass bg-surface-alpha p-4 text-left transition-colors hover:bg-[var(--bg-base)]"
          >
            <KeyRound size={18} className="text-amber-500" />
            <p className="mt-3 text-2xl font-semibold text-primary">{queues.recoveryUsers.length}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">Recovery</p>
            <p className="mt-2 text-xs leading-5 text-secondary">Password reset and account recovery requests.</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenQueue('billing')}
            className="rounded-2xl border border-glass bg-surface-alpha p-4 text-left transition-colors hover:bg-[var(--bg-base)]"
          >
            <WalletCards size={18} className="text-blue-500" />
            <p className="mt-3 text-2xl font-semibold text-primary">{queues.billingUsers.length}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">Billing</p>
            <p className="mt-2 text-xs leading-5 text-secondary">Payment action, refund, expired, and past-due reviews.</p>
          </button>
          <button
            type="button"
            onClick={onOpenMaintenance}
            className="rounded-2xl border border-glass bg-surface-alpha p-4 text-left transition-colors hover:bg-[var(--bg-base)]"
          >
            <Wrench size={18} className="text-blue-500" />
            <p className="mt-3 text-2xl font-semibold text-primary">{queues.maintenanceFlags.length}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">Flags</p>
            <p className="mt-2 text-xs leading-5 text-secondary">Active web, PWA, mobile, or admin maintenance controls.</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenQueue('paid')}
            className="rounded-2xl border border-glass bg-surface-alpha p-4 text-left transition-colors hover:bg-[var(--bg-base)]"
          >
            <WalletCards size={18} className="text-emerald-500" />
            <p className="mt-3 text-2xl font-semibold text-primary">{queues.paidUsers.length}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">Paid</p>
            <p className="mt-2 text-xs leading-5 text-secondary">Starter, Pro, Team, and Enterprise accounts.</p>
          </button>
        </div>
      </div>

      <aside className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-primary">Operator handoff</h2>
            <p className="mt-1 text-sm text-secondary">{queues.criticalChecks.length} critical / {queues.warningChecks.length} warnings</p>
          </div>
          <StatusBadge value={queues.criticalChecks.length ? 'fail' : queues.warningChecks.length ? 'warn' : 'pass'} />
        </div>
        <div className="mt-4 space-y-2">
          {handoffUsers.length ? handoffUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onOpenUser(user.id, isBillingAttentionUser(user) ? 'billing' : isRecoveryUser(user) ? 'recovery' : 'risk')}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-alpha px-3 py-3 text-left transition-colors hover:bg-[var(--bg-base)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-primary">{user.name}</span>
                <span className="mt-1 block truncate text-xs text-tertiary">{user.email}</span>
              </span>
              <span className="shrink-0 text-right">
                <StatusBadge value={isBillingAttentionUser(user) ? user.billing.status : isRecoveryUser(user) ? 'requested' : user.status} />
                <span className="mt-1 block text-[11px] font-semibold text-secondary">{user.planName}</span>
              </span>
            </button>
          )) : (
            <div className="rounded-2xl bg-surface-alpha px-3 py-5 text-center">
              <p className="text-sm font-semibold text-primary">No urgent handoff</p>
              <p className="mt-1 text-xs text-secondary">Risk and recovery queues are clear.</p>
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}

function AdminOpsExportPanel({
  snapshot,
  queues,
  onExportUsers,
  onExportAudit,
  onCopySummary,
}: {
  snapshot: AdminSnapshot;
  queues: AdminQueueSummary;
  onExportUsers: () => void;
  onExportAudit: () => void;
  onCopySummary: () => void;
}) {
  return (
    <section className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-primary">Operator export deck</h2>
          <p className="mt-1 text-sm leading-6 text-secondary">
            Download the current account roster, audit trail, or copy a launch handoff summary for support and founders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExportUsers}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
          >
            <Download size={15} />
            Users CSV
          </button>
          <button
            type="button"
            onClick={onExportAudit}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
          >
            <Download size={15} />
            Audit CSV
          </button>
          <button
            type="button"
            onClick={onCopySummary}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition-colors hover:bg-blue-600"
          >
            <ClipboardCheck size={15} />
            Copy handoff
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-xs text-secondary sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">Snapshot</p>
          <p className="mt-2 truncate font-semibold text-primary">{formatShortId(snapshot.requestId)}</p>
        </div>
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">Freshness</p>
          <p className="mt-2 font-semibold text-primary">{formatNumber(snapshot.dataFreshnessSec)}s / {snapshot.dataMode}</p>
        </div>
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">Queues</p>
          <p className="mt-2 font-semibold text-primary">{queues.riskUsers.length} risk / {queues.recoveryUsers.length} recovery</p>
        </div>
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">Flags</p>
          <p className="mt-2 font-semibold text-primary">{queues.maintenanceFlags.length} maintenance / {snapshot.audit.length} audit rows</p>
        </div>
      </div>
    </section>
  );
}

function UserAvatar({ user }: { user: AdminUserRecord }) {
  const [failed, setFailed] = useState(false);
  const label = (user.name || user.username || user.email || 'U').slice(0, 1).toUpperCase();
  const pictureUrl = isDisplayableAvatarUrl(user.picture) ? user.picture : '';
  if (pictureUrl && !failed) {
    return (
      <img
        src={pictureUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-600 dark:text-blue-300">
      {label}
    </div>
  );
}

function ConfirmUserMutationDialog({
  pending,
  busy,
  onCancel,
  onConfirm,
}: {
  pending: PendingUserPatch;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (operatorReason: string) => void;
}) {
  const isCritical = pending.risk.level === 'critical';
  const [operatorReason, setOperatorReason] = useState('');
  const reasonReady = !pending.risk.requiresReason || operatorReason.trim().length >= 8;

  useEffect(() => {
    setOperatorReason('');
  }, [pending]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 px-3 py-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[1.4rem] border border-glass bg-[var(--bg-base)] p-4 shadow-[var(--panel-elev-2)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.4rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-user-mutation-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={clsx(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isCritical ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500',
            )}>
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="confirm-user-mutation-title" className="text-lg font-semibold text-primary">{pending.risk.title}</h2>
              <p className="mt-1 text-sm leading-6 text-secondary">{pending.risk.detail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-surface-alpha hover:text-primary disabled:opacity-50"
            aria-label="Cancel account change"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-glass bg-surface-alpha p-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={pending.user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{pending.user.name}</p>
              <p className="truncate text-xs text-tertiary">{pending.user.email}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {pending.changes.map((change) => (
              <div key={change} className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-sm font-semibold text-secondary">
                {change}
              </div>
            ))}
          </div>
        </div>

        <div className={clsx(
          'mt-3 rounded-2xl border px-3 py-3',
          isCritical ? 'border-rose-500/25 bg-rose-500/10' : 'border-amber-500/25 bg-amber-500/10',
        )}>
          <p className={clsx('text-xs font-semibold uppercase tracking-[0.14em]', isCritical ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300')}>
            Operator review
          </p>
          <ul className="mt-2 space-y-1.5">
            {pending.risk.impacts.map((impact) => (
              <li key={impact} className="text-sm leading-5 text-secondary">{impact}</li>
            ))}
          </ul>
        </div>

        <label className="mt-3 grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">
            Operator reason{pending.risk.requiresReason ? ' required' : ''}
          </span>
          <textarea
            value={operatorReason}
            onChange={(event) => setOperatorReason(event.currentTarget.value)}
            maxLength={220}
            placeholder={pending.risk.requiresReason ? 'Reason for this account access change' : 'Optional note for support history'}
            disabled={busy}
            className="min-h-20 resize-none rounded-xl border border-glass bg-surface-alpha px-3 py-2 text-sm leading-6 text-primary outline-none transition-colors placeholder:text-tertiary focus:border-blue-400 disabled:opacity-50"
          />
          <span className="text-xs text-tertiary">
            {operatorReason.trim().length}/220 saved to support note
          </span>
        </label>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(operatorReason)}
            disabled={busy || !reasonReady}
            className={clsx(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              isCritical ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600',
            )}
          >
            <AlertTriangle size={16} />
            {busy ? 'Saving...' : pending.risk.confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmFeatureFlagMutationDialog({
  pending,
  busy,
  onCancel,
  onConfirm,
}: {
  pending: PendingFeatureFlagPatch;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (message: string) => void;
}) {
  const nextStatus = pending.patch.status || pending.flag.status;
  const isDisabled = nextStatus === 'disabled';
  const [message, setMessage] = useState(initialFeatureFlagMessage(pending.flag, pending.patch));
  const messageReady = message.trim().length >= 12;

  useEffect(() => {
    setMessage(initialFeatureFlagMessage(pending.flag, pending.patch));
  }, [pending]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 px-3 py-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[1.4rem] border border-glass bg-[var(--bg-base)] p-4 shadow-[var(--panel-elev-2)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.4rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-feature-flag-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={clsx(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              isDisabled ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500',
            )}>
              <Wrench size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="confirm-feature-flag-title" className="text-lg font-semibold text-primary">
                {isDisabled ? 'Confirm feature disable' : 'Confirm maintenance mode'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-secondary">
                This changes availability for Baristachaw surfaces and should include a clear operator message.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-surface-alpha hover:text-primary disabled:opacity-50"
            aria-label="Cancel feature flag change"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-glass bg-surface-alpha p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{pending.flag.label}</p>
              <p className="truncate text-xs text-tertiary">{pending.flag.key} / {pending.flag.surfaces.join(', ')}</p>
            </div>
            <StatusBadge value={nextStatus} />
          </div>
          <div className="mt-4 grid gap-2">
            {pending.changes.map((change) => (
              <div key={change} className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-sm font-semibold text-secondary">
                {change}
              </div>
            ))}
          </div>
        </div>

        <div className={clsx(
          'mt-3 rounded-2xl border px-3 py-3',
          isDisabled ? 'border-rose-500/25 bg-rose-500/10' : 'border-amber-500/25 bg-amber-500/10',
        )}>
          <p className={clsx('text-xs font-semibold uppercase tracking-[0.14em]', isDisabled ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300')}>
            User impact
          </p>
          <p className="mt-2 text-sm leading-5 text-secondary">
            Users on selected surfaces may see a blocked or degraded feature state until the flag returns to available.
          </p>
        </div>

        <label className="mt-3 grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Operator message required</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.currentTarget.value)}
            maxLength={240}
            placeholder="Short user-facing maintenance or disable reason"
            disabled={busy}
            className="min-h-20 resize-none rounded-xl border border-glass bg-surface-alpha px-3 py-2 text-sm leading-6 text-primary outline-none transition-colors placeholder:text-tertiary focus:border-blue-400 disabled:opacity-50"
          />
          <span className="text-xs text-tertiary">{message.trim().length}/240 saved to maintenance message</span>
        </label>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(message)}
            disabled={busy || !messageReady}
            className={clsx(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              isDisabled ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600',
            )}
          >
            <Wrench size={16} />
            {busy ? 'Saving...' : isDisabled ? 'Disable feature' : 'Apply maintenance'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function UsersTable({
  users,
  plans,
  busyUserId,
  selectedUserId,
  onPatch,
  onSelect,
  onCopy,
}: {
  users: AdminUserRecord[];
  plans: AdminPlan[];
  busyUserId: string | null;
  selectedUserId: string | null;
  onPatch: (userId: string, patch: AdminUserPatch) => void;
  onSelect: (userId: string) => void;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {users.map((user) => (
          <article key={user.id} className={clsx('rounded-2xl border border-glass bg-surface-alpha p-4', selectedUserId === user.id && 'ring-2 ring-blue-500/30')}>
            <div className="flex items-start gap-3">
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-primary">{user.name}</h3>
                  {user.isSample ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">preview</span> : null}
                </div>
                <p className="truncate text-sm font-semibold text-blue-600 dark:text-blue-300">@{user.username || 'unassigned'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-tertiary">
                  <span className="max-w-full truncate">{user.email}</span>
                  <button type="button" onClick={() => onCopy(user.email, 'Email')} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--bg-base)]" aria-label={`Copy email for ${user.email}`}>
                    <Copy size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-tertiary">
                  <span>{formatShortId(user.id)}</span>
                  <button type="button" onClick={() => onCopy(user.id, 'User ID')} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--bg-base)]" aria-label={`Copy user id for ${user.email}`}>
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={user.status}
                  disabled={busyUserId === user.id}
                  onChange={(event) => onPatch(user.id, { status: event.currentTarget.value as AccountStatus })}
                  className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-semibold text-primary"
                  aria-label={`Change status for ${user.email}`}
                >
                  {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select
                  value={user.planCode}
                  disabled={busyUserId === user.id}
                  onChange={(event) => onPatch(user.id, { planCode: event.currentTarget.value as PlanCode })}
                  className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-semibold text-primary"
                  aria-label={`Change plan for ${user.email}`}
                >
                  {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                </select>
                <select
                  value={user.role}
                  disabled={busyUserId === user.id}
                  onChange={(event) => onPatch(user.id, { role: event.currentTarget.value as AdminRole })}
                  className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-semibold text-primary"
                  aria-label={`Change role for ${user.email}`}
                >
                  {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => onSelect(user.id)}
                  className={clsx(
                    'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                    selectedUserId === user.id ? 'bg-blue-500 text-white' : 'border border-glass bg-[var(--bg-base)] text-secondary hover:text-primary',
                  )}
                >
                  <PanelRightOpen size={15} />
                  Manage
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-base)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={user.passwordResetRequired ? 'requested' : (user.accountRecoveryStatus || 'none')} />
                  <StatusBadge value={user.billing.status} />
                  <span className="text-xs text-tertiary">{user.provider}</span>
                </div>
                <p className="text-xs font-semibold text-secondary">{formatNumber(user.usage.aiRequestsToday)} AI / risk {user.riskScore}</p>
              </div>
              {busyUserId === user.id ? <p className="text-xs font-semibold text-blue-500">Saving account...</p> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-glass bg-surface-alpha md:block">
      <div className="overflow-x-auto">
        <table className={clsx(selectedUserId ? 'min-w-full' : 'min-w-[68rem]', 'w-full border-collapse text-left')}>
          <thead className="border-b border-glass text-[11px] uppercase tracking-[0.14em] text-tertiary">
            <tr>
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Billing</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Recovery</th>
              {!selectedUserId ? (
                <>
                  <th className="px-4 py-3 font-semibold">Usage today</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="px-4 py-3 font-semibold">Last seen</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={clsx('border-b border-glass last:border-b-0', selectedUserId === user.id && 'bg-blue-500/5')}>
                <td className="px-4 py-4 align-top">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-primary">{user.name}</p>
                        {user.isSample ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">preview</span> : null}
                      </div>
                      <p className="truncate text-xs font-semibold text-blue-600 dark:text-blue-300">@{user.username || 'unassigned'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-tertiary">
                        <span className="max-w-[13rem] truncate">{user.email}</span>
                        <button
                          type="button"
                          onClick={() => onCopy(user.email, 'Email')}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
                          aria-label={`Copy email for ${user.email}`}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-tertiary">
                        <span>{formatShortId(user.id)}</span>
                        <button
                          type="button"
                          onClick={() => onCopy(user.id, 'User ID')}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
                          aria-label={`Copy user id for ${user.email}`}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelect(user.id)}
                        className={clsx(
                          'mt-2 inline-flex min-h-8 items-center gap-2 rounded-xl px-2.5 text-[11px] font-semibold transition-colors',
                          selectedUserId === user.id
                            ? 'bg-blue-500 text-white'
                            : 'border border-glass bg-[var(--bg-base)] text-secondary hover:text-primary',
                        )}
                      >
                        <PanelRightOpen size={13} />
                        Manage
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <select
                    value={user.status}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { status: event.currentTarget.value as AccountStatus })}
                    className={clsx(selectedUserId ? 'w-28' : 'w-32', 'rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary')}
                    aria-label={`Change status for ${user.email}`}
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4 align-top">
                  <select
                    value={user.planCode}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { planCode: event.currentTarget.value as PlanCode })}
                    className={clsx(selectedUserId ? 'w-28' : 'w-32', 'rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary')}
                    aria-label={`Change plan for ${user.email}`}
                  >
                    {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <StatusBadge value={user.billing.status} />
                    <p className="text-[11px] capitalize text-tertiary">{user.billing.provider.replace(/_/g, ' ')} / {user.billing.market}</p>
                    {user.billing.paymentActionRequired ? <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">Action required</p> : null}
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <select
                    value={user.role}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { role: event.currentTarget.value as AdminRole })}
                    className={clsx(selectedUserId ? 'w-28' : 'w-32', 'rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary')}
                    aria-label={`Change role for ${user.email}`}
                  >
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <StatusBadge value={user.passwordResetRequired ? 'requested' : (user.accountRecoveryStatus || 'none')} />
                    <p className="text-[11px] text-tertiary">
                      {user.passwordResetRequired ? 'Password reset required' : user.provider}
                    </p>
                  </div>
                </td>
                {!selectedUserId ? (
                  <>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-semibold text-primary">{formatNumber(user.usage.aiRequestsToday)} AI</p>
                      <p className="text-xs text-secondary">{formatNumber(user.usage.deepRequestsToday)} deep / {formatNumber(user.usage.scannerRunsToday)} scans</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-alpha">
                          <div
                            className={clsx('h-full rounded-full', user.riskScore >= 60 ? 'bg-rose-500' : user.riskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min(100, Math.max(0, user.riskScore))}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-secondary">{user.riskScore}</span>
                      </div>
                      {user.flags.length ? <p className="mt-1 text-[11px] text-tertiary">{user.flags.join(', ')}</p> : null}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-xs text-secondary">{formatDate(user.lastSeenAt)}</p>
                      {busyUserId === user.id ? <p className="mt-1 text-[11px] text-blue-500">Saving...</p> : null}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}

function AccountInspector({
  user,
  plans,
  busy,
  error,
  onClose,
  onDismissError,
  onPatch,
  onCopy,
}: {
  user: AdminUserRecord;
  plans: AdminPlan[];
  busy: boolean;
  error: AdminApiError | null;
  onClose: () => void;
  onDismissError: () => void;
  onPatch: (userId: string, patch: AdminUserPatch) => void;
  onCopy: (value: string, label: string) => void;
}) {
  const [displayName, setDisplayName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [role, setRole] = useState<AdminRole>(user.role);
  const [status, setStatus] = useState<AccountStatus>(user.status);
  const [planCode, setPlanCode] = useState<PlanCode>(user.planCode);
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(user.billing.status);
  const [billingProvider, setBillingProvider] = useState<BillingProvider>(user.billing.provider);
  const [billingMarket, setBillingMarket] = useState<BillingMarket>(user.billing.market);
  const [paymentActionRequired, setPaymentActionRequired] = useState(Boolean(user.billing.paymentActionRequired));
  const [recoveryStatus, setRecoveryStatus] = useState<AccountRecoveryStatus>(user.accountRecoveryStatus || 'none');
  const [passwordResetRequired, setPasswordResetRequired] = useState(Boolean(user.passwordResetRequired));
  const [notes, setNotes] = useState(user.notes || '');
  const [supportNote, setSupportNote] = useState(user.supportNote || '');

  useEffect(() => {
    setDisplayName(user.name);
    setUsername(user.username);
    setRole(user.role);
    setStatus(user.status);
    setPlanCode(user.planCode);
    setBillingStatus(user.billing.status);
    setBillingProvider(user.billing.provider);
    setBillingMarket(user.billing.market);
    setPaymentActionRequired(Boolean(user.billing.paymentActionRequired));
    setRecoveryStatus(user.accountRecoveryStatus || 'none');
    setPasswordResetRequired(Boolean(user.passwordResetRequired));
    setNotes(user.notes || '');
    setSupportNote(user.supportNote || '');
  }, [user]);

  const dirty = displayName.trim() !== user.name
    || username.trim() !== user.username
    || role !== user.role
    || status !== user.status
    || planCode !== user.planCode
    || billingStatus !== user.billing.status
    || billingProvider !== user.billing.provider
    || billingMarket !== user.billing.market
    || paymentActionRequired !== Boolean(user.billing.paymentActionRequired)
    || recoveryStatus !== user.accountRecoveryStatus
    || passwordResetRequired !== Boolean(user.passwordResetRequired)
    || notes.trim() !== (user.notes || '')
    || supportNote.trim() !== (user.supportNote || '');

  const selectedPlan = plans.find((plan) => plan.code === planCode) || plans.find((plan) => plan.code === user.planCode) || plans[0];
  const provisionalPlanCode = planCode === 'free' ? 'starter' : planCode;
  const provisionalPlan = plans.find((plan) => plan.code === provisionalPlanCode) || selectedPlan;
  const provisionalLimitLabel = provisionalPlan
    ? `${formatNumber(provisionalPlan.aiDailyLimit)} AI / ${formatNumber(provisionalPlan.deepDailyLimit)} deep / ${formatNumber(provisionalPlan.scannerDailyLimit)} scans daily`
    : 'plan limits pending';

  const saveAccount = () => {
    const patch: AdminUserPatch = {};
    const nextDisplayName = displayName.trim();
    const nextUsername = username.trim().replace(/^@+/, '');
    if (nextDisplayName && nextDisplayName !== user.name) patch.displayName = nextDisplayName;
    if (nextUsername && nextUsername !== user.username) patch.username = nextUsername;
    if (role !== user.role) patch.role = role;
    if (status !== user.status) patch.status = status;
    if (planCode !== user.planCode) patch.planCode = planCode;
    if (billingStatus !== user.billing.status) patch.billingStatus = billingStatus;
    if (billingProvider !== user.billing.provider) patch.billingProvider = billingProvider;
    if (billingMarket !== user.billing.market) patch.billingMarket = billingMarket;
    if (paymentActionRequired !== Boolean(user.billing.paymentActionRequired)) patch.paymentActionRequired = paymentActionRequired;
    if (recoveryStatus !== user.accountRecoveryStatus) patch.accountRecoveryStatus = recoveryStatus;
    if (passwordResetRequired !== Boolean(user.passwordResetRequired)) patch.passwordResetRequired = passwordResetRequired;
    if (notes.trim() !== (user.notes || '')) patch.notes = notes.trim();
    if (supportNote.trim() !== (user.supportNote || '')) patch.supportNote = supportNote.trim();
    if (Object.keys(patch).length > 0) onPatch(user.id, patch);
  };

  const requirePasswordReset = () => {
    onPatch(user.id, {
      accountRecoveryStatus: 'requested',
      passwordResetRequired: true,
    });
  };

  const clearRecovery = () => {
    onPatch(user.id, {
      accountRecoveryStatus: 'resolved',
      passwordResetRequired: false,
    });
  };

  const markBillingResolved = () => {
    onPatch(user.id, {
      billingStatus: planCode === 'free' ? 'none' : 'active',
      status: status === 'past_due' ? 'active' : status,
      paymentActionRequired: false,
      supportNote: 'Operator reason: payment issue resolved and billing access refreshed.',
    });
  };

  const markReceiptReceived = () => {
    const targetPlanCode = provisionalPlanCode;
    const targetPlanName = provisionalPlan?.name || targetPlanCode;
    onPatch(user.id, {
      planCode: targetPlanCode,
      billingStatus: 'trialing',
      billingProvider: 'manual',
      billingMarket,
      status: status === 'suspended' || status === 'deleted' ? status : 'active',
      paymentActionRequired: true,
      supportNote: `Receipt received: provisional ${targetPlanName} token limits applied (${provisionalLimitLabel}). Admin must verify the subscription manually before marking paid.`,
    });
  };

  const markBillingPastDue = () => {
    onPatch(user.id, {
      billingStatus: 'past_due',
      status: 'past_due',
      paymentActionRequired: true,
      supportNote: 'Operator reason: payment provider reported past-due renewal.',
    });
  };

  return (
    <aside className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/82 p-4 shadow-[var(--panel-elev-1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <UserCog size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-primary">Account control</h2>
              <p className="truncate text-xs text-tertiary">{user.provider} / {user.platform || 'unknown'} / {user.locale || 'locale n/a'}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:bg-surface-alpha hover:text-primary"
          aria-label="Close account panel"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <button type="button" onClick={() => onCopy(user.id, 'User ID')} className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-glass bg-surface-alpha px-3 text-left text-secondary">
          <span className="inline-flex min-w-0 items-center gap-2"><Copy size={14} /> <span className="truncate">{formatShortId(user.id)}</span></span>
          <span className="font-semibold text-primary">ID</span>
        </button>
        <button type="button" onClick={() => onCopy(user.email, 'Email')} className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-glass bg-surface-alpha px-3 text-left text-secondary">
          <span className="inline-flex min-w-0 items-center gap-2"><Mail size={14} /> <span className="truncate">{user.email}</span></span>
          <span className="font-semibold text-primary">Email</span>
        </button>
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-glass bg-surface-alpha px-3 text-secondary">
          <span className="inline-flex min-w-0 items-center gap-2"><Clock3 size={14} /> <span className="truncate">{formatDate(user.createdAt)}</span></span>
          <span className="font-semibold text-primary">Created</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Display name</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} className="glass-input min-h-10 rounded-xl px-3 text-sm" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Username</span>
          <div className="relative">
            <AtSign size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input value={username} onChange={(event) => setUsername(event.currentTarget.value)} className="glass-input min-h-10 w-full rounded-xl pl-9 pr-3 text-sm" />
          </div>
        </label>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Status</span>
            <select value={status} onChange={(event) => setStatus(event.currentTarget.value as AccountStatus)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
              {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Role</span>
            <select value={role} onChange={(event) => setRole(event.currentTarget.value as AdminRole)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
              {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Plan</span>
            <select value={planCode} onChange={(event) => setPlanCode(event.currentTarget.value as PlanCode)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
              {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Recovery</span>
            <select value={recoveryStatus} onChange={(event) => setRecoveryStatus(event.currentTarget.value as AccountRecoveryStatus)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
              {RECOVERY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-glass bg-surface-alpha p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Billing and entitlement</p>
              <p className="mt-1 text-xs leading-5 text-secondary">{user.billing.recommendedAction}</p>
              <p className="mt-1 text-[11px] leading-5 text-tertiary">
                Receipt mode applies {provisionalLimitLabel} immediately, then keeps manual review required until the subscription is verified.
              </p>
            </div>
            <StatusBadge value={user.billing.status} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Billing status</span>
              <select value={billingStatus} onChange={(event) => setBillingStatus(event.currentTarget.value as BillingStatus)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                {BILLING_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Provider</span>
              <select value={billingProvider} onChange={(event) => setBillingProvider(event.currentTarget.value as BillingProvider)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                {BILLING_PROVIDER_OPTIONS.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Market</span>
              <select value={billingMarket} onChange={(event) => setBillingMarket(event.currentTarget.value as BillingMarket)} className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                {BILLING_MARKET_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-secondary">
              <span>Payment action required</span>
              <input
                type="checkbox"
                checked={paymentActionRequired}
                onChange={(event) => setPaymentActionRequired(event.currentTarget.checked)}
                className="h-4 w-4 accent-blue-500"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button type="button" onClick={markReceiptReceived} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-500/15 disabled:opacity-50 dark:text-blue-300">
              <ClipboardCheck size={14} />
              Receipt received
            </button>
            <button type="button" onClick={markBillingResolved} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300">
              <CheckCircle2 size={14} />
              Mark paid
            </button>
            <button type="button" onClick={markBillingPastDue} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300">
              <AlertTriangle size={14} />
              Mark past due
            </button>
          </div>
          <div className="mt-3 grid gap-1 text-[11px] text-tertiary">
            {user.billing.customerId ? <button type="button" onClick={() => onCopy(user.billing.customerId, 'Customer ID')} className="truncate text-left hover:text-primary">Customer: {user.billing.customerId}</button> : null}
            {user.billing.subscriptionId ? <button type="button" onClick={() => onCopy(user.billing.subscriptionId, 'Subscription ID')} className="truncate text-left hover:text-primary">Subscription: {user.billing.subscriptionId}</button> : null}
            {user.billing.currentPeriodEnd ? <span>Renews/ends {formatDate(user.billing.currentPeriodEnd)}</span> : null}
          </div>
        </div>

        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-glass bg-surface-alpha px-3 text-sm text-secondary">
          <span className="inline-flex items-center gap-2"><KeyRound size={15} /> Require password reset</span>
          <input
            type="checkbox"
            checked={passwordResetRequired}
            onChange={(event) => setPasswordResetRequired(event.currentTarget.checked)}
            className="h-4 w-4 accent-blue-500"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Internal notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} className="min-h-20 resize-none rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-sm leading-6 text-primary outline-none focus:border-blue-400" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Support note</span>
          <textarea value={supportNote} onChange={(event) => setSupportNote(event.currentTarget.value)} className="min-h-20 resize-none rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-sm leading-6 text-primary outline-none focus:border-blue-400" />
        </label>
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-800 shadow-[0_12px_28px_rgba(225,29,72,0.08)] dark:text-rose-200">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {(error.errorCode || 'account_update_failed').replace(/_/g, ' ')}
                </p>
                <button
                  type="button"
                  onClick={onDismissError}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-500/10 dark:text-rose-200"
                  aria-label="Dismiss account error"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="mt-1 font-semibold">{error.message}</p>
              {error.details ? <p className="mt-1 text-xs leading-5 opacity-85">{error.details}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={saveAccount}
          disabled={!dirty || busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} />
          {busy ? 'Saving...' : 'Save account'}
        </button>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button type="button" onClick={requirePasswordReset} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300">
            <KeyRound size={14} />
            Request reset
          </button>
          <button type="button" onClick={clearRecovery} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-xs font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary disabled:opacity-50">
            <CheckCircle2 size={14} />
            Resolve recovery
          </button>
        </div>
      </div>
    </aside>
  );
}

function BillingReadinessPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
      <div className="rounded-2xl border border-glass bg-surface-alpha p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Payment readiness</p>
            <p className="mt-1 text-xs text-secondary">{snapshot.billing.mode.replace(/_/g, ' ')}</p>
          </div>
          <StatusBadge value={snapshot.billing.ready ? 'pass' : 'warn'} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-[var(--bg-base)] p-2">
            <p className="text-lg font-semibold text-primary">{snapshot.billing.activeSubscriptions}</p>
            <p className="text-tertiary">active</p>
          </div>
          <div className="rounded-xl bg-[var(--bg-base)] p-2">
            <p className="text-lg font-semibold text-primary">{snapshot.billing.pastDueSubscriptions}</p>
            <p className="text-tertiary">past due</p>
          </div>
          <div className="rounded-xl bg-[var(--bg-base)] p-2">
            <p className="text-lg font-semibold text-primary">{formatUsd(snapshot.billing.revenueMonthlyUsd)}</p>
            <p className="text-tertiary">MRR</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-glass bg-surface-alpha p-4">
        <p className="text-sm font-semibold text-primary">Connected providers</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {snapshot.billing.connectedProviders.length ? snapshot.billing.connectedProviders.map((provider) => (
            <StatusBadge key={provider} value={provider} />
          )) : <StatusBadge value="not_configured" />}
        </div>
        <p className="mt-3 text-xs leading-5 text-secondary">Markets prepared: {snapshot.billing.supportedMarkets.join(', ')}.</p>
      </div>
      <div className="rounded-2xl border border-glass bg-surface-alpha p-4">
        <p className="text-sm font-semibold text-primary">Realtime contract</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {snapshot.billing.realtimeTables.map((table) => (
            <span key={table} className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[10px] font-semibold text-tertiary">{table}</span>
          ))}
        </div>
        {snapshot.billing.gaps[0] ? <p className="mt-3 text-xs leading-5 text-secondary">{snapshot.billing.gaps[0]}</p> : null}
      </div>
    </div>
  );
}

function PlansPanel({ plans }: { plans: AdminPlan[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {plans.map((plan) => (
        <div key={plan.code} className="rounded-2xl border border-glass bg-surface-alpha p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">{plan.name}</p>
              <p className="mt-1 text-xs text-tertiary">{formatUsd(plan.priceMonthlyUsd)}</p>
            </div>
            {plan.recommended ? <BadgeCheck size={18} className="text-blue-500" /> : null}
          </div>
          <p className="mt-4 min-h-[3rem] text-xs leading-5 text-secondary">{plan.description}</p>
          <div className="mt-3 rounded-xl bg-[var(--bg-base)] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary">Checkout</p>
            <p className="mt-1 text-xs font-semibold capitalize text-primary">{plan.checkoutMode.replace(/_/g, ' ')}</p>
            <p className="mt-1 break-words text-[11px] leading-4 text-secondary">{plan.displayPrice}</p>
          </div>
          <div className="mt-4 space-y-2 text-xs text-secondary">
            <div className="flex justify-between gap-3"><span>AI/day</span><strong className="text-primary">{formatNumber(plan.aiDailyLimit)}</strong></div>
            <div className="flex justify-between gap-3"><span>Deep/day</span><strong className="text-primary">{formatNumber(plan.deepDailyLimit)}</strong></div>
            <div className="flex justify-between gap-3"><span>Scans/day</span><strong className="text-primary">{formatNumber(plan.scannerDailyLimit)}</strong></div>
            <div className="flex justify-between gap-3"><span>Seats</span><strong className="text-primary">{formatNumber(plan.seats)}</strong></div>
            <div className="flex justify-between gap-3"><span>Users</span><strong className="text-primary">{formatNumber(plan.activeUsers)}</strong></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {plan.features.slice(0, 4).map((feature) => (
              <span key={feature} className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[10px] font-semibold text-tertiary">
                {feature}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-tertiary">
            <p className="truncate">Provider: {plan.billingProvider.replace(/_/g, ' ')}</p>
            {plan.billingProductId ? <p className="truncate">Product: {plan.billingProductId}</p> : null}
            {plan.revenuecatEntitlementId ? <p className="truncate">Entitlement: {plan.revenuecatEntitlementId}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function MaintenancePanel({
  flags,
  busyFlagKey,
  onPatch,
}: {
  flags: AdminFeatureFlag[];
  busyFlagKey: string | null;
  onPatch: (key: string, patch: AdminFeatureFlagPatch) => void;
}) {
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftMessages((current) => {
      const next = { ...current };
      for (const flag of flags) {
        if (!(flag.key in next)) next[flag.key] = flag.message || '';
      }
      return next;
    });
  }, [flags]);

  const commitMessage = (flag: AdminFeatureFlag) => {
    const message = (draftMessages[flag.key] ?? flag.message ?? '').trim();
    if (message === (flag.message || '')) return;
    onPatch(flag.key, { message });
  };

  const toggleSurface = (flag: AdminFeatureFlag, surface: FeatureSurface, checked: boolean) => {
    const current = new Set(flag.surfaces);
    if (checked) current.add(surface);
    else current.delete(surface);
    const surfaces = FEATURE_SURFACE_OPTIONS.filter((item) => current.has(item));
    onPatch(flag.key, { surfaces: surfaces.length ? surfaces : ['global'] });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {flags.map((flag) => {
        const busy = busyFlagKey === flag.key;
        return (
          <div key={flag.key} className="rounded-2xl border border-glass bg-surface-alpha p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{flag.label}</p>
                <p className="mt-1 text-xs text-tertiary">{flag.key} / updated {formatDate(flag.updatedAt)}</p>
              </div>
              <select
                value={flag.status}
                disabled={busy}
                onChange={(event) => onPatch(flag.key, { status: event.currentTarget.value as FeatureFlagStatus })}
                className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-xs font-semibold text-primary"
                aria-label={`Change status for ${flag.label}`}
              >
                {FEATURE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            <textarea
              value={draftMessages[flag.key] ?? flag.message ?? ''}
              disabled={busy}
              onChange={(event) => setDraftMessages((current) => ({ ...current, [flag.key]: event.currentTarget.value }))}
              onBlur={() => commitMessage(flag)}
              placeholder="User-facing maintenance message"
              className="mt-4 min-h-20 w-full resize-none rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-sm leading-6 text-primary outline-none transition-colors focus:border-blue-400"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {FEATURE_SURFACE_OPTIONS.map((surface) => (
                <label key={surface} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-xs font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={flag.surfaces.includes(surface)}
                    disabled={busy}
                    onChange={(event) => toggleSurface(flag, surface, event.currentTarget.checked)}
                    className="h-3.5 w-3.5 accent-blue-500"
                  />
                  {surface}
                </label>
              ))}
            </div>
            {busy ? <p className="mt-3 text-xs font-semibold text-blue-500">Saving maintenance control...</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function AuditPanel({ audit }: { audit: AdminSnapshot['audit'] }) {
  return (
    <div className="rounded-2xl border border-glass bg-surface-alpha">
      {audit.map((event, index) => (
        <div key={event.id} className={clsx('grid gap-3 px-4 py-4 md:grid-cols-[11rem_1fr_8rem]', index > 0 && 'border-t border-glass')}>
          <div className="text-xs text-tertiary">{formatDate(event.createdAt)}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">{event.action.replace(/_/g, ' ')}</p>
            <p className="mt-1 text-sm leading-5 text-secondary">{event.detail}</p>
            <p className="mt-1 truncate text-[11px] text-tertiary">{event.actor} {'->'} {event.target}</p>
          </div>
          <div className="md:text-right">
            <StatusBadge value={event.severity === 'info' ? 'pass' : event.severity === 'warning' ? 'warn' : 'fail'} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LaunchPanel({ checklist }: { checklist: LaunchChecklistItem[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {checklist.map((item) => (
        <div key={item.id} className="rounded-2xl border border-glass bg-surface-alpha p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <CheckIcon status={item.status} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{item.label}</p>
                <p className="mt-1 text-xs text-tertiary">{item.owner} / {item.due.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <StatusBadge value={item.status} />
          </div>
          <p className="mt-4 text-sm leading-6 text-secondary">{item.action}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-glass bg-surface-alpha px-4 py-10 text-center">
      <p className="text-sm font-semibold text-primary">No matching users</p>
      <p className="mt-1 text-sm text-secondary">Adjust search, status, or plan filters.</p>
    </div>
  );
}

export function AdminManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAuthModal, refreshAuthState } = useAuthModal();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const snapshotRef = useRef<AdminSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => tabFromSearch(location.search));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [accountErrorUserId, setAccountErrorUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<PlanCode | 'all'>('all');
  const [recoveryFilter, setRecoveryFilter] = useState<AccountRecoveryStatus | 'all'>('all');
  const [userQueueFilter, setUserQueueFilter] = useState<UserQueueFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyFlagKey, setBusyFlagKey] = useState<string | null>(null);
  const [pendingUserPatch, setPendingUserPatch] = useState<PendingUserPatch | null>(null);
  const [pendingFeatureFlagPatch, setPendingFeatureFlagPatch] = useState<PendingFeatureFlagPatch | null>(null);
  const [toast, setToast] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setActiveTab(tabFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const selectTab = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate({ pathname: '/admin', search: `?${params.toString()}` });
  }, [location.search, navigate]);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      const hasSnapshot = Boolean(snapshotRef.current);
      setLoading(!hasSnapshot);
      setRefreshing(hasSnapshot);
    }
    try {
      const next = await fetchAdminSnapshot();
      setSnapshot(next);
      setError(null);
      setAccountErrorUserId(null);
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      else setError(new AdminApiError('Gagal memuat snapshot admin.', { status: 0 }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const intervalSec = snapshot?.realtime.intervalSec || 12;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh({ silent: true });
      }
    }, intervalSec * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, snapshot?.realtime.intervalSec]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    let unsubscribeMediaChange: (() => void) | null = null;

    const syncThemeState = () => {
      const prefersDark = Boolean(media?.matches);
      setIsDark(root.classList.contains('dark') || (!root.classList.contains('light') && prefersDark));
    };

    syncThemeState();
    const observer = new MutationObserver(syncThemeState);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    if (media) unsubscribeMediaChange = subscribeMediaQueryChange(media, syncThemeState);
    window.addEventListener('storage', syncThemeState);

    return () => {
      observer.disconnect();
      unsubscribeMediaChange?.();
      window.removeEventListener('storage', syncThemeState);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (snapshot?.users || []).filter((user) => {
      const matchesQuery = !normalizedQuery
        || user.email.toLowerCase().includes(normalizedQuery)
        || user.name.toLowerCase().includes(normalizedQuery)
        || (user.username || '').toLowerCase().includes(normalizedQuery)
        || user.id.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesPlan = planFilter === 'all' || user.planCode === planFilter;
      const matchesRecovery = recoveryFilter === 'all' || (user.accountRecoveryStatus || 'none') === recoveryFilter || (recoveryFilter === 'requested' && Boolean(user.passwordResetRequired));
      const matchesQueue = matchesUserQueue(user, userQueueFilter);
      return matchesQuery && matchesStatus && matchesPlan && matchesRecovery && matchesQueue;
    });
  }, [planFilter, query, recoveryFilter, snapshot?.users, statusFilter, userQueueFilter]);

  const selectedUser = useMemo(() => (
    snapshot?.users.find((user) => user.id === selectedUserId) || null
  ), [selectedUserId, snapshot?.users]);
  const selectedAccountError = selectedUser && accountErrorUserId === selectedUser.id ? error : null;

  const adminQueues = useMemo<AdminQueueSummary>(() => {
    const users = snapshot?.users || [];
    const checks = snapshot?.checks || [];
    return {
      riskUsers: users.filter(isRiskUser),
      recoveryUsers: users.filter(isRecoveryUser),
      billingUsers: users.filter(isBillingAttentionUser),
      pastDueUsers: users.filter((user) => user.status === 'past_due'),
      paidUsers: users.filter((user) => user.planCode !== 'free' && user.status !== 'deleted'),
      maintenanceFlags: (snapshot?.featureFlags || []).filter((flag) => flag.status !== 'available'),
      criticalChecks: checks.filter((check) => check.status === 'fail'),
      warningChecks: checks.filter((check) => check.status === 'warn'),
    };
  }, [snapshot?.checks, snapshot?.featureFlags, snapshot?.users]);

  useEffect(() => {
    if (!selectedUserId || !snapshot?.users.length) return;
    if (!snapshot.users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(null);
    }
  }, [selectedUserId, snapshot?.users]);

  const blockingError = error && (error.status === 401 || error.status === 403) ? error : null;

  const handleSignIn = () => {
    openAuthModal({ source: 'general' });
    void refreshAuthState({ silent: true });
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    try {
      if (isDark) {
        root.classList.remove('dark');
        root.classList.add('light');
        window.localStorage.setItem('BARISTA_THEME', 'light');
        setIsDark(false);
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        window.localStorage.setItem('BARISTA_THEME', 'dark');
        setIsDark(true);
      }
    } catch {
      root.classList.toggle('dark', !isDark);
      root.classList.toggle('light', isDark);
      setIsDark(!isDark);
    }
  };

  const handleCopy = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`${label} copied`);
    } catch {
      setToast('Copy failed');
    }
  }, []);

  const exportUsersCsv = useCallback(() => {
    const current = snapshotRef.current;
    if (!current) return;
    const exported = downloadTextFile(
      `baristachaw-users-${exportStamp(current.generatedAt)}.csv`,
      usersToCsv(current),
      'text/csv;charset=utf-8',
    );
    setToast(exported ? 'Users CSV exported' : 'Export unavailable');
  }, []);

  const exportAuditCsv = useCallback(() => {
    const current = snapshotRef.current;
    if (!current) return;
    const exported = downloadTextFile(
      `baristachaw-audit-${exportStamp(current.generatedAt)}.csv`,
      auditToCsv(current),
      'text/csv;charset=utf-8',
    );
    setToast(exported ? 'Audit CSV exported' : 'Export unavailable');
  }, []);

  const copyLaunchSummary = useCallback(() => {
    const current = snapshotRef.current;
    if (!current) return;
    void handleCopy(buildLaunchSummary(current), 'Launch handoff');
  }, [handleCopy]);

  const openUserQueue = useCallback((queue: UserQueueFilter) => {
    setUserQueueFilter(queue);
    setStatusFilter('all');
    setPlanFilter('all');
    setRecoveryFilter(queue === 'recovery' ? 'requested' : 'all');
    setQuery('');
    const source = queue === 'risk'
        ? adminQueues.riskUsers
        : queue === 'recovery'
          ? adminQueues.recoveryUsers
          : queue === 'billing'
            ? adminQueues.billingUsers
            : queue === 'paid'
              ? adminQueues.paidUsers
              : snapshot?.users || [];
    setSelectedUserId(source[0]?.id || null);
    selectTab('users');
  }, [adminQueues.billingUsers, adminQueues.paidUsers, adminQueues.recoveryUsers, adminQueues.riskUsers, selectTab, snapshot?.users]);

  const openUserFromCommandCenter = useCallback((userId: string, queue: UserQueueFilter) => {
    setUserQueueFilter(queue);
    setStatusFilter('all');
    setPlanFilter('all');
    setRecoveryFilter(queue === 'recovery' ? 'requested' : 'all');
    setQuery('');
    setSelectedUserId(userId);
    selectTab('users');
  }, [selectTab]);

  const commitUserPatch = async (userId: string, patch: AdminUserPatch) => {
    setBusyUserId(userId);
    setAccountErrorUserId(null);
    try {
      const next = await updateAdminUser(userId, patch);
      setSnapshot(next);
      setError(null);
      setAccountErrorUserId(null);
      setToast('Perubahan admin tersimpan');
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err);
        setAccountErrorUserId(userId);
      }
      setToast('Perubahan admin gagal');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleUserPatch = (userId: string, patch: AdminUserPatch) => {
    const user = snapshotRef.current?.users.find((item) => item.id === userId);
    if (!user) {
      void commitUserPatch(userId, patch);
      return;
    }
    const risk = classifyUserPatchRisk(user, patch);
    if (!risk) {
      void commitUserPatch(userId, patch);
      return;
    }
    setPendingUserPatch({
      user,
      patch,
      risk,
      changes: describeUserPatch(user, patch),
    });
  };

  const confirmPendingUserPatch = (operatorReason: string) => {
    const pending = pendingUserPatch;
    if (!pending) return;
    setPendingUserPatch(null);
    void commitUserPatch(
      pending.user.id,
      appendOperatorReasonToPatch(pending.user, pending.patch, operatorReason, pending.changes),
    );
  };

  const commitFeatureFlagPatch = async (key: string, patch: AdminFeatureFlagPatch) => {
    setBusyFlagKey(key);
    setAccountErrorUserId(null);
    try {
      const next = await updateFeatureFlag(key, patch);
      setSnapshot(next);
      setError(null);
      setToast('Kontrol pemeliharaan tersimpan');
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      setToast('Kontrol pemeliharaan gagal');
    } finally {
      setBusyFlagKey(null);
    }
  };

  const handleFeatureFlagPatch = (key: string, patch: AdminFeatureFlagPatch) => {
    const flag = snapshotRef.current?.featureFlags.find((item) => item.key === key);
    if (!flag) {
      void commitFeatureFlagPatch(key, patch);
      return;
    }
    if (!featureFlagPatchRequiresMessage(flag, patch)) {
      void commitFeatureFlagPatch(key, patch);
      return;
    }
    setPendingFeatureFlagPatch({
      flag,
      patch,
      changes: describeFeatureFlagPatch(flag, patch),
    });
  };

  const confirmPendingFeatureFlagPatch = (message: string) => {
    const pending = pendingFeatureFlagPatch;
    if (!pending) return;
    setPendingFeatureFlagPatch(null);
    void commitFeatureFlagPatch(pending.flag.key, {
      ...pending.patch,
      message: message.trim().slice(0, 240),
    });
  };

  if (blockingError) {
    return (
      <ProtectedGate
        error={blockingError}
        onSignIn={handleSignIn}
        onRetry={() => void refresh()}
      />
    );
  }

  const criticalChecks = snapshot?.checks.filter((check) => check.status === 'fail').length || 0;
  const warningChecks = snapshot?.checks.filter((check) => check.status === 'warn').length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      className="relative page-container desktop-noise-bg w-full"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 sm:px-6">
        <header className="rounded-[1.6rem] border border-glass bg-[var(--bg-base)]/88 px-4 py-4 shadow-[var(--panel-elev-1)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal text-primary">Admin Management</h1>
                  <p className="mt-1 text-sm text-secondary">Users, plans, database readiness, audit, and launch control.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {snapshot ? <StatusBadge value={snapshot.dataMode} /> : null}
              {snapshot ? (
                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-surface-alpha px-2.5 text-[11px] font-semibold text-secondary">
                  <Activity size={13} />
                  Live {snapshot.realtime.intervalSec}s / #{snapshot.realtime.sequence}
                </span>
              ) : null}
              {snapshot ? (
                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-surface-alpha px-2.5 text-[11px] font-semibold text-secondary">
                  <Clock3 size={13} />
                  {formatDate(snapshot.generatedAt)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
                aria-label="Kembali ke aplikasi"
                title="Kembali ke aplikasi"
              >
                <ArrowLeft size={16} />
                <span>App</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
                aria-label={isDark ? 'Switch admin to light mode' : 'Switch admin to dark mode'}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)] transition-colors hover:bg-blue-600"
                disabled={refreshing}
              >
                <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {loading && !snapshot ? (
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl border border-glass bg-surface-alpha loading-shimmer" />
            ))}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="Total Users" value={formatNumber(snapshot.metrics.totalUsers)} detail={`${formatNumber(snapshot.metrics.activeUsers)} active accounts`} icon={Users} />
              <MetricTile label="Paid Users" value={formatNumber(snapshot.metrics.paidUsers)} detail={`${snapshot.metrics.planConversionRate}% plan conversion`} icon={WalletCards} />
              <MetricTile label="AI Today" value={formatNumber(snapshot.metrics.aiRequestsToday)} detail={`${formatNumber(snapshot.metrics.deepRequestsToday)} deep requests`} icon={Sparkles} />
              <MetricTile label="Launch Gate" value={`${criticalChecks}/${warningChecks}`} detail="Critical failures / warnings" icon={AlertTriangle} />
            </section>

            {error && !accountErrorUserId ? <AdminInlineError error={error} onDismiss={() => setError(null)} /> : null}

            {snapshot.warnings.length ? (
              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                {snapshot.warnings.map((warning) => (
                  <p key={warning} className="text-sm leading-6 text-amber-800 dark:text-amber-200">{warning}</p>
                ))}
              </section>
            ) : null}

            <AdminOpsExportPanel
              snapshot={snapshot}
              queues={adminQueues}
              onExportUsers={exportUsersCsv}
              onExportAudit={exportAuditCsv}
              onCopySummary={copyLaunchSummary}
            />

            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-glass bg-surface-alpha p-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTab(id)}
                  className={clsx(
                    'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                    activeTab === id
                      ? 'bg-blue-500 text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]'
                      : 'text-secondary hover:bg-[var(--bg-base)] hover:text-primary',
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>

            <AnimatePresence mode="wait">
              {activeTab === 'overview' ? (
                <motion.section key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <AdminCommandCenter
                    snapshot={snapshot}
                    queues={adminQueues}
                    onOpenQueue={openUserQueue}
                    onOpenMaintenance={() => selectTab('maintenance')}
                    onOpenUser={openUserFromCommandCenter}
                  />
                  <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
                    <div className="space-y-4">
                      <div className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold text-primary">Production checks</h2>
                            <p className="mt-1 text-sm text-secondary">Current backend, database, billing, and AI readiness.</p>
                          </div>
                          <StatusBadge value={snapshot.degraded ? 'warn' : 'pass'} />
                        </div>
                        <ChecksPanel checks={snapshot.checks.slice(0, 5)} />
                      </div>
                      <div className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                        <h2 className="text-base font-semibold text-primary">Plan mix</h2>
                        <div className="mt-4 grid gap-3 md:grid-cols-5">
                          {snapshot.plans.map((plan) => (
                            <div key={plan.code} className="rounded-2xl bg-surface-alpha p-3">
                              <p className="text-xs font-semibold text-secondary">{plan.name}</p>
                              <p className="mt-2 text-2xl font-semibold text-primary">{plan.activeUsers}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <aside className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                      <h2 className="text-base font-semibold text-primary">Recommendations</h2>
                      <div className="mt-4 space-y-3">
                        {snapshot.recommendations.map((item) => (
                          <div key={item} className="rounded-2xl bg-surface-alpha p-3">
                            <p className="text-sm leading-6 text-secondary">{item}</p>
                          </div>
                        ))}
                      </div>
                    </aside>
                  </div>
                </motion.section>
              ) : null}

              {activeTab === 'users' ? (
                <motion.section key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.currentTarget.value)}
                        placeholder="Search name, username, email, or user id"
                        className="glass-input min-h-11 w-full rounded-xl pl-9 pr-3 text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select value={userQueueFilter} onChange={(event) => setUserQueueFilter(event.currentTarget.value as UserQueueFilter)} className="min-h-11 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                        {USER_QUEUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as AccountStatus | 'all')} className="min-h-11 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                        <option value="all">All status</option>
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <select value={planFilter} onChange={(event) => setPlanFilter(event.currentTarget.value as PlanCode | 'all')} className="min-h-11 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                        <option value="all">All plans</option>
                        {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                      <select value={recoveryFilter} onChange={(event) => setRecoveryFilter(event.currentTarget.value as AccountRecoveryStatus | 'all')} className="min-h-11 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                        <option value="all">All recovery</option>
                        {RECOVERY_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </div>
                  {filteredUsers.length ? (
                    <div className={clsx('grid gap-4', selectedUser ? 'xl:grid-cols-[minmax(0,1fr)_24rem]' : 'xl:grid-cols-1')}>
                      <div className="min-w-0">
                        <UsersTable
                          users={filteredUsers}
                          plans={snapshot.plans}
                          busyUserId={busyUserId}
                          selectedUserId={selectedUserId}
                          onPatch={handleUserPatch}
                          onSelect={setSelectedUserId}
                          onCopy={(value, label) => void handleCopy(value, label)}
                        />
                      </div>
                      {selectedUser ? (
                        <AccountInspector
                          user={selectedUser}
                          plans={snapshot.plans}
                          busy={busyUserId === selectedUser.id}
                          error={selectedAccountError}
                          onClose={() => setSelectedUserId(null)}
                          onDismissError={() => {
                            setError(null);
                            setAccountErrorUserId(null);
                          }}
                          onPatch={handleUserPatch}
                          onCopy={(value, label) => void handleCopy(value, label)}
                        />
                      ) : null}
                    </div>
                  ) : <EmptyState />}
                </motion.section>
              ) : null}

              {activeTab === 'plans' ? (
                <motion.section key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-primary">Plan catalog</h2>
                      <p className="mt-1 text-sm text-secondary">Commercial tiers, quota ceilings, provider mapping, entitlement IDs, and launch billing readiness.</p>
                    </div>
                    <SlidersHorizontal size={18} className="text-blue-500" />
                  </div>
                  <BillingReadinessPanel snapshot={snapshot} />
                  <PlansPanel plans={snapshot.plans} />
                </motion.section>
              ) : null}

              {activeTab === 'maintenance' ? (
                <motion.section key="maintenance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-primary">Maintenance controls</h2>
                      <p className="mt-1 text-sm text-secondary">Feature availability flags consumed by web, PWA, and Android parity sessions.</p>
                    </div>
                    <StatusBadge value={snapshot.featureFlags.some((flag) => flag.status !== 'available') ? 'warn' : 'pass'} />
                  </div>
                  <MaintenancePanel flags={snapshot.featureFlags} busyFlagKey={busyFlagKey} onPatch={handleFeatureFlagPatch} />
                </motion.section>
              ) : null}

              {activeTab === 'database' ? (
                <motion.section key="database" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-primary">Database readiness</h2>
                      <p className="mt-1 text-sm text-secondary">Persistence, RLS, audit, and plan controls for production operations.</p>
                    </div>
                    <StatusBadge value={snapshot.dataMode} />
                  </div>
                  <ChecksPanel checks={snapshot.checks} />
                </motion.section>
              ) : null}

              {activeTab === 'audit' ? (
                <motion.section key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-primary">Audit trail</h2>
                    <p className="mt-1 text-sm text-secondary">Latest admin mutations and operational events.</p>
                  </div>
                  <AuditPanel audit={snapshot.audit} />
                </motion.section>
              ) : null}

              {activeTab === 'launch' ? (
                <motion.section key="launch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-primary">Launch gate</h2>
                    <p className="mt-1 text-sm text-secondary">The one-week Play Store launch readiness list.</p>
                  </div>
                  <LaunchPanel checklist={snapshot.launchChecklist} />
                </motion.section>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </div>

      <AnimatePresence>
        {pendingUserPatch ? (
          <ConfirmUserMutationDialog
            pending={pendingUserPatch}
            busy={busyUserId === pendingUserPatch.user.id}
            onCancel={() => setPendingUserPatch(null)}
            onConfirm={confirmPendingUserPatch}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingFeatureFlagPatch ? (
          <ConfirmFeatureFlagMutationDialog
            pending={pendingFeatureFlagPatch}
            busy={busyFlagKey === pendingFeatureFlagPatch.flag.key}
            onCancel={() => setPendingFeatureFlagPatch(null)}
            onConfirm={confirmPendingFeatureFlagPatch}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-glass bg-[var(--bg-base)]/94 px-4 py-2 text-sm font-semibold text-primary shadow-[var(--panel-elev-2)]"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
