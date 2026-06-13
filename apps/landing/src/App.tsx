import { ArrowRight, Check, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { BrewerGrid } from './components/BrewerGrid';
import { DownloadSection } from './components/DownloadSection';
import { FeatureGraphics } from './components/FeatureGraphics';
import { HeroSection } from './components/HeroSection';
import { LandingHeader } from './components/LandingHeader';
import { MethodSections } from './components/MethodSections';
import { SupportChatWidget } from './components/SupportChatWidget';
import { APP_LINKS, APK_URL } from './config';
import { DownloadPage } from './pages/DownloadPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
import { TermsPage } from './pages/TermsPage';

function EvidenceSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const evidence = [
    ['100%', isId ? 'Rasa Konsisten' : 'Taste Consistency'],
    ['16+', isId ? 'Metode Klasik' : 'Classic Methods'],
    ['99%', isId ? 'Kepuasan Pengguna' : 'User Satisfaction'],
    ['10.000+', isId ? 'Resep Terkalibrasi' : 'Calibrated Recipes'],
    ['0', isId ? 'Tebak-Tebakan' : 'Guesswork'],
    ['Akses', isId ? 'Instan & Cepat' : 'Instant Access'],
  ];
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-inner">
        <div>
          <p className="section-index section-index-light">05 / 06</p>
          <h2 id="evidence-title">{isId ? 'Mengapa Barista dan Pencinta Kopi Memilih BaristaChaw' : 'Why Baristas and Coffee Lovers Choose BaristaChaw'}</h2>
        </div>
        <div className="evidence-grid">
          {evidence.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <div className="honesty-note">
          <CircleAlert />
          <p>
            {isId
              ? 'BaristaChaw dirancang untuk mendampingi ritual kopi Anda. Setiap rekomendasi disesuaikan secara dinamis agar Anda selalu mendapatkan cangkir kopi terbaik di rumah maupun di kedai.'
              : 'BaristaChaw is designed to accompany your daily coffee ritual. Every suggestion is dynamically tailored so you can always serve the best cup of coffee, at home or in a cafe.'}
          </p>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="pricing section-shell" aria-labelledby="pricing-title">
      <div className="section-heading">
        <p className="section-index">Access</p>
        <div>
          <h2 id="pricing-title">{isId ? 'Akses Fleksibel untuk Setiap Barista.' : 'Flexible Access for Every Barista.'}</h2>
          <p>{isId ? 'Nikmati kenyamanan menyeduh dengan pilihan fitur yang sesuai kebutuhan Anda.' : 'Enjoy the comfort of brewing with feature options tailored to your needs.'}</p>
        </div>
      </div>
      <div className="plan-list">
        <article>
          <span>Free</span>
          <h3>{isId ? 'Eksplorasi Awal' : 'Initial Exploration'}</h3>
          <ul>
            <li><Check /> {isId ? 'Coba AI Brew Gratis' : 'Free AI Brew Try'}</li>
            <li><Check /> {isId ? 'Panduan Dasar Kopi' : 'Basic Coffee Guide'}</li>
            <li><Check /> {isId ? 'Simpan Resep Terbatas' : 'Limited Saved Recipes'}</li>
          </ul>
          <a href={APP_LINKS.aiBrew}>{isId ? 'Mulai Sekarang' : 'Start Now'} <ArrowRight /></a>
        </article>
        <article className="plan-featured">
          <span>Beta Barista</span>
          <h3>{isId ? 'Barista Premium' : 'Premium Barista'}</h3>
          <ul>
            <li><Check /> {isId ? 'Profil Rasa Tak Terbatas' : 'Unlimited Taste Profiles'}</li>
            <li><Check /> {isId ? 'Kalibrasi Presisi Grinder' : 'Precision Grinder Calibration'}</li>
            <li><Check /> {isId ? 'Asisten AI Kopi Cerdas' : 'Smart AI Coffee Coach'}</li>
          </ul>
          <a href={APP_LINKS.register}>{isId ? 'Daftar Beta Gratis' : 'Join Free Beta'} <ArrowRight /></a>
        </article>
        <article>
          <span>Cafe Team</span>
          <h3>{isId ? 'Kedai & Profesional' : 'Cafe & Professional'}</h3>
          <ul>
            <li><Check /> {isId ? 'Standarisasi SOP Kedai' : 'Standardized SOP Recipes'}</li>
            <li><Check /> {isId ? 'Mode Batch Brew Cepat' : 'Fast Batch Brew Mode'}</li>
            <li><Check /> {isId ? 'Dukungan Seluruh Tim' : 'Team-wide Support'}</li>
          </ul>
          <Link to="/support?topic=general">{isId ? 'Hubungi Kami' : 'Contact Us'} <ArrowRight /></Link>
        </article>
      </div>
    </section>
  );
}

function LandingHome({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <main>
      <HeroSection language={language} />
      <MethodSections language={language} />
      <BrewerGrid language={language} />
      <FeatureGraphics language={language} />
      <EvidenceSection language={language} />
      <PricingSection language={language} />
      <DownloadSection language={language} />
      <section className="final-cta">
        <div>
          <p>Baristachaw AI Brew</p>
          <h2>{isId ? 'Mulai Seduh Kopi Terbaik Anda Hari Ini.' : 'Start Brewing Your Best Coffee Today.'}</h2>
          <span>{isId ? 'Bergabunglah dengan ribuan home barista dan profesional yang telah menemukan kenyamanan menyeduh kopi yang konsisten, kaya rasa, dan menyenangkan.' : 'Join thousands of home baristas and professionals who have discovered the ease of brewing coffee that is consistent, flavorful, and enjoyable.'}</span>
        </div>
        <div className="final-actions">
          <a className="button button-light" href={APP_LINKS.aiBrew}>Try AI Brew <ArrowRight /></a>
          <a className="button button-ghost" href={APP_LINKS.register}>{isId ? 'Daftar Gratis' : 'Register Free'}</a>
          <a className="button button-ghost" href={APK_URL}>Download APK</a>
        </div>
      </section>
    </main>
  );
}

function SiteFooter({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/assets/baristachaw-logo.png" alt="" />
        <div><strong>Baristachaw</strong><span>Precise recipes. Honest confidence. Real workflow.</span></div>
      </div>
      <nav aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/support">Support</Link>
        <Link to="/download">{isId ? 'Unduh' : 'Download'}</Link>
        <a href={APP_LINKS.home}>Web app</a>
      </nav>
      <p>© 2026 Baristachaw. {isId ? 'Real brew validation required.' : 'Real brew validation required.'}</p>
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
          <a href={APP_LINKS.aiBrew}>Try AI Brew</a>
          <a href={APK_URL}>Download</a>
        </div>
      ) : null}
    </div>
  );
}
