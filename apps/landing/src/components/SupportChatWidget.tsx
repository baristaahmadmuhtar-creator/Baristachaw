import { Bot, Bug, Download, Instagram, LifeBuoy, LogIn, MessageCircle, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APK_AVAILABLE, APK_URL, APP_LINKS } from '../config';
import type { Language } from '../i18n';

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Component-specific translations for the support widget */
const local = {
  triggerAriaLabel: {
    id: 'Buka bantuan Baristachaw',
    en: 'Open Baristachaw support',
    bn: 'Buka bantuan Baristachaw',
  },
  subtitle: {
    id: 'Panduan cepat, bukan human support 24/7',
    en: 'Guided help, not 24/7 human support',
    bn: 'Panduan pantas, bukan sokongan manusia 24/7',
  },
  greeting: {
    id: 'Hai, perlu bantuan dengan brewing, akun, atau download?',
    en: 'Hi, need help with brewing, account, or download?',
    bn: 'Hai, perlu bantuan dengan seduhan, akaun, atau muat turun?',
  },
  register: {
    id: 'Daftar',
    en: 'Register',
    bn: 'Daftar',
  },
  loginIssue: {
    id: 'Masalah login',
    en: 'Login issue',
    bn: 'Masalah log masuk',
  },
  brewHelp: {
    id: 'Bantuan resep',
    en: 'Brew recipe help',
    bn: 'Bantuan resipi seduhan',
  },
  reportBug: {
    id: 'Laporkan bug',
    en: 'Report bug',
    bn: 'Laporkan pepijat',
  },
  contactSupport: {
    id: 'Hubungi support',
    en: 'Contact support',
    bn: 'Hubungi sokongan',
  },
  note: {
    id: 'Recipe adalah starting point. Kualitas cup akhir tetap memerlukan real brew.',
    en: 'Recipes are starting points. Final cup quality still requires real brewing.',
    bn: 'Resipi adalah titik permulaan. Kualiti cawan akhir masih memerlukan seduhan sebenar.',
  },
} satisfies Record<string, Record<Language, string>>;

export function SupportChatWidget({ language }: { language: Language }) {
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
    { icon: WhatsAppIcon, label: 'WhatsApp', href: 'https://wa.me/6738270093' },
    { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/baristachaw' },
    { icon: UserPlus, label: local.register[language], href: APP_LINKS.register },
    { icon: LogIn, label: local.loginIssue[language], href: APP_LINKS.login },
    { icon: Download, label: APK_AVAILABLE ? 'Download APK' : 'Request APK access', href: APK_AVAILABLE ? APK_URL : '/support?topic=download' },
    { icon: Bot, label: local.brewHelp[language], href: APP_LINKS.aiBrew },
    { icon: Bug, label: local.reportBug[language], href: '/support?topic=bug' },
    { icon: LifeBuoy, label: local.contactSupport[language], href: '/support' },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        className="support-trigger"
        type="button"
        aria-label={local.triggerAriaLabel[language]}
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
              <div className="support-ai-mark">
                <img
                  src="/assets/baristachaw-logo.png"
                  alt="Baristachaw Logo"
                  style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }}
                />
              </div>
              <div>
                <strong id="support-title">Baristachaw Support</strong>
                <span>{local.subtitle[language]}</span>
              </div>
              <button type="button" aria-label="Close support" onClick={() => setOpen(false)}><X /></button>
            </div>
            <p className="support-greeting">
              {local.greeting[language]}
            </p>
            <div className="support-actions">
              {actions.map(({ icon: Icon, label, href }) => (
                href.startsWith('/') ? (
                  <Link key={label} to={href} onClick={() => setOpen(false)}><Icon /> <span>{label}</span></Link>
                ) : (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"><Icon /> <span>{label}</span></a>
                )
              ))}
            </div>
            <p className="support-note">
              {local.note[language]}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
