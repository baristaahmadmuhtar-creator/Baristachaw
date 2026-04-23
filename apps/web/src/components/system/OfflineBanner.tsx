import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useGlobalState } from '../../context/GlobalState';

export function OfflineBanner() {
  const { t } = useGlobalState();
  const { isOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[90] rounded-2xl border border-amber-500/25 bg-amber-500/12 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="shrink-0" />
            <span>{t.offlineBanner}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
