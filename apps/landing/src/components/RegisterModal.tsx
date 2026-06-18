import { ArrowRight, Loader2, X, Check, UploadCloud, AlertCircle, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { APP_ORIGIN, type BillingDuration, formatCurrencyByLang, getCurrencyForLanguage, PRICING } from '../config';
import { OTP_CODE_LENGTH } from '../planCatalog';

type RegisterModalProps = {
  language: Language;
  plan: 'free' | 'starter' | 'plus' | 'pro' | 'team';
  duration: BillingDuration;
  user?: any;
  onLoginSuccess?: () => void;
  onClose: () => void;
};

export function RegisterModal({ language, plan, duration, user, onLoginSuccess, onClose }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp_and_password'>('email');
  const [isVerifySignupOtp, setIsVerifySignupOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Step state: 'pilih' | 'checkout' | 'success'
  const [step, setStep] = useState<'pilih' | 'checkout' | 'success'>('pilih');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>(() => {
    if (plan === 'pro') return 'pro';
    return 'starter';
  });
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>(duration);

  const [invoice, setInvoice] = useState<any>(null);
  const [fetchingInvoice, setFetchingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [copiedBankIndex, setCopiedBankIndex] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [proofDelivery, setProofDelivery] = useState<'direct_upload' | 'manual_support' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const currency = getCurrencyForLanguage(language);

  const supportWhatsappUrl = invoice?.instructions?.whatsappUrl || `https://wa.me/6738270092?text=${encodeURIComponent('Halo Baristachaw, saya ingin menanyakan tentang keanggotaan.')}`;
  const supportWhatsappNumber = invoice?.instructions?.whatsappNumber || "+6738270092";
  const supportInstagramUrl = invoice?.instructions?.instagramUrl || "https://instagram.com/baristachaw";
  const supportInstagramHandle = invoice?.instructions?.instagramHandle || "@baristachaw";
  const proofUploadReady = Boolean(invoice?.proof?.endpoint) && invoice?.proof?.storage !== 'deferred';
  const manualProofFallbackUrl = invoice?.instructions?.whatsappUrl
    || `https://wa.me/6738270092?text=${encodeURIComponent(`Halo Baristachaw, saya sudah transfer untuk invoice ${invoice?.id || ''} dan ingin mengirim bukti pembayaran.`)}`;

  const renderSupportLinks = () => (
    <div className="checkout-support-links" style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '14px 0 6px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
      <a href={supportWhatsappUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
        WhatsApp Support
      </a>
      <a href={supportInstagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
        Instagram CS
      </a>
    </div>
  );

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const visibleFocusable = () => {
      const node = dialogRef.current;
      if (!node) return [] as HTMLElement[];
      return Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((item) => item.offsetParent !== null || item === document.activeElement);
    };

    const focusFirst = () => {
      const items = visibleFocusable();
      (items[0] || dialogRef.current)?.focus();
    };

    window.setTimeout(focusFirst, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = visibleFocusable();
      if (!items.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const planDisplayNames: Record<string, Record<Language, string>> = {
    free: { id: 'Free', en: 'Free', bn: 'Percuma' },
    starter: { id: 'Barista Starter', en: 'Barista Starter', bn: 'Barista Starter' },
    plus: { id: 'Barista Starter', en: 'Barista Starter', bn: 'Barista Starter' },
    pro: { id: 'Barista Pro', en: 'Barista Pro', bn: 'Barista Pro' },
    team: { id: 'Cafe Team', en: 'Cafe Team', bn: 'Cafe Team' },
  };

  const durationLabels: Record<BillingDuration, Record<Language, string>> = {
    monthly: { id: '1 Bulan', en: '1 Month', bn: '1 Bulan' },
    quarterly: { id: '3 Bulan', en: '3 Months', bn: '3 Bulan' },
    yearly: { id: '1 Tahun', en: '1 Year', bn: '1 Tahun' },
  };

  const getPriceDisplay = (p = selectedPlan, d = selectedDuration): string => {
    if (p === 'free' as any) return t('plan.free.price', language);
    if (p === 'team' as any) return 'Custom';
    const tier = PRICING[p as 'starter' | 'pro'][d];
    return formatCurrencyByLang(tier.discounted[currency], language);
  };

  const fetchInvoice = useCallback(async () => {
    setFetchingInvoice(true);
    setInvoiceError('');
    setInvoice(null);
    try {
      const planCode = selectedPlan;
      const res = await fetch(`${APP_ORIGIN}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planCode,
          duration: selectedDuration,
          currency,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to create manual transfer invoice');
      }
      if (data.ok && data.manualInvoice) {
        setInvoice(data.manualInvoice);
      } else if (data.ok && data.mode === 'redirect' && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Invalid response from billing server');
      }
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Failed to load checkout details');
    } finally {
      setFetchingInvoice(false);
    }
  }, [currency, selectedDuration, selectedPlan]);

  useEffect(() => {
    if (step === 'checkout') {
      setUploadedFile(null);
      setTurnstileVerified(false);
      setProofDelivery(null);
      void fetchInvoice();
    }
  }, [fetchInvoice, step]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin
        ? `${APP_ORIGIN}/api/auth/email/signin`
        : `${APP_ORIGIN}/api/auth/email/signup`;

      const bodyPayload = isLogin
        ? { email, password }
        : { email, password, displayName: name };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || 'Authentication failed');
      }

      // If email confirmation is required, notify user
      if (payload.emailConfirmationRequired) {
        setIsVerifySignupOtp(true);
        setError('');
        setLoading(false);
        return;
      }

      // Successful login/register
      onLoginSuccess?.();

      if (plan === 'free') {
        window.location.href = APP_ORIGIN;
        return;
      }

      if (plan === 'team') {
        window.location.href = '/support?topic=general';
        return;
      }

      setStep('checkout');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInputChange = (val: string) => {
    setError('');
    const cleaned = val.replace(/\D/g, '');
    setOtpCode(cleaned.slice(0, OTP_CODE_LENGTH));
  };

  const handleOtpInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError('');
    const rawPasted = e.clipboardData.getData('text/plain');
    const cleaned = rawPasted.replace(/\D/g, '');
    setOtpCode(cleaned.slice(0, OTP_CODE_LENGTH));
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedOtp = otpCode.replace(/\D/g, '');
    if (normalizedOtp.length !== OTP_CODE_LENGTH) {
      setError("The verification code looks incomplete. Please enter the full code from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${APP_ORIGIN}/api/auth/email/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, token: normalizedOtp }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || 'Verification failed');
      }

      onLoginSuccess?.();

      if (plan === 'free') {
        window.location.href = APP_ORIGIN;
        return;
      }

      if (plan === 'team') {
        window.location.href = '/support?topic=general';
        return;
      }

      setStep('checkout');
      setIsVerifySignupOtp(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${APP_ORIGIN}/api/auth/email/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || 'Failed to resend OTP');
      }
      setError('OTP has been resent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleStartForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${APP_ORIGIN}/api/auth/email/password/reset/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || 'Failed to send reset code');
      }
      setForgotPasswordStep('otp_and_password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedOtp = otpCode.replace(/\D/g, '');
    if (normalizedOtp.length !== OTP_CODE_LENGTH) {
      setError("The verification code looks incomplete. Please enter the full code from your email.");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Verify OTP and get session/accessToken
      const verifyRes = await fetch(`${APP_ORIGIN}/api/auth/email/password/reset/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, token: normalizedOtp }),
      });
      const verifyPayload = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || verifyPayload.ok === false) {
        throw new Error(verifyPayload.error || 'Verification failed');
      }

      const token = verifyPayload.accessToken;
      if (!token) {
        throw new Error('Access token missing from verification response');
      }

      // Step 2: Update password using the acquired token
      const updateRes = await fetch(`${APP_ORIGIN}/api/auth/email/password/reset/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessToken: token, password: newPassword }),
      });
      const updatePayload = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok || updatePayload.ok === false) {
        throw new Error(updatePayload.error || 'Failed to update password');
      }

      onLoginSuccess?.();

      if (plan === 'free') {
        window.location.href = APP_ORIGIN;
        return;
      }

      if (plan === 'team') {
        window.location.href = '/support?topic=general';
        return;
      }

      setStep('checkout');
      setIsForgotPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const returnPlan = plan === 'plus' ? 'starter' : plan;
      const returnTo = window.location.origin + `/?login_success=1&plan=${returnPlan}&duration=${duration}`;
      const res = await fetch(`${APP_ORIGIN}/api/auth/url?provider=google&returnTo=${encodeURIComponent(returnTo)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Gagal memulai login Google');
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Tautan login Google tidak ditemukan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${APP_ORIGIN}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      window.location.reload();
    } catch (err) {
      setError('Failed to log out');
      setLoading(false);
    }
  };

  const handleCopyAccount = (accountNum: string) => {
    navigator.clipboard.writeText(accountNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBankDetail = (accountNum: string, idx: number) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedBankIndex(idx);
    setTimeout(() => setCopiedBankIndex(null), 2000);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadedFile(null);
        setError('Format bukti transfer harus JPG, PNG, WebP, atau PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadedFile(null);
        setError('Ukuran bukti transfer maksimal adalah 5MB.');
        return;
      }
      setUploadedFile(file);
      setProofDelivery(null);
      setError('');
    }
  };

  const handleCheckoutSubmit = async () => {
    if (proofUploadReady && !turnstileVerified) {
      setError('Silakan centang verifikasi bahwa Anda adalah manusia.');
      return;
    }

    if (!invoice?.id) {
      setError('Invoice manual belum siap. Coba muat ulang detail transfer.');
      return;
    }

    if (!proofUploadReady) {
      window.open(manualProofFallbackUrl, '_blank', 'noopener,noreferrer');
      setProofDelivery('manual_support');
      setStep('success');
      return;
    }

    if (!uploadedFile) {
      setError('Silakan upload bukti transfer Anda.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const res = await fetch(`${APP_ORIGIN}/api/billing/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: invoice.id,
          mimeType: uploadedFile.type,
          sizeBytes: uploadedFile.size,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit proof metadata');
      }

      const data = await res.json();
      if (data.ok) {
        if (data.uploadUrl) {
          const uploadRes = await fetch(data.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': uploadedFile.type,
            },
            body: uploadedFile,
          });
          if (!uploadRes.ok) {
            const supportUrl = data.supportLinks?.whatsappUrl || manualProofFallbackUrl;
            if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
            setProofDelivery('manual_support');
            setStep('success');
            return;
          }
        } else {
          const supportUrl = data.supportLinks?.whatsappUrl || manualProofFallbackUrl;
          if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
        }
        setProofDelivery(data.deliveryMode || 'direct_upload');
        setStep('success');
      } else {
        throw new Error(data.error || 'Gagal mengirim bukti transfer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses pembayaran.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="register-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="register-panel checkout-dark" role="dialog" aria-modal="true" aria-labelledby="register-title" tabIndex={-1}>
        
        {/* Step 1: PILIH (Plan & Duration Selection) */}
        {step === 'pilih' && (
          <>
            <div className="register-header">
              <div>
                <h2 id="register-title" style={{ fontSize: '20px', color: '#ffffff' }}>Pilih Plan Keanggotaan</h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Step 1 dari 3: Pilih paket terbaik Anda</p>
              </div>
              <button className="register-close" onClick={onClose} aria-label={t('register.close', language)}>
                <X size={20} />
              </button>
            </div>

            {/* Plan Duration Toggle */}
            <div className="duration-selector-tabs" style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['monthly', 'quarterly', 'yearly'] as BillingDuration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDuration(d)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 0,
                    background: selectedDuration === d ? '#3b82f6' : 'transparent',
                    color: selectedDuration === d ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {durationLabels[d][language]}
                </button>
              ))}
            </div>

            {/* Plan Cards */}
            <div className="plan-cards-container" style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {(['starter', 'pro'] as const).map((p) => {
                const isSelected = selectedPlan === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    aria-pressed={isSelected}
                    className={`payment-method-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      padding: '16px',
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                      <strong style={{ color: '#ffffff', fontSize: '15px', fontWeight: 800 }}>
                        {planDisplayNames[p]?.[language] ?? p}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
                        {p === 'starter'
                          ? 'Panduan AI, log brew lanjutan, riwayat scan' 
                          : 'AI Brew Coach, latte art, analisis scan, mode Deep'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '12px' }}>
                      <span style={{ color: '#3b82f6', fontSize: '16px', fontWeight: 800 }}>
                        {getPriceDisplay(p, selectedDuration)}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                        /{selectedDuration === 'monthly' ? 'bln' : selectedDuration === 'quarterly' ? '3bln' : 'thn'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {user ? (
                <>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: 0 }}>
                    Masuk sebagai: <strong>{user.email}</strong>
                  </p>
                  <button
                    className="checkout-submit-btn"
                    type="button"
                    onClick={() => setStep('checkout')}
                    style={{ marginBottom: '12px' }}
                  >
                    Lanjut ke Pembayaran <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {isVerifySignupOtp ? (
                    <>
                      <div className="register-divider" style={{ margin: '12px 0 6px', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'id' ? 'Verifikasi Email' : language === 'bn' ? 'Verifikasi Emel' : 'Verify Email'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>
                        {language === 'id' 
                          ? `Masukkan kode OTP yang kami kirim ke ${email}` 
                          : language === 'bn' 
                            ? `Masukkan kod OTP yang dihantar ke ${email}` 
                            : `Enter the OTP code sent to ${email}`}
                      </p>
                      <form onSubmit={handleVerifySignupOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Kode OTP</span>
                          <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => handleOtpInputChange(e.target.value)}
                            onPaste={handleOtpInputPaste}
                            required
                            maxLength={OTP_CODE_LENGTH}
                            placeholder={"1".repeat(OTP_CODE_LENGTH)}
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', letterSpacing: '2px', fontWeight: 'bold', textAlign: 'center' }}
                          />
                        </label>
                        {error && <p className="register-error" style={{ fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
                        <button className="checkout-submit-btn" type="submit" disabled={loading}>
                          {loading ? <Loader2 size={16} className="spin" /> : (language === 'id' ? 'Verifikasi Kode' : 'Verify Code')}
                        </button>
                      </form>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                        <button 
                          type="button" 
                          onClick={handleResendSignupOtp}
                          disabled={loading}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }}
                        >
                          {language === 'id' ? 'Kirim ulang OTP' : 'Resend OTP'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setIsVerifySignupOtp(false); setError(''); }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}
                        >
                          {language === 'id' ? 'Kembali' : 'Back'}
                        </button>
                      </div>
                    </>
                  ) : isForgotPassword ? (
                    <>
                      <div className="register-divider" style={{ margin: '12px 0 6px', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'id' ? 'Lupa Kata Sandi' : language === 'bn' ? 'Lupa Kata Laluan' : 'Forgot Password'}
                        </span>
                      </div>

                      {forgotPasswordStep === 'email' ? (
                        <form onSubmit={handleStartForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t('register.email', language)}</span>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              placeholder="you@example.com"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}
                            />
                          </label>
                          {error && <p className="register-error" style={{ fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
                          <button className="checkout-submit-btn" type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin" /> : (language === 'id' ? 'Kirim Kode OTP' : 'Send OTP Code')}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setIsForgotPassword(false); setError(''); }}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '12px', alignSelf: 'center', marginTop: '4px' }}
                          >
                            {language === 'id' ? 'Kembali ke Login' : 'Back to Login'}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyAndResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>
                            {language === 'id' 
                              ? `Masukkan kode OTP yang dikirim ke ${email} beserta kata sandi baru Anda.` 
                              : `Enter the OTP sent to ${email} and your new password.`}
                          </p>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Kode OTP</span>
                            <input
                              type="text"
                              value={otpCode}
                              onChange={(e) => handleOtpInputChange(e.target.value)}
                              onPaste={handleOtpInputPaste}
                              required
                              maxLength={OTP_CODE_LENGTH}
                              placeholder={"1".repeat(OTP_CODE_LENGTH)}
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', letterSpacing: '2px', fontWeight: 'bold', textAlign: 'center' }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                              {language === 'id' ? 'Kata Sandi Baru' : 'New Password'}
                            </span>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              minLength={8}
                              placeholder="••••••••"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}
                            />
                          </label>
                          {error && <p className="register-error" style={{ fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
                          <button className="checkout-submit-btn" type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin" /> : (language === 'id' ? 'Atur Ulang Kata Sandi' : 'Reset Password')}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setForgotPasswordStep('email'); setError(''); }}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '12px', alignSelf: 'center', marginTop: '4px' }}
                          >
                            {language === 'id' ? 'Ubah Email' : 'Change Email'}
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="register-divider" style={{ margin: '12px 0 6px', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hubungkan Akun Anda</span>
                      </div>

                      <button 
                        className="register-google-btn" 
                        type="button" 
                        onClick={handleGoogleSignIn} 
                        disabled={loading} 
                        style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          color: '#ffffff', 
                          borderRadius: '14px', 
                          padding: '12px', 
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '4px' }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        {t('register.google', language)}
                      </button>

                      <div className="register-divider" style={{ margin: '4px 0', color: 'rgba(255,255,255,0.3)' }}>
                        <span>{t('register.or', language)}</span>
                      </div>

                      <form onSubmit={handleEmailAuth} className="register-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                        {!isLogin && (
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t('register.name', language)}</span>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              autoComplete="name"
                              placeholder="Ahmad Muhtar"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}
                            />
                          </label>
                        )}
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t('register.email', language)}</span>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="you@example.com"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{t('register.password', language)}</span>
                            {isLogin && (
                              <button 
                                type="button" 
                                onClick={() => { setIsForgotPassword(true); setForgotPasswordStep('email'); setError(''); }}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 600 }}
                              >
                                {language === 'id' ? 'Lupa sandi?' : 'Forgot password?'}
                              </button>
                            )}
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            placeholder="••••••••"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}
                          />
                        </label>

                        {error && <p className="register-error" style={{ fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}

                        <button className="checkout-submit-btn" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
                          {loading ? (
                            <><Loader2 size={16} className="spin" /> {t('register.processing', language)}</>
                          ) : (
                            <>{isLogin ? t('register.loginSubmit', language) : t('register.submit', language)} <ArrowRight size={16} /></>
                          )}
                        </button>
                      </form>

                      <p className="register-login-link" style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                        {isLogin ? t('register.dontHaveAccount', language) : t('register.haveAccount', language)}{' '}
                        <button
                          type="button"
                          onClick={() => { setIsLogin(!isLogin); setError(''); }}
                          style={{
                            background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer',
                            fontWeight: 600, padding: 0, font: 'inherit', textDecoration: 'underline'
                          }}
                        >
                          {isLogin ? t('register.registerLink', language) : t('register.loginLink', language)}
                        </button>
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            {renderSupportLinks()}
          </>
        )}

        {/* Step 2: CHECKOUT */}
        {step === 'checkout' && (
          <>
            <div className="register-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setStep('pilih')} 
                  style={{ background: 'transparent', border: 0, color: '#ffffff', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                  aria-label="Kembali"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 id="register-title" style={{ fontSize: '20px', color: '#ffffff' }}>Checkout</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Step 2 dari 3: Selesaikan pembayaran</p>
                </div>
              </div>
              <button className="register-close" onClick={onClose} aria-label={t('register.close', language)}>
                <X size={20} />
              </button>
            </div>

            {/* Selected plan summary */}
            <div className="register-plan-summary">
              <span className="register-plan-label">{t('register.selectedPlan', language)}</span>
              <div className="register-plan-info">
                <strong>{planDisplayNames[selectedPlan]?.[language] ?? selectedPlan}</strong>
                <span>{getPriceDisplay(selectedPlan, selectedDuration)} / {durationLabels[selectedDuration][language].toLowerCase()}</span>
              </div>
            </div>

            <div className="manual-transfer-container">
                <div className="payment-method-card selected" style={{ marginBottom: '14px' }}>
                  <div className="pm-info">
                    <div className="pm-text">
                      <span className="pm-name">Transfer Manual</span>
                      <span className="pm-desc">Transfer, upload bukti, lalu tunggu review admin.</span>
                    </div>
                  </div>
                  <div className="pm-check-dot"></div>
                </div>
                {fetchingInvoice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', gap: '12px' }}>
                    <Loader2 className="spin" size={28} color="#3b82f6" />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Menyiapkan detail transfer...</p>
                  </div>
                ) : invoiceError ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', gap: '12px', textAlign: 'center' }}>
                    <AlertCircle size={28} color="#ef4444" />
                    <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>{invoiceError}</p>
                    <button onClick={fetchInvoice} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Coba Lagi</button>
                  </div>
                ) : invoice ? (
                  <>
                    <div className="total-transfer-box">
                      <span className="total-transfer-label">TOTAL TRANSFER</span>
                      <strong className="total-transfer-amount">{invoice.amountLabel}</strong>
                      <p className="total-transfer-notice">
                        *Pastikan transfer sesuai hingga 3 digit terakhir{' '}
                        <strong>({invoice.uniqueSuffix || invoice.id.slice(-3).replace(/[^0-9]/g, '3')})</strong>
                      </p>
                    </div>

                    <div className="qris-box">
                      <div className="qris-image">
                        {/* Custom Scalable Red vector QRIS SVG */}
                        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                          <rect x="0" y="0" width="200" height="28" fill="#E1251B" rx="4" />
                          <text x="100" y="17" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">QRIS MANUAL</text>
                          <rect x="25" y="42" width="150" height="150" fill="none" stroke="#E1251B" strokeWidth="2" rx="4" />
                          <rect x="35" y="52" width="30" height="30" fill="#000000" />
                          <rect x="40" y="57" width="20" height="20" fill="#ffffff" />
                          <rect x="45" y="62" width="10" height="10" fill="#000000" />
                          <rect x="135" y="52" width="30" height="30" fill="#000000" />
                          <rect x="140" y="57" width="20" height="20" fill="#ffffff" />
                          <rect x="145" y="62" width="10" height="10" fill="#000000" />
                          <rect x="35" y="142" width="30" height="30" fill="#000000" />
                          <rect x="40" y="147" width="20" height="20" fill="#ffffff" />
                          <rect x="45" y="152" width="10" height="10" fill="#000000" />
                          <rect x="75" y="52" width="10" height="10" fill="#000000" />
                          <rect x="95" y="52" width="15" height="5" fill="#000000" />
                          <rect x="120" y="52" width="5" height="10" fill="#000000" />
                          <rect x="75" y="72" width="15" height="10" fill="#000000" />
                          <rect x="100" y="67" width="10" height="15" fill="#000000" />
                          <rect x="115" y="72" width="10" height="10" fill="#000000" />
                          <rect x="35" y="92" width="15" height="5" fill="#000000" />
                          <rect x="60" y="92" width="10" height="10" fill="#000000" />
                          <rect x="80" y="87" width="25" height="10" fill="#000000" />
                          <rect x="115" y="92" width="10" height="15" fill="#000000" />
                          <rect x="135" y="92" width="15" height="10" fill="#000000" />
                          <rect x="160" y="87" width="5" height="20" fill="#000000" />
                          <rect x="35" y="112" width="10" height="15" fill="#000000" />
                          <rect x="55" y="112" width="20" height="10" fill="#000000" />
                          <rect x="85" y="112" width="10" height="15" fill="#000000" />
                          <rect x="105" y="107" width="15" height="10" fill="#000000" />
                          <rect x="130" y="112" width="5" height="10" fill="#000000" />
                          <rect x="145" y="112" width="20" height="15" fill="#000000" />
                          <rect x="75" y="132" width="10" height="10" fill="#000000" />
                          <rect x="95" y="132" width="15" height="15" fill="#000000" />
                          <rect x="120" y="132" width="10" height="10" fill="#000000" />
                          <rect x="75" y="152" width="25" height="10" fill="#000000" />
                          <rect x="110" y="147" width="10" height="15" fill="#000000" />
                          <rect x="130" y="152" width="15" height="10" fill="#000000" />
                          <rect x="155" y="147" width="10" height="20" fill="#000000" />
                          <rect x="75" y="172" width="10" height="10" fill="#000000" />
                          <rect x="95" y="167" width="15" height="10" fill="#000000" />
                          <rect x="120" y="172" width="20" height="5" fill="#000000" />
                          <rect x="150" y="172" width="15" height="10" fill="#000000" />
                        </svg>
                      </div>
                      <span>Scan QRIS Manual</span>
                    </div>

                    {invoice.instructions.banks && invoice.instructions.banks.length > 0 ? (
                      invoice.instructions.banks.map((bank: any, idx: number) => {
                        const isCopied = copiedBankIndex === idx;
                        return (
                          <div className="bank-details-card" key={idx} style={{ marginTop: idx > 0 ? '12px' : '0' }}>
                            <div className="bank-info-row">
                              <span className="bank-name-label">{bank.bankName}</span>
                              <button 
                                className={`bank-copy-btn ${isCopied ? 'copied' : ''}`}
                                onClick={() => handleCopyBankDetail(bank.accountNumber, idx)}
                                type="button"
                              >
                                {isCopied ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="bank-info-row" style={{ marginTop: '4px' }}>
                              <span className="bank-account-number">{bank.accountNumber}</span>
                            </div>
                            <div className="bank-info-row">
                              <span className="bank-account-name">{bank.accountName}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bank-details-card">
                        <div className="bank-info-row">
                          <span className="bank-name-label">{invoice.instructions.bankName}</span>
                          <button 
                            className={`bank-copy-btn ${copied ? 'copied' : ''}`}
                            onClick={() => handleCopyAccount(invoice.instructions.accountNumber)}
                            type="button"
                          >
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="bank-info-row" style={{ marginTop: '4px' }}>
                          <span className="bank-account-number">{invoice.instructions.accountNumber}</span>
                        </div>
                        <div className="bank-info-row">
                          <span className="bank-account-name">{invoice.instructions.accountName}</span>
                        </div>
                      </div>
                    )}

                    {proofUploadReady ? (
                      <>
                        {/* Screenshot Upload Drag/Drop Box */}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          style={{ display: 'none' }} 
                          accept="image/png, image/jpeg, image/webp, application/pdf"
                        />
                        <div
                          role="button"
                          tabIndex={0}
                          className={`receipt-upload-box ${uploadedFile ? 'uploaded' : ''}`}
                          onClick={handleUploadClick}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleUploadClick();
                            }
                          }}
                        >
                          <UploadCloud className="upload-icon" />
                          <p>{uploadedFile ? uploadedFile.name : 'Klik untuk upload screenshot'}</p>
                          <span>Maksimal 5MB (JPG, PNG, WebP, PDF)</span>
                        </div>
                      </>
                    ) : (
                      <div className="receipt-upload-box uploaded">
                        <AlertCircle className="upload-icon" />
                        <p>Upload otomatis belum siap</p>
                        <span>Kirim bukti transfer lewat WhatsApp atau Instagram dengan ID invoice ini.</span>
                      </div>
                    )}

                    {/* Manual confirmation */}
                    <button
                      type="button"
                      className="turnstile-mock-container"
                      onClick={() => setTurnstileVerified(!turnstileVerified)}
                      aria-pressed={turnstileVerified}
                    >
                      <div className="turnstile-left">
                        <div className={`turnstile-box ${turnstileVerified ? 'checked' : ''}`}>
                          {turnstileVerified && <Check size={14} color="#ffffff" />}
                        </div>
                        <span className="turnstile-text">Konfirmasi bukti transfer</span>
                      </div>
                      <div className="turnstile-right">
                        <div className="turnstile-cf-logo">
                          <span>Manual check</span>
                        </div>
                        <span className="turnstile-links">No auto charge</span>
                      </div>
                    </button>

                    {error && <p className="register-error" role="alert" style={{ margin: 0 }}>{error}</p>}

                    {renderSupportLinks()}

                    <button 
                      className="checkout-submit-btn" 
                      type="button" 
                      onClick={handleCheckoutSubmit}
                      disabled={paymentLoading || (proofUploadReady && (!uploadedFile || !turnstileVerified))}
                    >
                      {paymentLoading ? (
                        <><Loader2 size={16} className="spin" /> Memproses...</>
                      ) : !proofUploadReady ? (
                        <>Kirim Bukti via WhatsApp <ArrowRight size={16} /></>
                      ) : (
                        <>Kirim Bukti & Tunggu Review <ArrowRight size={16} /></>
                      )}
                    </button>
                  </>
                ) : null}
              </div>
          </>
        )}

        {/* Step 3: SUCCESS */}
        {step === 'success' && (
          <div className="checkout-success-view">
            <div className="success-checkmark-circle">
              <Check size={32} strokeWidth={3} />
            </div>
            <div>
              <h3>Pembayaran Menunggu Review</h3>
              <p style={{ marginTop: '10px' }}>
                {proofDelivery === 'manual_support'
                  ? 'Invoice sudah masuk antrean admin. Kirim file bukti lewat WhatsApp atau Instagram dengan ID invoice agar review lebih cepat.'
                  : 'Terima kasih. Admin akan mencocokkan transfer Anda dengan invoice manual ini.'}
              </p>
            </div>
            {renderSupportLinks()}
            <button 
              className="checkout-submit-btn" 
              type="button" 
              onClick={onClose}
              style={{ marginTop: '12px' }}
            >
              Selesai
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
