import { Apple, Download, ExternalLink, Globe2, ShieldCheck, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ANDROID_APK_FILE_NAME, APK_URL, APP_LINKS, RELEASE_URL, RELEASE_VERSION } from '../config';
import type { Language } from '../i18n';

function label(language: Language, id: string, en: string, bn = id): string {
  if (language === 'en') return en;
  if (language === 'bn') return bn;
  return id;
}

export function DownloadPage({ language, onDownloadClick }: { language: Language; onDownloadClick: () => void }) {
  const { pathname } = useLocation();
  const isPlayStore = pathname.includes('playstore');
  const isAppStore = pathname.includes('appstore');
  const platform = isPlayStore ? 'Google Play' : isAppStore ? 'App Store' : '';

  if (platform) {
    const isIos = platform === 'App Store';
    return (
      <main className="utility-page">
        <div className="utility-hero">
          <p>{platform}</p>
          <h1>
            {isIos
              ? label(language, 'iOS PWA sekarang. App Store segera hadir.', 'iOS PWA now. App Store coming soon.', 'iOS PWA sekarang. App Store akan datang.')
              : label(language, 'Android APK tersedia. Google Play segera hadir.', 'Android APK is available. Google Play coming soon.', 'Android APK tersedia. Google Play akan datang.')}
          </h1>
          <p>
            {isIos
              ? label(
                  language,
                  'Kami tidak menampilkan tombol App Store palsu. Gunakan PWA dari Safari sampai listing App Store siap.',
                  'We do not show a fake App Store button. Use the Safari PWA until the App Store listing is ready.',
                  'Kami tidak menampilkan tombol App Store palsu. Gunakan PWA dari Safari sampai listing App Store siap.',
                )
              : label(
                  language,
                  'Kami tidak menampilkan tombol Google Play palsu. APK signed release dapat diunduh sekarang.',
                  'We do not show a fake Google Play button. The signed release APK is ready to download now.',
                  'Kami tidak menampilkan tombol Google Play palsu. APK signed release dapat dimuat turun sekarang.',
                )}
          </p>
          <div className="utility-actions">
            {isIos ? (
              <a className="button button-primary" href={APP_LINKS.home}>
                <Apple size={18} /> {label(language, 'Buka iOS PWA', 'Open iOS PWA', 'Buka iOS PWA')}
              </a>
            ) : (
              <a className="button button-primary" href={APK_URL} download={ANDROID_APK_FILE_NAME}>
                <Download size={18} /> {label(language, 'Download APK', 'Download APK', 'Muat Turun APK')}
              </a>
            )}
            <button className="button button-outline" type="button" onClick={onDownloadClick}>
              {label(language, 'Pilih platform lain', 'Choose another platform', 'Pilih platform lain')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="utility-page">
      <div className="utility-hero">
        <p>Download</p>
        <h1>{label(language, 'Download Baristachaw untuk iOS dan Android.', 'Download Baristachaw for iOS and Android.', 'Muat Turun Baristachaw untuk iOS dan Android.')}</h1>
        <p>
          {label(
            language,
            `Pakai iOS sebagai PWA dari Safari atau download Android APK ${RELEASE_VERSION} sebagai signed release.`,
            `Use iOS as a Safari PWA or download Android APK ${RELEASE_VERSION} as a signed release.`,
            `Pakai iOS sebagai PWA dari Safari atau muat turun Android APK ${RELEASE_VERSION} sebagai signed release.`,
          )}
        </p>
        <div className="utility-actions">
          <button className="button button-primary" type="button" onClick={onDownloadClick}>
            <Download size={18} /> {label(language, 'Pilih download', 'Choose download', 'Pilih muat turun')}
          </button>
          <a className="button button-outline" href={APP_LINKS.home}>
            <Globe2 size={18} /> {label(language, 'Buka Web App', 'Open Web App', 'Buka Web App')}
          </a>
        </div>
      </div>
      <div className="utility-content">
        <div className="download-card">
          <div className="download-product">
            <img src="/assets/baristachaw-logo.png" alt="Baristachaw" />
            <div>
              <strong>Baristachaw {RELEASE_VERSION}</strong>
              <span>{label(language, 'iOS PWA dan Android APK', 'iOS PWA and Android APK', 'iOS PWA dan Android APK')}</span>
            </div>
          </div>
          <div className="download-facts">
            <span><Apple /> iOS PWA - {label(language, 'App Store segera hadir', 'App Store coming soon', 'App Store akan datang')}</span>
            <span><Smartphone /> Android {RELEASE_VERSION} - signed release</span>
            <span><ShieldCheck /> CAMERA + RECORD_AUDIO {label(language, 'saja', 'only', 'sahaja')}</span>
          </div>
          <div className="utility-actions" style={{ marginTop: 0 }}>
            <a className="button button-primary" href={APK_URL} download={ANDROID_APK_FILE_NAME} data-testid="landing-download-page-android">
              <Download size={18} /> {label(language, 'Download Android APK', 'Download Android APK', 'Muat Turun Android APK')}
            </a>
            <a className="button button-outline" href={APP_LINKS.home} data-testid="landing-download-page-ios">
              <Apple size={18} /> {label(language, 'Buka iOS PWA', 'Open iOS PWA', 'Buka iOS PWA')}
            </a>
            <a className="button button-outline" href={RELEASE_URL}>
              <ExternalLink size={18} /> {label(language, 'GitHub release', 'GitHub release', 'GitHub release')}
            </a>
          </div>
          <p className="download-migration-note" style={{ margin: 0 }}>
            {label(
              language,
              'Origin app.baristachaw.com tertanam pada native shell. Kualitas rasa akhir tetap memerlukan validasi seduh nyata.',
              'The app.baristachaw.com origin is baked into the native shell. Final cup quality still requires real brew validation.',
              'Origin app.baristachaw.com tertanam pada native shell. Kualiti rasa akhir tetap memerlukan validasi seduh nyata.',
            )}
          </p>
        </div>
        <div className="utility-actions download-route-actions">
          <Link className="button button-outline" to="/download/playstore">Google Play</Link>
          <Link className="button button-outline" to="/download/appstore">App Store</Link>
        </div>
      </div>
    </main>
  );
}
