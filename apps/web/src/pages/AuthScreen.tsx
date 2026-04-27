import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Coffee,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useAuthModal } from '../context/AuthModalContext';
import { useGlobalState } from '../context/GlobalState';
import { AppIconBrand, GoogleMark } from '../components/icons';

interface AuthScreenProps {
  intent?: 'signIn' | 'signUp';
  onLogin: () => void;
}

export function AuthScreen({ intent = 'signIn', onLogin }: AuthScreenProps) {
  const { t } = useGlobalState();
  const { isAuthenticated, authBusy, authError, isOffline, startGoogleAuth, continueAsGuest } = useAuthModal();
  const [success, setSuccess] = useState('');
  const isSignUp = intent === 'signUp';
  const authTitle = isSignUp ? t.authRouteSignupTitle : t.authRouteSigninTitle;
  const authSubtitle = isSignUp ? t.authRouteSignupSubtitle : t.authRouteSigninSubtitle;
  const onboardingSteps = [
    {
      title: t.authRouteStepGoogleTitle,
      body: t.authRouteStepGoogleBody,
    },
    {
      title: t.authRouteStepGuestTitle,
      body: t.authRouteStepGuestBody,
    },
    {
      title: t.authRouteStepPlanTitle,
      body: t.authRouteStepPlanBody,
    },
  ];
  const trustPoints = [
    { icon: UserRound, label: t.authRouteTrustGuest },
    { icon: ShieldCheck, label: t.authRouteTrustGoogle },
    { icon: WalletCards, label: t.authRouteTrustUpgrade },
  ];

  useEffect(() => {
    if (!isAuthenticated) return;
    setSuccess(t.authSignedInSuccess);
    const timeout = window.setTimeout(() => onLogin(), 300);
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, onLogin, t.authSignedInSuccess]);

  return (
    <div
      className="flex items-center justify-center p-4 sm:p-6"
      style={{
        minHeight: 'var(--app-vh)',
        paddingTop: 'max(1rem, calc(var(--safe-top, 0px) + 0.5rem))',
        paddingBottom: 'max(1rem, calc(var(--bottom-safe-capped, 0px) + 0.5rem))',
        paddingLeft: 'max(1rem, var(--safe-left, 0px))',
        paddingRight: 'max(1rem, var(--safe-right, 0px))',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-5xl"
      >
        <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr] lg:items-stretch">
          <section className="order-2 rounded-[2rem] border border-glass bg-[var(--bg-elevated)]/72 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/[0.04] sm:p-7 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-200">
              <Coffee size={14} />
              {t.authRouteEyebrow}
            </div>
            <h2 className="mt-5 max-w-xl text-2xl font-bold leading-tight tracking-tight text-primary sm:text-3xl">
              {t.authRouteValueTitle}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-secondary sm:text-base">
              {t.authRouteValueBody}
            </p>

            <div className="mt-6 space-y-3">
              {onboardingSteps.map((step, index) => (
                <div key={step.title} className="grid grid-cols-[2.35rem_minmax(0,1fr)] gap-3 rounded-3xl border border-glass bg-surface-alpha px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-sm font-bold text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-200">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary">{step.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-secondary">{step.body}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-primary">{t.authRoutePlanTeaserTitle}</h3>
                  <p className="mt-1 text-sm leading-5 text-secondary">{t.authRoutePlanTeaserBody}</p>
                </div>
                <Sparkles className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={19} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-glass bg-[var(--bg-base)]/76 p-4">
                  <span className="text-sm font-semibold text-primary">{t.authRouteFreePlanTitle}</span>
                  <span className="mt-2 block text-xs leading-5 text-secondary">{t.authRouteFreePlanBody}</span>
                </div>
                <div className="rounded-2xl border border-blue-500/24 bg-blue-500/10 p-4">
                  <span className="text-sm font-semibold text-primary">{t.authRouteProPlanTitle}</span>
                  <span className="mt-2 block text-xs leading-5 text-secondary">{t.authRouteProPlanBody}</span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-secondary">{t.authRoutePlanNote}</p>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div className="mb-5 text-center lg:text-left">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-black/[0.06] bg-white/85 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:border-blue-300/20 dark:bg-gradient-to-br dark:from-blue-500 dark:to-indigo-600 dark:shadow-[0_8px_32px_rgba(0,122,255,0.3)] lg:mx-0"
              >
                <AppIconBrand className="h-12 w-12 object-contain" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                {authTitle}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-base leading-6 text-secondary lg:mx-0">
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
                  <AlertCircle className="shrink-0 text-red-500" size={18} />
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
                  <CheckCircle className="shrink-0 text-emerald-500" size={18} />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass-card p-5 sm:p-7">
              {isOffline ? (
                <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/12 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                  {t.authModalOffline}
                </div>
              ) : null}
              <button
                onClick={() => void startGoogleAuth()}
                disabled={authBusy || isOffline}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {authBusy ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {t.opening}
                  </>
                ) : (
                  <>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                      <GoogleMark className="h-4 w-4" />
                    </span>
                    {t.continueWithGoogle}
                    <ArrowRight className="hidden sm:block" size={18} />
                  </>
                )}
              </button>
              <button
                onClick={() => void continueAsGuest()}
                disabled={authBusy}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-6 py-4 text-base font-semibold text-primary transition-all hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {authBusy ? <Loader2 className="animate-spin" size={20} /> : <UserRound size={20} />}
                {authBusy ? t.authGuestStarting : t.continueAsGuest}
              </button>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {trustPoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-glass bg-[var(--bg-base)]/66 px-3 py-2 text-center text-xs font-semibold text-secondary">
                    <Icon size={15} className="shrink-0 text-blue-600 dark:text-blue-300" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <Link
                to={isSignUp ? '/masuk' : '/daftar'}
                className="mt-5 flex items-center justify-center gap-2 text-center text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
              >
                {isSignUp ? t.authRouteSwitchToSignin : t.authRouteSwitchToSignup}
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}

