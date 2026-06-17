import { ArrowRight, Loader2, X, Check, Copy, UploadCloud, CreditCard, Smartphone, Coffee, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { APP_LINKS, APP_ORIGIN, type BillingDuration, formatCurrencyByLang, getCurrencyForLanguage, PRICING } from '../config';

type RegisterModalProps = {
  language: Language;
  plan: 'free' | 'plus' | 'pro' | 'team';
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

  // Step state: 'auth' | 'checkout' | 'success'
  const [step, setStep] = useState<'auth' | 'checkout' | 'success'>(() => {
    if (user && plan !== 'free' && plan !== 'team') {
      return 'checkout';
    }
    return 'auth';
  });

  const [paymentMethod, setPaymentMethod] = useState<'midtrans' | 'paypal' | 'manual'>('manual');
  const [invoice, setInvoice] = useState<any>(null);
  const [fetchingInvoice, setFetchingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currency = getCurrencyForLanguage(language);

  const planDisplayNames: Record<string, Record<Language, string>> = {
    free: { id: 'Free', en: 'Free', bn: 'Percuma' },
    plus: { id: 'Barista Plus', en: 'Barista Plus', bn: 'Barista Plus' },
    pro: { id: 'Barista Pro', en: 'Barista Pro', bn: 'Barista Pro' },
    team: { id: 'Cafe Team', en: 'Cafe Team', bn: 'Cafe Team' },
  };

  const durationLabels: Record<BillingDuration, Record<Language, string>> = {
    monthly: { id: '1 Bulan', en: '1 Month', bn: '1 Bulan' },
    quarterly: { id: '3 Bulan', en: '3 Months', bn: '3 Bulan' },
    yearly: { id: '1 Tahun', en: '1 Year', bn: '1 Tahun' },
  };

  const getPriceDisplay = (): string => {
    if (plan === 'free') return t('plan.free.price', language);
    if (plan === 'team') return 'Custom';
    const tier = PRICING[plan as 'plus' | 'pro'][duration];
    return formatCurrencyByLang(tier.discounted[currency], language);
  };

  const fetchInvoice = async () => {
    setFetchingInvoice(true);
    setInvoiceError('');
    try {
      const planCode = plan === 'plus' ? 'starter' : plan; // backend uses starter
      const res = await fetch(`${APP_ORIGIN}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planCode,
          duration,
          currency: 'idr', // Manual transfer uses IDR
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to create manual transfer invoice');
      }
      const data = await res.json();
      if (data.ok && data.manualInvoice) {
        setInvoice(data.manualInvoice);
      } else {
        throw new Error(data.error || 'Invalid response from billing server');
      }
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Failed to load checkout details');
    } finally {
      setFetchingInvoice(false);
    }
  };

  useEffect(() => {
    if (step === 'checkout' && paymentMethod === 'manual') {
      fetchInvoice();
    }
  }, [step, paymentMethod]);

  const handleProceedToCheckout = () => {
    if (plan === 'free') {
      window.location.href = APP_ORIGIN;
      return;
    }

    if (plan === 'team') {
      window.location.href = '/support?topic=general';
      return;
    }

    setStep('checkout');
  };

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
        setError('Verification email sent. Please check your inbox.');
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const returnTo = window.location.origin + `/?login_success=1&plan=${plan}&duration=${duration}`;
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Format bukti transfer harus JPG, PNG, WebP, atau PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran bukti transfer maksimal adalah 5MB.');
        return;
      }
      setUploadedFile(file);
      setError('');
    }
  };

  const handleCheckoutSubmit = async () => {
    if (paymentMethod !== 'manual') {
      setError('Metode pembayaran otomatis (Midtrans/PayPal) sedang dalam pemeliharaan. Silakan gunakan Transfer Manual.');
      return;
    }

    if (!turnstileVerified) {
      setError('Silakan centang verifikasi bahwa Anda adalah manusia.');
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
        throw new Error(data.error || 'Failed to submit proof');
      }

      const data = await res.json();
      if (data.ok) {
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
      <div className={`register-panel ${step !== 'auth' ? 'checkout-dark' : ''}`} role="dialog" aria-modal="true" aria-labelledby="register-title">
        
        {/* Step 1: AUTH */}
        {step === 'auth' && (
          <>
            <div className="register-header">
              <div>
                <h2 id="register-title">
                  {user
                    ? (plan === 'free' ? 'Mulai Sekarang' : 'Lanjutkan Pembayaran')
                    : (isLogin ? t('register.loginTitle', language) : t('register.title', language))}
                </h2>
                <p>
                  {user
                    ? `Masuk sebagai ${user.email}`
                    : (isLogin ? t('register.loginSubtitle', language) : t('register.subtitle', language))}
                </p>
              </div>
              <button className="register-close" onClick={onClose} aria-label={t('register.close', language)}>
                <X size={20} />
              </button>
            </div>

            {/* Selected plan summary */}
            <div className="register-plan-summary">
              <span className="register-plan-label">{t('register.selectedPlan', language)}</span>
              <div className="register-plan-info">
                <strong>{planDisplayNames[plan]?.[language] ?? plan}</strong>
                {plan !== 'free' && plan !== 'team' && (
                  <span>{getPriceDisplay()} / {durationLabels[duration][language].toLowerCase()}</span>
                )}
                {plan === 'free' && <span>{t('plan.free.price', language)}</span>}
              </div>
            </div>

            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                {error && <p className="register-error">{error}</p>}
                <button className="register-submit" type="button" onClick={handleProceedToCheckout} disabled={loading}>
                  {loading ? (
                    <><Loader2 size={16} className="spin" /> {t('register.processing', language)}</>
                  ) : (
                    <>{plan === 'free' ? 'Buka Aplikasi' : 'Lanjut ke Pembayaran'} <ArrowRight size={16} /></>
                  )}
                </button>
                <button
                  className="register-google-btn"
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  Keluar / Ganti Akun
                </button>
              </div>
            ) : (
              <>
                {/* Google Sign-in */}
                <button className="register-google-btn" type="button" onClick={handleGoogleSignIn} disabled={loading}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {t('register.google', language)}
                </button>

                <div className="register-divider">
                  <span>{t('register.or', language)}</span>
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailAuth} className="register-form">
                  {!isLogin && (
                    <label>
                      <span>{t('register.name', language)}</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        placeholder="Ahmad Muhtar"
                      />
                    </label>
                  )}
                  <label>
                    <span>{t('register.email', language)}</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    <span>{t('register.password', language)}</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                    />
                  </label>

                  {error && <p className="register-error">{error}</p>}

                  <button className="register-submit" type="submit" disabled={loading}>
                    {loading ? (
                      <><Loader2 size={16} className="spin" /> {t('register.processing', language)}</>
                    ) : (
                      <>{isLogin
                        ? t('register.loginSubmit', language)
                        : (plan === 'free' ? t('register.freeCta', language) : t('register.submit', language))} <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>

                <p className="register-login-link">
                  {isLogin ? t('register.dontHaveAccount', language) : t('register.haveAccount', language)}{' '}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer',
                      fontWeight: 600, padding: 0, font: 'inherit', textDecoration: 'underline'
                    }}
                  >
                    {isLogin ? t('register.registerLink', language) : t('register.loginLink', language)}
                  </button>
                </p>
              </>
            )}
          </>
        )}

        {/* Step 2: CHECKOUT */}
        {step === 'checkout' && (
          <>
            <div className="register-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setStep('auth')} 
                  style={{ background: 'transparent', border: 0, color: '#ffffff', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                  aria-label="Kembali"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 id="register-title" style={{ fontSize: '20px' }}>Checkout</h2>
                  <p style={{ fontSize: '13px' }}>Setup Membership</p>
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
                <strong>{planDisplayNames[plan]?.[language] ?? plan}</strong>
                <span>{getPriceDisplay()} / {durationLabels[duration][language].toLowerCase()}</span>
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '20px 0 10px', color: 'rgba(255,255,255,0.7)' }}>
              Metode Pembayaran
            </h3>

            <div className="payment-methods-list">
              {/* Midtrans */}
              <div 
                className={`payment-method-card ${paymentMethod === 'midtrans' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('midtrans')}
              >
                <div className="pm-info">
                  <div className="pm-icon"><Smartphone size={18} /></div>
                  <div className="pm-text">
                    <span className="pm-name">Midtrans</span>
                    <span className="pm-desc">Gopay / ShopeePay / CC (Indo)</span>
                  </div>
                </div>
                <div className="pm-check-dot"></div>
              </div>

              {/* PayPal */}
              <div 
                className={`payment-method-card ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('paypal')}
              >
                <div className="pm-info">
                  <div className="pm-icon"><CreditCard size={18} /></div>
                  <div className="pm-text">
                    <span className="pm-name">PayPal</span>
                    <span className="pm-desc">International / USD</span>
                  </div>
                </div>
                <div className="pm-check-dot"></div>
              </div>

              {/* Manual Transfer */}
              <div 
                className={`payment-method-card ${paymentMethod === 'manual' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('manual')}
              >
                <div className="pm-info">
                  <div className="pm-icon"><Coffee size={18} /></div>
                  <div className="pm-text">
                    <span className="pm-name">Manual Transfer</span>
                    <span className="pm-desc">BCA / Mandiri / QRIS Manual</span>
                  </div>
                </div>
                <div className="pm-check-dot"></div>
              </div>
            </div>

            {/* If Manual payment is chosen */}
            {paymentMethod === 'manual' && (
              <div className="manual-transfer-container">
                {fetchingInvoice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', gap: '12px' }}>
                    <Loader2 className="spin" size={28} color="#ffd233" />
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

                    {/* Screenshot Upload Drag/Drop Box */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                      accept="image/png, image/jpeg, image/webp, application/pdf"
                    />
                    <div 
                      className={`receipt-upload-box ${uploadedFile ? 'uploaded' : ''}`}
                      onClick={handleUploadClick}
                    >
                      <UploadCloud className="upload-icon" />
                      <p>{uploadedFile ? uploadedFile.name : 'Klik untuk upload screenshot'}</p>
                      <span>Maksimal 5MB (JPG, PNG, WebP, PDF)</span>
                    </div>

                    {/* Turnstile Mock Widget */}
                    <div 
                      className="turnstile-mock-container" 
                      onClick={() => setTurnstileVerified(!turnstileVerified)}
                    >
                      <div className="turnstile-left">
                        <div className={`turnstile-box ${turnstileVerified ? 'checked' : ''}`}>
                          {turnstileVerified && <Check size={14} color="#ffffff" />}
                        </div>
                        <span className="turnstile-text">Verifikasi bahwa Anda adalah manusia</span>
                      </div>
                      <div className="turnstile-right">
                        <div className="turnstile-cf-logo">
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', color: '#f6821f' }}>
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                          </svg>
                          <span>Cloudflare</span>
                        </div>
                        <span className="turnstile-links">Privasi • Bantuan</span>
                      </div>
                    </div>

                    {error && <p className="register-error" style={{ margin: 0 }}>{error}</p>}

                    <button 
                      className="checkout-submit-btn" 
                      type="button" 
                      onClick={handleCheckoutSubmit}
                      disabled={paymentLoading || !uploadedFile || !turnstileVerified}
                    >
                      {paymentLoading ? (
                        <><Loader2 size={16} className="spin" /> Memproses...</>
                      ) : (
                        <>Bayar Sekarang <ArrowRight size={16} /></>
                      )}
                    </button>
                  </>
                ) : null}
              </div>
            )}
            
            {paymentMethod !== 'manual' && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && <p className="register-error">{error}</p>}
                <button 
                  className="checkout-submit-btn" 
                  type="button"
                  onClick={handleCheckoutSubmit}
                >
                  Bayar Sekarang <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 3: SUCCESS */}
        {step === 'success' && (
          <div className="checkout-success-view">
            <div className="success-checkmark-circle">
              <Check size={32} strokeWidth={3} />
            </div>
            <div>
              <h3>Pembayaran Diterima!</h3>
              <p style={{ marginTop: '10px' }}>
                Terima kasih! Bukti transfer Anda telah berhasil dikirim ke server Baristachaw.
              </p>
              <p style={{ marginTop: '8px', opacity: 0.8, fontSize: '13px' }}>
                Admin kami akan memverifikasi transaksi Anda. Akun Anda akan ditingkatkan secara otomatis setelah proses verifikasi selesai (biasanya dalam 5-10 menit).
              </p>
            </div>
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
