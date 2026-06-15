import { ArrowRight, Check, CircleAlert, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { APP_LINKS, APK_URL, PRICING, type BillingDuration, formatCurrency, getCurrencyForRegion, type Region } from './config';
import type { Language } from './i18n';
import { t } from './i18n';
import { DownloadPage } from './pages/DownloadPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
import { TermsPage } from './pages/TermsPage';

function EvidenceSection({ language }: { language: Language }) {
  const evidence: [string, string][] = [
    ['100%', t('evidence.consistency', language)],
    ['36+', t('evidence.brewers', language)],
    ['99%', t('evidence.satisfaction', language)],
    ['10.000+', t('evidence.recipes', language)],
    ['0', t('evidence.guesswork', language)],
    [t('evidence.instant', language), t('evidence.access', language)],
  ];
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-inner">
        <ScrollReveal variant="dramatic">
          <div>
            <p className="section-index section-index-light">05 / 06</p>
            <h2 id="evidence-title">{t('evidence.title', language)}</h2>
          </div>
        </ScrollReveal>
        <div className="evidence-grid">
          {evidence.map(([value, label], index) => (
            <ScrollReveal key={label} variant="scale" delay={index * 0.06}>
              <div><strong>{value}</strong><span>{label}</span></div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal variant="fade" delay={0.2}>
          <div className="honesty-note">
            <CircleAlert />
            <p>{t('evidence.note', language)}</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

type RegisterState = {
  open: boolean;
  plan: 'free' | 'plus' | 'pro' | 'team';
};

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

function PricingSection({ language, region, onRegionChange, onRegister }: { language: Language; region: Region; onRegionChange: (r: Region) => void; onRegister: (plan: 'free' | 'plus' | 'pro' | 'team') => void }) {
  const [duration, setDuration] = useState<BillingDuration>('quarterly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const plusTier = PRICING.plus[duration];
  const proTier = PRICING.pro[duration];
  const currency = getCurrencyForRegion(region);

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
    <section className="pricing section-shell" aria-labelledby="pricing-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">{t('pricing.index', language)}</p>
          <div className="pricing-title-row">
            <div>
              <h2 id="pricing-title">{t('pricing.title', language)}</h2>
              <p>{t('pricing.subtitle', language)}</p>
            </div>
            <div className="region-selector-dropdown">
              <select 
                value={region} 
                onChange={(e) => onRegionChange(e.target.value as Region)}
                className="region-select"
                aria-label="Select Region"
              >
                <option value="id">Indonesia</option>
                <option value="bn">Brunei</option>
                <option value="my">Malaysia</option>
                <option value="sg">Singapore</option>
                <option value="au">Australia</option>
                <option value="us">United States</option>
                <option value="eu">Europe</option>
                <option value="global">Global</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Duration Toggle */}
      <ScrollReveal variant="fade" delay={0.05}>
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
              <li><Check size={16} /> {t('plan.free.f1', language)}</li>
              <li><Check size={16} /> {t('plan.free.f2', language)}</li>
              <li><Check size={16} /> {t('plan.free.f3', language)}</li>
              <li><Check size={16} /> {t('plan.free.f4', language)}</li>
              <li><Check size={16} /> {t('plan.free.f5', language)}</li>
            </ul>
            <button className="plan-cta" type="button" onClick={() => onRegister('free')}>
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
              <li><Check size={16} /> {t('plan.plus.f1', language)}</li>
              <li><Check size={16} /> {t('plan.plus.f2', language)}</li>
              <li><Check size={16} /> {t('plan.plus.f3', language)}</li>
              <li><Check size={16} /> {t('plan.plus.f4', language)}</li>
              <li><Check size={16} /> {t('plan.plus.f5', language)}</li>
            </ul>
            <button className="plan-cta plan-cta-primary" type="button" onClick={() => onRegister('plus')}>
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
              <li><Check size={16} /> {t('plan.pro.f1', language)}</li>
              <li><Check size={16} /> {t('plan.pro.f2', language)}</li>
              <li><Check size={16} /> {t('plan.pro.f3', language)}</li>
              <li><Check size={16} /> {t('plan.pro.f4', language)}</li>
              <li><Check size={16} /> {t('plan.pro.f5', language)}</li>
            </ul>
            <button className="plan-cta plan-cta-pro" type="button" onClick={() => onRegister('pro')}>
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
              <li><Check size={16} /> {t('plan.team.f1', language)}</li>
              <li><Check size={16} /> {t('plan.team.f2', language)}</li>
              <li><Check size={16} /> {t('plan.team.f3', language)}</li>
              <li><Check size={16} /> {t('plan.team.f4', language)}</li>
              <li><Check size={16} /> {t('plan.team.f5', language)}</li>
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

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value as Region)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            aria-label="Select Region"
          >
            {['id','bn','my','sg','au','eu','us','global'].map(r => (
              <option key={r} value={r}>{getRegionName(r as Region)}</option>
            ))}
          </select>
          <div style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', background: 'var(--bg-elevated)', border: '1px solid var(--line)', borderRadius: '8px' }}>
            {getRegionName(region)}
            <ChevronDown size={14} style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingHome({ language, region, onRegionChange }: { language: Language; region: Region; onRegionChange: (r: Region) => void }) {
  const [registerState, setRegisterState] = useState<RegisterState>({ open: false, plan: 'free' });
  const [duration] = useState<BillingDuration>('quarterly');

  const openRegister = (plan: 'free' | 'plus' | 'pro' | 'team') => {
    if (plan === 'team') {
      window.location.href = '/support?topic=general';
      return;
    }
    window.location.href = `${APP_LINKS.register}?plan=${plan}&region=${region}&lang=${language}`;
  };

  return (
    <main>
      <HeroSection language={language} onRegister={() => setRegisterState({ open: true, plan: 'free' })} />
      <MethodSections language={language} />
      <DataShowcase language={language} />
      <BrewerGrid language={language} />
      <ToolsShowcase language={language} />
      <FeatureGraphics language={language} />
      <EvidenceSection language={language} />
      <PricingSection language={language} region={region} onRegionChange={onRegionChange} onRegister={(plan) => setRegisterState({ open: true, plan })} />
      <DownloadSection language={language} />
      <ScrollReveal variant="blur">
        <section className="final-cta">
          <div>
            <p>{t('final.brand', language)}</p>
            <h2>{t('final.title', language)}</h2>
            <span>{t('final.body', language)}</span>
          </div>
          <div className="final-actions">
            <a className="button button-light" href={APP_LINKS.aiBrew}>{t('final.tryAiBrew', language)} <ArrowRight /></a>
            <button className="button button-ghost" type="button" onClick={() => openRegister('free')}>{t('final.registerFree', language)}</button>
            <a className="button button-ghost" href={APK_URL}>Download APK</a>
          </div>
        </section>
      </ScrollReveal>

      {registerState.open && (
        <RegisterModal
          language={language}
          plan={registerState.plan}
          duration={duration}
          onClose={() => setRegisterState({ open: false, plan: 'free' })}
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
    return 'id';
  });

  const [region, setRegion] = useState<Region>(() => {
    const stored = localStorage.getItem('baristachaw-marketing-region');
    if (stored) return stored as Region;
    return 'global';
  });

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
      />
      <Routes>
        <Route path="/" element={<LandingHome language={language} region={region} onRegionChange={handleRegionChange} />} />
        <Route path="/support" element={<SupportPage language={language} />} />
        <Route path="/privacy" element={<PrivacyPage language={language} />} />
        <Route path="/terms" element={<TermsPage language={language} />} />
        <Route path="/download/*" element={<DownloadPage language={language} />} />
        <Route path="*" element={<LandingHome language={language} region={region} onRegionChange={handleRegionChange} />} />
      </Routes>
      <SiteFooter language={language} />
      <SupportChatWidget language={language} />
      {location.pathname === '/' ? (
        <div className="mobile-sticky-cta" aria-label="Quick actions">
          <a href={APP_LINKS.aiBrew}>{t('mobileCta.tryAiBrew', language)}</a>
          <a href={APK_URL}>{t('mobileCta.download', language)}</a>
        </div>
      ) : null}
    </div>
  );
}
