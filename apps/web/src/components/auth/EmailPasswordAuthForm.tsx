import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useAuthModal, type EmailAuthMode } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import { AuthProgressMark } from './AuthProgressMark';
import { AlertCircle, ArrowLeft, AtSign, CheckCircle, Eye, EyeOff, Lock, UserRound } from '../icons';

type EmailPasswordAuthFormProps = {
  initialMode?: EmailAuthMode;
  compact?: boolean;
  className?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const currentColorIconStyle = { '--icon-glyph-color': 'currentColor' } as CSSProperties;

type AuthFormStep = 'email' | 'password' | 'confirmation' | 'resetSent' | 'recovery';
type PendingAuthAction = 'password' | 'reset' | 'recovery';

function readPasswordRecoveryRequest() {
  if (typeof window === 'undefined') return { requested: false, accessToken: '' };
  try {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const type = hash.get('type') || url.searchParams.get('type') || '';
    const accessToken = hash.get('access_token') || url.searchParams.get('access_token') || '';
    const requested = url.searchParams.get('recovery') === '1' || type === 'recovery';
    return { requested, accessToken };
  } catch {
    return { requested: false, accessToken: '' };
  }
}

export function EmailPasswordAuthForm({
  initialMode = 'signIn',
  compact = false,
  className = '',
}: EmailPasswordAuthFormProps) {
  const { t } = useGlobalState();
  const {
    authBusy,
    isOffline,
    authenticateWithEmail,
    sendPasswordResetEmail,
    updateRecoveredPassword,
    clearAuthError,
  } = useAuthModal();
  const [recoveryRequest] = useState(readPasswordRecoveryRequest);
  const [mode, setMode] = useState<EmailAuthMode>(initialMode);
  const [step, setStep] = useState<AuthFormStep>(recoveryRequest.requested ? 'recovery' : 'email');
  const [email, setEmail] = useState('');
  const [resetSentEmail, setResetSentEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAuthAction | null>(null);

  const isSignUp = mode === 'signUp';
  const disabled = authBusy || isOffline || pendingAction !== null;
  const isPasswordBusy = pendingAction === 'password';
  const isResetBusy = pendingAction === 'reset';
  const isRecoveryBusy = pendingAction === 'recovery';

  useEffect(() => {
    if (!recoveryRequest.requested || !recoveryRequest.accessToken || typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}`);
    } catch {
      // Keep recovery usable even if history cleanup fails.
    }
  }, [recoveryRequest]);

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
    setPendingAction('password');
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
    } finally {
      setPendingAction(null);
    }
  };

  const handleSendPasswordReset = async () => {
    const normalized = validateEmail();
    if (!normalized) return;

    setLocalError('');
    setPendingAction('reset');
    try {
      const result = await sendPasswordResetEmail(normalized);
      setPassword('');
      setResetSentEmail(result.email || normalized);
      setStep('resetSent');
    } catch {
      // AuthModalContext surfaces the localized server error.
    } finally {
      setPendingAction(null);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recoveryRequest.accessToken) {
      setLocalError(t.authRecoveryTokenMissing);
      return;
    }
    if (password.length < 8) {
      setLocalError(t.authPasswordTooShort);
      return;
    }

    setLocalError('');
    setPendingAction('recovery');
    try {
      await updateRecoveredPassword({
        accessToken: recoveryRequest.accessToken,
        password,
      });
      setPassword('');
    } catch {
      // AuthModalContext surfaces the localized server error.
    } finally {
      setPendingAction(null);
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
          <CheckCircle className="mt-0.5 shrink-0" size={18} variant="glyph" tone="green" />
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
              className="mt-3 text-sm font-semibold text-[var(--auth-accent)] hover:text-[var(--auth-accent-pressed)]"
            >
              {t.authEmailConfirmationCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'resetSent') {
    return (
      <div className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 shrink-0" size={18} variant="glyph" tone="green" />
          <div>
            <h3 className="text-sm font-semibold text-primary">{t.authResetEmailSentTitle}</h3>
            <p className="mt-1 text-sm leading-5 text-secondary">
              {t.authResetEmailSentBody.replace('{email}', resetSentEmail || email)}
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('signIn');
                setStep('password');
              }}
              className="mt-3 text-sm font-semibold text-[var(--auth-accent)] hover:text-[var(--auth-accent-pressed)]"
            >
              {t.authResetEmailSentCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'recovery') {
    return (
      <div className={className}>
        {!compact ? (
          <div className="mb-3">
            <h2 className="text-base font-semibold text-primary">{t.authRecoveryTitle}</h2>
            <p className="mt-1 text-sm leading-5 text-secondary">{t.authRecoveryBody}</p>
          </div>
        ) : null}

        {localError || !recoveryRequest.accessToken ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" variant="glyph" tone="amber" />
            <span>{localError || t.authRecoveryTokenMissing}</span>
          </div>
        ) : null}

        <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-semibold text-primary" htmlFor={compact ? 'auth-modal-recovery-password' : 'auth-route-recovery-password'}>
            {t.authRecoveryPasswordLabel}
          </label>
          <div className="auth-field-shell flex items-center gap-3 rounded-2xl px-4 py-3">
            <Lock size={18} className="shrink-0" variant="glyph" tone="purple" />
            <input
              id={compact ? 'auth-modal-recovery-password' : 'auth-route-recovery-password'}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLocalError('');
                clearAuthError();
              }}
              placeholder={t.authPasswordPlaceholder}
              disabled={disabled || !recoveryRequest.accessToken}
              className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-tertiary disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-full p-1.5 text-secondary hover:bg-surface-alpha hover:text-primary"
              aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
            >
              {showPassword ? <EyeOff size={16} variant="glyph" tone="neutral" /> : <Eye size={16} variant="glyph" tone="neutral" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={disabled || !recoveryRequest.accessToken}
            className="auth-action-primary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isRecoveryBusy ? <AuthProgressMark /> : <Lock size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
            {t.authRecoverySubmit}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signIn');
              setPassword('');
              setLocalError('');
              setStep('email');
            }}
            className="w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-secondary transition-colors hover:bg-surface-alpha hover:text-primary disabled:opacity-55"
          >
            {t.authResetEmailSentCta}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={className}>
      {localError ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" variant="glyph" tone="amber" />
          <span>{localError}</span>
        </div>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-semibold text-primary" htmlFor={compact ? 'auth-modal-email' : 'auth-route-email'}>
            {t.authEmailLabel}
          </label>
          <div className="auth-field-shell flex items-center gap-3 rounded-2xl px-4 py-3">
            <AtSign size={18} className="shrink-0" variant="glyph" tone="ice" />
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
              className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-tertiary disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="auth-action-primary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPasswordBusy ? <AuthProgressMark /> : <UserRound size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
            {t.authEmailContinue}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary"
            >
              <ArrowLeft size={14} variant="glyph" tone="neutral" />
              {t.authBackToEmail}
            </button>
            <span className="truncate rounded-full bg-surface-alpha px-3 py-1 text-xs font-semibold text-secondary">
              {email}
            </span>
          </div>

          {isSignUp ? (
            <div className="flex flex-col gap-2">
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
                className="auth-field-shell w-full rounded-2xl px-4 py-3 text-base text-primary outline-none placeholder:text-tertiary disabled:opacity-60"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="block text-sm font-semibold text-primary" htmlFor={compact ? 'auth-modal-password' : 'auth-route-password'}>
              {t.authPasswordLabel}
            </label>
            <div className="auth-field-shell flex items-center gap-3 rounded-2xl px-4 py-3">
              <Lock size={18} className="shrink-0" variant="glyph" tone="purple" />
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
                className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-tertiary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-full p-1.5 text-secondary hover:bg-surface-alpha hover:text-primary"
                aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
              >
                {showPassword ? <EyeOff size={16} variant="glyph" tone="neutral" /> : <Eye size={16} variant="glyph" tone="neutral" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="auth-action-primary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPasswordBusy ? <AuthProgressMark /> : <Lock size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
            {isSignUp ? t.authCreateAccount : t.authSignInWithPassword}
          </button>

          {!isSignUp ? (
            <button
              type="button"
              onClick={() => void handleSendPasswordReset()}
              disabled={disabled}
              className="w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-[var(--auth-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--auth-accent)_10%,transparent)] hover:text-[var(--auth-accent-pressed)] disabled:opacity-55"
            >
              {isResetBusy ? t.authResetEmailSending : t.authForgotPassword}
            </button>
          ) : null}

          <button
            type="button"
            onClick={switchMode}
            disabled={disabled}
            className="w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-secondary transition-colors hover:bg-surface-alpha hover:text-primary disabled:opacity-55"
          >
            {isSignUp ? t.authSwitchToPasswordSignin : t.authSwitchToPasswordSignup}
          </button>
        </form>
      )}
    </div>
  );
}
