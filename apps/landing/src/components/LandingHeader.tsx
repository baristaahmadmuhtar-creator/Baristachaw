import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_LINKS } from '../config';
import type { Language } from '../i18n';
import { t } from '../i18n';

type LandingHeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function LandingHeader({ language, onLanguageChange }: LandingHeaderProps) {
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
        <div className="language-switch" aria-label="Language">
          <button type="button" onClick={() => onLanguageChange('id')} aria-pressed={language === 'id'}>ID</button>
          <button type="button" onClick={() => onLanguageChange('en')} aria-pressed={language === 'en'}>EN</button>
          <button type="button" onClick={() => onLanguageChange('bn')} aria-pressed={language === 'bn'}>BN</button>
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
          <a href={APP_LINKS.login}>{t('nav.login', language)}</a>
          <a href={APP_LINKS.register}>{t('nav.register', language)}</a>
        </nav>
      ) : null}
    </header>
  );
}
