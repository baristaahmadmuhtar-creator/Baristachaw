import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_LINKS } from '../config';

type LandingHeaderProps = {
  language: 'id' | 'en';
  onLanguageChange: (language: 'id' | 'en') => void;
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
        <a href="/#engine">{language === 'id' ? 'AI Brew' : 'AI Brew'}</a>
        <a href="/#brewers">{language === 'id' ? 'Metode' : 'Methods'}</a>
        <Link to="/download">{language === 'id' ? 'Unduh' : 'Download'}</Link>
        <Link to="/support">Support</Link>
      </nav>
      <div className="header-actions">
        <div className="language-switch" aria-label="Language">
          <button type="button" onClick={() => onLanguageChange('id')} aria-pressed={language === 'id'}>ID</button>
          <button type="button" onClick={() => onLanguageChange('en')} aria-pressed={language === 'en'}>EN</button>
        </div>
        <a className="header-login" href={APP_LINKS.login}>{language === 'id' ? 'Masuk' : 'Login'}</a>
        <a className="button button-small button-light" href={APP_LINKS.aiBrew}>{language === 'id' ? 'Coba AI Brew' : 'Try AI Brew'}</a>
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
          <a href="/#engine" onClick={() => setOpen(false)}>AI Brew</a>
          <a href="/#brewers" onClick={() => setOpen(false)}>{language === 'id' ? 'Metode seduh' : 'Brewing methods'}</a>
          <Link to="/download" onClick={() => setOpen(false)}>{language === 'id' ? 'Unduh aplikasi' : 'Download app'}</Link>
          <Link to="/support" onClick={() => setOpen(false)}>Support</Link>
          <a href={APP_LINKS.login}>{language === 'id' ? 'Masuk' : 'Login'}</a>
          <a href={APP_LINKS.register}>{language === 'id' ? 'Daftar' : 'Register'}</a>
        </nav>
      ) : null}
    </header>
  );
}
