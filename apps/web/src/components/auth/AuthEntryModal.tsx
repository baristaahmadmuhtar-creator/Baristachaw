import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Info, Loader2, LogIn, X } from 'lucide-react';
import { useAuthModal } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import { getLanguageDirection } from '../../constants';

function resolveSourceLabel(source: string, t: Record<string, string>) {
  const sourceLabelMap: Record<string, string> = {
    home_search: t.authSourceHomeSearch,
    ai_brew: t.authSourceAiBrew,
    chat_send: t.authSourceChat,
    chat_image_generation: t.authSourceImageGeneration,
    scanner: t.authSourceScanner,
    auth_screen: t.authSourceAuthentication,
    general: t.authSourceGeneral,
  };
  return sourceLabelMap[source] || sourceLabelMap.general;
}

function AppleMark({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M16.365 12.248c.02 2.106 1.85 2.808 1.87 2.817-.016.05-.292 1.001-.964 1.983-.581.848-1.184 1.692-2.135 1.711-.934.017-1.234-.554-2.304-.554-1.071 0-1.405.537-2.286.571-.918.035-1.619-.919-2.205-1.764-1.197-1.729-2.111-4.883-.884-7.016.61-1.061 1.701-1.732 2.885-1.749.9-.018 1.75.605 2.304.605.554 0 1.595-.748 2.688-.638.458.02 1.744.185 2.567 1.389-.066.041-1.533.896-1.536 2.645Zm-1.987-4.69c.487-.59.816-1.409.726-2.226-.702.029-1.552.467-2.056 1.057-.451.52-.845 1.352-.738 2.147.783.061 1.582-.397 2.068-.978Z" />
    </svg>
  );
}

export function AuthEntryModal() {
  const { t, language } = useGlobalState();
  const {
    isOpen,
    source,
    authBusy,
    authError,
    isOffline,
    closeAuthModal,
    clearAuthError,
    startGoogleAuth,
  } = useAuthModal();
  const direction = getLanguageDirection(language);
  const isRtl = direction === 'rtl';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm"
            onClick={closeAuthModal}
          />
          <div
            className="fixed inset-0 z-[121] flex items-center justify-center pointer-events-none"
            style={{
              paddingTop: 'max(16px, var(--safe-top, 0px))',
              paddingBottom: 'max(16px, var(--bottom-safe-capped, 0px))',
              paddingLeft: 'max(16px, var(--safe-left, 0px))',
              paddingRight: 'max(16px, var(--safe-right, 0px))',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              dir={direction}
              className={`pointer-events-auto w-full max-w-md rounded-[1.8rem] border border-glass bg-[var(--bg-base)]/96 p-5 shadow-[0_18px_46px_rgba(0,0,0,0.24)] ${isRtl ? 'text-right' : 'text-left'}`}
              role="dialog"
              aria-modal="true"
              aria-label={t.signIn}
            >
              <div className={`flex items-start justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <h2 className="text-lg font-semibold text-primary">{t.authModalTitle}</h2>
                  <p className="mt-1 text-sm text-secondary">
                    {t.authModalBody.replace('{source}', resolveSourceLabel(source, t))}
                  </p>
                </div>
                <button
                  onClick={closeAuthModal}
                  className="rounded-full p-2 text-secondary hover:bg-surface-alpha hover:text-primary"
                  aria-label={t.authModalClose}
                >
                  <X size={16} />
                </button>
              </div>

              {isOffline && (
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/12 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  {t.authModalOffline}
                </div>
              )}

              {authError && (
                <div className={`mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{authError}</span>
                  <button
                    onClick={clearAuthError}
                    className="rounded-full p-1 text-red-500/90 hover:bg-red-500/10"
                    aria-label={t.authModalDismissError}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => void startGoogleAuth()}
                  disabled={authBusy || isOffline}
                  className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500/90 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="flex items-center justify-center gap-2">
                    {authBusy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                    {authBusy ? t.opening : t.continueWithGoogle}
                  </span>
                </button>

                <div className="rounded-2xl border border-glass bg-surface-alpha px-4 py-3 text-sm text-secondary">
                  <span className={`flex items-start gap-2 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                    <Info size={15} className="mt-0.5 shrink-0" />
                    <span className="flex-1">
                      <span className={`flex items-center gap-2 font-medium text-primary ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                        <AppleMark />
                        {t.authModalAppleSoon}
                      </span>
                      <span className="mt-1 block text-xs text-secondary">
                        {t.authModalAppleBody}
                      </span>
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
