import { Download, ExternalLink, ShieldCheck, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { APK_AVAILABLE, APK_URL, APP_LINKS, RELEASE_URL, RELEASE_VERSION } from '../config';
import type { Language } from '../i18n';

export function DownloadPage({ language }: { language: Language }) {
  const isId = language === 'id';
  const isBn = language === 'bn';
  const { pathname } = useLocation();
  const store = pathname.includes('playstore') ? 'Google Play' : pathname.includes('appstore') ? 'App Store' : '';

  if (store) {
    return (
      <main className="utility-page waitlist-page">
        <div className="utility-hero">
          <p>{store}</p>
          <h1>
            {isBn
              ? 'Belum tersedia di store.'
              : isId
                ? 'Belum tersedia di store.'
                : 'Not available in the store yet.'}
          </h1>
          <p>
            {isBn
              ? 'Kami tidak menampilkan tombol store palsu. Gunakan web app atau minta notifikasi saat listing tersedia.'
              : isId
                ? 'Kami tidak menampilkan tombol store palsu. Gunakan web app atau minta notifikasi saat listing tersedia.'
                : 'We do not show a fake store button. Use the web app or request a notification when the listing is ready.'}
          </p>
          <div className="utility-actions">
            <a className="button button-primary" href={APP_LINKS.aiBrew}>Try AI Brew</a>
            <Link className="button button-outline" to="/support?topic=waitlist">
              {isBn ? 'Minta notifikasi' : isId ? 'Minta notifikasi' : 'Request notification'}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="utility-page">
      <div className="utility-hero">
        <p>Android release</p>
        <h1>
          {isBn
            ? 'Minta akses Baristachaw untuk Android.'
            : isId
              ? 'Minta akses Baristachaw untuk Android.'
              : 'Request Baristachaw for Android.'}
        </h1>
        <p>
          {APK_AVAILABLE
            ? (isBn || isId
                ? `APK ${RELEASE_VERSION} tersedia setelah audit rilis.`
                : `The ${RELEASE_VERSION} APK is available after release audit.`)
            : (isBn || isId
                ? `APK ${RELEASE_VERSION} sedang disiapkan. Minta akses jika perlu build Android lebih awal.`
                : `The ${RELEASE_VERSION} APK is being prepared. Request access if you need an early Android build.`)}
        </p>
      </div>
      <div className="utility-content">
        <div className="download-card">
          <div className="download-product">
            <img src="/assets/baristachaw-logo.png" alt="Baristachaw" />
            <div>
              <strong>Baristachaw {RELEASE_VERSION}</strong>
              <span>Android - package com.baristachaw.mobile</span>
            </div>
          </div>
          <div className="download-facts">
            <span><ShieldCheck /> {APK_AVAILABLE ? 'Signed release' : 'Release artifact pending'}</span>
            <span><Smartphone /> Android {RELEASE_VERSION} static release gates targeted</span>
            <span><ShieldCheck /> CAMERA + RECORD_AUDIO {isBn ? 'sahaja' : isId ? 'saja' : 'only'}</span>
          </div>
          <div className="utility-actions" style={{ marginTop: 0 }}>
            <a className="button button-primary" href={APK_AVAILABLE ? APK_URL : '/support?topic=download'}>
              <Download size={18} /> {APK_AVAILABLE ? (isBn ? 'Muat Turun APK' : isId ? 'Download APK' : 'Download APK') : (isBn ? 'Minta akses' : isId ? 'Minta akses' : 'Request access')}
            </a>
            <a className="button button-outline" href={RELEASE_URL}>
              <ExternalLink size={18} /> {isBn ? 'Pelepasan GitHub' : isId ? 'GitHub release' : 'GitHub release'}
            </a>
          </div>
          <p className="download-migration-note" style={{ margin: 0 }}>
            {isBn
              ? 'Origin app.baristachaw.com tertanam pada native shell. Kualitas rasa akhir tetap perlu validasi seduh nyata.'
              : isId
                ? 'Origin app.baristachaw.com tertanam pada native shell. Kualitas rasa akhir tetap memerlukan validasi seduh nyata.'
                : 'The app.baristachaw.com origin is baked into the native shell. Final cup quality still requires real brew validation.'}
          </p>
        </div>
      </div>
    </main>
  );
}
