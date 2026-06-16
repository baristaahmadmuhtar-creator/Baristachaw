import { Apple, ArrowUpRight, Download, Globe2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APK_AVAILABLE, APK_URL, APP_LINKS, RELEASE_VERSION } from '../config';
import type { Language } from '../i18n';
import { ScrollReveal } from './ScrollReveal';

const local = {
  heading: {
    id: 'Mulai ritual kopi Anda sekarang.',
    en: 'Start your coffee ritual today.',
    bn: 'Mula ritual kopi anda sekarang.',
  },
  subtitle: {
    id: 'Gunakan web app langsung atau minta akses Android saat artifact rilis belum tersedia.',
    en: 'Use the web app instantly or request Android access while the release artifact is pending.',
    bn: 'Guna aplikasi web terus atau minta akses Android semasa artifact rilis belum tersedia.',
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
  playStoreDesc: {
    id: 'Segera hadir - daftar notifikasi',
    en: 'Coming soon - join waitlist',
    bn: 'Akan datang - sertai senarai tunggu',
  },
  appStoreDesc: {
    id: 'Daftar waitlist iOS',
    en: 'Join iOS waitlist',
    bn: 'Sertai senarai tunggu iOS',
  },
} satisfies Record<string, Record<Language, string>>;

export function DownloadSection({ language }: { language: Language }) {
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
          <a className="download-row download-row-primary" href={APK_AVAILABLE ? APK_URL : '/support?topic=download'}>
            <Download />
            <div>
              <strong>{APK_AVAILABLE ? 'Download APK' : 'Request access'}</strong>
              <span>{APK_AVAILABLE ? `${RELEASE_VERSION} - Android - signed release` : `${RELEASE_VERSION} - Android APK coming soon`}</span>
            </div>
            <ArrowUpRight />
          </a>
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
            <Apple />
            <div><strong>App Store</strong><span>{local.appStoreDesc[language]}</span></div>
            <ArrowUpRight />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
