import { Bot, Bug, Download, LifeBuoy, LogIn, MessageCircle, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APK_URL, APP_LINKS } from '../config';

export function SupportChatWidget({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
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
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const actions = [
    { icon: UserPlus, label: isId ? 'Daftar' : 'Register', href: APP_LINKS.register },
    { icon: LogIn, label: isId ? 'Masalah login' : 'Login issue', href: APP_LINKS.login },
    { icon: Download, label: 'Download APK', href: APK_URL },
    { icon: Bot, label: isId ? 'Bantuan recipe' : 'Brew recipe help', href: APP_LINKS.aiBrew },
    { icon: Bug, label: isId ? 'Laporkan bug' : 'Report bug', href: '/support?topic=bug' },
    { icon: LifeBuoy, label: isId ? 'Hubungi support' : 'Contact support', href: '/support' },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        className="support-trigger"
        type="button"
        aria-label={isId ? 'Buka bantuan Baristachaw' : 'Open Baristachaw support'}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircle />
      </button>
      {open ? (
        <div className="support-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false);
        }}>
          <div ref={panelRef} className="support-panel" role="dialog" aria-modal="true" aria-labelledby="support-title">
            <div className="support-panel-head">
              <div className="support-ai-mark"><Bot /></div>
              <div>
                <strong id="support-title">Baristachaw Support AI</strong>
                <span>{isId ? 'Panduan cepat, bukan human support 24/7' : 'Guided help, not 24/7 human support'}</span>
              </div>
              <button type="button" aria-label="Close support" onClick={() => setOpen(false)}><X /></button>
            </div>
            <p className="support-greeting">
              {isId ? 'Hai, perlu bantuan dengan brewing, akun, atau download?' : 'Hi, need help with brewing, account, or download?'}
            </p>
            <div className="support-actions">
              {actions.map(({ icon: Icon, label, href }) => (
                href.startsWith('/') ? (
                  <Link key={label} to={href} onClick={() => setOpen(false)}><Icon /> <span>{label}</span></Link>
                ) : (
                  <a key={label} href={href}><Icon /> <span>{label}</span></a>
                )
              ))}
            </div>
            <p className="support-note">
              {isId ? 'Recipe adalah starting point. Kualitas cup akhir tetap memerlukan real brew.' : 'Recipes are starting points. Final cup quality still requires real brewing.'}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
