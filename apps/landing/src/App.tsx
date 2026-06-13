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
    ['100%', isId ? 'Rasa Konsisten' : 'Consistent Taste'],
    ['16+', isId ? 'Metode Seduh' : 'Brewing Methods'],
    ['99%', isId ? 'Akurasi Kalibrasi' : 'Calibration Accuracy'],
    ['1.000+', isId ? 'Cangkir Teruji' : 'Tested Cups'],
    ['0', isId ? 'Coba-Coba' : 'Guesswork'],
    ['Akses', isId ? 'Kapan Saja' : 'Anywhere'],
  ];
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-inner">
        <div>
          <p className="section-index section-index-light">05 / 06</p>
          <h2 id="evidence-title">{isId ? 'Presisi Barista Sejati di Tangan Anda.' : 'True Barista Precision in Your Hands.'}</h2>
        </div>
        <div className="evidence-grid">
          {evidence.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <div className="honesty-note">
          <CircleAlert />
          <p>
            {isId
              ? 'BaristaChaw membantu Anda mendapatkan parameter seduh teoritis terbaik untuk setiap biji kopi. Sentuhan akhir tetap ada pada dedikasi Anda sebagai barista untuk menyajikan cangkir kopi yang sempurna.'
              : 'BaristaChaw helps you achieve the best theoretical brewing parameters for any coffee bean. The final touch remains with your dedication as a barista to serve the perfect cup.'}
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
          <h3>{isId ? 'Coba AI Brew' : 'Try AI Brew'}</h3>
          <ul>
            <li><Check /> {isId ? 'Uji Coba AI Brew' : 'Try AI Brew'}</li>
            <li><Check /> {isId ? 'Panduan AI Cerdas' : 'Smart AI Guidance'}</li>
            <li><Check /> {isId ? 'Simpan Resep Terbatas' : 'Limited Saved Recipes'}</li>
          </ul>
          <a href={APP_LINKS.aiBrew}>{isId ? 'Mulai Sekarang' : 'Start Now'} <ArrowRight /></a>
        </article>
        <article className="plan-featured">
          <span>Beta Barista</span>
          <h3>{isId ? 'Catatan & Kalibrasi' : 'Logs & Calibration'}</h3>
          <ul>
            <li><Check /> {isId ? 'Profil Rasa Tingkat Lanjut' : 'Advanced Taste Profiling'}</li>
            <li><Check /> {isId ? 'Kalibrasi Air & Grinder' : 'Water & Grinder Calibration'}</li>
            <li><Check /> {isId ? 'Riwayat Seduhan Riil' : 'Real Brew History'}</li>
          </ul>
          <a href={APP_LINKS.register}>{isId ? 'Daftar Beta Gratis' : 'Join Free Beta'} <ArrowRight /></a>
        </article>
        <article>
          <span>Cafe Team</span>
          <h3>{isId ? 'Kedai Kopi & Tim' : 'Coffee Shop & Team'}</h3>
          <ul>
            <li><Check /> {isId ? 'SOP Resep Standar' : 'Standardized SOP Recipes'}</li>
            <li><Check /> {isId ? 'Mode Batch Brew' : 'Batch Brew Mode'}</li>
            <li><Check /> {isId ? 'Dukungan Multi-Barista' : 'Multi-Barista Support'}</li>
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
          <h2>{isId ? 'Ciptakan Kopi Ternikmat Anda Hari Ini' : 'Craft Your Best Cup of Coffee Today'}</h2>
          <span>{isId ? 'Dapatkan kenyamanan menyeduh dengan asisten cerdas yang memandu ritual kopi harian Anda.' : 'Enjoy the convenience of brewing with a smart assistant guiding your daily coffee ritual.'}</span>
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
