import { AnimatePresence, motion } from 'motion/react';
import { Wrench } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAccountStatus } from '../../context/AccountStatusContext';
import { useGlobalState } from '../../context/GlobalState';

export function MaintenanceBanner() {
  const location = useLocation();
  const { t } = useGlobalState();
  const { snapshot, maintenance } = useAccountStatus();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldShow = !isAdminRoute && snapshot && (snapshot.appAccess.status !== 'ok' || maintenance.length > 0);

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
      {shouldShow ? (
        <motion.div
          initial={{ y: -16 }}
          animate={{ y: 0 }}
          exit={{ y: -12 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="pointer-events-none fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-[89] rounded-2xl border border-blue-200/30 bg-slate-950/95 px-4 py-2.5 text-sm text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur dark:border-blue-300/20"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <Wrench size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{statusLabel}</p>
              {message ? <p className="mt-0.5 leading-5">{message}</p> : null}
              {maintenance.length > 1 ? <p className="mt-0.5 text-xs opacity-80">{t.homeActiveOperationalFlags.replace('{count}', String(maintenance.length))}</p> : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
