import { Download, Globe2, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ANDROID_APK_FILE_NAME, APK_URL, APP_LINKS, RELEASE_VERSION } from '../config';
import type { Language } from '../i18n';

const copy = {
  title: {
    id: 'Unduh Aplikasi',
    en: 'Download Baristachaw',
    bn: 'Muat Turun Aplikasi',
  },
  subtitle: {
    id: 'Pilih platform yang ingin Anda gunakan.',
    en: 'Choose the platform you want to use.',
    bn: 'Pilih platform yang biskita mahu guna.',
  },
  iosTitle: {
    id: 'iOS',
    en: 'iOS',
    bn: 'iOS',
  },
  iosBody: {
    id: 'Siap dipakai dari Safari. App Store segera hadir.',
    en: 'Ready to use from Safari. App Store coming soon.',
    bn: 'Sedia digunakan dari Safari. App Store akan datang.',
  },
  iosHint: {
    id: 'Buka web app, lalu pilih Share dan Add to Home Screen.',
    en: 'Open the web app, then use Share and Add to Home Screen.',
    bn: 'Buka web app, kemudian pilih Share dan Add to Home Screen.',
  },
  iosButton: {
    id: 'Install iOS',
    en: 'Install iOS',
    bn: 'Install iOS',
  },
  androidTitle: {
    id: 'Android',
    en: 'Android',
    bn: 'Android',
  },
  androidBody: {
    id: `APK ${RELEASE_VERSION} siap diunduh sebagai signed release.`,
    en: `APK ${RELEASE_VERSION} is ready as a signed release.`,
    bn: `APK ${RELEASE_VERSION} siap dimuat turun sebagai signed release.`,
  },
  androidHint: {
    id: 'Setelah selesai, buka file APK dari folder Downloads untuk install.',
    en: 'After it finishes, open the APK from Downloads to install.',
    bn: 'Selepas siap, buka fail APK dari folder Downloads untuk install.',
  },
  androidButton: {
    id: 'Unduh Android',
    en: 'Download Android',
    bn: 'Muat Turun Android',
  },
  androidStarted: {
    id: 'Unduhan dimulai. Jika browser tidak membuka otomatis, buka file APK dari folder Downloads.',
    en: 'Download started. If the browser does not open it automatically, open the APK from Downloads.',
    bn: 'Muat turun bermula. Jika browser tidak membuka automatik, buka APK dari folder Downloads.',
  },
  secureNote: {
    id: 'Android memakai release asset resmi. iOS memakai PWA sampai App Store listing siap.',
    en: 'Android uses the official release asset. iOS uses the PWA until the App Store listing is ready.',
    bn: 'Android memakai release asset rasmi. iOS memakai PWA sampai App Store listing siap.',
  },
} satisfies Record<string, Record<Language, string>>;

export function DownloadModal({ language, onClose }: { language: Language; onClose: () => void }) {
  const [androidStarted, setAndroidStarted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button, a[href]')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, a[href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="download-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="download-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        aria-describedby="download-modal-subtitle"
        data-testid="landing-download-modal"
      >
        <div className="download-modal-head">
          <div>
            <p><Globe2 size={14} /> Baristachaw</p>
            <h2 id="download-modal-title">{copy.title[language]}</h2>
            <span id="download-modal-subtitle">{copy.subtitle[language]}</span>
          </div>
          <button type="button" aria-label="Close download options" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="download-platforms">
          <article className="download-platform-card">
            <div className="download-platform-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="3" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg>
            </div>
            <div>
              <h3>{copy.iosTitle[language]}</h3>
              <p>{copy.iosBody[language]}</p>
              <span>{copy.iosHint[language]}</span>
            </div>
            <a className="button button-outline" href={`${APP_LINKS.home}?guided_install=ios`} data-testid="landing-download-ios">
              {copy.iosButton[language]}
            </a>
          </article>

          <article className="download-platform-card download-platform-card-primary">
            <div className="download-platform-icon">
              <Smartphone />
            </div>
            <div>
              <h3>{copy.androidTitle[language]}</h3>
              <p>{copy.androidBody[language]}</p>
              <span>{copy.androidHint[language]}</span>
            </div>
            <a
              className="button button-primary"
              href={APK_URL}
              download={ANDROID_APK_FILE_NAME}
              data-testid="landing-download-android"
              onClick={() => setAndroidStarted(true)}
            >
              <Download size={17} /> {copy.androidButton[language]}
            </a>
            {androidStarted ? <p className="download-started-note">{copy.androidStarted[language]}</p> : null}
          </article>
        </div>

        <p className="download-modal-note">
          <ShieldCheck size={15} />
          {copy.secureNote[language]}
        </p>
      </div>
    </div>
  );
}
