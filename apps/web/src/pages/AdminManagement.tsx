import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  ListChecks,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  WalletCards,
  Wrench,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthModal } from '../context/AuthModalContext';
import {
  AdminApiError,
  fetchAdminSnapshot,
  updateAdminUser,
  updateFeatureFlag,
  type AccountStatus,
  type AdminFeatureFlag,
  type AdminPlan,
  type AdminRole,
  type AdminSnapshot,
  type AdminSystemCheck,
  type AdminUserRecord,
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

const TAB_IDS = new Set<string>(TABS.map((tab) => tab.id));
const ROLE_OPTIONS: AdminRole[] = ['owner', 'admin', 'support', 'analyst', 'user'];
const STATUS_OPTIONS: AccountStatus[] = ['active', 'trialing', 'past_due', 'suspended', 'deleted'];
const PLAN_OPTIONS: PlanCode[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
const FEATURE_STATUS_OPTIONS: FeatureFlagStatus[] = ['available', 'maintenance', 'disabled'];
const FEATURE_SURFACE_OPTIONS: FeatureSurface[] = ['global', 'web', 'pwa', 'mobile', 'admin'];

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

function statusTone(status: string): string {
  if (status === 'pass' || status === 'active') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'warn' || status === 'trialing' || status === 'past_due') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (status === 'fail' || status === 'suspended' || status === 'deleted') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  if (status === 'supabase') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
  return 'bg-surface-alpha text-secondary';
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

function UsersTable({
  users,
  plans,
  busyUserId,
  onPatch,
}: {
  users: AdminUserRecord[];
  plans: AdminPlan[];
  busyUserId: string | null;
  onPatch: (userId: string, patch: { role?: AdminRole; status?: AccountStatus; planCode?: PlanCode }) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-glass bg-surface-alpha">
      <div className="overflow-x-auto">
        <table className="min-w-[64rem] w-full border-collapse text-left">
          <thead className="border-b border-glass text-[11px] uppercase tracking-[0.14em] text-tertiary">
            <tr>
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Usage today</th>
              <th className="px-4 py-3 font-semibold">Risk</th>
              <th className="px-4 py-3 font-semibold">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-glass last:border-b-0">
                <td className="px-4 py-4 align-top">
                  <div className="flex min-w-0 items-center gap-3">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-600">
                        {user.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-primary">{user.name}</p>
                        {user.isSample ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">preview</span> : null}
                      </div>
                      <p className="truncate text-xs text-secondary">{user.email}</p>
                      <p className="mt-1 text-[11px] text-tertiary">{user.platform || 'unknown'} / {user.locale || 'locale n/a'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <select
                    value={user.status}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { status: event.currentTarget.value as AccountStatus })}
                    className="w-32 rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary"
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
                    className="w-32 rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary"
                    aria-label={`Change plan for ${user.email}`}
                  >
                    {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4 align-top">
                  <select
                    value={user.role}
                    disabled={busyUserId === user.id}
                    onChange={(event) => onPatch(user.id, { role: event.currentTarget.value as AdminRole })}
                    className="w-32 rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary"
                    aria-label={`Change role for ${user.email}`}
                  >
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
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
  onPatch: (key: string, patch: { status?: FeatureFlagStatus; message?: string; surfaces?: FeatureSurface[] }) => void;
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<PlanCode | 'all'>('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyFlagKey, setBusyFlagKey] = useState<string | null>(null);
  const [toast, setToast] = useState('');

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
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      else setError(new AdminApiError('Failed to load admin snapshot.', { status: 0 }));
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

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (snapshot?.users || []).filter((user) => {
      const matchesQuery = !normalizedQuery
        || user.email.toLowerCase().includes(normalizedQuery)
        || user.name.toLowerCase().includes(normalizedQuery)
        || user.id.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesPlan = planFilter === 'all' || user.planCode === planFilter;
      return matchesQuery && matchesStatus && matchesPlan;
    });
  }, [planFilter, query, snapshot?.users, statusFilter]);

  const blockingError = error && (error.status === 401 || error.status === 403) ? error : null;

  const handleSignIn = () => {
    openAuthModal({ source: 'general' });
    void refreshAuthState({ silent: true });
  };

  const handleUserPatch = async (userId: string, patch: { role?: AdminRole; status?: AccountStatus; planCode?: PlanCode }) => {
    setBusyUserId(userId);
    try {
      const next = await updateAdminUser(userId, patch);
      setSnapshot(next);
      setError(null);
      setToast('Admin change saved');
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      setToast('Admin change failed');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleFeatureFlagPatch = async (
    key: string,
    patch: { status?: FeatureFlagStatus; message?: string; surfaces?: FeatureSurface[] },
  ) => {
    setBusyFlagKey(key);
    try {
      const next = await updateFeatureFlag(key, patch);
      setSnapshot(next);
      setError(null);
      setToast('Maintenance control saved');
    } catch (err) {
      if (err instanceof AdminApiError) setError(err);
      setToast('Maintenance control failed');
    } finally {
      setBusyFlagKey(null);
    }
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

            {snapshot.warnings.length ? (
              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                {snapshot.warnings.map((warning) => (
                  <p key={warning} className="text-sm leading-6 text-amber-800 dark:text-amber-200">{warning}</p>
                ))}
              </section>
            ) : null}

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
                <motion.section key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
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
                        placeholder="Search name, email, or user id"
                        className="glass-input min-h-11 w-full rounded-xl pl-9 pr-3 text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as AccountStatus | 'all')} className="min-h-11 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                        <option value="all">All status</option>
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <select value={planFilter} onChange={(event) => setPlanFilter(event.currentTarget.value as PlanCode | 'all')} className="min-h-11 rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm text-primary">
                        <option value="all">All plans</option>
                        {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                    </div>
                  </div>
                  {filteredUsers.length ? (
                    <UsersTable users={filteredUsers} plans={snapshot.plans} busyUserId={busyUserId} onPatch={handleUserPatch} />
                  ) : <EmptyState />}
                </motion.section>
              ) : null}

              {activeTab === 'plans' ? (
                <motion.section key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/76 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-primary">Plan catalog</h2>
                      <p className="mt-1 text-sm text-secondary">Commercial tiers, quota ceilings, storage, seats, and active user count.</p>
                    </div>
                    <SlidersHorizontal size={18} className="text-blue-500" />
                  </div>
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
