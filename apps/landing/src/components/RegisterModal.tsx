import { ArrowRight, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { APP_LINKS, type BillingDuration, formatCurrencyByLang, getCurrencyForLanguage, PRICING } from '../config';

type RegisterModalProps = {
  language: Language;
  plan: 'free' | 'plus' | 'pro' | 'team';
  duration: BillingDuration;
  onClose: () => void;
};

export function RegisterModal({ language, plan, duration, onClose }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (plan === 'free') {
        // Redirect to app register page for free plan
        window.location.href = `${APP_LINKS.register}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
        return;
      }

      if (plan === 'team') {
        window.location.href = '/support?topic=general';
        return;
      }

      // For paid plans, create checkout via Mayar
      const res = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          duration,
          email,
          name,
          currency,
          language,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Payment creation failed');
      }

      const { checkoutUrl } = await res.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        // Fallback: redirect to app upgrade page
        window.location.href = `${APP_LINKS.upgrade}?plan=${plan}&duration=${duration}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Redirect to app's Google OAuth flow with plan info
    const returnUrl = plan === 'free'
      ? APP_LINKS.home
      : `${APP_LINKS.upgrade}?plan=${plan}&duration=${duration}`;
    window.location.href = `${APP_LINKS.login}?provider=google&redirect=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <div className="register-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="register-panel" role="dialog" aria-modal="true" aria-labelledby="register-title">
        <div className="register-header">
          <div>
            <h2 id="register-title">{t('register.title', language)}</h2>
            <p>{t('register.subtitle', language)}</p>
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

        {/* Google Sign-in */}
        <button className="register-google-btn" type="button" onClick={handleGoogleSignIn}>
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {t('register.google', language)}
        </button>

        <div className="register-divider">
          <span>{t('register.or', language)}</span>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailRegister} className="register-form">
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
              autoComplete="new-password"
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
            />
          </label>

          {error && <p className="register-error">{error}</p>}

          <button className="register-submit" type="submit" disabled={loading}>
            {loading ? (
              <><Loader2 size={16} className="spin" /> {t('register.processing', language)}</>
            ) : (
              <>{plan === 'free' ? t('register.freeCta', language) : t('register.submit', language)} <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="register-login-link">
          {t('register.haveAccount', language)}{' '}
          <a href={APP_LINKS.login}>{t('register.loginLink', language)}</a>
        </p>
      </div>
    </div>
  );
}
