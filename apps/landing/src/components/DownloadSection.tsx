import { Apple, ArrowUpRight, Download, Globe2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APK_URL, APP_LINKS, RELEASE_VERSION } from '../config';
import { ScrollReveal } from './ScrollReveal';

export function DownloadSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="download-section section-shell" id="download" aria-labelledby="download-title">
      <ScrollReveal variant="slide-up">
        <div className="section-heading">
          <p className="section-index">06 / 06</p>
          <div>
            <h2 id="download-title">{isId ? 'Mulai Ritual Kopi Terbaik Anda Sekarang.' : 'Start Your Perfect Coffee Ritual Today.'}</h2>
            <p>{isId ? 'Langsung gunakan web app atau unduh aplikasi Android — nikmati kenyamanan menyeduh kopi di mana saja.' : 'Use the web app instantly or download the Android app — enjoy brewing comfort anywhere.'}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="download-list">
        <ScrollReveal variant="fade" delay={0}>
          <a className="download-row download-row-primary" href={APK_URL}>
            <Download />
            <div><strong>Download APK</strong><span>{RELEASE_VERSION} · Android · signed release</span></div>
            <ArrowUpRight />
          </a>
        </ScrollReveal>
        <ScrollReveal variant="fade" delay={0.06}>
          <a className="download-row" href={APP_LINKS.aiBrew}>
            <Globe2 />
            <div><strong>{isId ? 'Buka Web App' : 'Use Web App'}</strong><span>{isId ? 'Buka AI Brew di app.baristachaw.com' : 'Open AI Brew on app.baristachaw.com'}</span></div>
            <ArrowUpRight />
          </a>
        </ScrollReveal>
        <ScrollReveal variant="fade" delay={0.12}>
          <Link className="download-row" to="/download/playstore">
            <Play />
            <div><strong>Google Play</strong><span>{isId ? 'Segera hadir · daftar notifikasi' : 'Coming soon · join waitlist'}</span></div>
            <ArrowUpRight />
          </Link>
        </ScrollReveal>
        <ScrollReveal variant="fade" delay={0.18}>
          <Link className="download-row" to="/download/appstore">
            <Apple />
            <div><strong>App Store</strong><span>{isId ? 'Daftar waitlist iOS' : 'Join iOS waitlist'}</span></div>
            <ArrowUpRight />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
