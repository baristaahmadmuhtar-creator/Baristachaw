import { Menu, X, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_LINKS, type Region } from '../config';
import type { Language } from '../i18n';
import { t } from '../i18n';

type LandingHeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
  region: Region;
  onRegionChange: (region: Region) => void;
};

export function LandingHeader({ language, onLanguageChange, region, onRegionChange }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="site-header">
      <a className="brand-lockup" href="/" aria-label="Baristachaw home">
        <img src="/assets/baristachaw-logo.png" alt="" width="42" height="42" />
        <span>Baristachaw</span>
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="/#engine">{t('nav.aiBrew', language)}</a>
        <a href="/#brewers">{t('nav.methods', language)}</a>
        <Link to="/download">{t('nav.download', language)}</Link>
        <Link to="/support">{t('nav.support', language)}</Link>
      </nav>
      <div className="header-actions">
        <div className="language-switch" aria-label="Language & Region">
          <div className="dropdown-group">
            <select 
              value={language} 
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              aria-label="Select Language"
              className="header-select"
            >
              <option value="id">ID</option>
              <option value="en">EN</option>
              <option value="bn">BN</option>
            </select>
          </div>
          <div className="dropdown-group">
            <select 
              value={region} 
              onChange={(e) => onRegionChange(e.target.value as Region)}
              aria-label="Select Region"
              className="header-select"
            >
              <option value="id">IDR</option>
              <option value="bn">BND</option>
              <option value="my">MYR</option>
              <option value="sg">SGD</option>
              <option value="au">AUD</option>
              <option value="eu">EUR</option>
              <option value="us">USD</option>
              <option value="global">GLOBAL</option>
            </select>
          </div>
        </div>
        <a className="header-login" href={APP_LINKS.login}>{t('nav.login', language)}</a>
        <a className="button button-small button-light" href={APP_LINKS.aiBrew}>{t('nav.tryAiBrew', language)}</a>
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          <a href="/#engine" onClick={() => setOpen(false)}>{t('nav.aiBrew', language)}</a>
          <a href="/#brewers" onClick={() => setOpen(false)}>{t('nav.brewMethods', language)}</a>
          <Link to="/download" onClick={() => setOpen(false)}>{t('nav.downloadApp', language)}</Link>
          <Link to="/support" onClick={() => setOpen(false)}>{t('nav.support', language)}</Link>
          <div className="mobile-menu-selectors">
            <select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}>
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
              <option value="bn">Bahasa Melayu (BN)</option>
            </select>
            <select value={region} onChange={(e) => onRegionChange(e.target.value as Region)}>
              <option value="id">Indonesia (IDR)</option>
              <option value="bn">Brunei (BND)</option>
              <option value="my">Malaysia (MYR)</option>
              <option value="sg">Singapore (SGD)</option>
              <option value="au">Australia (AUD)</option>
              <option value="eu">Europe (EUR)</option>
              <option value="us">US (USD)</option>
              <option value="global">Global</option>
            </select>
          </div>
          <a href={APP_LINKS.login}>{t('nav.login', language)}</a>
          <a href={APP_LINKS.register}>{t('nav.register', language)}</a>
        </nav>
      ) : null}
    </header>
  );
}
