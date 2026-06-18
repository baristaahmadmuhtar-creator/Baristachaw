import { ArrowRight, Check, CircleAlert, ChevronDown, Globe } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { BrewerGrid } from './components/BrewerGrid';
import { DownloadSection } from './components/DownloadSection';
import { FeatureGraphics } from './components/FeatureGraphics';
import { HeroSection } from './components/HeroSection';
import { LandingHeader } from './components/LandingHeader';
import { MethodSections } from './components/MethodSections';
import { RegisterModal } from './components/RegisterModal';
import { ScrollReveal } from './components/ScrollReveal';
import { SupportChatWidget } from './components/SupportChatWidget';
import { DataShowcase } from './components/DataShowcase';
import { ToolsShowcase } from './components/ToolsShowcase';
import { APK_AVAILABLE, APK_URL, APP_LINKS, APP_ORIGIN, PLAN_CATALOG, PRICING, RELEASE_VERSION, type BillingDuration, formatCurrency, getCurrencyForRegion, type Region } from './config';
import type { Language } from './i18n';
import { t } from './i18n';
import { DownloadPage } from './pages/DownloadPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
import { TermsPage } from './pages/TermsPage';

function ConversionProofSection({ language }: { language: Language }) {
  const benefits = [
    { id: 'b1', title: t('value.card1.title', language), desc: t('value.card1.body', language) },
    { id: 'b2', title: t('value.card2.title', language), desc: t('value.card2.body', language) },
    { id: 'b3', title: t('value.card3.title', language), desc: t('value.card3.body', language) },
    { id: 'b4', title: t('value.card4.title', language), desc: t('value.card4.body', language) },
  ];

  return (
    <section className="evidence-section conversion-proof-section" aria-labelledby="proof-title">
      <div className="evidence-inner" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <ScrollReveal variant="dramatic">
          <div>
            <p className="section-index section-index-light">{t('value.index', language)}</p>
            <h2 id="proof-title" style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: '16px' }}>{t('value.title', language)}</h2>
            <p style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: 'rgba(255,255,255,0.7)', marginBottom: '48px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              {t('value.body', language)}
            </p>
          </div>
        </ScrollReveal>
        <div className="evidence-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginTop: '48px' }}>
          {benefits.map((benefit, index) => (
            <ScrollReveal key={benefit.id} variant="scale" delay={index * 0.06}>
              <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <strong style={{ display: 'block', fontSize: '18px', marginBottom: '8px', color: '#3b82f6' }}>{benefit.title}</strong>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{benefit.desc}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal variant="fade" delay={0.3}>
          <p style={{ marginTop: '48px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '600px', margin: '48px auto 0 auto', lineHeight: '1.5' }}>
            {t('value.note', language)}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

type RegisterState = {
  open: boolean;
  plan: 'free' | 'starter' | 'plus' | 'pro' | 'team';
  duration: BillingDuration;
};

function browserLocaleParts(): { languages: string[]; timeZone: string } {
  const languages = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  return { languages, timeZone };
}

function inferInitialLanguage(): Language {
  const { languages, timeZone } = browserLocaleParts();
  if (languages.some((item) => item === 'id' || item.startsWith('id-')) || /jakarta|makassar|jayapura|pontianak/i.test(timeZone)) {
    return 'id';
  }
  if (languages.some((item) => item.endsWith('-bn') || item === 'ms-bn') || /brunei/i.test(timeZone)) {
    return 'bn';
  }
  return 'en';
}

function inferInitialRegion(): Region {
  const { languages, timeZone } = browserLocaleParts();
  if (languages.some((item) => item === 'id' || item.startsWith('id-')) || /jakarta|makassar|jayapura|pontianak/i.test(timeZone)) return 'id';
  if (languages.some((item) => item.endsWith('-bn') || item === 'ms-bn') || /brunei/i.test(timeZone)) return 'bn';
  if (languages.some((item) => item.endsWith('-my')) || /kuala_lumpur|kuching/i.test(timeZone)) return 'my';
  if (languages.some((item) => item.endsWith('-sg')) || /singapore/i.test(timeZone)) return 'sg';
  if (languages.some((item) => item.endsWith('-au')) || /sydney|melbourne|perth|brisbane|adelaide/i.test(timeZone)) return 'au';
  if (languages.some((item) => item.endsWith('-us')) || /new_york|los_angeles|chicago|denver/i.test(timeZone)) return 'us';
  return 'global';
}

function getRegionName(region: Region): string {
  switch (region) {
    case 'id': return 'Indonesia';
    case 'bn': return 'Brunei';
    case 'my': return 'Malaysia';
    case 'sg': return 'Singapore';
    case 'eu': return 'Europe';
    case 'au': return 'Australia';
    case 'us': return 'United States';
    default: return 'Global';
  }
}

function PricingSection({ language, region, onRegionChange, onRegister }: { language: Language; region: Region; onRegionChange: (r: Region) => void; onRegister: (plan: 'free' | 'starter' | 'plus' | 'pro' | 'team', duration: BillingDuration) => void }) {
  const [duration, setDuration] = useState<BillingDuration>('quarterly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const plusTier = PRICING.plus[duration];
  const proTier = PRICING.pro[duration];
  const currency = getCurrencyForRegion(region);
  const catalogFeatures = {
    free: PLAN_CATALOG.find((plan) => plan.code === 'free')?.features || [],
    plus: PLAN_CATALOG.find((plan) => plan.code === 'starter')?.features || [],
    pro: PLAN_CATALOG.find((plan) => plan.code === 'pro')?.features || [],
    team: PLAN_CATALOG.find((plan) => plan.code === 'team')?.features || [],
  };

  const durationKeys: Record<BillingDuration, string> = {
    monthly: 'pricing.1month',
    quarterly: 'pricing.3months',
    yearly: 'pricing.1year',
  };

  const handlePromoApply = () => {
    if (promoCode.trim().length >= 4) {
      setPromoApplied(true);
    }
  };

  return (
    <section id="pricing" className="pricing section-shell" aria-labelledby="pricing-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">{t('pricing.index', language)}</p>
          <div className="pricing-title-row">
            <div>
              <h2 id="pricing-title">{t('pricing.title', language)}</h2>
              <p>{t('pricing.subtitle', language)}</p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="fade" delay={0.05} style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <RegionDropdown region={region} onRegionChange={onRegionChange} language={language} />
        </div>

        {/* Duration Toggle */}
        <div className="plan-duration-toggle" role="radiogroup" aria-label={t('pricing.selectDuration', language)}>
          {(['monthly', 'quarterly', 'yearly'] as const).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={duration === d}
              className={duration === d ? 'active' : ''}
              onClick={() => setDuration(d)}
            >
              {t(durationKeys[d], language)}
              {d === 'yearly' && <span className="toggle-save-chip">{t('pricing.best', language)}</span>}
            </button>
          ))}
        </div>
      </ScrollReveal>

      <div className="plan-list">
        {/* FREE */}
        <ScrollReveal variant="slide-up" delay={0} className="pricing-reveal-wrap">
          <article className="plan-card">
            <span className="plan-tier-badge">{t('plan.free.badge', language)}</span>
            <h3>{t('plan.free.name', language)}</h3>
            <div className="plan-price-display">
              <strong className="plan-price-main">{t('plan.free.price', language)}</strong>
              <span className="plan-price-sub">{t('plan.free.period', language)}</span>
            </div>
            <ul>
              {catalogFeatures.free.map((feature) => (
                <li key={feature}><Check size={16} /> {feature}</li>
              ))}
            </ul>
            <button className="plan-cta" type="button" onClick={() => onRegister('free', duration)}>
              {t('plan.free.cta', language)} <ArrowRight size={16} />
            </button>
          </article>
        </ScrollReveal>

        {/* BARISTA PLUS — Featured */}
        <ScrollReveal variant="scale" delay={0.08} className="pricing-reveal-wrap">
          <article className="plan-card plan-featured">
            <div className="plan-best-value">{t('pricing.bestValue', language)}</div>
            <span className="plan-tier-badge">{t('plan.plus.badge', language)}</span>
            <h3>{t('plan.plus.name', language)}</h3>
            <div className="plan-price-display">
              {plusTier.discountPct > 0 && (
                <span className="plan-price-original">
                  {formatCurrency(plusTier.original[currency], currency)}
                </span>
              )}
              <strong className="plan-price-main">
                {formatCurrency(plusTier.discounted[currency], currency)}
              </strong>
              <span className="plan-price-sub">
                / {t(durationKeys[duration], language).toLowerCase()}
              </span>
            </div>
            {plusTier.discountPct > 0 && (
              <div className="plan-discount-badge">
                {plusTier.saveLabel[language]}
              </div>
            )}
            <ul>
              {catalogFeatures.plus.map((feature) => (
                <li key={feature}><Check size={16} /> {feature}</li>
              ))}
            </ul>
            <button className="plan-cta plan-cta-primary" type="button" onClick={() => onRegister('starter', duration)}>
              {t('plan.plus.cta', language)} <ArrowRight size={16} />
            </button>
          </article>
        </ScrollReveal>

        {/* BARISTA PRO — Premium Dark */}
        <ScrollReveal variant="scale" delay={0.14} className="pricing-reveal-wrap">
          <article className="plan-card plan-pro-dark">
            <span className="plan-tier-badge plan-tier-pro">{t('plan.pro.badge', language)}</span>
            <h3>{t('plan.pro.name', language)}</h3>
            <div className="plan-price-display">
              {proTier.discountPct > 0 && (
                <span className="plan-price-original">
                  {formatCurrency(proTier.original[currency], currency)}
                </span>
              )}
              <strong className="plan-price-main">
                {formatCurrency(proTier.discounted[currency], currency)}
              </strong>
              <span className="plan-price-sub">
                / {t(durationKeys[duration], language).toLowerCase()}
              </span>
            </div>
            {proTier.discountPct > 0 && (
              <div className="plan-discount-badge plan-discount-pro">
                {proTier.saveLabel[language]}
              </div>
            )}
            <ul>
              {catalogFeatures.pro.map((feature) => (
                <li key={feature}><Check size={16} /> {feature}</li>
              ))}
            </ul>
            <button className="plan-cta plan-cta-pro" type="button" onClick={() => onRegister('pro', duration)}>
              {t('plan.pro.cta', language)} <ArrowRight size={16} />
            </button>
          </article>
        </ScrollReveal>

        {/* CAFE TEAM */}
        <ScrollReveal variant="slide-up" delay={0.2} className="pricing-reveal-wrap">
          <article className="plan-card plan-team">
            <span className="plan-tier-badge">{t('plan.team.badge', language)}</span>
            <h3>{t('plan.team.name', language)}</h3>
            <div className="plan-price-display">
              <strong className="plan-price-main">{t('plan.team.price', language)}</strong>
              <span className="plan-price-sub">{t('plan.team.period', language)}</span>
            </div>
            <ul>
              {catalogFeatures.team.map((feature) => (
                <li key={feature}><Check size={16} /> {feature}</li>
              ))}
            </ul>
            <Link className="plan-cta" to="/support?topic=general">
              {t('plan.team.cta', language)} <ArrowRight size={16} />
            </Link>
          </article>
        </ScrollReveal>
      </div>

      {/* Promo Code */}
      <ScrollReveal variant="fade" delay={0.1}>
        <div className="promo-section">
          <p className="promo-label">{t('promo.label', language)}</p>
          <div className="promo-input-wrap">
            <input
              type="text"
              className="promo-input"
              placeholder={t('promo.placeholder', language)}
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
              maxLength={20}
              aria-label={t('promo.ariaLabel', language)}
            />
            <button
              className="promo-apply"
              onClick={handlePromoApply}
              disabled={promoCode.trim().length < 4}
            >
              {promoApplied ? t('promo.applied', language) : t('promo.apply', language)}
            </button>
          </div>
          {promoApplied && (
            <p className="promo-success">
              {t('promo.success', language)}
            </p>
          )}
        </div>
      </ScrollReveal>

    </section>
  );
}

import { CustomSelect } from './components/CustomSelect';

function RegionDropdown({ region, onRegionChange, language }: { region: Region; onRegionChange: (r: Region) => void; language: Language }) {
  const regions = ['id', 'bn', 'my', 'sg', 'au', 'eu', 'us', 'global'] as const;
  const options = regions.map(r => ({ value: r, label: getRegionName(r) }));

  return (
    <CustomSelect 
      id="pricing-region-select"
      type="region"
      size="normal"
      theme="light"
      value={region}
      onChange={(val) => onRegionChange(val as Region)}
      options={options}
      style={{ width: '220px', zIndex: 50 }}
    />
  );
}

function LandingHome({ language, region, onRegionChange, user, onLoginSuccess, initialRegisterState }: { language: Language; region: Region; onRegionChange: (r: Region) => void; user: any; onLoginSuccess: () => void; initialRegisterState?: RegisterState }) {
  const [registerState, setRegisterState] = useState<RegisterState>(initialRegisterState || { open: false, plan: 'free', duration: 'quarterly' });

  useEffect(() => {
    if (initialRegisterState?.open) {
      setRegisterState(initialRegisterState);
    }
  }, [initialRegisterState]);

  const openRegister = (plan: 'free' | 'starter' | 'plus' | 'pro' | 'team', duration: BillingDuration = 'quarterly') => {
    const normalizedPlan = plan === 'plus' ? 'starter' : plan;
    if (normalizedPlan === 'team') {
      window.location.href = '/support?topic=general';
      return;
    }
    if (normalizedPlan === 'free' && user) {
      window.location.href = APP_ORIGIN;
      return;
    }
    setRegisterState({ open: true, plan: normalizedPlan, duration });
  };

  return (
    <main>
      <HeroSection language={language} onRegister={() => openRegister('free')} user={user} />
      <MethodSections language={language} />
      <DataShowcase language={language} />
      <BrewerGrid language={language} />
      <ToolsShowcase language={language} />
      <FeatureGraphics language={language} />
      <ConversionProofSection language={language} />
      <PricingSection language={language} region={region} onRegionChange={onRegionChange} onRegister={openRegister} />
      <DownloadSection language={language} />
      <ScrollReveal variant="blur">
        <section className="final-cta">
          <div>
            <p>{t('final.brand', language)}</p>
            <h2>{t('final.title', language)}</h2>
            <span>{t('final.body', language)}</span>
          </div>
          <div className="final-actions">
            {user ? (
              <a className="button button-light" href={APP_ORIGIN}>{t('final.tryAiBrew', language)} <ArrowRight /></a>
            ) : (
              <>
                <a className="button button-light" href={APP_LINKS.aiBrew}>{t('final.tryAiBrew', language)} <ArrowRight /></a>
                <button className="button button-ghost" type="button" onClick={() => openRegister('free')}>{t('final.registerFree', language)}</button>
              </>
            )}
            <a className="button button-ghost" href={APK_AVAILABLE ? APK_URL : '/support?topic=download'}>
              {APK_AVAILABLE ? 'Download APK' : 'Request access'}
            </a>
          </div>
        </section>
      </ScrollReveal>

      {registerState.open && (
        <RegisterModal
          language={language}
          plan={registerState.plan}
          duration={registerState.duration}
          user={user}
          onLoginSuccess={onLoginSuccess}
          onClose={() => setRegisterState({ ...registerState, open: false })}
        />
      )}
    </main>
  );
}

function SiteFooter({ language }: { language: Language }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/assets/baristachaw-logo.png" alt="" />
        <div><strong>Baristachaw</strong><span>{t('footer.tagline', language)}</span></div>
      </div>
      <nav aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/support">Support</Link>
        <Link to="/download">{t('nav.download', language)}</Link>
        <a href={APP_LINKS.home}>Web App</a>
      </nav>
      <p>&copy; 2026 Baristachaw. {t('footer.copyright', language)}</p>
    </footer>
  );
}

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [pathname]);
  return null;
}

export function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('baristachaw-marketing-language');
    if (stored === 'en') return 'en';
    if (stored === 'bn') return 'bn';
    if (stored === 'id') return 'id';
    return inferInitialLanguage();
  });

  const [region, setRegion] = useState<Region>(() => {
    const stored = localStorage.getItem('baristachaw-marketing-region');
    if (stored) return stored as Region;
    return inferInitialRegion();
  });

  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [initialRegister, setInitialRegister] = useState<RegisterState | undefined>();

  const checkAuth = async () => {
    try {
      const res = await fetch(`${APP_ORIGIN}/api/auth/me?soft=1`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.warn('Failed to check auth status', err);
    } finally {
      setUserLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${APP_ORIGIN}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (err) {
      console.warn('Failed to log out', err);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // If we just redirected from Google OAuth with success query param
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('login_success') === '1') {
      const plan = searchParams.get('plan') as 'free' | 'starter' | 'plus' | 'pro' | 'team' | null;
      const duration = searchParams.get('duration') as BillingDuration | null;
      
      if (plan && duration) {
        setInitialRegister({ open: true, plan, duration });
      }

      const nextUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, nextUrl);
      checkAuth();
    }
  }, []);

  const location = useLocation();

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    localStorage.setItem('baristachaw-marketing-language', next);
    document.documentElement.lang = next === 'bn' ? 'ms-BN' : next;
  };

  const handleRegionChange = (next: Region) => {
    setRegion(next);
    localStorage.setItem('baristachaw-marketing-region', next);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'bn' ? 'ms-BN' : language;
  }, [language]);

  return (
    <div className="marketing-app">
      <ScrollManager />
      <LandingHeader 
        language={language} 
        onLanguageChange={handleLanguageChange} 
        region={region} 
        onRegionChange={handleRegionChange} 
        user={user}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/" element={<LandingHome language={language} region={region} onRegionChange={handleRegionChange} user={user} onLoginSuccess={checkAuth} initialRegisterState={initialRegister} />} />
        <Route path="/support" element={<SupportPage language={language} />} />
        <Route path="/privacy" element={<PrivacyPage language={language} />} />
        <Route path="/terms" element={<TermsPage language={language} />} />
        <Route path="/download/*" element={<DownloadPage language={language} />} />
        <Route path="*" element={<LandingHome language={language} region={region} onRegionChange={handleRegionChange} user={user} onLoginSuccess={checkAuth} initialRegisterState={initialRegister} />} />
      </Routes>
      <SiteFooter language={language} />
      <SupportChatWidget language={language} />
      {location.pathname === '/' ? (
        <div className="mobile-sticky-cta" aria-label="Quick actions">
          <a href={user ? APP_ORIGIN : APP_LINKS.aiBrew}>{t('mobileCta.tryAiBrew', language)}</a>
          <a href={APK_AVAILABLE ? APK_URL : '/support?topic=download'}>
            {APK_AVAILABLE ? t('mobileCta.download', language) : 'Request access'}
          </a>
        </div>
      ) : null}
    </div>
  );
}
