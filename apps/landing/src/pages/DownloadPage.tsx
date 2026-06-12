import { Download, ExternalLink, ShieldCheck, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { APK_URL, APP_LINKS, RELEASE_URL, RELEASE_VERSION } from '../config';

export function DownloadPage({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const { pathname } = useLocation();
  const store = pathname.includes('playstore') ? 'Google Play' : pathname.includes('appstore') ? 'App Store' : '';

  if (store) {
    return (
      <main className="utility-page waitlist-page">
        <div className="utility-hero">
          <p>{store}</p>
          <h1>{isId ? 'Belum tersedia di store.' : 'Not available in the store yet.'}</h1>
          <p>{isId ? 'Kami tidak menampilkan tombol store palsu. Gunakan web app atau APK resmi sambil menunggu listing.' : 'We do not show a fake store button. Use the web app or official APK while the listing is prepared.'}</p>
          <div className="utility-actions">
            <a className="button button-primary" href={APP_LINKS.aiBrew}>Try AI Brew</a>
            <Link className="button button-outline" to={`/support?topic=waitlist`}>{isId ? 'Minta notifikasi' : 'Request notification'}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="utility-page">
      <div className="utility-hero">
        <p>Android release</p>
        <h1>{isId ? 'Unduh Baristachaw untuk Android.' : 'Download Baristachaw for Android.'}</h1>
        <p>{isId ? `APK ${RELEASE_VERSION} telah ditandatangani dan diaudit tanpa permission storage/media terlarang.` : `The ${RELEASE_VERSION} APK is signed and audited without prohibited broad storage/media permissions.`}</p>
      </div>
      <div className="utility-content download-detail">
        <div className="download-product">
          <img src="/assets/baristachaw-logo.png" alt="Baristachaw" />
          <div>
            <strong>Baristachaw {RELEASE_VERSION}</strong>
            <span>Android · package com.baristachaw.mobile</span>
          </div>
        </div>
        <div className="download-facts">
          <span><ShieldCheck /> Signed release</span>
          <span><Smartphone /> Android 1.0.2 static release gates passed</span>
          <span><ShieldCheck /> CAMERA + RECORD_AUDIO only</span>
        </div>
        <div className="utility-actions">
          <a className="button button-primary" href={APK_URL}><Download size={18} /> Download APK</a>
          <a className="button button-outline" href={RELEASE_URL}><ExternalLink size={18} /> GitHub release</a>
        </div>
        <p className="download-migration-note">
          {isId ? 'Origin app.baristachaw.com sudah tertanam pada native shell. Kualitas rasa akhir tetap memerlukan validasi seduh nyata.' : 'The app.baristachaw.com origin is baked into the native shell. Final cup quality still requires real brew validation.'}
        </p>
      </div>
    </main>
  );
}
