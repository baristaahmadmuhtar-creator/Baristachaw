import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuthModal } from '../context/AuthModalContext';
import { useGlobalState } from '../context/GlobalState';
import { EmailPasswordAuthForm } from '../components/auth/EmailPasswordAuthForm';
import { AuthProgressMark } from '../components/auth/AuthProgressMark';
import {
  AlertCircle,
  AppIconBrand,
  ArrowRight,
  CheckCircle,
  FacebookMark,
  GoogleMark,
  UserRound,
} from '../components/icons';

interface AuthScreenProps {
  intent?: 'signIn' | 'signUp';
  onLogin: () => void;
}

type AuthScreenAction = 'google' | 'facebook' | 'guest';

export function AuthScreen({ intent = 'signIn', onLogin }: AuthScreenProps) {
  const { t } = useGlobalState();
  const { isAuthenticated, authBusy, authError, isOffline, startGoogleAuth, startFacebookAuth, continueAsGuest } = useAuthModal();
  const [success, setSuccess] = useState('');
  const [activeAction, setActiveAction] = useState<AuthScreenAction | null>(null);
  const authBusyRef = useRef(authBusy);
  const authWasBusyRef = useRef(false);
  const isSignUp = intent === 'signUp';
  const authTitle = isSignUp ? t.authRouteSignupTitle : t.authRouteSigninTitle;
  const authSubtitle = isSignUp ? t.authRouteSignupSubtitle : t.authRouteSigninSubtitle;
  const isAuthActionPending = activeAction !== null || authBusy;
  const isGoogleBusy = activeAction === 'google';
  const isFacebookBusy = activeAction === 'facebook';
  const isGuestBusy = activeAction === 'guest';

  const startAuthAction = async (action: AuthScreenAction, handler: () => Promise<void>) => {
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
    if (!isAuthenticated) return;
    setSuccess(t.authSignedInSuccess);
    const timeout = window.setTimeout(() => onLogin(), 300);
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, onLogin, t.authSignedInSuccess]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('confirmed') !== '1') return;
      setSuccess(t.authEmailConfirmedBody);
      url.searchParams.delete('confirmed');
      window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Non-blocking browser-only notice.
    }
  }, [t.authEmailConfirmedBody]);

  return (
    <div
      className="flex items-center justify-center overflow-x-hidden p-4 sm:p-6"
      style={{
        minHeight: 'var(--app-vh)',
        paddingTop: 'max(0.75rem, calc(var(--safe-top, 0px) + 0.5rem))',
        paddingBottom: 'max(0.75rem, calc(var(--safe-ui-bottom, var(--safe-bottom, 0px)) + 0.5rem))',
        paddingLeft: 'max(1rem, var(--safe-left, 0px))',
        paddingRight: 'max(1rem, var(--safe-right, 0px))',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[28rem]"
      >
        <section>
            <div className="mb-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="auth-brand-tile mx-auto mb-4"
              >
                <AppIconBrand className="auth-brand-image" />
              </motion.div>
              <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                {authTitle}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-secondary sm:text-base">
                {authSubtitle}
              </p>
            </div>

            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
                >
                  <AlertCircle className="shrink-0" size={18} variant="glyph" tone="amber" />
                  <span className="text-sm text-red-600 dark:text-red-400">{authError}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                >
                  <CheckCircle className="shrink-0" size={18} variant="glyph" tone="green" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="auth-card-surface rounded-[2rem] p-4 sm:p-6">
              {isOffline ? (
                <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/12 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                  {t.authModalOffline}
                </div>
              ) : null}
              <button
                onClick={() => void startAuthAction('google', startGoogleAuth)}
                disabled={isAuthActionPending || isOffline}
                className="auth-action-primary flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isGoogleBusy ? (
                  <>
                    <AuthProgressMark />
                    {t.opening}
                  </>
                ) : (
                  <>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                      <GoogleMark className="h-4 w-4" />
                    </span>
                    {t.continueWithGoogle}
                    <ArrowRight className="hidden sm:block" size={18} variant="glyph" tone="neutral" style={{ '--icon-glyph-color': 'currentColor' } as CSSProperties} />
                  </>
                )}
              </button>

              <button
                onClick={() => void startAuthAction('facebook', startFacebookAuth)}
                disabled={isAuthActionPending || isOffline}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-5 py-3.5 text-base font-semibold text-primary transition-all hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-55 focus-soft"
              >
                {isFacebookBusy ? (
                  <>
                    <AuthProgressMark />
                    {t.opening}
                  </>
                ) : (
                  <>
                    <FacebookMark className="h-6 w-6 shrink-0" />
                    {t.continueWithFacebook}
                    <ArrowRight className="hidden sm:block" size={18} variant="glyph" tone="neutral" style={{ '--icon-glyph-color': 'currentColor' } as CSSProperties} />
                  </>
                )}
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--glass-border)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{t.authUseEmailDivider}</span>
                <span className="h-px flex-1 bg-[var(--glass-border)]" />
              </div>

              <EmailPasswordAuthForm initialMode={intent} />

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--glass-border)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{t.authGuestDivider}</span>
                <span className="h-px flex-1 bg-[var(--glass-border)]" />
              </div>

              <button
                onClick={() => void startAuthAction('guest', continueAsGuest)}
                disabled={isAuthActionPending}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-5 py-3.5 text-base font-semibold text-primary transition-all hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-55 focus-soft"
              >
                {isGuestBusy ? <AuthProgressMark /> : <UserRound size={20} variant="glyph" tone="ice" />}
                {isGuestBusy ? t.authGuestStarting : t.continueAsGuest}
              </button>

              <Link
                to={isSignUp ? '/masuk' : '/daftar'}
                className="mt-4 flex items-center justify-center gap-2 text-center text-sm font-semibold text-[var(--auth-accent)] hover:text-[var(--auth-accent-pressed)]"
              >
                {isSignUp ? t.authRouteSwitchToSignin : t.authRouteSwitchToSignup}
                <ArrowRight size={15} variant="glyph" tone="blue" />
              </Link>
            </div>
          </section>
      </motion.div>
    </div>
  );
}

