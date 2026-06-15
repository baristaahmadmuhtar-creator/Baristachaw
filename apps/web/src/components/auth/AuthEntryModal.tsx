import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { useAuthModal } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import { CustomSelect } from '../ui/CustomSelect';
import { getLanguageDirection } from '../../constants';
import { modalExitTransition, modalSpringTransition, overlayFadeTransition } from '../../utils/motionPresets';
import { EmailPasswordAuthForm } from './EmailPasswordAuthForm';
import { AuthProgressMark } from './AuthProgressMark';
import { AlertCircle, FacebookMark, GoogleMark, ShieldCheck, Sparkles, WalletCards, X } from '../icons';

function resolveSourceLabel(source: string, t: Record<string, string>) {
  if (/^ai_brew(?:_|$)/i.test(source)) return t.authSourceAiBrew;
  if (/^chat(?:_|$)/i.test(source)) return t.authSourceChat;
  const sourceLabelMap: Record<string, string> = {
    home_search: t.authSourceHomeSearch,
    ai_brew: t.authSourceAiBrew,
    chat_send: t.authSourceChat,
    chat_image_generation: t.authSourceImageGeneration,
    scanner: t.authSourceScanner,
    auth_screen: t.authSourceAuthentication,
    registration: t.authSourceRegistration,
    general: t.authSourceGeneral,
  };
  return sourceLabelMap[source] || sourceLabelMap.general;
}

type AuthModalAction = 'google' | 'facebook';

export function AuthEntryModal() {
  const { t, language, setLanguage, region, setRegion } = useGlobalState();
  const {
    isOpen,
    source,
    authBusy,
    authError,
    isOffline,
    closeAuthModal,
    clearAuthError,
    startGoogleAuth,
    startFacebookAuth,
  } = useAuthModal();
  const direction = getLanguageDirection(language);
  const isRtl = direction === 'rtl';
  const titleId = useId();
  const bodyId = useId();
  const googleButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const authBusyRef = useRef(authBusy);
  const authWasBusyRef = useRef(false);
  const [activeAction, setActiveAction] = useState<AuthModalAction | null>(null);
  const isAuthActionPending = activeAction !== null || authBusy;
  const isGoogleBusy = activeAction === 'google';
  const isFacebookBusy = activeAction === 'facebook';
  const benefits = [
    { icon: Sparkles, label: t.authModalBenefitGuest },
    { icon: ShieldCheck, label: t.authModalBenefitSync },
    { icon: WalletCards, label: t.authModalBenefitUpgrade },
  ];

  const startAuthAction = async (action: AuthModalAction, handler: () => Promise<void>) => {
    if (isAuthActionPending) return;
    setActiveAction(action);
    try {
      await handler();
      if (!authBusyRef.current) setActiveAction(null);
    } catch {
      setActiveAction(null);
    }
  };

  useEffect(() => {
    authBusyRef.current = authBusy;
    if (authBusy) {
      authWasBusyRef.current = true;
      return;
    }
    if (!authWasBusyRef.current) return;
    authWasBusyRef.current = false;
    setActiveAction(null);
  }, [authBusy]);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => {
      if (isOffline) closeButtonRef.current?.focus();
      else googleButtonRef.current?.focus();
    }, 60);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAuthActionPending) {
        event.preventDefault();
        closeAuthModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeAuthModal, isAuthActionPending, isOffline, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayFadeTransition}
            className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!isAuthActionPending) closeAuthModal();
            }}
          />
          <div
            className="fixed inset-0 z-[121] flex items-center justify-center pointer-events-none"
            style={{
              paddingTop: 'max(16px, var(--safe-top, 0px))',
              paddingBottom: 'max(16px, var(--safe-ui-bottom, var(--safe-bottom, 0px)))',
              paddingLeft: 'max(16px, var(--safe-left, 0px))',
              paddingRight: 'max(16px, var(--safe-right, 0px))',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={isOpen ? modalSpringTransition : modalExitTransition}
              dir={direction}
              className={`auth-card-surface motion-safe-surface pointer-events-auto max-h-[calc(var(--app-vh)-2rem)] w-full max-w-md overflow-y-auto rounded-[1.8rem] p-5 ${isRtl ? 'text-right' : 'text-left'}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={bodyId}
            >
              <div className={`flex items-start justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <h2 id={titleId} className="text-lg font-semibold text-primary">{t.authModalTitle}</h2>
                  <p id={bodyId} className="mt-1 text-sm text-secondary">
                    {t.authModalBody.replace('{source}', resolveSourceLabel(source, t))}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeAuthModal}
                  disabled={isAuthActionPending}
                  className="rounded-full p-2 text-secondary hover:bg-surface-alpha hover:text-primary"
                  aria-label={t.authModalClose}
                >
                  <X size={16} variant="glyph" tone="neutral" />
                </button>
              </div>

              {isOffline && (
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/12 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  {t.authModalOffline}
                </div>
              )}

              {authError && (
                <div className={`mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" variant="glyph" tone="amber" />
                  <span className="flex-1">{authError}</span>
                  <button
                    type="button"
                    onClick={clearAuthError}
                    className="rounded-full p-1 text-red-500/90 hover:bg-red-500/10"
                    aria-label={t.authModalDismissError}
                  >
                    <X size={12} variant="glyph" tone="neutral" />
                  </button>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <div className="mb-2 flex flex-col sm:flex-row gap-3 rounded-xl border border-glass bg-[var(--bg-base)]/72 p-3" data-testid="auth-language-step">
                  <div className="flex-1 relative">
                    <label htmlFor="modal-language-select" className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
                      {t.authRouteLanguageTitle || 'Language'}
                    </label>
                    <div className="relative">
                      <CustomSelect
                        id="modal-language-select"
                        value={language}
                        onChange={setLanguage}
                        options={[
                          { value: 'en', label: 'English' },
                          { value: 'id', label: 'Indonesia' }
                        ]}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 relative">
                    <label htmlFor="modal-region-select" className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
                      {language === 'id' ? 'Negara' : 'Country'}
                    </label>
                    <div className="relative">
                      <CustomSelect
                        id="modal-region-select"
                        value={region}
                        onChange={(val) => setRegion(val as any)}
                        options={[
                          { value: 'id', label: 'Indonesia' },
                          { value: 'bn', label: 'Brunei' },
                          { value: 'my', label: 'Malaysia' },
                          { value: 'sg', label: 'Singapore' },
                          { value: 'au', label: 'Australia' },
                          { value: 'eu', label: 'Europe' },
                          { value: 'us', label: 'United States' },
                          { value: 'global', label: 'Global' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <EmailPasswordAuthForm compact initialMode={source === 'registration' ? 'signUp' : 'signIn'} />

                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-[var(--glass-border)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    {language === 'id' ? 'atau masuk dengan' : 'or continue with'}
                  </span>
                  <span className="h-px flex-1 bg-[var(--glass-border)]" />
                </div>

                <button
                  ref={googleButtonRef}
                  type="button"
                  onClick={() => void startAuthAction('google', startGoogleAuth)}
                  disabled={isAuthActionPending || isOffline}
                  className="auth-action-primary motion-pressable w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isGoogleBusy ? (
                      <AuthProgressMark />
                    ) : (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                        <GoogleMark className="h-4 w-4" />
                      </span>
                    )}
                    {isGoogleBusy ? t.opening : t.continueWithGoogle}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void startAuthAction('facebook', startFacebookAuth)}
                  disabled={isAuthActionPending || isOffline}
                  className="motion-pressable w-full rounded-2xl border border-glass bg-surface-alpha px-4 py-3 text-sm font-semibold text-primary transition-all hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isFacebookBusy ? (
                      <AuthProgressMark />
                    ) : (
                      <FacebookMark className="h-6 w-6 shrink-0" />
                    )}
                    {isFacebookBusy ? t.opening : t.continueWithFacebook}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={closeAuthModal}
                  disabled={isAuthActionPending}
                  className="mt-2 w-full rounded-2xl border border-glass bg-surface-alpha px-4 py-3 text-sm font-semibold text-secondary hover:text-primary transition-all disabled:opacity-55 text-center hover:bg-[var(--bg-elevated)]"
                >
                  {t.cancel || 'Batal'}
                </button>

                <div className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-secondary ${isRtl ? 'text-right' : ''}`}>
                  <span className={`flex items-start gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Sparkles size={16} className="mt-0.5 shrink-0" variant="glyph" tone="green" />
                    <span>{t.authRoutePlanNote}</span>
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
