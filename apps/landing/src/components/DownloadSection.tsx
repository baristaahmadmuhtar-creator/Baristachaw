import { ArrowUpRight, Download, Globe2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_LINKS, RELEASE_VERSION } from '../config';
import type { Language } from '../i18n';
import { ScrollReveal } from './ScrollReveal';

const local = {
  heading: {
    id: 'Mulai Ritual Kopi Terbaik Anda Sekarang.',
    en: 'Start Your Perfect Coffee Ritual Today.',
    bn: 'Mula Ritual Kopi Terbaik Anda Sekarang.',
  },
  subtitle: {
    id: 'Langsung gunakan web app atau unduh aplikasi Android - nikmati kenyamanan menyeduh kopi di mana saja.',
    en: 'Use the web app instantly or download the Android app - enjoy brewing comfort anywhere.',
    bn: 'Guna terus aplikasi web atau muat turun aplikasi Android - nikmati keselesaan menyeduh kopi di mana sahaja.',
  },
  webAppLabel: {
    id: 'Buka Web App',
    en: 'Use Web App',
    bn: 'Buka Aplikasi Web',
  },
  webAppDesc: {
    id: 'Buka AI Brew di app.baristachaw.com',
    en: 'Open AI Brew on app.baristachaw.com',
    bn: 'Buka AI Brew di app.baristachaw.com',
  },
  downloadAppLabel: {
    id: 'Unduh Aplikasi',
    en: 'Download',
    bn: 'Muat Turun Aplikasi',
  },
  downloadAppDesc: {
    id: `${RELEASE_VERSION} - iOS PWA dan Android APK`,
    en: `${RELEASE_VERSION} - iOS PWA and Android APK`,
    bn: `${RELEASE_VERSION} - iOS PWA dan Android APK`,
  },
  playStoreDesc: {
    id: 'Android APK tersedia - Google Play segera hadir',
    en: 'Android APK available - Google Play coming soon',
    bn: 'Android APK tersedia - Google Play akan datang',
  },
  appStoreDesc: {
    id: 'iOS PWA tersedia - App Store segera hadir',
    en: 'iOS PWA available - App Store coming soon',
    bn: 'iOS PWA tersedia - App Store akan datang',
  },
} satisfies Record<string, Record<Language, string>>;

export function DownloadSection({ language, onDownloadClick }: { language: Language; onDownloadClick: () => void }) {
  return (
    <section className="download-section section-shell" id="download" aria-labelledby="download-title">
      <ScrollReveal variant="slide-up">
        <div className="section-heading">
          <p className="section-index">06 / 06</p>
          <div>
            <h2 id="download-title">{local.heading[language]}</h2>
            <p>{local.subtitle[language]}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="download-list">
        <ScrollReveal variant="fade" delay={0}>
          <button className="download-row download-row-primary" type="button" data-testid="landing-download-section" onClick={onDownloadClick}>
            <Download />
            <div>
              <strong>{local.downloadAppLabel[language]}</strong>
              <span>{local.downloadAppDesc[language]}</span>
            </div>
            <ArrowUpRight />
          </button>
        </ScrollReveal>
        <ScrollReveal variant="fade" delay={0.06}>
          <a className="download-row" href={APP_LINKS.aiBrew}>
            <Globe2 />
            <div><strong>{local.webAppLabel[language]}</strong><span>{local.webAppDesc[language]}</span></div>
            <ArrowUpRight />
          </a>
        </ScrollReveal>
        <ScrollReveal variant="fade" delay={0.12}>
          <Link className="download-row" to="/download/playstore">
            <Play />
            <div><strong>Google Play</strong><span>{local.playStoreDesc[language]}</span></div>
            <ArrowUpRight />
          </Link>
        </ScrollReveal>
        <ScrollReveal variant="fade" delay={0.18}>
          <Link className="download-row" to="/download/appstore">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="3" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg>
            <div><strong>App Store</strong><span>{local.appStoreDesc[language]}</span></div>
            <ArrowUpRight />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
