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
import { APP_LINKS, APK_URL } from './config';
import { DownloadPage } from './pages/DownloadPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SupportPage } from './pages/SupportPage';
import { TermsPage } from './pages/TermsPage';

function EvidenceSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const evidence = [
    ['100%', isId ? 'Rasa Konsisten' : 'Taste Consistency'],
    ['16+', isId ? 'Alat Seduh Didukung' : 'Supported Brewers'],
    ['99%', isId ? 'Kepuasan Pengguna' : 'User Satisfaction'],
    ['10.000+', isId ? 'Resep Terkalibrasi' : 'Calibrated Recipes'],
    ['0', isId ? 'Tebak-Tebakan' : 'Zero Guesswork'],
    ['Instan', isId ? 'Akses Kapan Saja' : 'Instant Access'],
  ];
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-inner">
        <ScrollReveal variant="slide-up">
          <div>
            <p className="section-index section-index-light">05 / 06</p>
            <h2 id="evidence-title">{isId ? 'Mengapa Barista dan Pencinta Kopi Memilih BaristaChaw' : 'Why Baristas and Coffee Lovers Choose BaristaChaw'}</h2>
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
                : 'BaristaChaw is designed to accompany your daily coffee ritual. Every recommendation is dynamically personalized so you always get the best cup — at home, at the office, or at your favorite café.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function PricingSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="pricing section-shell" aria-labelledby="pricing-title">
      <ScrollReveal variant="slide-up">
        <div className="section-heading">
          <p className="section-index">Access</p>
          <div>
            <h2 id="pricing-title">{isId ? 'Akses Fleksibel untuk Setiap Barista.' : 'Flexible Access for Every Barista.'}</h2>
            <p>{isId ? 'Pilih paket yang sesuai dengan gaya menyeduh Anda — dari home brewer hingga profesional kedai.' : 'Choose a plan that fits your brewing style — from home brewer to café professional.'}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="plan-list">
        <ScrollReveal variant="slide-up" delay={0}>
          <article>
            <span>Free</span>
            <h3>{isId ? 'Mulai Eksplorasi' : 'Start Exploring'}</h3>
            <ul>
              <li><Check /> {isId ? 'Coba AI Brew gratis' : 'Try AI Brew for free'}</li>
              <li><Check /> {isId ? 'Panduan dasar menyeduh' : 'Basic brewing guidance'}</li>
              <li><Check /> {isId ? 'Simpan beberapa resep favorit' : 'Save a few favorite recipes'}</li>
            </ul>
            <a href={APP_LINKS.aiBrew}>{isId ? 'Mulai Sekarang' : 'Start Now'} <ArrowRight /></a>
          </article>
        </ScrollReveal>
        <ScrollReveal variant="scale" delay={0.08}>
          <article className="plan-featured">
            <span>Beta Barista</span>
            <h3>{isId ? 'Barista Premium' : 'Premium Barista'}</h3>
            <ul>
              <li><Check /> {isId ? 'Profil rasa tak terbatas' : 'Unlimited flavor profiles'}</li>
              <li><Check /> {isId ? 'Kalibrasi presisi grinder Anda' : 'Precision grinder calibration'}</li>
              <li><Check /> {isId ? 'Asisten AI kopi yang cerdas' : 'Smart AI coffee coach'}</li>
            </ul>
            <a href={APP_LINKS.register}>{isId ? 'Daftar Beta — Gratis' : 'Join Free Beta'} <ArrowRight /></a>
          </article>
        </ScrollReveal>
        <ScrollReveal variant="slide-up" delay={0.16}>
          <article>
            <span>Cafe Team</span>
            <h3>{isId ? 'Kedai & Profesional' : 'Café & Professional'}</h3>
            <ul>
              <li><Check /> {isId ? 'Standarisasi SOP resep kedai' : 'Standardized café recipe SOPs'}</li>
              <li><Check /> {isId ? 'Mode batch brew cepat' : 'Fast batch brew mode'}</li>
              <li><Check /> {isId ? 'Akses untuk seluruh tim barista' : 'Access for your entire barista team'}</li>
            </ul>
            <Link to="/support?topic=general">{isId ? 'Hubungi Kami' : 'Contact Us'} <ArrowRight /></Link>
          </article>
        </ScrollReveal>
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
      <ScrollReveal variant="blur">
        <section className="final-cta">
          <div>
            <p>Baristachaw AI Brew</p>
            <h2>{isId ? 'Mulai Seduh Kopi Terbaik Anda Hari Ini.' : 'Start Brewing Your Best Coffee Today.'}</h2>
            <span>{isId ? 'Bergabung dengan ribuan home barista dan profesional yang sudah merasakan kenyamanan menyeduh kopi yang konsisten, kaya rasa, dan menyenangkan — setiap hari.' : 'Join thousands of home baristas and professionals who have discovered the joy of brewing consistent, flavorful, and delightful coffee — every single day.'}</span>
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
        <div><strong>Baristachaw</strong><span>{isId ? 'Asisten kopi cerdas untuk ritual seduh terbaik Anda.' : 'Your smart coffee companion for the perfect brew.'}</span></div>
      </div>
      <nav aria-label="Footer">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/support">Support</Link>
        <Link to="/download">{isId ? 'Unduh' : 'Download'}</Link>
        <a href={APP_LINKS.home}>Web App</a>
      </nav>
      <p>© 2026 Baristachaw. {isId ? 'Kopi terbaik dimulai dari ritual yang tepat.' : 'Great coffee starts with the right ritual.'}</p>
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
