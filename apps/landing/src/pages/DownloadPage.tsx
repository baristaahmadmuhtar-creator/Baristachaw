import { Download, ExternalLink, ShieldCheck, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { APK_URL, APP_LINKS, RELEASE_URL, RELEASE_VERSION } from '../config';
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
              ? 'Kami indada tunjuk butang store palsu. Gunakan web app atau APK rasmi sementara menunggu listing bersedia.'
              : isId
              ? 'Kami tidak menampilkan tombol store palsu. Gunakan web app atau APK resmi sambil menunggu listing.'
              : 'We do not show a fake store button. Use the web app or official APK while the listing is prepared.'}
          </p>
          <div className="utility-actions">
            <a className="button button-primary" href={APP_LINKS.aiBrew}>Try AI Brew</a>
            <Link className="button button-outline" to={`/support?topic=waitlist`}>
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
            ? 'Muat turun Baristachaw untuk Android.'
            : isId
            ? 'Unduh Baristachaw untuk Android.'
            : 'Download Baristachaw for Android.'}
        </h1>
        <p>
          {isBn
            ? `APK ${RELEASE_VERSION} sudah ditandatangani dan diaudit tanpa kebenaran storage/media yang dilarang.`
            : isId
            ? `APK ${RELEASE_VERSION} telah ditandatangani dan diaudit tanpa permission storage/media terlarang.`
            : `The ${RELEASE_VERSION} APK is signed and audited without prohibited broad storage/media permissions.`}
        </p>
      </div>
      <div className="utility-content">
        <div className="download-card">
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
            <span><ShieldCheck /> CAMERA + RECORD_AUDIO {isBn ? 'sahaja' : isId ? 'saja' : 'only'}</span>
          </div>
          <div className="utility-actions" style={{ marginTop: 0 }}>
            <a className="button button-primary" href={APK_URL}>
              <Download size={18} /> {isBn ? 'Muat Turun APK' : isId ? 'Download APK' : 'Download APK'}
            </a>
            <a className="button button-outline" href={RELEASE_URL}>
              <ExternalLink size={18} /> {isBn ? 'Pelepasan GitHub' : isId ? 'GitHub release' : 'GitHub release'}
            </a>
          </div>
          <p className="download-migration-note" style={{ margin: 0 }}>
            {isBn
              ? 'Asal app.baristachaw.com sudah tertanam pada native shell. Kualiti rasa akhir tetap memerlukan pengesahan seduhan sebenar.'
              : isId
              ? 'Origin app.baristachaw.com sudah tertanam pada native shell. Kualitas rasa akhir tetap memerlukan validasi seduh nyata.'
              : 'The app.baristachaw.com origin is baked into the native shell. Final cup quality still requires real brew validation.'}
          </p>
        </div>
      </div>
    </main>
  );
}
