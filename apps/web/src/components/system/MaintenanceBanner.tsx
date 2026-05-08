import { AnimatePresence, motion } from 'motion/react';
import { X, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccountStatus } from '../../context/AccountStatusContext';
import { useGlobalState } from '../../context/GlobalState';

export function MaintenanceBanner() {
  const location = useLocation();
  const { t } = useGlobalState();
  const { snapshot, maintenance } = useAccountStatus();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldShow = !isAdminRoute && snapshot && (snapshot.appAccess.status !== 'ok' || maintenance.length > 0);
  const noticeKey = useMemo(() => [
    snapshot?.appAccess.status || 'ok',
    snapshot?.appAccess.message || '',
    ...maintenance.map((flag) => `${flag.key}:${flag.status}:${flag.message || ''}`),
  ].join('|'), [maintenance, snapshot?.appAccess.message, snapshot?.appAccess.status]);
  const [minimizedKey, setMinimizedKey] = useState('');
  const minimized = Boolean(shouldShow && noticeKey && minimizedKey === noticeKey);

  const primaryFlag = maintenance[0];
  const message = snapshot?.appAccess.message
    || primaryFlag?.message
    || (primaryFlag ? t.homeFeatureUnavailableMessage.replace('{feature}', primaryFlag.label).replace('{status}', primaryFlag.status) : '');
  const statusLabel = snapshot?.appAccess.status === 'blocked'
    ? t.homeWorkspaceBlocked
    : primaryFlag?.status === 'disabled'
      ? t.homeFeatureUnavailable
      : t.homeFeatureMaintenance;

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
          <Wrench size={13} className="shrink-0" />
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
            <Wrench size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{statusLabel}</p>
              {message ? <p className="mt-0.5 line-clamp-2 leading-5">{message}</p> : null}
              {maintenance.length > 1 ? <p className="mt-0.5 text-xs opacity-80">{t.homeActiveOperationalFlags.replace('{count}', String(maintenance.length))}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="pointer-events-auto absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={() => setMinimizedKey(noticeKey)}
            aria-label="Minimize maintenance notice"
          >
            <X size={14} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
