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
    ['16', isId ? 'method families' : 'method families'],
    ['99', isId ? 'style diaudit' : 'audited styles'],
    ['1,000/1,000', isId ? 'method/style pass' : 'method/style pass'],
    ['1,000/1,000', isId ? 'source-backed pass' : 'source-backed pass'],
    ['725', isId ? 'unit tests pass' : 'unit tests passed'],
    ['40/40', isId ? 'mobile tests' : 'mobile tests'],
  ];
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-inner">
        <div>
          <p className="section-index section-index-light">05 / 06</p>
          <h2 id="evidence-title">{isId ? 'Evidence software, bukan klaim rasa sempurna.' : 'Software evidence, not a perfect-taste claim.'}</h2>
        </div>
        <div className="evidence-grid">
          {evidence.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <div className="honesty-note">
          <CircleAlert />
          <p>
            {isId
              ? 'Software memvalidasi aritmetika, mekanik workflow, vocabulary, confidence, source fidelity, dan guardrail. Extraction fisik, sensory balance, grinder calibration, water chemistry, dan kualitas cup akhir tetap memerlukan real brew.'
              : 'Software validates arithmetic, workflow mechanics, vocabulary, confidence, source fidelity, and guardrails. Physical extraction, sensory balance, grinder calibration, water chemistry, and final cup quality still require real brewing.'}
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
          <h2 id="pricing-title">{isId ? 'Mulai sederhana. Kalibrasi dengan brew nyata.' : 'Start simple. Calibrate with real brews.'}</h2>
          <p>{isId ? 'MVP fokus pada akses yang jelas, bukan pricing yang rumit.' : 'The MVP focuses on clear access, not complicated pricing.'}</p>
        </div>
      </div>
      <div className="plan-list">
        <article>
          <span>Free</span>
          <h3>{isId ? 'Preview workflow' : 'Workflow preview'}</h3>
          <ul><li><Check /> Try AI Brew</li><li><Check /> Basic AI Coach</li><li><Check /> Limited saved recipes</li></ul>
          <a href={APP_LINKS.aiBrew}>{isId ? 'Mulai sekarang' : 'Start now'} <ArrowRight /></a>
        </article>
        <article className="plan-featured">
          <span>Beta Barista</span>
          <h3>{isId ? 'Brew log dan calibration' : 'Brew logs and calibration'}</h3>
          <ul><li><Check /> Advanced target taste</li><li><Check /> Grinder and water notes</li><li><Check /> Real brew evidence</li></ul>
          <a href={APP_LINKS.register}>{isId ? 'Daftar beta' : 'Join beta'} <ArrowRight /></a>
        </article>
        <article>
          <span>Cafe Team</span>
          <h3>{isId ? 'Workflow multi-barista' : 'Multi-barista workflow'}</h3>
          <ul><li><Check /> SOP recipes</li><li><Check /> Batch brew</li><li><Check /> Team support</li></ul>
          <Link to="/support?topic=general">{isId ? 'Hubungi kami' : 'Contact us'} <ArrowRight /></Link>
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
          <h2>{isId ? 'Mulai dengan recipe yang lebih baik. Tingkatkan dengan real brew feedback.' : 'Start with better recipes. Improve with real brew feedback.'}</h2>
          <span>{isId ? 'AI memberi starting point yang presisi. Brew nyata melengkapi kebenarannya.' : 'AI gives a precise starting point. Your real brew completes the truth.'}</span>
        </div>
        <div className="final-actions">
          <a className="button button-light" href={APP_LINKS.aiBrew}>Try AI Brew <ArrowRight /></a>
          <a className="button button-ghost" href={APP_LINKS.register}>{isId ? 'Daftar gratis' : 'Register free'}</a>
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
