import { ArrowRight, Check, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { BrewerGrid } from './components/BrewerGrid';
import { DownloadSection } from './components/DownloadSection';
import { FeatureGraphics } from './components/FeatureGraphics';
import { HeroSection } from './components/HeroSection';
import { LandingHeader } from './components/LandingHeader';
import { MethodSections } from './components/MethodSections';
import { ScrollReveal } from './components/ScrollReveal';
import { SupportChatWidget } from './components/SupportChatWidget';
import { DataShowcase } from './components/DataShowcase';
import { ToolsShowcase } from './components/ToolsShowcase';
import { APP_LINKS, APK_URL, PRICING, formatCurrency } from './config';
import { DownloadPage } from './pages/DownloadPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
import { TermsPage } from './pages/TermsPage';

function EvidenceSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const evidence = [
    ['100%', isId ? 'Rasa Konsisten' : 'Flavor Consistency'],
    ['36+', isId ? 'Alat Seduh Didukung' : 'Supported Brewers'],
    ['99%', isId ? 'Kepuasan Pengguna' : 'User Satisfaction Rate'],
    ['10.000+', isId ? 'Resep Terkalibrasi' : 'Calibrated Recipes'],
    ['0', isId ? 'Tebak-Tebakan' : 'Guesswork Needed'],
    ['Instan', isId ? 'Akses Kapan Saja' : 'App Access'],
  ];
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-inner">
        <ScrollReveal variant="dramatic">
          <div>
            <p className="section-index section-index-light">05 / 06</p>
            <h2 id="evidence-title">{isId ? 'Mengapa Barista dan Pencinta Kopi Memilih BaristaChaw' : 'Why Coffee Lovers Rely on BaristaChaw'}</h2>
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
            <p>
              {isId
                ? 'BaristaChaw dirancang untuk mendampingi ritual kopi harian Anda. Setiap rekomendasi disesuaikan secara dinamis agar Anda selalu mendapatkan cangkir kopi terbaik — di rumah, di kantor, atau di kedai favorit Anda.'
                : 'BaristaChaw is crafted to elevate your daily coffee ritual. Each recommendation is dynamically tailored to your specific setup so you can unlock the best possible extraction — at home, at the office, or on the bar.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function PricingSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const [duration, setDuration] = useState<'monthly' | 'quarterly' | 'yearly'>('quarterly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const plusTier = PRICING.plus[duration];
  const proTier = PRICING.pro[duration];

  const durationLabels: Record<string, { id: string; en: string }> = {
    monthly: { id: '1 Bulan', en: '1 Month' },
    quarterly: { id: '3 Bulan', en: '3 Months' },
    yearly: { id: '1 Tahun', en: '1 Year' },
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
          <p className="section-index">Pricing</p>
          <div>
            <h2 id="pricing-title">{isId ? 'Pilih Paket Terbaik untuk Ritual Kopi Anda.' : 'Choose the Perfect Plan for Your Coffee Ritual.'}</h2>
            <p>{isId ? 'Dari home brewer hingga barista profesional — semua paket dirancang agar kopi Anda selalu sempurna.' : 'From casual home brewing to professional bar workflows — every plan is engineered for extraction excellence.'}</p>
          </div>
        </div>
      </ScrollReveal>

      {/* Duration Toggle */}
      <ScrollReveal variant="fade" delay={0.05}>
        <div className="plan-duration-toggle" role="radiogroup" aria-label={isId ? 'Pilih durasi' : 'Select duration'}>
          {(['monthly', 'quarterly', 'yearly'] as const).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={duration === d}
              className={duration === d ? 'active' : ''}
              onClick={() => setDuration(d)}
            >
              {isId ? durationLabels[d].id : durationLabels[d].en}
              {d === 'yearly' && <span className="toggle-save-chip">{isId ? 'Terbaik!' : 'Best!'}</span>}
            </button>
          ))}
        </div>
      </ScrollReveal>

      <div className="plan-list">
        {/* FREE */}
        <ScrollReveal variant="slide-up" delay={0}>
          <article className="plan-card">
            <span className="plan-tier-badge">Free</span>
            <h3>{isId ? 'Mulai Eksplorasi' : 'Start Exploring'}</h3>
            <div className="plan-price-display">
              <strong className="plan-price-main">{isId ? 'Gratis' : 'Free'}</strong>
              <span className="plan-price-sub">{isId ? 'Selamanya' : 'Forever'}</span>
            </div>
            <ul>
              <li><Check size={16} /> {isId ? 'Brew Timer interaktif' : 'Interactive Brew Timer'}</li>
              <li><Check size={16} /> {isId ? 'Kalkulator Grind Size' : 'Grind Size Calculator'}</li>
              <li><Check size={16} /> {isId ? 'Kalkulator Rasio Kopi' : 'Coffee Ratio Calculator'}</li>
              <li><Check size={16} /> {isId ? 'Koleksi & Catatan Resep' : 'Recipe Collection & Notes'}</li>
              <li><Check size={16} /> {isId ? 'AI Brew harian terbatas' : 'Limited daily AI Brew'}</li>
            </ul>
            <a className="plan-cta" href={APP_LINKS.aiBrew}>{isId ? 'Mulai Sekarang' : 'Start Now'} <ArrowRight size={16} /></a>
          </article>
        </ScrollReveal>

        {/* BARISTA PLUS — Featured */}
        <ScrollReveal variant="scale" delay={0.08}>
          <article className="plan-card plan-featured">
            <div className="plan-best-value">{isId ? 'TERLARIS' : 'BEST VALUE'}</div>
            <span className="plan-tier-badge">Barista Plus</span>
            <h3>{isId ? 'Home Barista Serius' : 'Serious Home Barista'}</h3>
            <div className="plan-price-display">
              {plusTier.discountPct > 0 && (
                <span className="plan-price-original">
                  {formatCurrency(plusTier.original.idr, 'idr')}
                </span>
              )}
              <strong className="plan-price-main">
                {formatCurrency(plusTier.discounted.idr, 'idr')}
              </strong>
              <span className="plan-price-sub">
                / {isId ? durationLabels[duration].id.toLowerCase() : durationLabels[duration].en.toLowerCase()}
              </span>
              <span className="plan-price-alt">
                {formatCurrency(plusTier.discounted.bnd, 'bnd')} · {formatCurrency(plusTier.discounted.usd, 'usd')}
              </span>
            </div>
            {plusTier.discountPct > 0 && (
              <div className="plan-discount-badge">
                {isId ? plusTier.saveLabel.id : plusTier.saveLabel.en}
              </div>
            )}
            <ul>
              <li><Check size={16} /> {isId ? 'Semua fitur Free' : 'All Free features'}</li>
              <li><Check size={16} /> {isId ? 'AI Brew Unlimited (Basic + Advanced)' : 'Unlimited AI Brew (Basic + Advanced)'}</li>
              <li><Check size={16} /> {isId ? 'AI Chat terbatas (15/hari)' : 'AI Chat limited (15/day)'}</li>
              <li><Check size={16} /> {isId ? 'Kalibrasi grinder presisi' : 'Precision grinder calibration'}</li>
              <li><Check size={16} /> {isId ? 'Profil rasa tak terbatas' : 'Unlimited flavor profiles'}</li>
            </ul>
            <a className="plan-cta plan-cta-primary" href={`${APP_LINKS.upgrade}?plan=starter&duration=${duration}`}>
              {isId ? 'Pilih Barista Plus' : 'Get Barista Plus'} <ArrowRight size={16} />
            </a>
          </article>
        </ScrollReveal>

        {/* BARISTA PRO — Premium Dark */}
        <ScrollReveal variant="scale" delay={0.14}>
          <article className="plan-card plan-pro-dark">
            <span className="plan-tier-badge plan-tier-pro">Barista Pro</span>
            <h3>{isId ? 'Barista Profesional' : 'Professional Barista'}</h3>
            <div className="plan-price-display">
              {proTier.discountPct > 0 && (
                <span className="plan-price-original">
                  {formatCurrency(proTier.original.idr, 'idr')}
                </span>
              )}
              <strong className="plan-price-main">
                {formatCurrency(proTier.discounted.idr, 'idr')}
              </strong>
              <span className="plan-price-sub">
                / {isId ? durationLabels[duration].id.toLowerCase() : durationLabels[duration].en.toLowerCase()}
              </span>
              <span className="plan-price-alt">
                {formatCurrency(proTier.discounted.bnd, 'bnd')} · {formatCurrency(proTier.discounted.usd, 'usd')}
              </span>
            </div>
            {proTier.discountPct > 0 && (
              <div className="plan-discount-badge plan-discount-pro">
                {isId ? proTier.saveLabel.id : proTier.saveLabel.en}
              </div>
            )}
            <ul>
              <li><Check size={16} /> {isId ? 'Semua fitur Barista Plus' : 'All Barista Plus features'}</li>
              <li><Check size={16} /> {isId ? 'AI Chat Unlimited' : 'Unlimited AI Chat'}</li>
              <li><Check size={16} /> {isId ? 'AI Scan & Analisis Kopi' : 'AI Scan & Coffee Analysis'}</li>
              <li><Check size={16} /> {isId ? 'AI Latte Art Generator' : 'AI Latte Art Generator'}</li>
              <li><Check size={16} /> {isId ? 'Semua fitur mendatang' : 'All upcoming features'}</li>
            </ul>
            <a className="plan-cta plan-cta-pro" href={`${APP_LINKS.upgrade}?plan=pro&duration=${duration}`}>
              {isId ? 'Pilih Barista Pro' : 'Get Barista Pro'} <ArrowRight size={16} />
            </a>
          </article>
        </ScrollReveal>

        {/* CAFÉ TEAM */}
        <ScrollReveal variant="slide-up" delay={0.2}>
          <article className="plan-card plan-team">
            <span className="plan-tier-badge">Café Team</span>
            <h3>{isId ? 'Kedai & Profesional' : 'Café & Professional'}</h3>
            <div className="plan-price-display">
              <strong className="plan-price-main">{isId ? 'Custom' : 'Custom'}</strong>
              <span className="plan-price-sub">{isId ? 'Hubungi kami' : 'Contact us'}</span>
            </div>
            <ul>
              <li><Check size={16} /> {isId ? 'Semua fitur Barista Pro' : 'All Barista Pro features'}</li>
              <li><Check size={16} /> {isId ? 'SOP resep standarisasi tim' : 'Team recipe SOP standardization'}</li>
              <li><Check size={16} /> {isId ? 'Batch brew kalkulasi cepat' : 'High-volume batch calculations'}</li>
              <li><Check size={16} /> {isId ? 'Multi-seat akses tim barista' : 'Multi-seat team access'}</li>
              <li><Check size={16} /> {isId ? 'Dukungan prioritas 12 jam' : '12-hour priority support'}</li>
            </ul>
            <Link className="plan-cta" to="/support?topic=general">
              {isId ? 'Hubungi Kami' : 'Contact Us'} <ArrowRight size={16} />
            </Link>
          </article>
        </ScrollReveal>
      </div>

      {/* Promo Code */}
      <ScrollReveal variant="fade" delay={0.1}>
        <div className="promo-section">
          <p className="promo-label">{isId ? 'Punya kode promo?' : 'Have a promo code?'}</p>
          <div className="promo-input-wrap">
            <input
              type="text"
              className="promo-input"
              placeholder={isId ? 'Masukkan kode promo...' : 'Enter promo code...'}
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
              maxLength={20}
              aria-label={isId ? 'Kode promo' : 'Promo code'}
            />
            <button
              className="promo-apply"
              onClick={handlePromoApply}
              disabled={promoCode.trim().length < 4}
            >
              {promoApplied ? (isId ? '✓ Diterapkan' : '✓ Applied') : (isId ? 'Terapkan' : 'Apply')}
            </button>
          </div>
          {promoApplied && (
            <p className="promo-success">
              {isId ? 'Kode promo akan diterapkan saat checkout.' : 'Promo code will be applied at checkout.'}
            </p>
          )}
        </div>
      </ScrollReveal>
    </section>
  );
}

function LandingHome({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <main>
      <HeroSection language={language} />
      <MethodSections language={language} />
      <DataShowcase language={language} />
      <BrewerGrid language={language} />
      <ToolsShowcase language={language} />
      <FeatureGraphics language={language} />
      <EvidenceSection language={language} />
      <PricingSection language={language} />
      <DownloadSection language={language} />
      <ScrollReveal variant="blur">
        <section className="final-cta">
          <div>
            <p>Baristachaw AI Brew</p>
            <h2>{isId ? 'Mulai Seduh Kopi Terbaik Anda Hari Ini.' : 'Start Extracting Exceptional Coffee Today.'}</h2>
            <span>{isId ? 'Bergabung dengan ribuan home barista dan profesional yang sudah merasakan kenyamanan menyeduh kopi yang konsisten, kaya rasa, dan menyenangkan — setiap hari.' : 'Join thousands of home brewers and coffee professionals who have elevated their morning rituals with consistent, flavorful, and repeatable extractions — every single day.'}</span>
          </div>
          <div className="final-actions">
            <a className="button button-light" href={APP_LINKS.aiBrew}>{isId ? 'Coba AI Brew' : 'Try AI Brew'} <ArrowRight /></a>
            <a className="button button-ghost" href={APP_LINKS.register}>{isId ? 'Daftar Gratis' : 'Register Free'}</a>
            <a className="button button-ghost" href={APK_URL}>Download APK</a>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}

function SiteFooter({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/assets/baristachaw-logo.png" alt="" />
        <div><strong>Baristachaw</strong><span>{isId ? 'Asisten kopi cerdas untuk ritual seduh terbaik Anda.' : 'Your intelligent brewing companion for the perfect extraction.'}</span></div>
      </div>
      <nav aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/support">Support</Link>
        <Link to="/download">{isId ? 'Unduh' : 'Download'}</Link>
        <a href={APP_LINKS.home}>Web App</a>
      </nav>
      <p>© 2026 Baristachaw. {isId ? 'Kopi terbaik dimulai dari ritual yang tepat.' : 'Exceptional coffee begins with a precise ritual.'}</p>
    </footer>
  );
}

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [pathname]);
  return null;
}

export function App() {
  const [language, setLanguage] = useState<'id' | 'en'>(() => {
    const stored = localStorage.getItem('baristachaw-marketing-language');
    return stored === 'en' ? 'en' : 'id';
  });
  const location = useLocation();

  const handleLanguageChange = (next: 'id' | 'en') => {
    setLanguage(next);
    localStorage.setItem('baristachaw-marketing-language', next);
    document.documentElement.lang = next;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="marketing-app">
      <ScrollManager />
      <LandingHeader language={language} onLanguageChange={handleLanguageChange} />
      <Routes>
        <Route path="/" element={<LandingHome language={language} />} />
        <Route path="/support" element={<SupportPage language={language} />} />
        <Route path="/privacy" element={<PrivacyPage language={language} />} />
        <Route path="/terms" element={<TermsPage language={language} />} />
        <Route path="/download/*" element={<DownloadPage language={language} />} />
        <Route path="*" element={<LandingHome language={language} />} />
      </Routes>
      <SiteFooter language={language} />
      <SupportChatWidget language={language} />
      {location.pathname === '/' ? (
        <div className="mobile-sticky-cta" aria-label="Quick actions">
          <a href={APP_LINKS.aiBrew}>{language === 'id' ? 'Coba AI Brew' : 'Try AI Brew'}</a>
          <a href={APK_URL}>Download</a>
        </div>
      ) : null}
    </div>
  );
}
