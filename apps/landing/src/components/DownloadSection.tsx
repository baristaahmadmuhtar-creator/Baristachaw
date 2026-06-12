import { Apple, ArrowUpRight, Download, Globe2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APK_URL, APP_LINKS, RELEASE_VERSION } from '../config';

export function DownloadSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="download-section section-shell" id="download" aria-labelledby="download-title">
      <div className="section-heading">
        <p className="section-index">06 / 06</p>
        <div>
          <h2 id="download-title">{isId ? 'Baristachaw di perangkat Anda.' : 'Get Baristachaw on your device.'}</h2>
          <p>{isId ? 'Gunakan web app sekarang atau instal APK Android yang telah ditandatangani.' : 'Use the web app now or install the signed Android APK.'}</p>
        </div>
      </div>
      <div className="download-list">
        <a className="download-row download-row-primary" href={APK_URL}>
          <Download />
          <div><strong>Download APK</strong><span>{RELEASE_VERSION} · Android · signed release</span></div>
          <ArrowUpRight />
        </a>
        <a className="download-row" href={APP_LINKS.aiBrew}>
          <Globe2 />
          <div><strong>Use Web App</strong><span>Open AI Brew on app.baristachaw.com</span></div>
          <ArrowUpRight />
        </a>
        <Link className="download-row" to="/download/playstore">
          <Play />
          <div><strong>Google Play</strong><span>{isId ? 'Segera hadir · minta notifikasi' : 'Coming soon · request notification'}</span></div>
          <ArrowUpRight />
        </Link>
        <Link className="download-row" to="/download/appstore">
          <Apple />
          <div><strong>App Store</strong><span>{isId ? 'Waitlist iOS' : 'iOS waitlist'}</span></div>
          <ArrowUpRight />
        </Link>
      </div>
    </section>
  );
}
