import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
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
  Library,
  ListChecks,
  Lock,
  Mail,
  Menu,
  ChevronRight,
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
import { useGlobalState } from '../context/GlobalState';
import { isDisplayableAvatarUrl } from '../utils/avatarUrl';
import { subscribeMediaQueryChange } from '../utils/mediaQuery';
import { createAdminCopy, type AdminCopy } from './adminLocalization';
import {
  AdminApiError,
  createCatalogRequest,
  fetchAdminSnapshot,
  updateAdminPlan,
  updateAdminUser,
  updateFeatureFlag,
  type AccountRecoveryStatus,
  type AccountStatus,
  type AdminAiUsageAggregate,
  type AdminAiProviderStatus,
  type AdminCatalogKind,
  type AdminCatalogRequestPatch,
  type AdminFeatureFlag,
  type AdminFeatureFlagPatch,
  type AdminPlan,
  type AdminPlanPatch,
  type AdminRole,
  type AdminSnapshot,
  type AdminSystemCheck,
  type AdminUserPatch,
  type AdminUserRecord,
  type BillingMarket,
  type BillingProvider,
  type BillingStatus,
  type CheckStatus,
  type CheckoutMode,
  type FeatureFlagStatus,
  type FeatureSurface,
  type LaunchChecklistItem,
  type PlanCode,
} from '../services/adminApi';

const TABS = [
  { id: 'overview', labelKey: 'tabOverview', icon: Gauge },
  { id: 'users', labelKey: 'tabUsers', icon: Users },
  { id: 'plans', labelKey: 'tabPlans', icon: WalletCards },
  { id: 'ai', labelKey: 'tabAi', icon: Sparkles },
  { id: 'maintenance', labelKey: 'tabMaintenance', icon: Wrench },
  { id: 'database', labelKey: 'tabDatabase', icon: Database },
  { id: 'recipes', labelKey: 'tabRecipes', icon: Library },
  { id: 'audit', labelKey: 'tabAudit', icon: BookOpenCheck },
  { id: 'launch', labelKey: 'tabLaunch', icon: ListChecks },
] as const;

type AdminTab = (typeof TABS)[number]['id'];
type AdminAiUsageRange = { aiFrom?: string; aiTo?: string };
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
const USER_QUEUE_OPTIONS: Array<{ value: UserQueueFilter; labelKey: keyof AdminCopy['raw'] }> = [
  { value: 'all', labelKey: 'queueAll' },
  { value: 'risk', labelKey: 'queueRisk' },
  { value: 'recovery', labelKey: 'queueRecovery' },
  { value: 'billing', labelKey: 'queueBilling' },
  { value: 'paid', labelKey: 'queuePaid' },
  { value: 'sample', labelKey: 'queueSample' },
];
const PLAN_OPTIONS: PlanCode[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
const BILLING_STATUS_OPTIONS: BillingStatus[] = ['none', 'active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded'];
const BILLING_PROVIDER_OPTIONS: BillingProvider[] = ['none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual', 'midtrans', 'xendit'];
const BILLING_MARKET_OPTIONS: BillingMarket[] = ['indonesia', 'brunei', 'global', 'unknown'];
const CHECKOUT_MODE_OPTIONS: CheckoutMode[] = ['disabled', 'external', 'stripe_checkout', 'play_billing', 'app_store', 'manual_invoice'];
const CATALOG_KIND_OPTIONS: AdminCatalogKind[] = ['grinder', 'water', 'dripper'];
const FEATURE_STATUS_OPTIONS: FeatureFlagStatus[] = ['available', 'maintenance', 'disabled'];
const FEATURE_SURFACE_OPTIONS: FeatureSurface[] = ['global', 'web', 'pwa', 'mobile', 'admin'];
const OPERATOR_REASON_MIN_LENGTH = 12;
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

const AdminCopyContext = createContext<AdminCopy>(createAdminCopy());

function useAdminCopy() {
  return useContext(AdminCopyContext);
}

function tabFromSearch(search: string): AdminTab {
  const requested = new URLSearchParams(search).get('tab') || 'overview';
  return TAB_IDS.has(requested) ? requested as AdminTab : 'overview';
}

function formatNumber(value: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function formatUsd(value: number, locale = 'en', customLabel = 'Custom'): string {
  if (value <= 0) return customLabel;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function formatPlanLimitLabel(plan?: AdminPlan, admin?: AdminCopy): string {
  if (!plan) return admin?.text('planLimitsPending') || 'plan limits pending';
  const number = admin?.number ?? formatNumber;
  if (admin) {
    return admin.format('aiDeepScanLimits', {
      ai: number(plan.aiDailyLimit),
      deep: number(plan.deepDailyLimit),
      scans: number(plan.scannerDailyLimit),
    });
  }
  return `${number(plan.aiDailyLimit)} AI / ${number(plan.deepDailyLimit)} deep / ${number(plan.scannerDailyLimit)} scans daily`;
}

type PlanEditorDraft = {
  name: string;
  description: string;
  priceMonthlyUsd: string;
  aiDailyLimit: string;
  deepDailyLimit: string;
  scannerDailyLimit: string;
  storageMb: string;
  seats: string;
  supportSlaHours: string;
  featuresText: string;
  recommended: boolean;
  billingProvider: BillingProvider;
  billingProductId: string;
  billingPriceId: string;
  revenuecatEntitlementId: string;
  market: BillingMarket;
  displayPrice: string;
  checkoutMode: CheckoutMode;
  paymentMethodsText: string;
  operatorNote: string;
};

function planToDraft(plan: AdminPlan): PlanEditorDraft {
  return {
    name: plan.name,
    description: plan.description,
    priceMonthlyUsd: String(plan.priceMonthlyUsd),
    aiDailyLimit: String(Math.round(plan.aiDailyLimit)),
    deepDailyLimit: String(Math.round(plan.deepDailyLimit)),
    scannerDailyLimit: String(Math.round(plan.scannerDailyLimit)),
    storageMb: String(Math.round(plan.storageMb)),
    seats: String(Math.round(plan.seats)),
    supportSlaHours: String(Math.round(plan.supportSlaHours)),
    featuresText: plan.features.join('\n'),
    recommended: Boolean(plan.recommended),
    billingProvider: plan.billingProvider,
    billingProductId: plan.billingProductId,
    billingPriceId: plan.billingPriceId,
    revenuecatEntitlementId: plan.revenuecatEntitlementId,
    market: plan.market,
    displayPrice: plan.displayPrice,
    checkoutMode: plan.checkoutMode,
    paymentMethodsText: plan.paymentMethods.join('\n'),
    operatorNote: '',
  };
}

function parseAdminList(value: string): string[] {
  return value
    .split(/[\n,]+/g)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function normalizedNumber(value: string, integer = true, min = 0): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return null;
  return integer ? Math.round(parsed) : Math.round(parsed * 100) / 100;
}

function normalizedPlanNumber(key: keyof PlanEditorDraft, value: string): number | null {
  const integer = key !== 'priceMonthlyUsd';
  const min = key === 'seats' || key === 'supportSlaHours' ? 1 : 0;
  return normalizedNumber(value, integer, min);
}

function sameStringList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function buildPlanEditorPatch(plan: AdminPlan, draft: PlanEditorDraft): AdminPlanPatch {
  const patch: AdminPlanPatch = {};
  const stringFields: Array<[keyof AdminPlanPatch, string, string]> = [
    ['name', draft.name.trim(), plan.name],
    ['description', draft.description.trim(), plan.description],
    ['billingProductId', draft.billingProductId.trim(), plan.billingProductId],
    ['billingPriceId', draft.billingPriceId.trim(), plan.billingPriceId],
    ['revenuecatEntitlementId', draft.revenuecatEntitlementId.trim(), plan.revenuecatEntitlementId],
    ['displayPrice', draft.displayPrice.trim(), plan.displayPrice],
  ];
  for (const [key, next, current] of stringFields) {
    if (next !== current) {
      (patch as Record<string, unknown>)[key] = next;
    }
  }

  const numericFields: Array<[keyof AdminPlanPatch, number | null, number]> = [
    ['priceMonthlyUsd', normalizedPlanNumber('priceMonthlyUsd', draft.priceMonthlyUsd), plan.priceMonthlyUsd],
    ['aiDailyLimit', normalizedPlanNumber('aiDailyLimit', draft.aiDailyLimit), plan.aiDailyLimit],
    ['deepDailyLimit', normalizedPlanNumber('deepDailyLimit', draft.deepDailyLimit), plan.deepDailyLimit],
    ['scannerDailyLimit', normalizedPlanNumber('scannerDailyLimit', draft.scannerDailyLimit), plan.scannerDailyLimit],
    ['storageMb', normalizedPlanNumber('storageMb', draft.storageMb), plan.storageMb],
    ['seats', normalizedPlanNumber('seats', draft.seats), plan.seats],
    ['supportSlaHours', normalizedPlanNumber('supportSlaHours', draft.supportSlaHours), plan.supportSlaHours],
  ];
  for (const [key, next, current] of numericFields) {
    if (next !== null && next !== current) {
      (patch as Record<string, unknown>)[key] = next;
    }
  }

  const features = parseAdminList(draft.featuresText);
  if (!sameStringList(features, plan.features)) patch.features = features;
  const paymentMethods = parseAdminList(draft.paymentMethodsText);
  if (!sameStringList(paymentMethods, plan.paymentMethods)) patch.paymentMethods = paymentMethods;
  if (draft.recommended !== Boolean(plan.recommended)) patch.recommended = draft.recommended;
  if (draft.billingProvider !== plan.billingProvider) patch.billingProvider = draft.billingProvider;
  if (draft.market !== plan.market) patch.market = draft.market;
  if (draft.checkoutMode !== plan.checkoutMode) patch.checkoutMode = draft.checkoutMode;
  if (Object.keys(patch).length > 0) patch.operatorNote = draft.operatorNote.trim();
  return patch;
}

function billingProviderForPlan(plan: AdminPlan): BillingProvider {
  if (plan.code === 'free') return 'none';
  if (plan.billingProvider === 'none' || plan.billingProvider === 'admin') return 'manual';
  return plan.billingProvider;
}

function billingMarketForPlan(plan: AdminPlan, fallback: BillingMarket): BillingMarket {
  return plan.market && plan.market !== 'unknown' ? plan.market : fallback;
}

function hasOperatorReasonText(value: unknown): boolean {
  return typeof value === 'string' && value.replace(/\s+/g, ' ').trim().length >= OPERATOR_REASON_MIN_LENGTH;
}

function userPatchRequiresOperatorReasonOnClient(patch: AdminUserPatch): boolean {
  return patch.status === 'suspended'
    || patch.status === 'deleted'
    || patch.role === 'owner'
    || patch.billingStatus === 'active'
    || patch.billingStatus === 'trialing';
}

function formatDate(value: string, locale = 'en', unknownLabel = 'Unknown'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unknownLabel;
  return new Intl.DateTimeFormat(locale, {
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
  if (status === 'pass' || status === 'active' || status === 'verified' || status === 'resolved') return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
  if (status === 'warn' || status === 'trialing' || status === 'past_due' || status === 'requested') return 'bg-amber-500/10 text-amber-800 dark:text-amber-300';
  if (status === 'fail' || status === 'suspended' || status === 'deleted' || status === 'rejected' || status === 'cancelled' || status === 'expired' || status === 'refunded') return 'bg-rose-500/10 text-rose-800 dark:text-rose-300';
  if (status === 'supabase') return 'bg-blue-500/10 text-blue-800 dark:text-blue-300';
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

function hasActiveUserFilters({
  query,
  statusFilter,
  planFilter,
  recoveryFilter,
  userQueueFilter,
}: {
  query: string;
  statusFilter: AccountStatus | 'all';
  planFilter: PlanCode | 'all';
  recoveryFilter: AccountRecoveryStatus | 'all';
  userQueueFilter: UserQueueFilter;
}) {
  return Boolean(query.trim())
    || statusFilter !== 'all'
    || planFilter !== 'all'
    || recoveryFilter !== 'all'
    || userQueueFilter !== 'all';
}

function buildPlanOverridePatch(user: AdminUserRecord, plan: AdminPlan): AdminUserPatch {
  const freePlan = plan.code === 'free';
  return {
    planCode: plan.code,
    billingStatus: freePlan ? 'none' : 'trialing',
    billingProvider: freePlan ? 'none' : 'manual',
    billingMarket: billingMarketForPlan(plan, user.billing.market),
    status: user.status === 'suspended' || user.status === 'deleted' ? user.status : 'active',
    paymentActionRequired: !freePlan,
    supportNote: freePlan
      ? `Operator reason: changed ${user.email} to Free and cleared paid entitlement. Limits: ${formatPlanLimitLabel(plan)}.`
      : `Operator reason: applied provisional ${plan.name} for ${user.email}. Manual receipt/provider verification required. Limits: ${formatPlanLimitLabel(plan)}.`,
  };
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

function classifyUserPatchRisk(user: AdminUserRecord, patch: AdminUserPatch, admin?: AdminCopy): UserMutationRisk | null {
  const impacts: string[] = [];
  let level: UserMutationRiskLevel | null = null;
  let title = admin?.text('confirmAccountChange') || 'Confirm account change';
  let detail = admin?.text('confirmAccountChangeDetail') || 'This change affects account access or support state.';
  let confirmLabel = admin?.text('confirmChange') || 'Confirm change';

  if (patch.status && patch.status !== user.status) {
    if (patch.status === 'deleted') {
      level = 'critical';
      title = admin?.text('confirmDeletion') || 'Confirm account deletion state';
      detail = admin?.text('confirmDeletionDetail') || 'This marks the account as deleted and blocks normal app access.';
      confirmLabel = admin?.text('markDeleted') || 'Mark deleted';
      impacts.push('The user may lose access to app workflows immediately.');
      impacts.push('Support should retain an audit reason before this is used for a real customer.');
    } else if (patch.status === 'suspended') {
      level = 'critical';
      title = admin?.text('confirmSuspension') || 'Confirm account suspension';
      detail = admin?.text('confirmSuspensionDetail') || 'This blocks the account from normal Baristachaw access until restored.';
      confirmLabel = admin?.text('suspendAccount') || 'Suspend account';
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
      title = admin?.text('confirmRoleChange') || 'Confirm privileged role change';
      detail = admin?.text('confirmRoleChangeDetail') || 'Owner and admin role changes affect who can manage users, plans, and launch controls.';
      confirmLabel = admin?.text('confirmChange') || 'Confirm role change';
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
    if (patch.billingStatus === 'active' || patch.billingStatus === 'trialing') {
      impacts.push('Paid billing activation must include a support note so the audit trail explains the entitlement source.');
    }
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
  const requiresReason = userPatchRequiresOperatorReasonOnClient(patch) && !hasOperatorReasonText(patch.supportNote);
  return {
    level,
    title,
    detail,
    confirmLabel,
    requiresReason,
    impacts: impacts.length ? impacts : ['This change affects user access and should be reviewed before saving.'],
  };
}

function featureFlagPatchRequiresMessage(flag: AdminFeatureFlag, patch: AdminFeatureFlagPatch): boolean {
  const nextStatus = patch.status || flag.status;
  if (nextStatus === 'available') return false;
  if (patch.status && patch.status !== flag.status) return true;
  return typeof patch.message === 'string' && patch.message.trim() !== (flag.message || '').trim();
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

function StatusBadge({ value, label, className }: { value: string; label?: string; className?: string }) {
  const admin = useAdminCopy();
  return (
    <span className={clsx('inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold capitalize', statusTone(value), className)}>
      {label || admin.enumLabel(value)}
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
    <div className="rounded-xl border border-glass bg-surface-alpha px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary truncate">{label}</p>
        <Icon size={14} className="text-blue-500 shrink-0" />
      </div>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-primary">{value}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-secondary truncate" title={detail}>{detail}</p>
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
  const admin = useAdminCopy();
  return (
    <div className="flex min-h-[var(--app-height)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-[1.6rem] border border-glass bg-[var(--bg-base)]/94 p-6 shadow-[var(--panel-elev-2)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-normal text-primary">{admin.text('accessRequiredTitle')}</h1>
        <p className="mt-3 text-sm leading-6 text-secondary">
          {isAuthRequired
            ? admin.text('accessRequiredAuth')
            : error?.details || admin.text('accessRequiredForbidden')}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {isAuthRequired ? (
            <button type="button" onClick={onSignIn} className="glass-button-primary px-4 py-2 text-sm">
              {admin.text('signIn')}
            </button>
          ) : null}
          <button type="button" onClick={onRetry} className="glass-button px-4 py-2 text-sm">
            {admin.text('retry')}
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
  const admin = useAdminCopy();
  return (
    <section className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              {error.errorCode ? admin.enumLabel(error.errorCode) : admin.text('adminRequestFailed')}
            </p>
            <p className="mt-1 text-sm leading-6 text-secondary">{error.message}</p>
            {error.details ? <p className="mt-1 text-xs leading-5 text-tertiary">{error.details}</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
          aria-label={admin.text('dismissAdminError')}
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
  const admin = useAdminCopy();
  const handoffUsers = [...queues.billingUsers, ...queues.recoveryUsers, ...queues.riskUsers]
    .filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index)
    .slice(0, 3);

  return (
    <section className="grid gap-3 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="rounded-2xl border border-glass bg-[var(--bg-base)]/76 p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-primary">{admin.text('commandCenterTitle')}</h2>
            <p className="text-[11px] text-secondary">
              {admin.text('commandCenterSubtitle')}
            </p>
          </div>
          <StatusBadge value={snapshot.degraded ? 'warn' : 'pass'} />
        </div>

        <div className="mt-3 grid gap-2.5 grid-cols-2 md:grid-cols-5">
          <button
            type="button"
            onClick={() => onOpenQueue('risk')}
            className="rounded-xl border border-glass bg-surface-alpha p-3 text-left transition-colors hover:bg-[var(--bg-base)] border-0"
          >
            <AlertTriangle size={15} className="text-rose-500" />
            <p className="mt-1.5 text-lg font-bold text-primary">{queues.riskUsers.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tertiary truncate">{admin.text('riskCardTitle')}</p>
            <p className="text-[10px] text-secondary truncate mt-0.5">{admin.format('riskCardDetail', { count: admin.number(queues.pastDueUsers.length) })}</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenQueue('recovery')}
            className="rounded-xl border border-glass bg-surface-alpha p-3 text-left transition-colors hover:bg-[var(--bg-base)] border-0"
          >
            <KeyRound size={15} className="text-amber-500" />
            <p className="mt-1.5 text-lg font-bold text-primary">{queues.recoveryUsers.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tertiary truncate">{admin.text('recoveryCardTitle')}</p>
            <p className="text-[10px] text-secondary truncate mt-0.5">{admin.text('recoveryCardDetail')}</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenQueue('billing')}
            className="rounded-xl border border-glass bg-surface-alpha p-3 text-left transition-colors hover:bg-[var(--bg-base)] border-0"
          >
            <WalletCards size={15} className="text-blue-500" />
            <p className="mt-1.5 text-lg font-bold text-primary">{queues.billingUsers.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tertiary truncate">{admin.text('billingCardTitle')}</p>
            <p className="text-[10px] text-secondary truncate mt-0.5">{admin.text('billingCardDetail')}</p>
          </button>
          <button
            type="button"
            onClick={onOpenMaintenance}
            className="rounded-xl border border-glass bg-surface-alpha p-3 text-left transition-colors hover:bg-[var(--bg-base)] border-0"
          >
            <Wrench size={15} className="text-blue-500" />
            <p className="mt-1.5 text-lg font-bold text-primary">{queues.maintenanceFlags.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tertiary truncate">{admin.text('flagsCardTitle')}</p>
            <p className="text-[10px] text-secondary truncate mt-0.5">{admin.text('flagsCardDetail')}</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenQueue('paid')}
            className="rounded-xl border border-glass bg-surface-alpha p-3 text-left transition-colors hover:bg-[var(--bg-base)] border-0"
          >
            <WalletCards size={15} className="text-emerald-500" />
            <p className="mt-1.5 text-lg font-bold text-primary">{queues.paidUsers.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tertiary truncate">{admin.text('paidCardTitle')}</p>
            <p className="text-[10px] text-secondary truncate mt-0.5">{admin.text('paidCardDetail')}</p>
          </button>
        </div>
      </div>

      <aside className="rounded-2xl border border-glass bg-[var(--bg-base)]/76 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-primary">{admin.text('handoffTitle')}</h2>
            <p className="text-[11px] text-secondary">{queues.criticalChecks.length} critical / {queues.warningChecks.length} warnings</p>
          </div>
          <StatusBadge value={queues.criticalChecks.length ? 'fail' : queues.warningChecks.length ? 'warn' : 'pass'} />
        </div>
        <div className="mt-3 space-y-1.5">
          {handoffUsers.length ? handoffUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onOpenUser(user.id, isBillingAttentionUser(user) ? 'billing' : isRecoveryUser(user) ? 'recovery' : 'risk')}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-alpha px-3 py-2 text-left transition-colors hover:bg-[var(--bg-base)] border-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-primary">{user.name}</span>
                <span className="block truncate text-[10px] text-tertiary mt-0.5">{user.email}</span>
              </span>
              <span className="shrink-0 text-right">
                <StatusBadge value={isBillingAttentionUser(user) ? user.billing.status : isRecoveryUser(user) ? 'requested' : user.status} />
                <span className="mt-0.5 block text-[10px] font-semibold text-secondary">{user.planName}</span>
              </span>
            </button>
          )) : (
            <div className="rounded-xl bg-surface-alpha px-3 py-4 text-center">
              <p className="text-xs font-semibold text-primary">{admin.text('noUrgentHandoff')}</p>
              <p className="mt-0.5 text-[10px] text-secondary">{admin.text('queuesClear')}</p>
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
  const admin = useAdminCopy();
  return (
    <section className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-primary">{admin.text('exportTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-secondary">
            {admin.text('exportSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExportUsers}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
          >
            <Download size={15} />
            {admin.text('usersCsv')}
          </button>
          <button
            type="button"
            onClick={onExportAudit}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
          >
            <Download size={15} />
            {admin.text('auditCsv')}
          </button>
          <button
            type="button"
            onClick={onCopySummary}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition-colors hover:bg-blue-700"
          >
            <ClipboardCheck size={15} />
            {admin.text('copyHandoff')}
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-xs text-secondary sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('snapshot')}</p>
          <p className="mt-2 truncate font-semibold text-primary">{formatShortId(snapshot.requestId)}</p>
        </div>
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('freshness')}</p>
          <p className="mt-2 font-semibold text-primary">{admin.number(snapshot.dataFreshnessSec)}s / {admin.enumLabel(snapshot.dataMode)}</p>
        </div>
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('queues')}</p>
          <p className="mt-2 font-semibold text-primary">{admin.number(queues.riskUsers.length)} {admin.text('risk').toLowerCase()} / {admin.number(queues.recoveryUsers.length)} {admin.text('recovery').toLowerCase()}</p>
        </div>
        <div className="rounded-2xl bg-surface-alpha p-3">
          <p className="font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('flags')}</p>
          <p className="mt-2 font-semibold text-primary">{admin.number(queues.maintenanceFlags.length)} {admin.text('maintenanceControls').toLowerCase()} / {admin.number(snapshot.audit.length)} audit rows</p>
        </div>
      </div>
    </section>
  );
}

function MobileAdminCommandBar({
  activeTab,
  snapshot,
  queues,
  refreshing,
  onSelectTab,
  onOpenQueue,
  onRefresh,
}: {
  activeTab: AdminTab;
  snapshot: AdminSnapshot;
  queues: AdminQueueSummary;
  refreshing: boolean;
  onSelectTab: (tab: AdminTab) => void;
  onOpenQueue: (queue: UserQueueFilter) => void;
  onRefresh: () => void;
}) {
  const admin = useAdminCopy();
  const activeTabLabel = admin.text(TABS.find((tab) => tab.id === activeTab)?.labelKey || 'tabOverview');
  const attentionCount = queues.riskUsers.length + queues.recoveryUsers.length + queues.billingUsers.length;

  return (
    <section
      className="sticky top-2 z-30 rounded-[1.2rem] border border-glass bg-[var(--bg-base)]/92 p-3 shadow-[var(--panel-elev-1)] backdrop-blur-xl lg:hidden"
      aria-label={admin.text('mobileAdminDock')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary">{activeTabLabel}</p>
          <p className="mt-0.5 truncate text-[11px] text-tertiary">
            {admin.enumLabel(snapshot.dataMode)} / {attentionCount} {admin.text('attentionItems')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onOpenQueue('billing')}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-glass bg-surface-alpha px-2.5 text-xs font-semibold text-secondary"
          >
            <WalletCards size={14} />
            {queues.billingUsers.length}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
            aria-label={admin.text('refresh')}
          >
            <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onSelectTab('users')}
          className={clsx(
            'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'users' ? 'bg-blue-600 text-white' : 'border border-glass bg-surface-alpha text-secondary',
          )}
        >
          <Users size={14} />
          {admin.text('tabUsers')}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('plans')}
          className={clsx(
            'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'plans' ? 'bg-blue-600 text-white' : 'border border-glass bg-surface-alpha text-secondary',
          )}
        >
          <WalletCards size={14} />
          {admin.text('tabPlans')}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('recipes')}
          className={clsx(
            'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'recipes' ? 'bg-blue-600 text-white' : 'border border-glass bg-surface-alpha text-secondary',
          )}
        >
          <Library size={14} />
          {admin.text('tabRecipes')}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('launch')}
          className={clsx(
            'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors',
            activeTab === 'launch' ? 'bg-blue-600 text-white' : 'border border-glass bg-surface-alpha text-secondary',
          )}
        >
          <ListChecks size={14} />
          {admin.text('tabLaunch')}
        </button>
      </div>
    </section>
  );
}

function UserQueueChips({
  value,
  counts,
  onChange,
}: {
  value: UserQueueFilter;
  counts: Record<UserQueueFilter, number>;
  onChange: (value: UserQueueFilter) => void;
}) {
  const admin = useAdminCopy();
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={admin.text('queueFilterLabel')}>
      {USER_QUEUE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={clsx(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors',
              selected
                ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)]'
                : 'border border-glass bg-surface-alpha text-secondary hover:bg-[var(--bg-base)] hover:text-primary',
            )}
          >
            <span>{admin.text(option.labelKey)}</span>
            <span className={clsx(
              'rounded-full px-2 py-0.5 text-[10px]',
              selected ? 'bg-white/20 text-white' : 'bg-[var(--bg-base)] text-tertiary',
            )}>
              {admin.number(counts[option.value] || 0)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function UserAvatar({ user, className = 'h-9 w-9' }: { user: AdminUserRecord; className?: string }) {
  const [failed, setFailed] = useState(false);
  const label = (user.name || user.username || user.email || 'U').slice(0, 1).toUpperCase();
  const pictureUrl = isDisplayableAvatarUrl(user.picture) ? user.picture : '';
  if (pictureUrl && !failed) {
    return (
      <img
        src={pictureUrl}
        alt=""
        onError={() => setFailed(true)}
        className={clsx('rounded-full object-cover', className)}
      />
    );
  }
  return (
    <div className={clsx('flex items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-600 dark:text-blue-300', className)}>
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
  const admin = useAdminCopy();
  const isCritical = pending.risk.level === 'critical';
  const [operatorReason, setOperatorReason] = useState('');
  const reasonReady = !pending.risk.requiresReason || hasOperatorReasonText(operatorReason);

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
            aria-label={admin.text('cancel')}
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
          <p className={clsx('text-xs font-semibold uppercase tracking-[0.14em]', isCritical ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300')}>
            {admin.text('operatorReview')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {pending.risk.impacts.map((impact) => (
              <li key={impact} className="text-sm leading-5 text-secondary">{impact}</li>
            ))}
          </ul>
        </div>

        <label className="mt-3 grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">
            {admin.text('operatorReason')}{pending.risk.requiresReason ? ` ${admin.text('required')}` : ''}
          </span>
          <textarea
            value={operatorReason}
            onChange={(event) => setOperatorReason(event.currentTarget.value)}
            maxLength={220}
            placeholder={pending.risk.requiresReason ? admin.text('operatorReasonRequiredPlaceholder') : admin.text('operatorReasonOptionalPlaceholder')}
            disabled={busy}
            className="min-h-20 resize-none rounded-xl border border-glass bg-surface-alpha px-3 py-2 text-sm leading-6 text-primary outline-none transition-colors placeholder:text-tertiary focus:border-blue-400 disabled:opacity-50"
          />
          <span className="text-xs text-tertiary">
            {admin.format('savedToSupportNote', { count: operatorReason.trim().length })}
          </span>
        </label>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary disabled:opacity-50"
          >
            {admin.text('cancel')}
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
            {busy ? admin.text('saving') : pending.risk.confirmLabel}
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
  const admin = useAdminCopy();
  const nextStatus = pending.patch.status || pending.flag.status;
  const isDisabled = nextStatus === 'disabled';
  const [message, setMessage] = useState(initialFeatureFlagMessage(pending.flag, pending.patch));
  const messageReady = message.trim().length >= OPERATOR_REASON_MIN_LENGTH;

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
                {isDisabled ? admin.text('confirmFeatureDisable') : admin.text('confirmMaintenanceMode')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-secondary">
                {admin.text('featureChangeDetail')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-surface-alpha hover:text-primary disabled:opacity-50"
            aria-label={admin.text('cancelFeatureChange')}
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
          <p className={clsx('text-xs font-semibold uppercase tracking-[0.14em]', isDisabled ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300')}>
            {admin.text('userImpact')}
          </p>
          <p className="mt-2 text-sm leading-5 text-secondary">
            {admin.text('userImpactDetail')}
          </p>
        </div>

        <label className="mt-3 grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">{admin.text('operatorMessageRequired')}</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.currentTarget.value)}
            maxLength={240}
            placeholder={admin.text('maintenanceMessagePlaceholder')}
            disabled={busy}
            className="min-h-20 resize-none rounded-xl border border-glass bg-surface-alpha px-3 py-2 text-sm leading-6 text-primary outline-none transition-colors placeholder:text-tertiary focus:border-blue-400 disabled:opacity-50"
          />
          <span className="text-xs text-tertiary">{admin.format('savedToMaintenanceMessage', { count: message.trim().length })}</span>
        </label>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary disabled:opacity-50"
          >
            {admin.text('cancel')}
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
            {busy ? admin.text('saving') : isDisabled ? admin.text('disableFeature') : admin.text('applyMaintenance')}
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
  const admin = useAdminCopy();
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
                  {user.isSample ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">{admin.text('preview')}</span> : null}
                </div>
                <p className="truncate text-sm font-semibold text-blue-600 dark:text-blue-300">@{user.username || admin.text('unassigned')}</p>
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

            <div className="mt-4 grid gap-2" aria-label={admin.text('userCardControls')}>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary">
                  {admin.text('status')}
                  <select
                    value={user.status}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { status: event.currentTarget.value as AccountStatus })}
                    className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-semibold normal-case tracking-normal text-primary"
                    aria-label={`Change status for ${user.email}`}
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{admin.enumLabel(status)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary">
                  {admin.text('plan')}
                  <select
                    value={user.planCode}
                    disabled={busyUserId === user.id}
                    onChange={(event) => {
                      const nextPlanCode = event.currentTarget.value as PlanCode;
                      const nextPlan = plans.find((plan) => plan.code === nextPlanCode);
                      if (nextPlan) onPatch(user.id, buildPlanOverridePatch(user, nextPlan));
                    }}
                    className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-semibold normal-case tracking-normal text-primary"
                    aria-label={`Change plan for ${user.email}`}
                  >
                    {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary">
                  {admin.text('role')}
                  <select
                    value={user.role}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { role: event.currentTarget.value as AdminRole })}
                    className="min-h-10 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-semibold normal-case tracking-normal text-primary"
                    aria-label={`Change role for ${user.email}`}
                  >
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{admin.enumLabel(role)}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => onSelect(user.id)}
                  className={clsx(
                    'mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                    selectedUserId === user.id ? 'bg-blue-600 text-white' : 'border border-glass bg-[var(--bg-base)] text-secondary hover:text-primary',
                  )}
                  aria-pressed={selectedUserId === user.id}
                >
                  <PanelRightOpen size={15} />
                  {admin.text('manage')}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-base)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={user.passwordResetRequired ? 'requested' : (user.accountRecoveryStatus || 'none')} />
                  <StatusBadge value={user.billing.status} />
                  <span className="text-xs font-semibold text-secondary">{admin.enumLabel(user.provider)}</span>
                </div>
                <p className="text-xs font-semibold text-secondary">{admin.number(user.usage.aiRequestsToday)} AI / {admin.text('risk').toLowerCase()} {user.riskScore}</p>
              </div>
              {busyUserId === user.id ? <p className="text-xs font-semibold text-blue-500">{admin.text('savingAccount')}</p> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-glass bg-[var(--bg-elevated)]/90 shadow-[var(--panel-elev-1)] md:block">
      <div className="overflow-x-auto">
        <table className={clsx(selectedUserId ? 'min-w-full' : 'min-w-[68rem]', 'w-full border-collapse text-left')}>
          <caption className="sr-only">{admin.text('usersTableCaption')}</caption>
          <thead className="border-b border-glass bg-surface-alpha text-[10px] uppercase tracking-[0.12em] text-secondary">
            <tr>
              <th className="px-3 py-2 font-semibold">{admin.text('account')}</th>
              <th className="px-3 py-2 font-semibold">{admin.text('status')}</th>
              <th className="px-3 py-2 font-semibold">{admin.text('plan')}</th>
              <th className="px-3 py-2 font-semibold">{admin.text('billing')}</th>
              <th className="px-3 py-2 font-semibold">{admin.text('role')}</th>
              <th className="px-3 py-2 font-semibold">{admin.text('recovery')}</th>
              {!selectedUserId ? (
                <>
                  <th className="px-3 py-2 font-semibold">{admin.text('usageToday')}</th>
                  <th className="px-3 py-2 font-semibold">{admin.text('risk')}</th>
                  <th className="px-3 py-2 font-semibold">{admin.text('lastSeen')}</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-glass/40">
            {users.map((user) => (
              <tr key={user.id} className={clsx('transition-colors hover:bg-surface-alpha/40', selectedUserId === user.id && 'bg-blue-500/10')}>
                <td className="px-3 py-2 align-top">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar user={user} className="h-7 w-7 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-primary">{user.name}</p>
                        {user.isSample ? <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:text-amber-300">{admin.text('preview')}</span> : null}
                      </div>
                      <p className="truncate text-[10px] font-semibold text-blue-600 dark:text-blue-300">@{user.username || admin.text('unassigned')}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-tertiary">
                        <span className="max-w-[11rem] truncate">{user.email}</span>
                        <button
                          type="button"
                          onClick={() => onCopy(user.email, 'Email')}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
                          aria-label={`Copy email for ${user.email}`}
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-tertiary">
                        <span>{formatShortId(user.id)}</span>
                        <button
                          type="button"
                          onClick={() => onCopy(user.id, 'User ID')}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
                          aria-label={`Copy user id for ${user.email}`}
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelect(user.id)}
                        className={clsx(
                          'mt-1 inline-flex h-6 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold transition-colors',
                          selectedUserId === user.id
                            ? 'bg-blue-600 text-white'
                            : 'border border-glass bg-[var(--bg-base)] text-secondary hover:text-primary',
                        )}
                      >
                        <PanelRightOpen size={11} />
                        {admin.text('manage')}
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={user.status}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { status: event.currentTarget.value as AccountStatus })}
                    className={clsx(selectedUserId ? 'w-24' : 'w-28', 'h-7 rounded-lg border border-glass bg-[var(--bg-base)] px-1.5 text-[11px] font-semibold text-primary')}
                    aria-label={`Change status for ${user.email}`}
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{admin.enumLabel(status)}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={user.planCode}
                    disabled={busyUserId === user.id}
                    onChange={(event) => {
                      const nextPlanCode = event.currentTarget.value as PlanCode;
                      const nextPlan = plans.find((plan) => plan.code === nextPlanCode);
                      if (nextPlan) onPatch(user.id, buildPlanOverridePatch(user, nextPlan));
                    }}
                    className={clsx(selectedUserId ? 'w-24' : 'w-28', 'h-7 rounded-lg border border-glass bg-[var(--bg-base)] px-1.5 text-[11px] font-semibold text-primary')}
                    aria-label={`Change plan for ${user.email}`}
                  >
                    {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    <StatusBadge value={user.billing.status} className="self-start text-[9px] py-0.5 px-1.5" />
                    <p className="text-[10px] capitalize text-tertiary">{admin.enumLabel(user.billing.provider)} / {admin.enumLabel(user.billing.market)}</p>
                    {user.billing.paymentActionRequired ? <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-300">{admin.text('actionRequired')}</p> : null}
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={user.role}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { role: event.currentTarget.value as AdminRole })}
                    className={clsx(selectedUserId ? 'w-24' : 'w-28', 'h-7 rounded-lg border border-glass bg-[var(--bg-base)] px-1.5 text-[11px] font-semibold text-primary')}
                    aria-label={`Change role for ${user.email}`}
                  >
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{admin.enumLabel(role)}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    <StatusBadge value={user.passwordResetRequired ? 'requested' : (user.accountRecoveryStatus || 'none')} className="self-start text-[9px] py-0.5 px-1.5" />
                    <p className="text-[10px] text-tertiary">
                      {user.passwordResetRequired ? admin.text('passwordResetRequired') : admin.enumLabel(user.provider)}
                    </p>
                  </div>
                </td>
                {!selectedUserId ? (
                  <>
                    <td className="px-3 py-2 align-top">
                      <p className="text-xs font-semibold text-primary">{admin.number(user.usage.aiRequestsToday)} AI</p>
                      <p className="text-[10px] text-secondary">{admin.number(user.usage.deepRequestsToday)} deep / {admin.number(user.usage.scannerRunsToday)} scans</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alpha">
                          <div
                            className={clsx('h-full rounded-full', user.riskScore >= 60 ? 'bg-rose-500' : user.riskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min(100, Math.max(0, user.riskScore))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-secondary">{user.riskScore}</span>
                      </div>
                      {user.flags.length ? <p className="mt-0.5 text-[9px] text-tertiary">{user.flags.join(', ')}</p> : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="text-[10px] text-secondary">{admin.date(user.lastSeenAt)}</p>
                      {busyUserId === user.id ? <p className="mt-0.5 text-[9px] text-blue-500">{admin.text('saving')}</p> : null}
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

function PlanQuickControl({
  plans,
  selectedPlanCode,
  busy,
  onSelectPlan,
  onApplyPlan,
}: {
  plans: AdminPlan[];
  selectedPlanCode: PlanCode;
  busy: boolean;
  onSelectPlan: (plan: AdminPlan) => void;
  onApplyPlan: (plan: AdminPlan) => void;
}) {
  const admin = useAdminCopy();
  return (
    <div className="rounded-lg border border-glass bg-surface-alpha/35 p-2 mt-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-primary">{admin.text('planQuickControl')}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-secondary">{admin.text('planQuickControlSubtitle')}</p>
        </div>
        <WalletCards size={14} className="mt-0.5 shrink-0 text-blue-500" />
      </div>
      <div className="mt-2 grid gap-1.5">
        {plans.map((plan) => {
          const selected = plan.code === selectedPlanCode;
          const paidPlan = plan.code !== 'free';
          return (
            <div
              key={plan.code}
              className={clsx(
                'grid gap-1.5 rounded-lg border px-2 py-2 transition-colors',
                selected ? 'border-blue-500/35 bg-blue-500/10' : 'border-glass bg-[var(--bg-base)]',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(plan)}
                aria-pressed={selected}
                className="grid gap-1 text-left"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-primary">{plan.name}</span>
                      {plan.recommended ? <BadgeCheck size={12} className="text-blue-500" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                      {plan.displayPrice || admin.currencyUsd(plan.priceMonthlyUsd)}
                    </span>
                  </span>
                  <StatusBadge value={selected ? 'selected' : plan.checkoutMode} className="text-[9px] py-0.5 px-1.5" />
                </span>
                <span className="text-[10px] leading-snug text-secondary">{formatPlanLimitLabel(plan, admin)}</span>
                <span className="text-[9px] leading-snug text-tertiary">
                  {admin.text('provider')} {admin.enumLabel(billingProviderForPlan(plan))} / {admin.enumLabel(billingMarketForPlan(plan, 'unknown'))}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onApplyPlan(plan)}
                disabled={busy}
                className={clsx(
                  'inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold transition-colors disabled:opacity-50',
                  paidPlan
                    ? 'border border-blue-500/30 bg-blue-500/10 text-blue-800 hover:bg-blue-500/15 dark:text-blue-300'
                    : 'border border-glass bg-surface-alpha text-secondary hover:bg-[var(--bg-base)] hover:text-primary',
                )}
              >
                {paidPlan ? <ClipboardCheck size={12} /> : <CheckCircle2 size={12} />}
                {paidPlan ? admin.text('applyProvisional') : admin.text('applyFree')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
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
  onDirtyChange,
}: {
  user: AdminUserRecord;
  plans: AdminPlan[];
  busy: boolean;
  error: AdminApiError | null;
  onClose: () => void;
  onDismissError: () => void;
  onPatch: (userId: string, patch: AdminUserPatch) => void;
  onCopy: (value: string, label: string) => void;
  onDirtyChange?: (userId: string, dirty: boolean) => void;
}) {
  const admin = useAdminCopy();
  const titleId = useId();
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const currentRecoveryStatus = user.accountRecoveryStatus || 'none';
  const dirty = displayName.trim() !== user.name
    || username.trim() !== user.username
    || role !== user.role
    || status !== user.status
    || planCode !== user.planCode
    || billingStatus !== user.billing.status
    || billingProvider !== user.billing.provider
    || billingMarket !== user.billing.market
    || paymentActionRequired !== Boolean(user.billing.paymentActionRequired)
    || recoveryStatus !== currentRecoveryStatus
    || passwordResetRequired !== Boolean(user.passwordResetRequired)
    || notes.trim() !== (user.notes || '')
    || supportNote.trim() !== (user.supportNote || '');

  useEffect(() => {
    onDirtyChange?.(user.id, dirty);
    return () => onDirtyChange?.(user.id, false);
  }, [dirty, onDirtyChange, user.id]);

  const selectedPlan = plans.find((plan) => plan.code === planCode) || plans.find((plan) => plan.code === user.planCode) || plans[0];
  const provisionalPlanCode = planCode === 'free' ? 'starter' : planCode;
  const provisionalPlan = plans.find((plan) => plan.code === provisionalPlanCode) || selectedPlan;
  const selectedPlanLimitLabel = formatPlanLimitLabel(selectedPlan, admin);
  const provisionalLimitLabel = formatPlanLimitLabel(provisionalPlan, admin);
  const canRestoreAccount = status === 'suspended' || status === 'past_due' || recoveryStatus === 'requested' || passwordResetRequired;
  const entitlementTouched = planCode !== user.planCode
    || billingStatus !== user.billing.status
    || billingProvider !== user.billing.provider
    || billingMarket !== user.billing.market
    || paymentActionRequired !== Boolean(user.billing.paymentActionRequired);
  const saveBlockedByReason = dirty
    && entitlementTouched
    && (planCode !== user.planCode || billingStatus === 'active' || billingStatus === 'trialing')
    && !hasOperatorReasonText(supportNote);

  const selectPlanPreset = (plan: AdminPlan) => {
    setPlanCode(plan.code);
    setBillingProvider(billingProviderForPlan(plan));
    setBillingMarket(billingMarketForPlan(plan, billingMarket));
    if (plan.code === 'free') {
      setBillingStatus('none');
      setPaymentActionRequired(false);
    } else {
      setBillingStatus(user.planCode === plan.code && user.billing.status === 'active' ? 'active' : 'trialing');
      setPaymentActionRequired(true);
    }
  };

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
    if (recoveryStatus !== currentRecoveryStatus) patch.accountRecoveryStatus = recoveryStatus;
    if (passwordResetRequired !== Boolean(user.passwordResetRequired)) patch.passwordResetRequired = passwordResetRequired;
    if (notes.trim() !== (user.notes || '')) patch.notes = notes.trim();
    if (supportNote.trim() !== (user.supportNote || '')) patch.supportNote = supportNote.trim();
    if (userPatchRequiresOperatorReasonOnClient(patch) && !hasOperatorReasonText(patch.supportNote) && hasOperatorReasonText(supportNote)) {
      patch.supportNote = supportNote.trim();
    }
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
    const provider = selectedPlan?.code === 'free'
      ? 'none'
      : billingProvider === 'none' || billingProvider === 'admin'
        ? 'manual'
        : billingProvider;
    onPatch(user.id, {
      planCode,
      billingStatus: planCode === 'free' ? 'none' : 'active',
      billingProvider: provider,
      billingMarket,
      status: status === 'past_due' || status === 'trialing' ? 'active' : status,
      paymentActionRequired: false,
      supportNote: `Operator reason: verified ${selectedPlan?.name || planCode} billing and refreshed entitlement. Limits: ${selectedPlanLimitLabel}.`,
    });
  };

  const applyPlanEntitlement = (plan: AdminPlan) => {
    const freePlan = plan.code === 'free';
    onPatch(user.id, {
      planCode: plan.code,
      billingStatus: freePlan ? 'none' : 'trialing',
      billingProvider: freePlan ? 'none' : 'manual',
      billingMarket: billingMarketForPlan(plan, billingMarket),
      status: status === 'suspended' || status === 'deleted' ? status : 'active',
      paymentActionRequired: !freePlan,
      supportNote: freePlan
        ? `Operator reason: moved account to Free and cleared paid entitlement. Limits: ${formatPlanLimitLabel(plan)}.`
        : `Operator reason: applied provisional ${plan.name} entitlement for manual receipt review. Limits: ${formatPlanLimitLabel(plan)}.`,
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
      billingProvider: billingProvider === 'none' ? 'manual' : billingProvider,
      billingMarket,
      status: 'past_due',
      paymentActionRequired: true,
      supportNote: 'Operator reason: payment provider reported past-due renewal.',
    });
  };

  const restoreAccount = () => {
    onPatch(user.id, {
      status: 'active',
      accountRecoveryStatus: recoveryStatus === 'requested' ? 'resolved' : recoveryStatus,
      passwordResetRequired: false,
      supportNote: 'Operator reason: restored account after admin review and cleared recovery lock.',
    });
  };

  const suspendAccount = () => {
    onPatch(user.id, {
      status: 'suspended',
      paymentActionRequired: true,
      supportNote: 'Operator reason: suspended account for admin review.',
    });
  };

  return (
    <aside
      role="dialog"
      aria-labelledby={titleId}
      className="fixed inset-x-3 bottom-3 z-[70] max-h-[86dvh] overflow-y-auto overscroll-contain rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/94 p-3 shadow-[var(--panel-elev-2)] backdrop-blur-xl xl:sticky xl:inset-auto xl:top-4 xl:z-auto xl:max-h-[calc(100dvh-8rem)] xl:bg-[var(--bg-base)]/82 xl:shadow-[var(--panel-elev-1)]"
    >
      <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-surface-alpha xl:hidden" aria-hidden="true" />
      <div className="sticky top-0 z-10 -mx-3 -mt-3 flex items-start justify-between gap-3 rounded-t-[1.4rem] border-b border-glass bg-[var(--bg-base)]/94 px-3 py-2.5 backdrop-blur-xl xl:static xl:mx-0 xl:mt-0 xl:border-b-0 xl:bg-transparent xl:px-0 xl:py-0 xl:backdrop-blur-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <UserCog size={18} />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-base font-semibold text-primary">{admin.text('accountControl')}</h2>
              <p className="truncate text-xs text-tertiary">{admin.enumLabel(user.provider)} / {user.platform || admin.text('unknown')} / {user.locale || admin.text('localeNA')}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:bg-surface-alpha hover:text-primary"
          aria-label={admin.text('closeAccountPanel')}
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {/* Card 1: General Info */}
        <div className="rounded-xl border border-glass bg-surface-alpha/40 p-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-secondary mb-2 flex items-center gap-1.5 border-b border-glass pb-1.5">
            <UserCog size={13} className="text-blue-500" />
            {admin.text('generalInfo') || 'General Info'}
          </h3>
          <div className="grid gap-2 text-xs">
            <button type="button" onClick={() => onCopy(user.id, 'User ID')} className="flex h-8 items-center justify-between gap-3 rounded-lg border border-glass bg-surface-alpha px-2.5 text-left text-secondary">
              <span className="inline-flex min-w-0 items-center gap-1.5"><Copy size={11} /> <span className="truncate">{formatShortId(user.id)}</span></span>
              <span className="font-semibold text-primary text-[10px]">ID</span>
            </button>
            <button type="button" onClick={() => onCopy(user.email, 'Email')} className="flex h-8 items-center justify-between gap-3 rounded-lg border border-glass bg-surface-alpha px-2.5 text-left text-secondary">
              <span className="inline-flex min-w-0 items-center gap-1.5"><Mail size={11} /> <span className="truncate">{user.email}</span></span>
              <span className="font-semibold text-primary text-[10px]">Email</span>
            </button>
            <div className="flex h-8 items-center justify-between gap-3 rounded-lg border border-glass bg-surface-alpha px-2.5 text-secondary">
              <span className="inline-flex min-w-0 items-center gap-1.5"><Clock3 size={11} /> <span className="truncate">{admin.date(user.createdAt)}</span></span>
              <span className="font-semibold text-primary text-[10px]">{admin.text('created')}</span>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold text-tertiary">{admin.text('displayName')}</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} className="glass-input h-8 rounded-lg px-2.5 text-xs" />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold text-tertiary">{admin.text('username')}</span>
              <div className="relative">
                <AtSign size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary" />
                <input value={username} onChange={(event) => setUsername(event.currentTarget.value)} className="glass-input h-8 w-full rounded-lg pl-8 pr-2.5 text-xs" />
              </div>
            </label>
          </div>
        </div>

        {/* Card 2: Access & Credentials */}
        <div className="rounded-xl border border-glass bg-surface-alpha/40 p-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-secondary mb-2 flex items-center gap-1.5 border-b border-glass pb-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            {admin.text('accessSecurity') || 'Access & Security'}
          </h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-tertiary">{admin.text('status')}</span>
                <select value={status} onChange={(event) => setStatus(event.currentTarget.value as AccountStatus)} className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-xs text-primary">
                  {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-tertiary">{admin.text('role')}</span>
                <select value={role} onChange={(event) => setRole(event.currentTarget.value as AdminRole)} className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-xs text-primary">
                  {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold text-tertiary">{admin.text('recovery')}</span>
                <select value={recoveryStatus} onChange={(event) => setRecoveryStatus(event.currentTarget.value as AccountRecoveryStatus)} className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-xs text-primary">
                  {RECOVERY_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
                </select>
              </label>
              <label className="flex h-8 items-center justify-between gap-2 rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 text-xs text-secondary mt-5">
                <span className="text-[10px] font-semibold text-tertiary leading-none">{admin.text('requirePasswordReset')}</span>
                <input
                  type="checkbox"
                  checked={passwordResetRequired}
                  onChange={(event) => setPasswordResetRequired(event.currentTarget.checked)}
                  className="h-3.5 w-3.5 accent-blue-500 shrink-0"
                />
              </label>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={restoreAccount} disabled={busy || !canRestoreAccount} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300">
                <CheckCircle2 size={12} />
                {admin.text('restoreActive')}
              </button>
              <button type="button" onClick={suspendAccount} disabled={busy || status === 'suspended' || status === 'deleted'} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-[10px] font-semibold text-rose-800 transition-colors hover:bg-rose-500/15 disabled:opacity-50 dark:text-rose-300">
                <Lock size={12} />
                {admin.text('suspendReview')}
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Entitlement & Billing */}
        <div className="rounded-xl border border-glass bg-surface-alpha/40 p-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-secondary mb-2 flex items-center gap-1.5 border-b border-glass pb-1.5">
            <WalletCards size={13} className="text-blue-500" />
            {admin.text('billingEntitlement')}
          </h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-glass bg-surface-alpha px-2 py-1 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-tertiary">{admin.text('currentPlan')}</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-primary">{user.planName}</p>
              </div>
              <div className="rounded-lg border border-glass bg-surface-alpha px-2 py-1 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-tertiary">{admin.text('billing')}</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-primary">{admin.enumLabel(user.billing.status)}</p>
              </div>
              <div className="rounded-lg border border-glass bg-surface-alpha px-2 py-1 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-tertiary">{admin.text('risk')}</p>
                <p className={clsx('mt-0.5 text-[10px] font-semibold', user.riskScore >= 60 ? 'text-rose-500' : user.riskScore >= 30 ? 'text-amber-500' : 'text-emerald-500')}>{user.riskScore}</p>
              </div>
            </div>

            <PlanQuickControl
              plans={plans}
              selectedPlanCode={planCode}
              busy={busy}
              onSelectPlan={selectPlanPreset}
              onApplyPlan={applyPlanEntitlement}
            />

            <div className="mt-2 grid gap-2">
              <div className="grid grid-cols-3 gap-2">
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold text-tertiary">{admin.text('billingStatus')}</span>
                  <select value={billingStatus} onChange={(event) => setBillingStatus(event.currentTarget.value as BillingStatus)} className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-1.5 text-xs text-primary">
                    {BILLING_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold text-tertiary">{admin.text('provider')}</span>
                  <select value={billingProvider} onChange={(event) => setBillingProvider(event.currentTarget.value as BillingProvider)} className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-1.5 text-xs text-primary">
                    {BILLING_PROVIDER_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold text-tertiary">{admin.text('market')}</span>
                  <select value={billingMarket} onChange={(event) => setBillingMarket(event.currentTarget.value as BillingMarket)} className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-1.5 text-xs text-primary">
                    {BILLING_MARKET_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
                  </select>
                </label>
              </div>
              
              <label className="flex h-8 items-center justify-between gap-3 rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 text-xs text-secondary">
                <span className="text-[10px] font-semibold text-tertiary leading-none">{admin.text('paymentActionRequired')}</span>
                <input
                  type="checkbox"
                  checked={paymentActionRequired}
                  onChange={(event) => setPaymentActionRequired(event.currentTarget.checked)}
                  className="h-3.5 w-3.5 accent-blue-500 shrink-0"
                />
              </label>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={markReceiptReceived} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-1 text-[10px] font-semibold text-blue-800 transition-colors hover:bg-blue-500/15 disabled:opacity-50 dark:text-blue-300">
                <ClipboardCheck size={11} />
                {admin.text('receiptReceived')}
              </button>
              <button type="button" onClick={markBillingResolved} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-1 text-[10px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300">
                <CheckCircle2 size={11} />
                {admin.text('markPaid')}
              </button>
              <button type="button" onClick={markBillingPastDue} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-1 text-[10px] font-semibold text-amber-800 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300">
                <AlertTriangle size={11} />
                {admin.text('markPastDue')}
              </button>
            </div>

            <div className="mt-2 space-y-1 rounded-lg bg-surface-alpha p-2 text-[10px] text-tertiary leading-tight">
              {user.billing.customerId ? <button type="button" onClick={() => onCopy(user.billing.customerId, 'Customer ID')} className="truncate text-left block w-full hover:text-primary">{admin.text('customer')}: {user.billing.customerId}</button> : null}
              {user.billing.subscriptionId ? <button type="button" onClick={() => onCopy(user.billing.subscriptionId, 'Subscription ID')} className="truncate text-left block w-full hover:text-primary">{admin.text('subscription')}: {user.billing.subscriptionId}</button> : null}
              {user.billing.currentPeriodEnd ? <span>{admin.format('renewsEnds', { date: admin.date(user.billing.currentPeriodEnd) })}</span> : null}
            </div>
          </div>
        </div>

        {/* Card 4: Notes & Auditing */}
        <div className="rounded-xl border border-glass bg-surface-alpha/40 p-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-secondary mb-2 flex items-center gap-1.5 border-b border-glass pb-1.5">
            <Clock3 size={13} className="text-blue-500" />
            {admin.text('internalNotes') || 'Notes & Auditing'}
          </h3>
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold text-tertiary">{admin.text('internalNotes')}</span>
              <textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} className="min-h-[3.5rem] resize-none rounded-lg border border-glass bg-[var(--bg-base)] px-2 py-1.5 text-xs leading-relaxed text-primary outline-none focus:border-blue-400" />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold text-tertiary">{admin.text('supportNote')}</span>
              <textarea value={supportNote} onChange={(event) => setSupportNote(event.currentTarget.value)} className="min-h-[3.5rem] resize-none rounded-lg border border-glass bg-[var(--bg-base)] px-2 py-1.5 text-xs leading-relaxed text-primary outline-none focus:border-blue-400" />
            </label>
          </div>
        </div>
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
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-rose-800 hover:bg-rose-500/10 dark:text-rose-200"
                  aria-label={admin.text('dismissAdminError')}
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

      <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-3 grid gap-2 border-t border-glass bg-[var(--bg-base)]/94 p-3 backdrop-blur-xl xl:static xl:mx-0 xl:mb-0 xl:border-t-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-0">
        {saveBlockedByReason ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
            {admin.text('entitlementNeedsNote')}
          </div>
        ) : null}
        <button
          type="button"
          onClick={saveAccount}
          disabled={!dirty || busy || saveBlockedByReason}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)] transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={14} />
          {busy ? admin.text('saving') : admin.text('saveAccount')}
        </button>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button type="button" onClick={requirePasswordReset} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-800 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300">
            <KeyRound size={12} />
            {admin.text('requestReset')}
          </button>
          <button type="button" onClick={clearRecovery} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-glass bg-surface-alpha px-2 text-[10px] font-semibold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary disabled:opacity-50">
            <CheckCircle2 size={12} />
            {admin.text('resolveRecovery')}
          </button>
        </div>
      </div>
    </aside>
  );
}

function BillingReadinessPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  const admin = useAdminCopy();
  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
      <div className="rounded-2xl border border-glass bg-surface-alpha p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">{admin.text('paymentReadiness')}</p>
            <p className="mt-1 text-xs text-secondary">{admin.enumLabel(snapshot.billing.mode)}</p>
          </div>
          <StatusBadge value={snapshot.billing.ready ? 'pass' : 'warn'} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-[var(--bg-base)] p-2">
            <p className="text-lg font-semibold text-primary">{snapshot.billing.activeSubscriptions}</p>
            <p className="text-tertiary">{admin.text('active')}</p>
          </div>
          <div className="rounded-xl bg-[var(--bg-base)] p-2">
            <p className="text-lg font-semibold text-primary">{snapshot.billing.pastDueSubscriptions}</p>
            <p className="text-tertiary">{admin.text('pastDue')}</p>
          </div>
          <div className="rounded-xl bg-[var(--bg-base)] p-2">
            <p className="text-lg font-semibold text-primary">{admin.currencyUsd(snapshot.billing.revenueMonthlyUsd)}</p>
            <p className="text-tertiary">MRR</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-glass bg-surface-alpha p-4">
        <p className="text-sm font-semibold text-primary">{admin.text('connectedProviders')}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {snapshot.billing.connectedProviders.length ? snapshot.billing.connectedProviders.map((provider) => (
            <StatusBadge key={provider} value={provider} />
          )) : <StatusBadge value="not_configured" label={admin.text('notConfigured')} />}
        </div>
        <p className="mt-3 text-xs leading-5 text-secondary">{admin.format('marketsPrepared', { markets: snapshot.billing.supportedMarkets.map((market) => admin.enumLabel(market)).join(', ') })}</p>
      </div>
      <div className="rounded-2xl border border-glass bg-surface-alpha p-4">
        <p className="text-sm font-semibold text-primary">{admin.text('realtimeContract')}</p>
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

function PlanEditorCard({
  plan,
  busy,
  onPatch,
  onDirtyChange,
}: {
  plan: AdminPlan;
  busy: boolean;
  onPatch: (planCode: PlanCode, patch: AdminPlanPatch) => void;
  onDirtyChange?: (planCode: PlanCode, dirty: boolean) => void;
}) {
  const admin = useAdminCopy();
  const [draft, setDraft] = useState<PlanEditorDraft>(() => planToDraft(plan));

  useEffect(() => {
    setDraft(planToDraft(plan));
  }, [plan]);

  const patch = useMemo(() => buildPlanEditorPatch(plan, draft), [draft, plan]);
  const changedKeys = Object.keys(patch).filter((key) => key !== 'operatorNote');
  const dirty = changedKeys.length > 0;
  const invalidNumber = [
    ['priceMonthlyUsd', draft.priceMonthlyUsd],
    ['aiDailyLimit', draft.aiDailyLimit],
    ['deepDailyLimit', draft.deepDailyLimit],
    ['scannerDailyLimit', draft.scannerDailyLimit],
    ['storageMb', draft.storageMb],
    ['seats', draft.seats],
    ['supportSlaHours', draft.supportSlaHours],
  ].some(([key, value]) => normalizedPlanNumber(key as keyof PlanEditorDraft, value) === null);
  const canSave = dirty && hasOperatorReasonText(draft.operatorNote) && !invalidNumber && !busy;

  useEffect(() => {
    onDirtyChange?.(plan.code, dirty);
    return () => onDirtyChange?.(plan.code, false);
  }, [dirty, onDirtyChange, plan.code]);

  const setField = <K extends keyof PlanEditorDraft>(key: K, value: PlanEditorDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    if (!canSave) return;
    onPatch(plan.code, patch);
  };

  return (
    <article className="rounded-2xl border border-glass bg-surface-alpha p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-primary">{plan.name}</p>
            {plan.recommended ? <BadgeCheck size={17} className="text-blue-500" /> : null}
          </div>
          <p className="mt-1 text-xs text-tertiary">{admin.enumLabel(plan.code)} / {admin.currencyUsd(plan.priceMonthlyUsd)} / {admin.number(plan.activeUsers)} {admin.text('usersLabel')}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setDraft(planToDraft(plan))}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-xs font-semibold text-secondary transition-colors hover:text-primary"
            disabled={busy}
            title={admin.text('reset')}
          >
            <RefreshCcw size={14} />
            {admin.text('reset')}
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSave}
            title={admin.text('save')}
          >
            <Save size={14} />
            {busy ? admin.text('saving') : admin.text('save')}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-secondary">
          {admin.text('name')}
          <input value={draft.name} onChange={(event) => setField('name', event.currentTarget.value)} className="glass-input mt-1 min-h-10 w-full rounded-xl px-3 text-sm" />
        </label>
        <label className="text-xs font-semibold text-secondary">
          {admin.text('displayPrice')}
          <input value={draft.displayPrice} onChange={(event) => setField('displayPrice', event.currentTarget.value)} className="glass-input mt-1 min-h-10 w-full rounded-xl px-3 text-sm" />
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold text-secondary">
        {admin.text('description')}
        <textarea value={draft.description} onChange={(event) => setField('description', event.currentTarget.value)} className="glass-input mt-1 min-h-20 w-full rounded-xl px-3 py-2 text-sm" />
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [admin.text('priceUsd'), 'priceMonthlyUsd'],
          [admin.text('aiDay'), 'aiDailyLimit'],
          [admin.text('deepDay'), 'deepDailyLimit'],
          [admin.text('scansDay'), 'scannerDailyLimit'],
          [admin.text('storageMb'), 'storageMb'],
          [admin.text('seats'), 'seats'],
          [admin.text('slaHours'), 'supportSlaHours'],
        ].map(([label, key]) => (
          <label key={key} className="text-xs font-semibold text-secondary">
            {label}
            <input
              type="number"
              min={key === 'seats' || key === 'supportSlaHours' ? 1 : 0}
              value={draft[key as keyof PlanEditorDraft] as string}
              onChange={(event) => setField(key as keyof PlanEditorDraft, event.currentTarget.value as never)}
              className="glass-input mt-1 min-h-10 w-full rounded-xl px-3 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-secondary">
          {admin.text('provider')}
          <select value={draft.billingProvider} onChange={(event) => setField('billingProvider', event.currentTarget.value as BillingProvider)} className="mt-1 min-h-10 w-full rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
            {BILLING_PROVIDER_OPTIONS.map((provider) => <option key={provider} value={provider}>{admin.enumLabel(provider)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-secondary">
          {admin.text('market')}
          <select value={draft.market} onChange={(event) => setField('market', event.currentTarget.value as BillingMarket)} className="mt-1 min-h-10 w-full rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
            {BILLING_MARKET_OPTIONS.map((market) => <option key={market} value={market}>{admin.enumLabel(market)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-secondary">
          {admin.text('checkout')}
          <select value={draft.checkoutMode} onChange={(event) => setField('checkoutMode', event.currentTarget.value as CheckoutMode)} className="mt-1 min-h-10 w-full rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
            {CHECKOUT_MODE_OPTIONS.map((mode) => <option key={mode} value={mode}>{admin.enumLabel(mode)}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-secondary">
          {admin.text('productId')}
          <input value={draft.billingProductId} onChange={(event) => setField('billingProductId', event.currentTarget.value)} className="glass-input mt-1 min-h-10 w-full rounded-xl px-3 text-sm" />
        </label>
        <label className="text-xs font-semibold text-secondary">
          {admin.text('priceId')}
          <input value={draft.billingPriceId} onChange={(event) => setField('billingPriceId', event.currentTarget.value)} className="glass-input mt-1 min-h-10 w-full rounded-xl px-3 text-sm" />
        </label>
        <label className="text-xs font-semibold text-secondary">
          {admin.text('entitlementId')}
          <input value={draft.revenuecatEntitlementId} onChange={(event) => setField('revenuecatEntitlementId', event.currentTarget.value)} className="glass-input mt-1 min-h-10 w-full rounded-xl px-3 text-sm" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-secondary">
          {admin.text('features')}
          <textarea value={draft.featuresText} onChange={(event) => setField('featuresText', event.currentTarget.value)} className="glass-input mt-1 min-h-24 w-full rounded-xl px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-secondary">
          {admin.text('paymentMethods')}
          <textarea value={draft.paymentMethodsText} onChange={(event) => setField('paymentMethodsText', event.currentTarget.value)} className="glass-input mt-1 min-h-24 w-full rounded-xl px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-xs font-semibold text-secondary">
          <input type="checkbox" checked={draft.recommended} onChange={(event) => setField('recommended', event.currentTarget.checked)} />
          {admin.text('recommended')}
        </label>
        <span className={clsx('text-xs font-semibold', changedKeys.length ? 'text-blue-600 dark:text-blue-300' : 'text-tertiary')}>
          {changedKeys.length ? admin.format('pendingChanges', { count: changedKeys.length }) : admin.text('noPendingChanges')}
        </span>
      </div>

      <label className="mt-3 block text-xs font-semibold text-secondary">
        {admin.text('operatorNote')}
        <textarea
          value={draft.operatorNote}
          onChange={(event) => setField('operatorNote', event.currentTarget.value)}
          placeholder={admin.text('operatorNotePlaceholder')}
          className="glass-input mt-1 min-h-20 w-full rounded-xl px-3 py-2 text-sm"
        />
      </label>
      {invalidNumber ? <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{admin.text('numericFieldsInvalid')}</p> : null}
    </article>
  );
}

function PlansPanel({
  plans,
  busyPlanCode,
  onPatch,
  onDirtyChange,
}: {
  plans: AdminPlan[];
  busyPlanCode: PlanCode | null;
  onPatch: (planCode: PlanCode, patch: AdminPlanPatch) => void;
  onDirtyChange?: (planCode: PlanCode, dirty: boolean) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {plans.map((plan) => (
        <PlanEditorCard
          key={plan.code}
          plan={plan}
          busy={busyPlanCode === plan.code}
          onPatch={onPatch}
          onDirtyChange={onDirtyChange}
        />
      ))}
    </div>
  );
}

function CatalogDatabasePanel({
  snapshot,
  busy,
  onCreate,
}: {
  snapshot: AdminSnapshot;
  busy: boolean;
  onCreate: (patch: AdminCatalogRequestPatch) => Promise<boolean>;
}) {
  const admin = useAdminCopy();
  const [kind, setKind] = useState<AdminCatalogKind>('grinder');
  const [title, setTitle] = useState('');
  const [entityId, setEntityId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [operatorNote, setOperatorNote] = useState('');
  const [payloadText, setPayloadText] = useState('{\n  "brand": "",\n  "model": "",\n  "region": "Indonesia"\n}');
  const [parseError, setParseError] = useState('');

  const submit = async () => {
    try {
      const payload = JSON.parse(payloadText) as Record<string, unknown>;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        setParseError(admin.text('payloadMustObject'));
        return;
      }
      setParseError('');
      const saved = await onCreate({
        kind,
        title: title.trim(),
        entityId: entityId.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        payload,
        operatorNote: operatorNote.trim(),
      });
      if (saved) {
        setTitle('');
        setEntityId('');
        setSourceUrl('');
        setOperatorNote('');
      }
    } catch {
      setParseError(admin.text('payloadInvalid'));
    }
  };

  const canSubmit = Boolean(title.trim()) && hasOperatorReasonText(operatorNote) && !busy;

  return (
    <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_1.1fr]">
      <div className="rounded-xl border border-glass bg-surface-alpha p-3">
        <div className="flex items-start justify-between gap-3 border-b border-glass pb-2">
          <div>
            <p className="text-xs font-semibold text-primary">{admin.text('catalogOperations')}</p>
            <p className="mt-0.5 text-[10px] text-secondary">{admin.text('catalogOperationsSubtitle')}</p>
          </div>
          <StatusBadge value={snapshot.catalog.ready ? 'pass' : 'warn'} className="text-[9px] min-h-6 h-6 px-1.5 shrink-0 self-start" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {snapshot.catalog.supportedKinds.map((item) => (
            <div key={item} className="rounded-lg bg-[var(--bg-base)] p-1.5">
              <p className="text-base font-semibold text-primary">{admin.number(snapshot.catalog.publishedCounts[item])}</p>
              <p className="text-[10px] text-tertiary">{admin.enumLabel(item)}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-lg bg-[var(--bg-base)] p-2.5 text-[10px] text-secondary">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge value="queued" label={admin.format('queuedCount', { count: admin.number(snapshot.catalog.reviewQueue.queued) })} className="text-[9px] min-h-5 h-5 px-1.5" />
            <StatusBadge value="needs_source" label={admin.format('needsSourceCount', { count: admin.number(snapshot.catalog.reviewQueue.needsSource) })} className="text-[9px] min-h-5 h-5 px-1.5" />
            <StatusBadge value="approved" label={admin.format('approvedCount', { count: admin.number(snapshot.catalog.reviewQueue.approved) })} className="text-[9px] min-h-5 h-5 px-1.5" />
          </div>
          {snapshot.catalog.gaps[0] ? <p className="mt-2.5 leading-normal text-[10px]">{snapshot.catalog.gaps[0]}</p> : null}
        </div>
        <div className="mt-2.5 space-y-1.5">
          {snapshot.catalog.recentRequests.slice(0, 5).map((request) => (
            <div key={request.id} className="rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-semibold text-primary">{request.title}</p>
                <StatusBadge value={request.reviewStatus} className="text-[9px] min-h-5 h-5 px-1" />
              </div>
              <p className="mt-0.5 truncate text-[10px] text-tertiary">{admin.enumLabel(request.kind)} / {request.payloadPreview || request.entityId || 'draft'}</p>
            </div>
          ))}
          {!snapshot.catalog.recentRequests.length ? <p className="rounded-lg bg-[var(--bg-base)] px-3 py-2 text-xs text-tertiary text-center">{admin.text('noCatalogRequests')}</p> : null}
        </div>
      </div>

      <div className="rounded-xl border border-glass bg-surface-alpha p-3">
        <div className="flex items-center justify-between gap-3 border-b border-glass pb-2">
          <p className="text-xs font-semibold text-primary">{admin.text('newCatalogRequest')}</p>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={13} />
            {busy ? admin.text('saving') : admin.text('queue')}
          </button>
        </div>
        <div className="mt-3 grid gap-2.5 md:grid-cols-3">
          <label className="text-[10px] font-semibold text-secondary">
            {admin.text('kind')}
            <select value={kind} onChange={(event) => setKind(event.currentTarget.value as AdminCatalogKind)} className="mt-1 h-8 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-xs text-primary">
              {CATALOG_KIND_OPTIONS.map((item) => <option key={item} value={item}>{admin.enumLabel(item)}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold text-secondary md:col-span-2">
            {admin.text('title')}
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} className="glass-input mt-1 h-8 w-full rounded-lg px-2 text-xs" />
          </label>
        </div>
        <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
          <label className="text-[10px] font-semibold text-secondary">
            {admin.text('entityId')}
            <input value={entityId} onChange={(event) => setEntityId(event.currentTarget.value)} className="glass-input mt-1 h-8 w-full rounded-lg px-2 text-xs" />
          </label>
          <label className="text-[10px] font-semibold text-secondary">
            {admin.text('sourceUrl')}
            <input value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} className="glass-input mt-1 h-8 w-full rounded-lg px-2 text-xs" />
          </label>
        </div>
        <label className="mt-2.5 block text-[10px] font-semibold text-secondary">
          {admin.text('payloadJson')}
          <textarea value={payloadText} onChange={(event) => setPayloadText(event.currentTarget.value)} className="glass-input mt-1 min-h-[5.5rem] w-full rounded-lg px-2 py-1.5 font-mono text-[10px]" />
        </label>
        <label className="mt-2.5 block text-[10px] font-semibold text-secondary">
          {admin.text('operatorNote')}
          <textarea value={operatorNote} onChange={(event) => setOperatorNote(event.currentTarget.value)} className="glass-input mt-1 min-h-[3rem] w-full rounded-lg px-2 py-1 text-xs" />
        </label>
        {parseError ? <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{parseError}</p> : null}
      </div>
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
  const admin = useAdminCopy();
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
          <div key={flag.key} className="rounded-xl border border-glass bg-surface-alpha p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">{flag.label}</p>
                <p className="mt-0.5 text-[10px] text-tertiary">{flag.key} / updated {admin.date(flag.updatedAt)}</p>
              </div>
              <select
                value={flag.status}
                disabled={busy}
                onChange={(event) => onPatch(flag.key, { status: event.currentTarget.value as FeatureFlagStatus })}
                className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-[11px] font-semibold text-primary"
                aria-label={`Change status for ${flag.label}`}
              >
                {FEATURE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{admin.enumLabel(status)}</option>)}
              </select>
            </div>

            <textarea
              value={draftMessages[flag.key] ?? flag.message ?? ''}
              disabled={busy}
              onChange={(event) => setDraftMessages((current) => ({ ...current, [flag.key]: event.currentTarget.value }))}
              onBlur={() => commitMessage(flag)}
              placeholder={admin.text('userFacingMaintenanceMessage')}
              className="mt-3 min-h-[3.5rem] w-full resize-none rounded-lg border border-glass bg-[var(--bg-base)] px-2 py-1.5 text-xs leading-relaxed text-primary outline-none transition-colors focus:border-blue-400"
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {FEATURE_SURFACE_OPTIONS.map((surface) => (
                <label key={surface} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-[10px] font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={flag.surfaces.includes(surface)}
                    disabled={busy}
                    onChange={(event) => toggleSurface(flag, surface, event.currentTarget.checked)}
                    className="h-3 w-3 accent-blue-500"
                  />
                  {admin.enumLabel(surface)}
                </label>
              ))}
            </div>
            {busy ? <p className="mt-2 text-[10px] font-semibold text-blue-500">{admin.text('savingMaintenanceControl')}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function formatAiUsageLabel(value: AdminAiProviderStatus['recommendedFor'][number]): string {
  if (value === 'ai_chat') return 'AI Chat';
  if (value === 'ai_brew') return 'AI Brew';
  if (value === 'deep_search') return 'Deep/Search';
  if (value === 'structured_fallback') return 'Fallback';
  return 'Vision';
}

function formatAiTierLabel(value: AdminAiProviderStatus['tier']): string {
  if (value === 'paid_credit') return 'Paid credit aktif';
  if (value === 'paid_credit_ready') return 'Siap paid credit';
  return 'Free tier';
}

function formatAiCostUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0.0000';
  return `$${value.toFixed(value < 0.01 ? 4 : 2)}`;
}

function formatAiSuccessRate(usage: AdminAiUsageAggregate): string {
  if (usage.requests <= 0) return '0%';
  return `${Math.round((usage.successes / usage.requests) * 100)}%`;
}

function AiUsageMetricCard({ title, usage }: { title: string; usage: AdminAiUsageAggregate }) {
  const admin = useAdminCopy();
  return (
    <div className="rounded-xl border border-glass bg-surface-alpha p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{title}</p>
          <p className="mt-1 text-lg font-semibold text-primary">{admin.number(usage.requests)}</p>
        </div>
        <StatusBadge value={usage.failures > 0 || usage.rateLimited > 0 ? 'warn' : usage.requests > 0 ? 'pass' : 'supabase'} label={formatAiSuccessRate(usage)} className="text-[9px] min-h-6 h-6 px-1.5" />
      </div>
      <div className="mt-2.5 grid gap-1.5 text-[11px] text-secondary">
        <p>{admin.text('aiUsageTokens')}: <span className="font-semibold text-primary">{admin.number(usage.totalTokens)}</span></p>
        <p>{admin.text('aiUsageCost')}: <span className="font-semibold text-primary">{formatAiCostUsd(usage.estimatedCostUsd)}</span></p>
        <p>{admin.text('aiUsageFailures')}: <span className="font-semibold text-primary">{admin.number(usage.failures)}</span>{usage.rateLimited ? ` / ${admin.number(usage.rateLimited)} limit` : ''}</p>
        <p>{admin.text('aiUsageLatency')}: <span className="font-semibold text-primary">{usage.avgLatencyMs ? `${admin.number(usage.avgLatencyMs)}ms` : '-'}</span></p>
      </div>
    </div>
  );
}

function AiProviderPanel({
  snapshot,
  busyFlagKey,
  onPatch,
  aiUsageRange,
  onApplyUsageRange,
}: {
  snapshot: AdminSnapshot;
  busyFlagKey: string | null;
  onPatch: (key: string, patch: AdminFeatureFlagPatch) => void;
  aiUsageRange: { aiFrom?: string; aiTo?: string };
  onApplyUsageRange: (range: { aiFrom?: string; aiTo?: string }) => void;
}) {
  const admin = useAdminCopy();
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});
  const defaultCustomFrom = snapshot.ai.usage.custom.range.from.slice(0, 10);
  const defaultCustomTo = snapshot.ai.usage.custom.range.to.slice(0, 10);
  const [usageFromDraft, setUsageFromDraft] = useState(aiUsageRange.aiFrom || defaultCustomFrom);
  const [usageToDraft, setUsageToDraft] = useState(aiUsageRange.aiTo || defaultCustomTo);

  useEffect(() => {
    setDraftMessages((current) => {
      const next = { ...current };
      for (const provider of snapshot.ai.providers) {
        if (!(provider.featureFlagKey in next)) next[provider.featureFlagKey] = provider.message || '';
      }
      return next;
    });
  }, [snapshot.ai.providers]);

  useEffect(() => {
    setUsageFromDraft(aiUsageRange.aiFrom || snapshot.ai.usage.custom.range.from.slice(0, 10));
    setUsageToDraft(aiUsageRange.aiTo || snapshot.ai.usage.custom.range.to.slice(0, 10));
  }, [aiUsageRange.aiFrom, aiUsageRange.aiTo, snapshot.ai.usage.custom.range.from, snapshot.ai.usage.custom.range.to]);

  const commitMessage = (provider: AdminAiProviderStatus) => {
    const message = (draftMessages[provider.featureFlagKey] ?? provider.message ?? '').trim();
    if (message === (provider.message || '')) return;
    onPatch(provider.featureFlagKey, { message });
  };

  const healthTone = (provider: AdminAiProviderStatus) => {
    if (provider.status !== 'available') return 'warn';
    if (!provider.configured) return 'fail';
    if (provider.health.status === 'ok') return 'pass';
    if (provider.health.status === 'rate_limited' || provider.health.status === 'error') return 'warn';
    return 'supabase';
  };

  const stats = [
    { label: admin.text('aiEnabledProviders'), value: snapshot.ai.enabledProviders },
    { label: admin.text('aiConfiguredProviders'), value: snapshot.ai.configuredProviders },
    { label: admin.text('aiPaidCreditProviders'), value: snapshot.ai.paidCreditProviders },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">{admin.text('aiNoSecretLeak')}</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">{admin.text('aiProviderSecurityNote')}</p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-200">{admin.text('aiFallbackPolicy')}</p>
          </div>
          <StatusBadge value={snapshot.ai.ready ? 'pass' : 'warn'} label={snapshot.ai.ready ? admin.text('aiProviderReady') : admin.text('aiNoKeys')} className="text-[10px] h-6 px-2 shrink-0 self-start" />
        </div>
      </div>

      {snapshot.ai.warnings.length ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          {snapshot.ai.warnings.map((warning) => (
            <p key={warning} className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-glass bg-surface-alpha p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-primary">{admin.number(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-glass bg-[var(--bg-base)]/70 p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">{admin.text('aiBrewFallbackTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">{admin.text('aiBrewFallbackSubtitle')}</p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">
              {admin.text('aiBrewFallbackThreshold')} {admin.number(snapshot.aiBrewFallbacks.thresholdPct || 8)}%
            </p>
          </div>
          <StatusBadge
            value={snapshot.aiBrewFallbacks.status || (snapshot.aiBrewFallbacks.totalEvents > 0 ? 'warn' : 'pass')}
            label={`${admin.text('aiBrewFallbackRate')} ${admin.number(snapshot.aiBrewFallbacks.fallbackRatePct)}%`}
            className="text-[10px] h-6 px-2 shrink-0 self-start"
          />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {[
            { label: admin.text('aiBrewFallbackOptimizerRejected'), value: snapshot.aiBrewFallbacks.optimizerRejected },
            { label: admin.text('aiBrewFallbackNoChange'), value: snapshot.aiBrewFallbacks.optimizerNoChange },
            { label: admin.text('aiBrewFallbackSequence'), value: snapshot.aiBrewFallbacks.sequenceFallback },
            { label: admin.text('aiBrewFallbackRecent'), value: snapshot.aiBrewFallbacks.totalEvents },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-surface-alpha p-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{item.label}</p>
              <p className="mt-0.5 text-base font-semibold text-primary">{admin.number(item.value)}</p>
            </div>
          ))}
        </div>
        {snapshot.aiBrewFallbacks.trend?.length ? (
          <div className="mt-3 rounded-lg bg-surface-alpha p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiBrewFallbackTrend')}</p>
              <span className="text-[11px] font-semibold text-secondary">
                {admin.number(snapshot.aiBrewFallbacks.trend[snapshot.aiBrewFallbacks.trend.length - 1]?.fallbackRatePct || 0)}%
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {snapshot.aiBrewFallbacks.trend.map((bucket) => (
                <div key={bucket.date} className="flex min-h-16 flex-col justify-end gap-1">
                  <div className="flex h-10 items-end rounded-lg bg-[var(--bg-base)]/72 px-1 py-0.5">
                    <div
                      className={clsx('w-full rounded-md', bucket.status === 'fail' ? 'bg-rose-500' : bucket.status === 'warn' ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ height: `${Math.max(6, Math.min(100, bucket.fallbackRatePct))}%` }}
                      title={`${bucket.date}: ${bucket.fallbackRatePct}% / ${bucket.totalEvents}`}
                    />
                  </div>
                  <p className="truncate text-center text-[9px] font-medium text-tertiary">{bucket.date.slice(5)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {snapshot.aiBrewFallbacks.recentEvents.length ? snapshot.aiBrewFallbacks.recentEvents.slice(0, 5).map((event) => (
            <div key={event.id} className="grid gap-1 rounded-lg bg-surface-alpha px-2.5 py-1.5 text-[11px] text-secondary sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <span className="font-semibold text-primary">{event.kind.replace(/_/g, ' ')}</span>
              <span className="min-w-0 truncate">{event.detail}</span>
              <span className="text-[10px] text-tertiary sm:text-right">{admin.date(event.createdAt)}</span>
            </div>
          )) : <p className="rounded-lg bg-surface-alpha px-3 py-3 text-center text-xs text-secondary">{admin.text('aiBrewFallbackNoEvents')}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-glass bg-[var(--bg-base)]/70 p-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">{admin.text('aiBrewUsageTitle')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">{admin.text('aiBrewUsageSubtitle')}</p>
          </div>
          <StatusBadge value="supabase" label={admin.text('aiUsageEstimated')} className="text-[9px] min-h-6 h-6 px-1.5 shrink-0 self-start" />
        </div>
        <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
          <AiUsageMetricCard title={admin.text('aiUsageToday')} usage={snapshot.ai.usage.today} />
          <AiUsageMetricCard title={admin.text('aiUsageMonth')} usage={snapshot.ai.usage.month} />
          <AiUsageMetricCard title={admin.text('aiUsageCustom')} usage={snapshot.ai.usage.custom} />
        </div>
        <div className="mt-3 grid gap-2.5 rounded-xl border border-glass bg-surface-alpha p-2.5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">
            {admin.text('aiUsageFrom')}
            <input
              type="date"
              value={usageFromDraft}
              onChange={(event) => setUsageFromDraft(event.currentTarget.value)}
              className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-xs normal-case tracking-normal text-primary"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">
            {admin.text('aiUsageTo')}
            <input
              type="date"
              value={usageToDraft}
              onChange={(event) => setUsageToDraft(event.currentTarget.value)}
              className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-xs normal-case tracking-normal text-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => onApplyUsageRange({ aiFrom: usageFromDraft || undefined, aiTo: usageToDraft || undefined })}
            className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)] transition hover:bg-blue-500"
          >
            {admin.text('aiUsageApply')}
          </button>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="rounded-xl border border-glass bg-surface-alpha p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiUsageProviderBreakdown')}</p>
            <div className="mt-2 space-y-1.5">
              {snapshot.ai.usage.month.providerBreakdown.length ? snapshot.ai.usage.month.providerBreakdown.slice(0, 6).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2.5 rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-primary">{item.label}</p>
                    <p className="text-[10px] text-secondary">{admin.number(item.totalTokens)} token / {formatAiCostUsd(item.estimatedCostUsd)}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-primary">{admin.number(item.requests)}</p>
                </div>
              )) : <p className="py-3 text-center text-xs text-secondary">{admin.text('aiUsageNoEvents')}</p>}
            </div>
          </div>
          <div className="rounded-xl border border-glass bg-surface-alpha p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiUsageRecentEvents')}</p>
            <div className="mt-2 space-y-1.5">
              {snapshot.ai.usage.recentEvents.length ? snapshot.ai.usage.recentEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="grid gap-0.5 rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5 text-[11px] text-secondary sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-primary">{event.providerLabel} / {event.model}</p>
                    <p className="text-[10px] text-tertiary">{event.action}{event.mode ? ` / ${event.mode}` : ''} / {event.route}</p>
                  </div>
                  <p className="sm:text-right text-[10px]">
                    <span className={clsx('font-semibold', event.outcome === 'success' ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300')}>
                      {event.outcome.replace(/_/g, ' ')}
                    </span>
                    <br />
                    {admin.number(event.totalTokens)} token / {formatAiCostUsd(event.estimatedCostUsd)}
                  </p>
                </div>
              )) : <p className="py-3 text-center text-xs text-secondary">{admin.text('aiUsageNoEvents')}</p>}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-tertiary">{snapshot.ai.usage.estimationNote}</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {snapshot.ai.providers.map((provider) => {
          const busy = busyFlagKey === provider.featureFlagKey;
          const lastHealth = provider.health.lastCheckedAt.startsWith('1970')
            ? 'belum ada request'
            : `${admin.date(provider.health.lastCheckedAt)}${provider.health.lastLatencyMs ? ` / ${admin.number(provider.health.lastLatencyMs)}ms` : ''}`;
          return (
            <article key={provider.provider} className="rounded-xl border border-glass bg-surface-alpha p-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-primary">{provider.label}</p>
                    <StatusBadge value={healthTone(provider)} label={provider.health.status.replace(/_/g, ' ')} className="text-[9px] min-h-5 h-5 px-1.5" />
                    <StatusBadge value={provider.status === 'available' ? 'pass' : 'warn'} label={admin.enumLabel(provider.status)} className="text-[9px] min-h-5 h-5 px-1.5" />
                  </div>
                  <p className="mt-0.5 text-[10px] text-tertiary">{provider.provider} / priority {provider.priority} / {formatAiTierLabel(provider.tier)}</p>
                </div>
                <select
                  value={provider.status}
                  disabled={busy}
                  onChange={(event) => onPatch(provider.featureFlagKey, { status: event.currentTarget.value as FeatureFlagStatus })}
                  className="h-8 rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-[11px] font-semibold text-primary shrink-0 self-start"
                  aria-label={`Change AI provider status for ${provider.label}`}
                >
                  {FEATURE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{admin.enumLabel(status)}</option>)}
                </select>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiPrimaryModel')}</p>
                  <p className="mt-0.5 text-xs font-semibold text-primary">{provider.primaryModel}</p>
                  {provider.fallbackModels.length ? <p className="mt-0.5 text-[10px] text-secondary">{provider.fallbackModels.join(', ')}</p> : null}
                </div>
                <div className="rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiLastHealth')}</p>
                  <p className="mt-0.5 text-xs font-semibold text-primary">{lastHealth}</p>
                  <p className="mt-0.5 text-[10px] text-secondary">
                    {provider.health.successes} ok / {provider.health.failures} fail{provider.health.errorCode ? ` / ${provider.health.errorCode}` : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiStandardKeys')} / {admin.text('aiPaidKeys')}</p>
                  <p className="mt-0.5 text-xs font-semibold text-primary">{provider.standardKeyCount} / {provider.paidKeyCount}</p>
                  <p className="mt-0.5 text-[10px] text-secondary">{provider.configured ? `${provider.keyCount} total server key` : admin.text('aiNoKeys')}</p>
                </div>
                <div className="rounded-lg bg-[var(--bg-base)] px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{admin.text('aiRecommendedFor')}</p>
                  <p className="mt-0.5 text-xs font-semibold text-primary">{provider.recommendedFor.map(formatAiUsageLabel).join(', ')}</p>
                </div>
              </div>

              <textarea
                value={draftMessages[provider.featureFlagKey] ?? provider.message ?? ''}
                disabled={busy}
                onChange={(event) => setDraftMessages((current) => ({ ...current, [provider.featureFlagKey]: event.currentTarget.value }))}
                onBlur={() => commitMessage(provider)}
                placeholder={admin.text('maintenanceMessagePlaceholder')}
                className="mt-3 min-h-[3rem] w-full resize-none rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 py-1.5 text-xs leading-relaxed text-primary outline-none transition-colors focus:border-blue-400"
              />
              {busy ? <p className="mt-2 text-[10px] font-semibold text-blue-500">{admin.text('savingMaintenanceControl')}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function RecipeLibraryPanel({ snapshot }: { snapshot: AdminSnapshot }) {
  const admin = useAdminCopy();
  const library = snapshot.recipeLibrary;
  const stats = [
    { label: admin.text('recipeLibrarySynced'), value: library.totalItems },
    { label: admin.text('recipeLibraryAiBrew'), value: library.aiBrewCount },
    { label: admin.text('recipeLibraryCollection'), value: library.collectionCount },
    { label: admin.text('recipeLibraryFeedback'), value: library.feedbackCount },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-glass bg-surface-alpha p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-primary">{admin.number(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-glass bg-surface-alpha p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">{admin.text('recipeLibraryReady')}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-secondary">
              {library.tables.join(', ')}
            </p>
          </div>
          <StatusBadge value={library.ready ? 'pass' : 'warn'} className="text-[9px] min-h-6 h-6 px-1.5 shrink-0 self-start" />
        </div>
        {library.gaps[0] ? (
          <div className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
            <span className="font-semibold">{admin.text('recipeLibraryGap')}: </span>
            {library.gaps[0]}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-glass bg-surface-alpha">
        <div className="flex items-center justify-between gap-3 border-b border-glass px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold text-primary">{admin.text('recipeLibraryRecent')}</p>
            <p className="mt-0.5 text-[10px] text-tertiary">{admin.text('recipeLibrarySubtitle')}</p>
          </div>
          <Library size={15} className="shrink-0 text-blue-500" />
        </div>
        {library.recentItems.length ? (
          <div className="divide-y divide-[var(--panel-border-soft)]">
            {library.recentItems.map((item) => (
              <article key={`${item.source}-${item.id}`} className="grid gap-2.5 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_10rem_8rem] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-primary">{item.title}</p>
                    {item.deletedAt ? <StatusBadge value="warn" label={admin.enumLabel('deleted')} className="text-[9px] min-h-5 h-5 px-1" /> : null}
                    {item.feedbackRating ? <StatusBadge value="pass" label={admin.enumLabel(item.feedbackRating)} className="text-[9px] min-h-5 h-5 px-1" /> : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-secondary">{item.summary}</p>
                  <p className="mt-0.5 truncate text-[10px] text-tertiary">{item.userId}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  <span className="rounded-full bg-[var(--bg-base)] px-1.5 py-0.5 text-[9px] font-semibold text-secondary">
                    {admin.enumLabel(item.source)}
                  </span>
                  <span className="rounded-full bg-[var(--bg-base)] px-1.5 py-0.5 text-[9px] font-semibold text-secondary">
                    {admin.enumLabel(item.itemType)}
                  </span>
                  {item.brewMode ? (
                    <span className="rounded-full bg-[var(--bg-base)] px-1.5 py-0.5 text-[9px] font-semibold text-secondary">
                      {admin.enumLabel(item.brewMode)}
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-tertiary md:text-right">{admin.date(item.updatedAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-secondary">{admin.text('recipeLibraryNoItems')}</p>
        )}
      </div>
    </div>
  );
}

function AuditPanel({ audit, onExport }: { audit: AdminSnapshot['audit']; onExport?: () => void }) {
  const admin = useAdminCopy();
  return (
    <div className="space-y-4">
      {onExport && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-secondary">{admin.text('auditLogs') || 'Audit Logs'}</h3>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-glass bg-surface-alpha px-3 text-xs font-semibold text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
          >
            <Download size={13} />
            {admin.text('auditCsv')}
          </button>
        </div>
      )}
      <div className="rounded-2xl border border-glass bg-surface-alpha">
        {audit.map((event, index) => (
          <div key={event.id} className={clsx('grid gap-3 px-4 py-4 md:grid-cols-[11rem_1fr_8rem]', index > 0 && 'border-t border-glass')}>
            <div className="text-xs text-tertiary">{admin.date(event.createdAt)}</div>
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
    </div>
  );
}

function LaunchPanel({ checklist, onCopySummary }: { checklist: LaunchChecklistItem[]; onCopySummary?: () => void }) {
  const admin = useAdminCopy();
  return (
    <div className="space-y-4">
      {onCopySummary && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-secondary">{admin.text('launchChecklist') || 'Launch Checklist'}</h3>
          <button
            type="button"
            onClick={onCopySummary}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)] transition-colors hover:bg-blue-700"
          >
            <ClipboardCheck size={13} />
            {admin.text('copyHandoff')}
          </button>
        </div>
      )}
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
    </div>
  );
}

function EmptyState() {
  const admin = useAdminCopy();
  return (
    <div className="rounded-2xl border border-dashed border-glass bg-surface-alpha px-4 py-10 text-center">
      <p className="text-sm font-semibold text-primary">{admin.text('noMatchingUsers')}</p>
      <p className="mt-1 text-sm text-secondary">{admin.text('noMatchingUsersSubtitle')}</p>
    </div>
  );
}

export function AdminManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAuthModal, refreshAuthState } = useAuthModal();
  const { language } = useGlobalState();
  const admin = useMemo(() => createAdminCopy(language), [language]);
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
  const [busyPlanCode, setBusyPlanCode] = useState<PlanCode | null>(null);
  const [busyCatalogRequest, setBusyCatalogRequest] = useState(false);
  const [aiUsageRange, setAiUsageRange] = useState<AdminAiUsageRange>({});
  const [pendingUserPatch, setPendingUserPatch] = useState<PendingUserPatch | null>(null);
  const [pendingFeatureFlagPatch, setPendingFeatureFlagPatch] = useState<PendingFeatureFlagPatch | null>(null);
  const [toast, setToast] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [dirtyAccountIds, setDirtyAccountIds] = useState<Set<string>>(() => new Set());
  const [dirtyPlanCodes, setDirtyPlanCodes] = useState<Set<PlanCode>>(() => new Set());
  const refreshSequenceRef = useRef(0);

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

  const handleTabKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, current: AdminTab) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === current);
    if (currentIndex < 0) return;
    const lastIndex = TABS.length - 1;
    const nextIndex = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? Math.min(lastIndex, currentIndex + 1)
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? Math.max(0, currentIndex - 1)
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? lastIndex
            : currentIndex;
    if (nextIndex === currentIndex && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const nextTab = TABS[nextIndex].id;
    selectTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`admin-tab-${nextTab}`)?.focus();
    });
  }, [selectTab]);

  const trackAccountDraftDirty = useCallback((userId: string, dirty: boolean) => {
    setDirtyAccountIds((current) => {
      const hasValue = current.has(userId);
      if ((dirty && hasValue) || (!dirty && !hasValue)) return current;
      const next = new Set(current);
      if (dirty) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const trackPlanDraftDirty = useCallback((planCode: PlanCode, dirty: boolean) => {
    setDirtyPlanCodes((current) => {
      const hasValue = current.has(planCode);
      if ((dirty && hasValue) || (!dirty && !hasValue)) return current;
      const next = new Set(current);
      if (dirty) next.add(planCode);
      else next.delete(planCode);
      return next;
    });
  }, []);

  const refresh = useCallback(async (options?: { silent?: boolean; aiUsageRange?: AdminAiUsageRange }) => {
    const requestSequence = refreshSequenceRef.current + 1;
    refreshSequenceRef.current = requestSequence;
    if (!options?.silent) {
      const hasSnapshot = Boolean(snapshotRef.current);
      setLoading(!hasSnapshot);
      setRefreshing(hasSnapshot);
    }
    try {
      const next = await fetchAdminSnapshot(options?.aiUsageRange || aiUsageRange);
      if (requestSequence !== refreshSequenceRef.current) return;
      setSnapshot(next);
      setError(null);
      setAccountErrorUserId(null);
    } catch (err) {
      if (requestSequence !== refreshSequenceRef.current) return;
      if (err instanceof AdminApiError) setError(err);
      else setError(new AdminApiError('Gagal memuat snapshot admin.', { status: 0 }));
    } finally {
      if (requestSequence === refreshSequenceRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [aiUsageRange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyAiUsageRange = useCallback((range: AdminAiUsageRange) => {
    setAiUsageRange(range);
    void refresh({ aiUsageRange: range });
  }, [refresh]);

  const invalidateInFlightRefreshes = useCallback(() => {
    refreshSequenceRef.current += 1;
  }, []);

  const liveRefreshPaused = Boolean(
    pendingUserPatch
      || pendingFeatureFlagPatch
      || busyUserId
      || busyFlagKey
      || busyPlanCode
      || busyCatalogRequest
      || dirtyAccountIds.size
      || dirtyPlanCodes.size,
  );

  useEffect(() => {
    const intervalSec = snapshot?.realtime.intervalSec || 12;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !liveRefreshPaused) {
        void refresh({ silent: true });
      }
    }, intervalSec * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !liveRefreshPaused) {
        void refresh({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [liveRefreshPaused, refresh, snapshot?.realtime.intervalSec]);

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

  const userQueueCounts = useMemo<Record<UserQueueFilter, number>>(() => ({
    all: snapshot?.users.length || 0,
    risk: adminQueues.riskUsers.length,
    recovery: adminQueues.recoveryUsers.length,
    billing: adminQueues.billingUsers.length,
    paid: adminQueues.paidUsers.length,
    sample: (snapshot?.users || []).filter((user) => user.isSample).length,
  }), [adminQueues.billingUsers.length, adminQueues.paidUsers.length, adminQueues.recoveryUsers.length, adminQueues.riskUsers.length, snapshot?.users]);

  const userFiltersActive = hasActiveUserFilters({
    query,
    statusFilter,
    planFilter,
    recoveryFilter,
    userQueueFilter,
  });

  useEffect(() => {
    if (!selectedUserId || !snapshot?.users.length) return;
    if (!snapshot.users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(null);
      return;
    }
    if (activeTab === 'users' && filteredUsers.length && !filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
    if (activeTab === 'users' && !filteredUsers.length) {
      setSelectedUserId(null);
    }
  }, [activeTab, filteredUsers, selectedUserId, snapshot?.users]);

  const blockingError = error && (error.status === 401 || error.status === 403) ? error : null;

  const resetUserFilters = useCallback(() => {
    setQuery('');
    setStatusFilter('all');
    setPlanFilter('all');
    setRecoveryFilter('all');
    setUserQueueFilter('all');
  }, []);

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
      setToast(admin.format('usersCopied', { label }));
    } catch {
      setToast(admin.text('copyFailed'));
    }
  }, [admin]);

  const exportUsersCsv = useCallback(() => {
    const current = snapshotRef.current;
    if (!current) return;
    const exported = downloadTextFile(
      `baristachaw-users-${exportStamp(current.generatedAt)}.csv`,
      usersToCsv(current),
      'text/csv;charset=utf-8',
    );
    setToast(exported ? admin.text('usersCsvExported') : admin.text('exportUnavailable'));
  }, [admin]);

  const exportAuditCsv = useCallback(() => {
    const current = snapshotRef.current;
    if (!current) return;
    const exported = downloadTextFile(
      `baristachaw-audit-${exportStamp(current.generatedAt)}.csv`,
      auditToCsv(current),
      'text/csv;charset=utf-8',
    );
    setToast(exported ? admin.text('auditCsvExported') : admin.text('exportUnavailable'));
  }, [admin]);

  const copyLaunchSummary = useCallback(() => {
    const current = snapshotRef.current;
    if (!current) return;
    void handleCopy(buildLaunchSummary(current), admin.text('launchHandoff'));
  }, [admin, handleCopy]);

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
    invalidateInFlightRefreshes();
    setBusyUserId(userId);
    setAccountErrorUserId(null);
    try {
      const next = await updateAdminUser(userId, patch);
      setSnapshot(next);
      setError(null);
      setAccountErrorUserId(null);
      setToast(admin.text('adminChangesSaved'));
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err);
        setAccountErrorUserId(userId);
      }
      setToast(admin.text('adminChangesFailed'));
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
    const risk = classifyUserPatchRisk(user, patch, admin);
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
    invalidateInFlightRefreshes();
    setBusyFlagKey(key);
    setAccountErrorUserId(null);
    try {
      const next = await updateFeatureFlag(key, patch);
      setSnapshot(next);
      setError(null);
      setToast(admin.text('maintenanceSaved'));
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      setToast(admin.text('maintenanceFailed'));
    } finally {
      setBusyFlagKey(null);
    }
  };

  const commitPlanPatch = async (planCode: PlanCode, patch: AdminPlanPatch) => {
    invalidateInFlightRefreshes();
    setBusyPlanCode(planCode);
    setAccountErrorUserId(null);
    try {
      const next = await updateAdminPlan(planCode, patch);
      setSnapshot(next);
      setError(null);
      setToast(admin.text('planSaved'));
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      setToast(admin.text('planFailed'));
    } finally {
      setBusyPlanCode(null);
    }
  };

  const commitCatalogRequest = async (patch: AdminCatalogRequestPatch): Promise<boolean> => {
    invalidateInFlightRefreshes();
    setBusyCatalogRequest(true);
    setAccountErrorUserId(null);
    try {
      const next = await createCatalogRequest(patch);
      setSnapshot(next);
      setError(null);
      setToast(admin.text('catalogSaved'));
      return true;
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      setToast(admin.text('catalogFailed'));
      return false;
    } finally {
      setBusyCatalogRequest(false);
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
      <AdminCopyContext.Provider value={admin}>
        <ProtectedGate
          error={blockingError}
          onSignIn={handleSignIn}
          onRetry={() => void refresh()}
        />
      </AdminCopyContext.Provider>
    );
  }

  const criticalChecks = snapshot?.checks.filter((check) => check.status === 'fail').length || 0;
  const warningChecks = snapshot?.checks.filter((check) => check.status === 'warn').length || 0;

  return (
    <AdminCopyContext.Provider value={admin}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex min-h-screen w-full bg-[var(--bg-base)] text-primary desktop-noise-bg overflow-x-hidden"
      aria-busy={loading || refreshing}
    >
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {admin.text('skipToAdminContent')}
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:border-glass lg:bg-[var(--bg-elevated)]/60 lg:backdrop-blur-xl z-20">
        <div className="flex h-14 items-center px-4 border-b border-glass gap-2 shrink-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-tight text-primary truncate">Baristachaw Admin</h2>
            <p className="text-[9px] text-tertiary truncate">Management Console</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {TABS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                selectTab(id);
                setIsMobileDrawerOpen(false);
              }}
              onKeyDown={(event) => handleTabKeyDown(event, id)}
              id={`admin-tab-${id}`}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`admin-panel-${id}`}
              className={clsx(
                'w-full flex items-center justify-between min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all group border-0 text-left',
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.18)]'
                  : 'text-secondary hover:bg-surface-alpha hover:text-primary'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={14} className={activeTab === id ? 'text-white' : 'text-secondary group-hover:text-primary'} />
                <span className="truncate">{admin.text(labelKey)}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {id === 'database' && criticalChecks > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-rose-500/15 text-rose-500 px-1 text-[9px] font-bold">
                    {criticalChecks}
                  </span>
                )}
                {id === 'users' && (adminQueues.riskUsers.length + adminQueues.recoveryUsers.length > 0) && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-amber-500/15 text-amber-500 px-1 text-[9px] font-bold">
                    {adminQueues.riskUsers.length + adminQueues.recoveryUsers.length}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-glass space-y-2 bg-[var(--bg-elevated)]/40 shrink-0">
          <div className="flex items-center justify-between gap-2 px-1">
            {snapshot ? (
              <span className={clsx(
                'inline-flex items-center gap-1.5 text-[10px] font-semibold text-secondary truncate max-w-[120px]',
                liveRefreshPaused ? 'text-amber-500' : 'text-emerald-500'
              )}>
                <span className={clsx('h-1.5 w-1.5 rounded-full', liveRefreshPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse')} />
                {liveRefreshPaused ? admin.text('livePaused') : admin.text('live')} {snapshot.realtime.intervalSec}s
              </span>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-glass bg-surface-alpha text-secondary hover:text-primary transition-colors"
              title={isDark ? admin.text('switchToLight') : admin.text('switchToDark')}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-glass bg-surface-alpha px-2 text-[10px] font-semibold text-secondary hover:bg-[var(--bg-base)] hover:text-primary transition-all"
            >
              <ArrowLeft size={11} />
              <span>Exit</span>
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 text-[10px] font-semibold text-white hover:bg-blue-700 transition-all"
              disabled={refreshing}
            >
              <RefreshCcw size={11} className={refreshing ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (with AnimatePresence) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[65] w-64 flex flex-col bg-[var(--bg-elevated)] border-r border-glass shadow-2xl lg:hidden"
            >
              <div className="flex h-14 items-center justify-between px-4 border-b border-glass shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-500" />
                  <span className="text-xs font-bold text-primary">Baristachaw Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:bg-surface-alpha hover:text-primary"
                  aria-label="Close menu"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {TABS.map(({ id, labelKey, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      selectTab(id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center justify-between min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all group text-left border-0',
                      activeTab === id
                        ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.18)]'
                        : 'text-secondary hover:bg-surface-alpha hover:text-primary'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} />
                      <span className="truncate">{admin.text(labelKey)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {id === 'database' && criticalChecks > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-rose-500/15 text-rose-500 px-1 text-[9px] font-bold">
                          {criticalChecks}
                        </span>
                      )}
                      {id === 'users' && (adminQueues.riskUsers.length + adminQueues.recoveryUsers.length > 0) && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-amber-500/15 text-amber-500 px-1 text-[9px] font-bold">
                          {adminQueues.riskUsers.length + adminQueues.recoveryUsers.length}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-glass space-y-2 bg-[var(--bg-elevated)]/40 shrink-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] text-tertiary">
                    Seq: #{snapshot?.realtime.sequence}
                  </span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-glass bg-surface-alpha text-secondary"
                  >
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      navigate('/');
                    }}
                    className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-glass bg-surface-alpha text-xs font-semibold text-secondary"
                  >
                    <ArrowLeft size={12} />
                    <span>Exit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      void refresh();
                    }}
                    className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-blue-600 text-xs font-semibold text-white"
                  >
                    <RefreshCcw size={12} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 lg:pl-60 flex flex-col min-h-screen">
        {/* Mobile sticky top bar */}
        <header className="flex h-14 items-center justify-between px-4 border-b border-glass bg-[var(--bg-base)]/88 backdrop-blur-xl sticky top-0 z-30 lg:hidden shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-glass bg-surface-alpha text-secondary hover:text-primary shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-semibold text-primary truncate">
              {admin.text(TABS.find((tab) => tab.id === activeTab)?.labelKey || 'tabOverview')}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {snapshot ? <StatusBadge value={snapshot.dataMode} /> : null}
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"
              disabled={refreshing}
            >
              <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-7xl w-full mx-auto">
          {/* Desktop Tab Header */}
          <div className="hidden lg:flex items-center justify-between border-b border-glass pb-4 mb-2 shrink-0">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-primary">
                {admin.text(TABS.find((tab) => tab.id === activeTab)?.labelKey || 'tabOverview')}
              </h1>
              <p className="text-xs text-secondary mt-0.5">
                {activeTab === 'users' ? admin.text('usersSearchPlaceholder') : admin.text('pageSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {snapshot ? (
                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-surface-alpha px-2.5 text-[10px] font-semibold text-secondary">
                  <Clock3 size={11} />
                  {admin.date(snapshot.generatedAt)}
                </span>
              ) : null}
            </div>
          </div>

          {loading && !snapshot ? (
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-28 rounded-2xl border border-glass bg-surface-alpha loading-shimmer" />
              ))}
            </div>
          ) : null}

          {error && !snapshot && !blockingError ? (
            <section className="rounded-[1.4rem] border border-rose-500/25 bg-rose-500/10 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-500" />
                    <h2 className="text-base font-semibold text-primary">
                      {error.errorCode ? admin.enumLabel(error.errorCode) : admin.text('adminRequestFailed')}
                    </h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-secondary">{error.message}</p>
                  {error.details ? <p className="mt-1 text-xs leading-5 text-tertiary">{error.details}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)] transition-colors hover:bg-blue-700"
                >
                  <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
                  {admin.text('retry')}
                </button>
              </div>
            </section>
          ) : null}

          {snapshot ? (
            <>
              {/* Compact Metrics Bar */}
              <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <MetricTile label={admin.text('metricTotalUsers')} value={admin.number(snapshot.metrics.totalUsers)} detail={admin.format('activeAccounts', { count: admin.number(snapshot.metrics.activeUsers) })} icon={Users} />
                <MetricTile label={admin.text('metricPaidUsers')} value={admin.number(snapshot.metrics.paidUsers)} detail={admin.format('planConversion', { count: snapshot.metrics.planConversionRate })} icon={WalletCards} />
                <MetricTile label={admin.text('metricAiToday')} value={admin.number(snapshot.metrics.aiRequestsToday)} detail={admin.format('deepRequests', { count: admin.number(snapshot.metrics.deepRequestsToday) })} icon={Sparkles} />
                <MetricTile label={admin.text('metricLaunchGate')} value={`${criticalChecks}/${warningChecks}`} detail={admin.text('criticalWarnings')} icon={AlertTriangle} />
              </section>

              {error && !accountErrorUserId ? <AdminInlineError error={error} onDismiss={() => setError(null)} /> : null}

              {snapshot.warnings.length ? (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  {snapshot.warnings.map((warning) => (
                    <p key={warning} className="text-sm leading-6 text-amber-800 dark:text-amber-200">{warning}</p>
                  ))}
                </section>
              ) : null}

              <main id="admin-main-content" className="min-w-0" aria-label={admin.text('adminContent')} tabIndex={-1}>
            <AnimatePresence mode="wait">
              {activeTab === 'overview' ? (
                <motion.section id="admin-panel-overview" aria-labelledby="admin-tab-overview" role="tabpanel" key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
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
                            <h2 className="text-base font-semibold text-primary">{admin.text('productionChecks')}</h2>
                            <p className="mt-1 text-sm text-secondary">{admin.text('productionChecksSubtitle')}</p>
                          </div>
                          <StatusBadge value={snapshot.degraded ? 'warn' : 'pass'} />
                        </div>
                        <ChecksPanel checks={snapshot.checks.slice(0, 5)} />
                      </div>
                      <div className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                        <h2 className="text-base font-semibold text-primary">{admin.text('planMix')}</h2>
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
                      <h2 className="text-base font-semibold text-primary">{admin.text('recommendations')}</h2>
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
                <motion.section id="admin-panel-users" aria-labelledby="admin-tab-users" role="tabpanel" key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4" role="search" aria-label={admin.text('userFilters')}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="relative flex-1">
                      <span className="sr-only">{admin.text('usersSearchLabel')}</span>
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.currentTarget.value)}
                        placeholder={admin.text('usersSearchPlaceholder')}
                        className="glass-input h-9 w-full rounded-lg pl-9 pr-8 text-xs"
                      />
                      {query ? (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-secondary hover:bg-surface-alpha hover:text-primary"
                          aria-label={admin.text('clearSearch')}
                        >
                          <X size={13} />
                        </button>
                      ) : null}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <select value={userQueueFilter} onChange={(event) => setUserQueueFilter(event.currentTarget.value as UserQueueFilter)} className="h-9 rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 text-xs font-semibold text-primary" aria-label={admin.text('queueFilterLabel')}>
                        {USER_QUEUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{admin.text(option.labelKey)}</option>)}
                      </select>
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as AccountStatus | 'all')} className="h-9 rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 text-xs font-semibold text-primary" aria-label={admin.text('statusFilterLabel')}>
                        <option value="all">{admin.text('allStatus')}</option>
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{admin.enumLabel(status)}</option>)}
                      </select>
                      <select value={planFilter} onChange={(event) => setPlanFilter(event.currentTarget.value as PlanCode | 'all')} className="h-9 rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 text-xs font-semibold text-primary" aria-label={admin.text('planFilterLabel')}>
                        <option value="all">{admin.text('allPlans')}</option>
                        {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{admin.enumLabel(plan)}</option>)}
                      </select>
                      <select value={recoveryFilter} onChange={(event) => setRecoveryFilter(event.currentTarget.value as AccountRecoveryStatus | 'all')} className="h-9 rounded-lg border border-glass bg-[var(--bg-base)] px-2.5 text-xs font-semibold text-primary" aria-label={admin.text('recoveryFilterLabel')}>
                        <option value="all">{admin.text('allRecovery')}</option>
                        {RECOVERY_OPTIONS.map((status) => <option key={status} value={status}>{admin.enumLabel(status)}</option>)}
                      </select>
                      {userFiltersActive ? (
                        <button
                          type="button"
                          onClick={resetUserFilters}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-glass bg-surface-alpha px-2.5 text-xs font-semibold text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
                        >
                          <RefreshCcw size={13} />
                          {admin.text('clearFilters')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={exportUsersCsv}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-glass bg-surface-alpha px-2.5 text-xs font-semibold text-secondary hover:bg-[var(--bg-base)] hover:text-primary"
                      >
                        <Download size={13} />
                        {admin.text('usersCsv')}
                      </button>
                    </div>
                    </div>
                    <UserQueueChips value={userQueueFilter} counts={userQueueCounts} onChange={setUserQueueFilter} />
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-alpha px-3 py-2 text-xs text-secondary" aria-live="polite" aria-atomic="true">
                      <span className="font-semibold text-primary">
                        {admin.format('userResultsSummary', { shown: admin.number(filteredUsers.length), total: admin.number(snapshot.users.length) })}
                      </span>
                      {selectedUser ? <span>{admin.format('selectedUserSummary', { name: selectedUser.name || selectedUser.email })}</span> : <span>{admin.text('selectUserHint')}</span>}
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
                          onDirtyChange={trackAccountDraftDirty}
                        />
                      ) : null}
                    </div>
                  ) : <EmptyState />}
                </motion.section>
              ) : null}

              {activeTab === 'plans' ? (
                <motion.section id="admin-panel-plans" aria-labelledby="admin-tab-plans" role="tabpanel" key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-primary">{admin.text('planCatalog')}</h2>
                      <p className="mt-1 text-sm text-secondary">{admin.text('planCatalogSubtitle')}</p>
                    </div>
                    <SlidersHorizontal size={18} className="text-blue-500" />
                  </div>
                  <BillingReadinessPanel snapshot={snapshot} />
                  <PlansPanel
                    plans={snapshot.plans}
                    busyPlanCode={busyPlanCode}
                    onPatch={(planCode, patch) => void commitPlanPatch(planCode, patch)}
                    onDirtyChange={trackPlanDraftDirty}
                  />
                </motion.section>
              ) : null}

              {activeTab === 'ai' ? (
                <motion.section id="admin-panel-ai" aria-labelledby="admin-tab-ai" role="tabpanel" key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-primary">{admin.text('aiProviderControls')}</h2>
                      <p className="mt-1 text-sm text-secondary">{admin.text('aiProviderControlsSubtitle')}</p>
                    </div>
                    <StatusBadge value={snapshot.ai.ready ? 'pass' : 'warn'} />
                  </div>
                  <AiProviderPanel
                    snapshot={snapshot}
                    busyFlagKey={busyFlagKey}
                    onPatch={handleFeatureFlagPatch}
                    aiUsageRange={aiUsageRange}
                    onApplyUsageRange={applyAiUsageRange}
                  />
                </motion.section>
              ) : null}

              {activeTab === 'maintenance' ? (
                <motion.section id="admin-panel-maintenance" aria-labelledby="admin-tab-maintenance" role="tabpanel" key="maintenance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-primary">{admin.text('maintenanceControls')}</h2>
                      <p className="mt-1 text-sm text-secondary">{admin.text('maintenanceControlsSubtitle')}</p>
                    </div>
                    <StatusBadge value={snapshot.featureFlags.some((flag) => flag.status !== 'available') ? 'warn' : 'pass'} />
                  </div>
                  <MaintenancePanel flags={snapshot.featureFlags.filter((flag) => !flag.key.startsWith('ai_provider_'))} busyFlagKey={busyFlagKey} onPatch={handleFeatureFlagPatch} />
                </motion.section>
              ) : null}

              {activeTab === 'database' ? (
                <motion.section id="admin-panel-database" aria-labelledby="admin-tab-database" role="tabpanel" key="database" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-primary">{admin.text('databaseReadiness')}</h2>
                      <p className="mt-1 text-sm text-secondary">{admin.text('databaseReadinessSubtitle')}</p>
                    </div>
                    <StatusBadge value={snapshot.dataMode} />
                  </div>
                  <CatalogDatabasePanel snapshot={snapshot} busy={busyCatalogRequest} onCreate={commitCatalogRequest} />
                  <ChecksPanel checks={snapshot.checks} />
                </motion.section>
              ) : null}

              {activeTab === 'recipes' ? (
                <motion.section id="admin-panel-recipes" aria-labelledby="admin-tab-recipes" role="tabpanel" key="recipes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-primary">{admin.text('recipeLibrary')}</h2>
                      <p className="mt-1 text-sm text-secondary">{admin.text('recipeLibrarySubtitle')}</p>
                    </div>
                    <StatusBadge value={snapshot.recipeLibrary.ready ? 'pass' : 'warn'} />
                  </div>
                  <RecipeLibraryPanel snapshot={snapshot} />
                </motion.section>
              ) : null}

              {activeTab === 'audit' ? (
                <motion.section id="admin-panel-audit" aria-labelledby="admin-tab-audit" role="tabpanel" key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-primary">{admin.text('auditTrail')}</h2>
                    <p className="mt-1 text-sm text-secondary">{admin.text('auditTrailSubtitle')}</p>
                  </div>
                  <AuditPanel audit={snapshot.audit} onExport={exportAuditCsv} />
                </motion.section>
              ) : null}

              {activeTab === 'launch' ? (
                <motion.section id="admin-panel-launch" aria-labelledby="admin-tab-launch" role="tabpanel" key="launch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-primary">{admin.text('launchGate')}</h2>
                    <p className="mt-1 text-sm text-secondary">{admin.text('launchGateSubtitle')}</p>
                  </div>
                  <LaunchPanel checklist={snapshot.launchChecklist} onCopySummary={copyLaunchSummary} />
                </motion.section>
              ) : null}
            </AnimatePresence>
            </main>
          </>
        ) : null}
      </div>
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
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
    </AdminCopyContext.Provider>
  );
}
