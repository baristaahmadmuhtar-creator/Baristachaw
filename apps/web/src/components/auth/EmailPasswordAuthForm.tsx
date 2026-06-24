import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useAuthModal, type EmailAuthMode } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import { AuthProgressMark } from './AuthProgressMark';
import { AlertCircle, ArrowLeft, AtSign, CheckCircle, Eye, EyeOff, Lock, UserRound } from '../icons';
import { OtpCodeInput } from './OtpCodeInput';
import { PasswordStrengthHint } from './PasswordStrengthHint';
import { AuthNoticeCard } from './AuthNoticeCard';
import { OTP_CODE_LENGTH } from '@baristachaw/shared';

type EmailPasswordAuthFormProps = {
  initialMode?: EmailAuthMode;
  compact?: boolean;
  className?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const currentColorIconStyle = { '--icon-glyph-color': 'currentColor' } as CSSProperties;

type AuthFormStep = 'email' | 'password' | 'confirmation' | 'otpResetVerify' | 'otpResetPassword' | 'recovery' | 'forgotEmail';
type PendingAuthAction = 'password' | 'reset' | 'recovery' | 'otp';

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
    sendEmailOtp,
    verifyEmailOtp,
    startPasswordResetOtp,
    verifyPasswordResetOtp,
    completePasswordResetWithOtp,
    submitForgotEmailRecovery,
    updateRecoveredPassword,
    clearAuthError,
  } = useAuthModal();
  
  const [recoveryRequest] = useState(readPasswordRecoveryRequest);
  const [mode, setMode] = useState<EmailAuthMode>(initialMode);
  const [step, setStep] = useState<AuthFormStep>(recoveryRequest.requested ? 'recovery' : 'email');
  
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAuthAction | null>(null);
  const [resetToken, setResetToken] = useState('');

  // Forgot Email states
  const [recoveryContact, setRecoveryContact] = useState('');
  const [recoveryHint, setRecoveryHint] = useState('');

  const displayNameInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const recoveryPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const resetPasswordInputRef = useRef<HTMLInputElement | null>(null);

  const isSignUp = mode === 'signUp';
  const disabled = authBusy || isOffline || pendingAction !== null;
  const isPasswordBusy = pendingAction === 'password';
  const isResetBusy = pendingAction === 'reset';
  const isRecoveryBusy = pendingAction === 'recovery';
  const isOtpBusy = pendingAction === 'otp';

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = step === 'password'
      ? (isSignUp ? displayNameInputRef.current || passwordInputRef.current : passwordInputRef.current)
      : step === 'recovery'
        ? recoveryPasswordInputRef.current
        : step === 'otpResetPassword'
          ? resetPasswordInputRef.current
          : null;
    if (!target || target.disabled) return;
    const focusTimer = window.setTimeout(() => target.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isSignUp, step]);

  const validateEmail = (targetEmail = email) => {
    const normalized = targetEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setLocalError(t.authEmailInvalid || 'Email tidak valid.');
      return null;
    }
    setLocalError('');
    return normalized;
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = validateEmail();
    if (!normalized) return;
    setEmail(normalized);
    setStep('password');
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = validateEmail();
    if (!normalized) return;
    if (password.length < 8) {
      setLocalError(t.authPasswordTooShort || 'Password minimal 8 karakter.');
      return;
    }

    setLocalError('');
    setLocalSuccess('');
    setPendingAction('password');
    try {
      const result = await authenticateWithEmail({
        mode,
        email: normalized,
        password,
        displayName: isSignUp ? displayName.trim() : undefined,
      });
      if (result.emailConfirmationRequired) {
        // Send OTP explicitly if sign up needs confirmation
        if (isSignUp) {
           await sendEmailOtp(normalized).catch(() => {}); // Optimistic or handle error
        }
        setPassword('');
        setStep('confirmation');
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === t.authEmailNotRegistered || msg.includes('belum terdaftar') || msg.includes('not registered')) {
        setLocalError(msg);
        clearAuthError();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleSendPasswordResetOtp = async () => {
    const normalized = validateEmail();
    if (!normalized) return;

    setLocalError('');
    setLocalSuccess('');
    setPendingAction('reset');
    try {
      await startPasswordResetOtp(normalized);
      setPassword('');
      setStep('otpResetVerify');
      setLocalSuccess(t.authResetCodeSent || 'Jika email terdaftar, kode reset telah dikirim.');
    } catch {
      // Intentionally show generic message on error to prevent enumeration
      setStep('otpResetVerify');
      setLocalSuccess(t.authResetCodeSent || 'Jika email terdaftar, kode reset telah dikirim.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleVerifySignUpOtp = async (code: string) => {
    const normalized = validateEmail();
    if (!normalized || code.length !== OTP_CODE_LENGTH) return;

    setLocalError('');
    setPendingAction('otp');
    try {
      await verifyEmailOtp({ email: normalized, token: code });
      // On success, context will update user and close modal
    } catch {
      setLocalError(t.authOtpInvalid || 'Kode tidak valid atau kedaluwarsa.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleVerifyResetOtp = async (code: string) => {
    const normalized = validateEmail();
    if (!normalized || code.length !== OTP_CODE_LENGTH) return;

    setLocalError('');
    setPendingAction('otp');
    try {
      const result = await verifyPasswordResetOtp({ email: normalized, token: code });
      if (result.accessToken) {
         setResetToken(result.accessToken);
         setStep('otpResetPassword');
         setLocalSuccess('');
      } else {
         throw new Error('No token returned');
      }
    } catch {
      setLocalError(t.authOtpInvalid || 'Kode tidak valid atau kedaluwarsa.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleCompleteReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetToken) return;
    if (password.length < 8) {
      setLocalError(t.authPasswordTooShort || 'Password minimal 8 karakter.');
      return;
    }

    setLocalError('');
    setPendingAction('reset');
    try {
      await completePasswordResetWithOtp({
        accessToken: resetToken,
        password,
      });
      // Context sets user and closes modal
    } catch {
      // Error handled by context
    } finally {
      setPendingAction(null);
    }
  };

  const handleForgotEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = validateEmail(recoveryContact);
    if (!normalized) return;

    setLocalError('');
    setLocalSuccess('');
    setPendingAction('recovery');
    try {
      const res = await submitForgotEmailRecovery({
        contactEmail: normalized,
        displayNameHint: recoveryHint.trim() || undefined,
      });
      setLocalSuccess(res.message);
      setRecoveryContact('');
      setRecoveryHint('');
    } catch {
      // Generic error or rate limit
    } finally {
      setPendingAction(null);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recoveryRequest.accessToken) {
      setLocalError(t.authRecoveryTokenMissing || 'Token reset password tidak ditemukan.');
      return;
    }
    if (password.length < 8) {
      setLocalError(t.authPasswordTooShort || 'Password minimal 8 karakter.');
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
      // Context will close modal or update state
    } catch {
      // Handled by context
    } finally {
      setPendingAction(null);
    }
  };

  const switchMode = () => {
    setMode((current) => current === 'signIn' ? 'signUp' : 'signIn');
    setLocalError('');
    setLocalSuccess('');
    clearAuthError();
    setStep('password');
  };

  const renderError = () => {
    if (!localError) return null;
    const isNotRegistered = localError === t.authEmailNotRegistered || localError.includes('belum terdaftar') || localError.includes('not registered');
    return (
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-600 dark:text-red-400">
        <AlertCircle size={18} className="mt-0.5 shrink-0" variant="glyph" tone="red" />
        <div className="flex-1 flex flex-col items-start gap-1">
          <span>{localError}</span>
          {isNotRegistered && !isSignUp && (
            <button
              type="button"
              onClick={() => { switchMode(); setLocalError(''); }}
              className="mt-1 text-xs font-bold uppercase tracking-wider text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200 text-left"
            >
              {t.authSwitchToPasswordSignup || 'Create a new Baristachaw account'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSuccess = () => {
    if (!localSuccess) return null;
    return (
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-sm font-medium text-green-700 dark:text-green-400">
        <CheckCircle size={18} className="mt-0.5 shrink-0" variant="glyph" tone="green" />
        <span>{localSuccess}</span>
      </div>
    );
  };

  if (step === 'confirmation') {
    return (
      <div className={`rounded-[1.25rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 shadow-inner ${className}`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-blue-500/20 p-3 text-blue-600 dark:text-blue-400 mb-2">
            <CheckCircle className="shrink-0" size={32} variant="glyph" />
          </div>
          <h3 className="text-lg font-bold text-primary">{t.authEmailConfirmationTitle || 'Cek Email Anda'}</h3>
          <p className="text-sm leading-relaxed text-secondary mb-2">
             {(t.authOtpDescription || 'Masukkan kode verifikasi yang dikirim ke email Anda.')} <br/> <strong>{email}</strong>
          </p>
          
          {renderError()}

          <OtpCodeInput 
             length={OTP_CODE_LENGTH} 
             disabled={isOtpBusy} 
             onComplete={handleVerifySignUpOtp} 
             onPasteError={setLocalError}
          />

          <div className="flex flex-col w-full gap-2 mt-4">
             <button
               type="button"
               disabled={isOtpBusy}
               onClick={() => sendEmailOtp(email)}
               className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
             >
               {t.authOtpResend || 'Kirim Ulang Kode'}
             </button>
             <button
               type="button"
               disabled={isOtpBusy}
               onClick={() => {
                 setMode('signIn');
                 setStep('email');
               }}
               className="text-sm font-bold text-secondary hover:text-primary transition-colors"
             >
               {t.authResetEmailSentCta || 'Kembali'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'otpResetVerify') {
    return (
      <div className={`rounded-[1.25rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 shadow-inner ${className}`}>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-blue-500/20 p-3 text-blue-600 dark:text-blue-400 mb-2">
            <Lock className="shrink-0" size={32} variant="glyph" />
          </div>
          <h3 className="text-lg font-bold text-primary">{t.authForgotPassword || 'Reset Password'}</h3>
          <p className="text-sm leading-relaxed text-secondary mb-2">
             {(t.authOtpDescription || 'Masukkan kode verifikasi yang dikirim ke email Anda.')} <br/> <strong>{email}</strong>
          </p>

          {renderSuccess()}
          {renderError()}

          <OtpCodeInput 
             length={OTP_CODE_LENGTH} 
             disabled={isOtpBusy} 
             onComplete={handleVerifyResetOtp} 
             onPasteError={setLocalError}
          />

          <div className="flex flex-col w-full gap-2 mt-4">
             <button
               type="button"
               disabled={isOtpBusy}
               onClick={() => startPasswordResetOtp(email).then(() => setLocalSuccess(t.authResetCodeSent || 'Kode reset telah dikirim.'))}
               className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
             >
               {t.authOtpResend || 'Kirim Ulang Kode'}
             </button>
             <button
               type="button"
               disabled={isOtpBusy}
               onClick={() => {
                 setStep('password');
               }}
               className="text-sm font-bold text-secondary hover:text-primary transition-colors"
             >
               {t.authResetEmailSentCta || 'Kembali'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'otpResetPassword') {
    return (
      <div className={className}>
         <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
               <Lock size={28} variant="glyph" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-primary">{t.authRecoveryTitle || 'Buat Password Baru'}</h2>
         </div>

         {renderError()}

         <form onSubmit={handleCompleteReset} className="flex flex-col gap-4">
           <div className="flex flex-col gap-1.5">
             <label className="text-sm font-bold text-primary" htmlFor="auth-reset-password">
               {t.authRecoveryPasswordLabel || 'Password Baru'}
             </label>
             <div className="auth-field-shell flex items-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 focus-within:border-purple-500/50 focus-within:bg-[var(--bg-base)]">
               <Lock size={18} className="shrink-0" variant="glyph" tone="purple" />
               <input
                 ref={resetPasswordInputRef}
                 id="auth-reset-password"
                 type={showPassword ? 'text' : 'password'}
                 autoComplete="new-password"
                 value={password}
                 onChange={(event) => {
                   setPassword(event.target.value);
                   setLocalError('');
                   clearAuthError();
                 }}
                 placeholder={t.authPasswordPlaceholder || 'Minimal 8 karakter'}
                 disabled={disabled}
                 className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-primary outline-none placeholder:font-medium placeholder:text-tertiary disabled:opacity-60"
               />
               <button
                 type="button"
                 onClick={() => setShowPassword((value) => !value)}
                 className="rounded-full p-1.5 text-secondary hover:bg-surface-alpha hover:text-primary"
               >
                 {showPassword ? <EyeOff size={16} variant="glyph" tone="neutral" /> : <Eye size={16} variant="glyph" tone="neutral" />}
               </button>
             </div>
             <PasswordStrengthHint password={password} translations={t as Record<string, string>} />
           </div>

           <button
             type="submit"
             disabled={disabled}
             className="auth-action-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_24px_rgba(168,85,247,0.25)] transition-all hover:from-purple-700 hover:to-purple-600 disabled:opacity-55"
           >
             {isResetBusy ? <AuthProgressMark /> : <Lock size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
             {t.authRecoverySubmit || 'Simpan Password'}
           </button>
         </form>
      </div>
    );
  }

  if (step === 'forgotEmail') {
    return (
      <div className={className}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UserRound size={28} variant="glyph" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-primary">{t.authForgotEmail || 'Lupa Email?'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
             {t.authForgotEmailDescription || 'Masukkan email kontak dan petunjuk agar kami dapat membantu memulihkan akun Anda.'}
          </p>
        </div>

        {renderError()}
        {renderSuccess()}

        <form onSubmit={handleForgotEmailSubmit} className="flex flex-col gap-4">
           <div className="flex flex-col gap-1.5">
             <label className="text-sm font-bold text-primary">Email Kontak</label>
             <input
               type="email"
               required
               value={recoveryContact}
               onChange={(e) => { setRecoveryContact(e.target.value); setLocalError(''); }}
               placeholder="email_yang_bisa_dihubungi@domain.com"
               disabled={disabled}
               className="auth-field-shell w-full rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 text-[15px] font-semibold text-primary outline-none focus-within:border-blue-500/50 focus-within:bg-[var(--bg-base)] disabled:opacity-60"
             />
           </div>
           
           <div className="flex flex-col gap-1.5">
             <label className="text-sm font-bold text-primary">Petunjuk Akun (Opsional)</label>
             <input
               type="text"
               value={recoveryHint}
               onChange={(e) => setRecoveryHint(e.target.value)}
               placeholder="Misal: Nomor HP lama, username sebelumnya"
               disabled={disabled}
               className="auth-field-shell w-full rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 text-[15px] font-semibold text-primary outline-none focus-within:border-blue-500/50 focus-within:bg-[var(--bg-base)] disabled:opacity-60"
             />
           </div>

           <button
             type="submit"
             disabled={disabled || !recoveryContact}
             className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 disabled:opacity-55"
           >
             {isRecoveryBusy ? <AuthProgressMark /> : null}
             {t.authForgotEmailSubmit || 'Kirim Permintaan'}
           </button>
           <button
             type="button"
             disabled={disabled}
             onClick={() => setStep('email')}
             className="flex w-full items-center justify-center gap-2 rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 text-sm font-bold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
           >
             Kembali
           </button>
        </form>
      </div>
    );
  }

  if (step === 'recovery') {
    return (
      <div className={className}>
        {!compact ? (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Lock size={28} variant="glyph" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-primary">{t.authRecoveryTitle || 'Buat Password Baru'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{t.authRecoveryBody || 'Kode diterima! Silakan masukkan password baru Anda di bawah ini.'}</p>
          </div>
        ) : null}

        {localError || !recoveryRequest.accessToken ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={18} className="mt-0.5 shrink-0" variant="glyph" tone="red" />
            <span>{localError || t.authRecoveryTokenMissing || 'Token reset password tidak valid atau sudah kadaluarsa.'}</span>
          </div>
        ) : null}

        <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-primary" htmlFor={compact ? 'auth-modal-recovery-password' : 'auth-route-recovery-password'}>
              {t.authRecoveryPasswordLabel || 'Password Baru'}
            </label>
            <div className="auth-field-shell flex items-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 focus-within:border-purple-500/50 focus-within:bg-[var(--bg-base)]">
              <Lock size={18} className="shrink-0" variant="glyph" tone="purple" />
              <input
                ref={recoveryPasswordInputRef}
                id={compact ? 'auth-modal-recovery-password' : 'auth-route-recovery-password'}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLocalError('');
                  clearAuthError();
                }}
                placeholder={t.authPasswordPlaceholder || 'Minimal 8 karakter'}
                disabled={disabled || !recoveryRequest.accessToken}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-primary outline-none placeholder:font-medium placeholder:text-tertiary disabled:opacity-60"
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
            <PasswordStrengthHint password={password} translations={t as Record<string, string>} />
          </div>

          <button
            type="submit"
            disabled={disabled || !recoveryRequest.accessToken}
            className="auth-action-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_24px_rgba(168,85,247,0.25)] transition-all hover:from-purple-700 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isRecoveryBusy ? <AuthProgressMark /> : <Lock size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
            {t.authRecoverySubmit || 'Simpan Password'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signIn');
              setPassword('');
              setLocalError('');
              setStep('email');
            }}
            className="w-full rounded-2xl px-4 py-3.5 text-center text-sm font-bold text-secondary transition-colors hover:bg-surface-alpha hover:text-primary disabled:opacity-55"
          >
            {t.authResetEmailSentCta || 'Kembali ke Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={className}>
      {renderError()}
      {renderSuccess()}

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-primary" htmlFor={compact ? 'auth-modal-email' : 'auth-route-email'}>
              {t.authEmailLabel || 'Email'}
            </label>
            <div className="auth-field-shell flex items-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 focus-within:border-blue-500/50 focus-within:bg-[var(--bg-base)]">
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
                placeholder={t.authEmailPlaceholder || 'nama@email.com'}
                disabled={disabled}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-primary outline-none placeholder:font-medium placeholder:text-tertiary disabled:opacity-60"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={disabled || !email}
            className="auth-action-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPasswordBusy ? <AuthProgressMark /> : <UserRound size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
            {t.authEmailContinue || 'Lanjutkan'}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setStep('forgotEmail'); setLocalError(''); setLocalSuccess(''); }}
              className="inline-block rounded-lg px-3 py-1.5 text-[13px] font-bold text-secondary hover:bg-surface-alpha hover:text-primary transition-colors"
            >
              {t.authForgotEmail || 'Lupa Email?'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-glass bg-surface-alpha px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-base)] text-blue-500 shadow-sm">
                <UserRound size={14} variant="glyph" />
              </div>
              <span className="truncate text-[13px] font-bold text-primary">
                {email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setStep('email'); setLocalError(''); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--bg-base)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-secondary shadow-sm hover:text-primary transition-colors"
            >
              Ganti
            </button>
          </div>

          {isSignUp ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-primary" htmlFor={compact ? 'auth-modal-name' : 'auth-route-name'}>
                {t.authNameLabel || 'Nama Lengkap'}
              </label>
              <input
                ref={displayNameInputRef}
                id={compact ? 'auth-modal-name' : 'auth-route-name'}
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  clearAuthError();
                }}
                placeholder={t.authNamePlaceholder || 'Cth: Budi Santoso'}
                disabled={disabled}
                className="auth-field-shell w-full rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 text-[15px] font-semibold text-primary outline-none placeholder:font-medium placeholder:text-tertiary focus-within:border-blue-500/50 focus-within:bg-[var(--bg-base)] disabled:opacity-60"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-primary" htmlFor={compact ? 'auth-modal-password' : 'auth-route-password'}>
                {t.authPasswordLabel || 'Password'}
              </label>
              {!isSignUp ? (
                <button
                  type="button"
                  onClick={() => void handleSendPasswordResetOtp()}
                  disabled={disabled}
                  className="text-[12px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-55"
                >
                  {isResetBusy ? (t.authResetEmailSending || 'Mengirim...') : (t.authForgotPassword || 'Lupa Password?')}
                </button>
              ) : null}
            </div>
            <div className="auth-field-shell flex items-center gap-3 rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 focus-within:border-blue-500/50 focus-within:bg-[var(--bg-base)]">
              <Lock size={18} className="shrink-0" variant="glyph" tone="purple" />
              <input
                ref={passwordInputRef}
                id={compact ? 'auth-modal-password' : 'auth-route-password'}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLocalError('');
                  clearAuthError();
                }}
                placeholder={t.authPasswordPlaceholder || 'Minimal 8 karakter'}
                disabled={disabled}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-primary outline-none placeholder:font-medium placeholder:text-tertiary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-full p-1.5 text-secondary hover:bg-surface-alpha hover:text-primary transition-colors"
                aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
              >
                {showPassword ? <EyeOff size={16} variant="glyph" tone="neutral" /> : <Eye size={16} variant="glyph" tone="neutral" />}
              </button>
            </div>
            {isSignUp && <PasswordStrengthHint password={password} translations={t as Record<string, string>} />}
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="auth-action-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPasswordBusy ? <AuthProgressMark /> : <Lock size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />}
            {isSignUp ? (t.authCreateAccount || 'Buat Akun') : (t.authSignInWithPassword || 'Masuk')}
          </button>

          <div className="relative mt-2 flex items-center justify-center py-2">
            <div className="absolute inset-x-0 h-px bg-glass"></div>
            <span className="relative bg-[var(--bg-elevated)] px-4 text-[11px] font-extrabold uppercase tracking-widest text-tertiary">
              ATAU
            </span>
          </div>

          <button
            type="button"
            onClick={switchMode}
            disabled={disabled}
            className="w-full rounded-2xl border border-glass bg-surface-alpha px-4 py-3.5 text-center text-[14px] font-bold text-primary transition-colors hover:bg-[var(--bg-base)] disabled:opacity-55"
          >
            {isSignUp ? (t.authSwitchToPasswordSignin || 'Sudah punya akun? Masuk') : (t.authSwitchToPasswordSignup || 'Belum punya akun? Daftar')}
          </button>
        </form>
      )}
    </div>
  );
}
