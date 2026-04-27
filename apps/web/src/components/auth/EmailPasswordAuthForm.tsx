import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, AtSign, CheckCircle, Eye, EyeOff, Loader2, Lock, UserRound } from 'lucide-react';
import { useAuthModal, type EmailAuthMode } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';

type EmailPasswordAuthFormProps = {
  initialMode?: EmailAuthMode;
  compact?: boolean;
  className?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailPasswordAuthForm({
  initialMode = 'signIn',
  compact = false,
  className = '',
}: EmailPasswordAuthFormProps) {
  const { t } = useGlobalState();
  const { authBusy, isOffline, authenticateWithEmail, clearAuthError } = useAuthModal();
  const [mode, setMode] = useState<EmailAuthMode>(initialMode);
  const [step, setStep] = useState<'email' | 'password' | 'confirmation'>('email');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const isSignUp = mode === 'signUp';
  const disabled = authBusy || isOffline;

  const validateEmail = () => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setLocalError(t.authEmailInvalid);
      return null;
    }
    setEmail(normalized);
    setLocalError('');
    return normalized;
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = validateEmail();
    if (!normalized) return;
    setStep('password');
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = validateEmail();
    if (!normalized) return;
    if (password.length < 8) {
      setLocalError(t.authPasswordTooShort);
      return;
    }

    setLocalError('');
    try {
      const result = await authenticateWithEmail({
        mode,
        email: normalized,
        password,
        displayName: isSignUp ? displayName.trim() : undefined,
      });
      if (result.emailConfirmationRequired) {
        setPassword('');
        setStep('confirmation');
      }
    } catch {
      // AuthModalContext surfaces the localized server error.
    }
  };

  const switchMode = () => {
    setMode((current) => current === 'signIn' ? 'signUp' : 'signIn');
    setLocalError('');
    clearAuthError();
    setStep('password');
  };

  if (step === 'confirmation') {
    return (
      <div className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={18} />
          <div>
            <h3 className="text-sm font-semibold text-primary">{t.authEmailConfirmationTitle}</h3>
            <p className="mt-1 text-sm leading-5 text-secondary">
              {t.authEmailConfirmationBody.replace('{email}', email)}
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('signIn');
                setStep('password');
              }}
              className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
            >
              {t.authEmailConfirmationCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {!compact ? (
        <div className="mb-3">
          <h2 className="text-base font-semibold text-primary">{t.authEmailCardTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-secondary">{t.authEmailCardBody}</p>
        </div>
      ) : null}

      {localError ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{localError}</span>
        </div>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <label className="block text-sm font-semibold text-primary" htmlFor={compact ? 'auth-modal-email' : 'auth-route-email'}>
            {t.authEmailLabel}
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-glass bg-[var(--bg-base)]/72 px-4 py-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/15">
            <AtSign size={18} className="shrink-0 text-secondary" />
            <input
              id={compact ? 'auth-modal-email' : 'auth-route-email'}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setLocalError('');
                clearAuthError();
              }}
              placeholder={t.authEmailPlaceholder}
              disabled={disabled}
              className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-tertiary disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-55 dark:text-blue-200"
          >
            {authBusy ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={17} />}
            {t.authEmailContinue}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary"
            >
              <ArrowLeft size={14} />
              {t.authBackToEmail}
            </button>
            <span className="truncate rounded-full bg-surface-alpha px-3 py-1 text-xs font-semibold text-secondary">
              {email}
            </span>
          </div>

          {isSignUp ? (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-primary" htmlFor={compact ? 'auth-modal-name' : 'auth-route-name'}>
                {t.authNameLabel}
              </label>
              <input
                id={compact ? 'auth-modal-name' : 'auth-route-name'}
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  clearAuthError();
                }}
                placeholder={t.authNamePlaceholder}
                disabled={disabled}
                className="w-full rounded-2xl border border-glass bg-[var(--bg-base)]/72 px-4 py-3 text-sm text-primary outline-none placeholder:text-tertiary focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-primary" htmlFor={compact ? 'auth-modal-password' : 'auth-route-password'}>
              {t.authPasswordLabel}
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-glass bg-[var(--bg-base)]/72 px-4 py-3 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/15">
              <Lock size={18} className="shrink-0 text-secondary" />
              <input
                id={compact ? 'auth-modal-password' : 'auth-route-password'}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLocalError('');
                  clearAuthError();
                }}
                placeholder={t.authPasswordPlaceholder}
                disabled={disabled}
                className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-tertiary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-full p-1.5 text-secondary hover:bg-surface-alpha hover:text-primary"
                aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-55 dark:text-blue-200"
          >
            {authBusy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={17} />}
            {isSignUp ? t.authCreateAccount : t.authSignInWithPassword}
          </button>

          <button
            type="button"
            onClick={switchMode}
            disabled={authBusy}
            className="w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-secondary transition-colors hover:bg-surface-alpha hover:text-primary disabled:opacity-55"
          >
            {isSignUp ? t.authSwitchToPasswordSignin : t.authSwitchToPasswordSignup}
          </button>
        </form>
      )}
    </div>
  );
}
