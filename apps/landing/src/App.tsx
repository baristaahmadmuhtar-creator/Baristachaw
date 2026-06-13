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
import { APP_LINKS, APK_URL } from './config';
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
  return (
    <section className="pricing section-shell" aria-labelledby="pricing-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">Access</p>
          <div>
            <h2 id="pricing-title">{isId ? 'Akses Fleksibel untuk Setiap Barista.' : 'Flexible Access for Every Coffee Brewer.'}</h2>
            <p>{isId ? 'Pilih paket yang sesuai dengan gaya menyeduh Anda — dari home brewer hingga profesional kedai.' : 'Choose a tier that matches your brewing setup — from casual home extraction to professional bar workflows.'}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="plan-list">
        <ScrollReveal variant="slide-up" delay={0}>
          <article>
            <span>Free</span>
            <h3>{isId ? 'Mulai Eksplorasi' : 'Start Exploring'}</h3>
            <ul>
              <li><Check /> {isId ? 'Coba AI Brew gratis' : 'Daily free AI Brew plans'}</li>
              <li><Check /> {isId ? 'Panduan dasar menyeduh' : 'Real-time brew timer'}</li>
              <li><Check /> {isId ? 'Simpan beberapa resep favorit' : 'Save up to 5 custom recipes'}</li>
            </ul>
            <a href={APP_LINKS.aiBrew}>{isId ? 'Mulai Sekarang' : 'Start Now'} <ArrowRight /></a>
          </article>
        </ScrollReveal>
        <ScrollReveal variant="scale" delay={0.08}>
          <article className="plan-featured">
            <span>Beta Barista</span>
            <h3>{isId ? 'Barista Premium' : 'Premium Barista'}</h3>
            <ul>
              <li><Check /> {isId ? 'Profil rasa tak terbatas' : 'Unlimited flavor profiles (Sweet, Bright, Body)'}</li>
              <li><Check /> {isId ? 'Kalibrasi presisi grinder Anda' : 'Grinder setting calculations & conversions'}</li>
              <li><Check /> {isId ? 'Asisten AI kopi yang cerdas' : 'Unlimited AI Coffee Coach diagnostic chats'}</li>
            </ul>
            <a href={APP_LINKS.register}>{isId ? 'Daftar Beta — Gratis' : 'Join Free Beta'} <ArrowRight /></a>
          </article>
        </ScrollReveal>
        <ScrollReveal variant="slide-up" delay={0.16}>
          <article>
            <span>Cafe Team</span>
            <h3>{isId ? 'Kedai & Profesional' : 'Café & Professional'}</h3>
            <ul>
              <li><Check /> {isId ? 'Standarisasi SOP resep kedai' : 'Standardize recipe SOPs for your team'}</li>
              <li><Check /> {isId ? 'Mode batch brew cepat' : 'High-volume batch brew calculations'}</li>
              <li><Check /> {isId ? 'Akses untuk seluruh tim barista' : 'Multi-seat team manager access'}</li>
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
