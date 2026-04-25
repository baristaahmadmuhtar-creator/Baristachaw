import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Info, Loader2, CheckCircle, AlertCircle, UserRound } from 'lucide-react';
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
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-black/[0.06] bg-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:border-blue-300/20 dark:bg-gradient-to-br dark:from-blue-500 dark:to-indigo-600 dark:shadow-[0_8px_32px_rgba(0,122,255,0.3)]"
          >
            <AppIconBrand className="h-16 w-16 object-contain" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Baristachaw
          </h1>
          <p className="text-secondary text-base">
            {isSignUp ? t.authRouteSignupSubtitle : t.authRouteSigninSubtitle}
          </p>
        </div>

        <AnimatePresence>
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
            >
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <span className="text-sm text-red-600 dark:text-red-400">{authError}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3"
            >
              <CheckCircle className="text-emerald-500 shrink-0" size={18} />
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-card p-8">
          {isOffline ? (
            <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/12 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
              {t.authModalOffline}
            </div>
          ) : null}
          <button
            onClick={() => void startGoogleAuth()}
            disabled={authBusy || isOffline}
            className="w-full glass-button-primary py-4 px-6 flex items-center justify-center gap-3 text-base"
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
              </>
            )}
          </button>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-glass bg-surface-alpha px-4 py-3 text-sm text-secondary">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="block font-semibold text-primary">
                {isSignUp ? t.authRouteSignupTitle : t.authRouteSigninTitle}
              </span>
              <span className="mt-1 block text-xs">
                {isSignUp ? t.authRouteSignupSubtitle : t.authRouteSigninSubtitle}
              </span>
            </span>
          </div>
          <button
            onClick={() => void continueAsGuest()}
            disabled={authBusy}
            className="mt-3 w-full rounded-2xl border border-glass bg-surface-alpha py-4 px-6 flex items-center justify-center gap-3 text-base font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-55"
          >
            {authBusy ? <Loader2 className="animate-spin" size={20} /> : <UserRound size={20} />}
            {authBusy ? t.authGuestStarting : t.continueAsGuest}
          </button>
          <Link
            to={isSignUp ? '/masuk' : '/daftar'}
            className="mt-4 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300"
          >
            {isSignUp ? t.authRouteSwitchToSignin : t.authRouteSwitchToSignup}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

