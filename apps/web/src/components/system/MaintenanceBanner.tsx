import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CreditCard, ShieldCheck, Wrench, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccountStatus } from '../../context/AccountStatusContext';
import { useGlobalState } from '../../context/GlobalState';
import { getLanguageLocale } from '../../constants';
import { resolveWorkspaceStatus } from '../../utils/workspaceStatus';

function localizeRuntimeMaintenanceMessage(message: string, language: string) {
  if (!message || language !== 'id') return message;

  if (/paid plan is waiting for admin billing verification/i.test(message)) {
    return 'Paket berbayar Anda masih menunggu verifikasi billing admin. Hubungi support sebelum mengandalkan limit berbayar.';
  }

  return message;
}

export function MaintenanceBanner() {
  const location = useLocation();
  const { language, t } = useGlobalState();
  const { snapshot, maintenance, loading, error } = useAccountStatus();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const status = useMemo(() => resolveWorkspaceStatus({
    snapshot,
    loading,
    error: error?.message || '',
    maintenance,
    language,
    locale: getLanguageLocale(language),
  }), [error, language, loading, maintenance, snapshot]);
  const shouldShow = !isAdminRoute && Boolean(snapshot || error) && status.shouldFloat;
  const noticeKey = useMemo(() => [
    status.kind,
    status.label,
    status.message,
    snapshot?.billing.currentPeriodEnd || '',
    ...maintenance.map((flag) => `${flag.key}:${flag.status}:${flag.message || ''}`),
  ].join('|'), [maintenance, snapshot?.billing.currentPeriodEnd, status.kind, status.label, status.message]);
  const [minimizedKey, setMinimizedKey] = useState('');
  const minimized = Boolean(shouldShow && noticeKey && minimizedKey === noticeKey);
  const message = localizeRuntimeMaintenanceMessage(status.message, language);
  const statusLabel = status.label;
  const StatusIcon = status.kind === 'maintenance'
    ? Wrench
    : status.kind === 'blocked' || status.kind === 'past_due' || status.kind === 'inactive'
      ? AlertTriangle
      : status.kind === 'pending_review' || status.kind === 'expiring'
        ? CreditCard
        : ShieldCheck;

  return (
    <AnimatePresence>
      {minimized ? (
        <motion.button
          type="button"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          onClick={() => setMinimizedKey('')}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-3 z-[70] inline-flex max-w-[72vw] items-center gap-2 rounded-full border border-blue-200/30 bg-slate-950/92 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.20)] backdrop-blur lg:bottom-auto lg:right-4 lg:top-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
          aria-label={statusLabel}
        >
          <StatusIcon size={13} className="shrink-0" />
          <span className="truncate">{statusLabel}</span>
        </motion.button>
      ) : null}
      {shouldShow ? (
        <motion.div
          initial={{ y: -16 }}
          animate={{ y: 0 }}
          exit={{ y: -12 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className={`${minimized ? 'hidden' : 'block'} pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] left-3 right-3 z-[70] rounded-2xl border border-blue-200/30 bg-slate-950/92 px-3.5 py-2.5 text-sm text-white shadow-[0_10px_24px_rgba(0,0,0,0.20)] backdrop-blur dark:border-blue-300/20 lg:bottom-auto lg:left-[calc(var(--desktop-rail-current-width,var(--desktop-rail-width-expanded))+1rem)] lg:right-4 lg:top-[calc(env(safe-area-inset-top,0px)+0.75rem)] lg:max-w-3xl`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2 pr-8">
            <StatusIcon size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{status.title}</p>
              {message ? <p className="mt-0.5 line-clamp-2 leading-5">{message}</p> : null}
              {status.helper ? <p className="mt-0.5 text-xs opacity-80">{status.helper}</p> : null}
              {maintenance.length > 1 && status.kind === 'maintenance' ? <p className="mt-0.5 text-xs opacity-80">{t.homeActiveOperationalFlags.replace('{count}', String(maintenance.length))}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="pointer-events-auto absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={() => setMinimizedKey(noticeKey)}
            aria-label={language === 'id' ? 'Minimalkan pemberitahuan pemeliharaan' : 'Minimize maintenance notice'}
          >
            <X size={14} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
