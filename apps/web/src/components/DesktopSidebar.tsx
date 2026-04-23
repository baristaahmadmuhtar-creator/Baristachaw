import { useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PARITY_NAV_META } from '@baristaclaw/shared';
import {
  Home,
  ScanLine,
  Gauge,
  BookOpen,
  MessageSquare,
  Coffee,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Image as ImageIcon,
  Brain,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useNavbar } from '../context/NavbarContext';
import { useGlobalState } from '../context/GlobalState';
import { ChatWorkspacePanel } from './chat/ChatWorkspacePanel';

export function DesktopSidebar() {
  const { t } = useGlobalState();
  const {
    desktopRailCollapsed,
    setDesktopRailCollapsed,
    desktopChatSidebarCollapsed,
    setDesktopChatSidebarCollapsed,
    desktopChatNavOpen,
    setDesktopChatNavOpen,
    desktopChatNavTab,
    setDesktopChatNavTab,
  } = useNavbar();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';
  const wasChatRouteRef = useRef(false);
  const railRef = useRef<HTMLElement | null>(null);
  const chatPanelRef = useRef<HTMLElement | null>(null);

  const closeChatWorkspace = useCallback(() => {
    setDesktopChatNavOpen(false);
    setDesktopChatNavTab('history');
    setDesktopChatSidebarCollapsed(false);
  }, [setDesktopChatNavOpen, setDesktopChatNavTab, setDesktopChatSidebarCollapsed]);

  useEffect(() => {
    if (isChatRoute && !wasChatRouteRef.current) {
      setDesktopChatNavOpen(true);
      setDesktopChatNavTab('history');
      setDesktopChatSidebarCollapsed(false);
    }
    wasChatRouteRef.current = isChatRoute;
  }, [isChatRoute, setDesktopChatNavOpen, setDesktopChatNavTab, setDesktopChatSidebarCollapsed]);

  useEffect(() => {
    if (!isChatRoute) {
      closeChatWorkspace();
    }
  }, [closeChatWorkspace, isChatRoute]);

  useEffect(() => {
    if (!desktopChatNavOpen) {
      setDesktopChatSidebarCollapsed(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeChatWorkspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeChatWorkspace, desktopChatNavOpen, setDesktopChatSidebarCollapsed]);

  useEffect(() => {
    if (!isChatRoute || !desktopChatNavOpen || !desktopRailCollapsed) return;

    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (railRef.current?.contains(target)) return;
      if (chatPanelRef.current?.contains(target)) return;
      closeChatWorkspace();
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [closeChatWorkspace, desktopChatNavOpen, desktopRailCollapsed, isChatRoute]);

  const navItems = [
    { path: PARITY_NAV_META.Home.path, icon: Home, label: t.home || PARITY_NAV_META.Home.label },
    { path: PARITY_NAV_META.Scanner.path, icon: ScanLine, label: t.scanner || PARITY_NAV_META.Scanner.label },
    { path: PARITY_NAV_META.Tools.path, icon: Gauge, label: t.tools || PARITY_NAV_META.Tools.label },
    { path: PARITY_NAV_META.Collection.path, icon: BookOpen, label: t.collection || PARITY_NAV_META.Collection.label },
    { path: PARITY_NAV_META.Chat.path, icon: MessageSquare, label: t.chat || PARITY_NAV_META.Chat.label },
  ];

  const compactWorkspaceTabs = [
    { id: 'history' as const, icon: History, label: t.chatWorkspaceTabHistory },
    { id: 'library' as const, icon: ImageIcon, label: t.chatWorkspaceTabLibrary },
    { id: 'memory' as const, icon: Brain, label: t.chatWorkspaceTabMemory },
  ];

  const chatPanelTitle = desktopChatNavTab === 'history'
    ? t.chatWorkspaceTabHistory
    : desktopChatNavTab === 'library'
      ? t.chatWorkspaceTabLibrary
      : t.chatWorkspaceTabMemory;

  return (
    <>
      <aside
        ref={railRef}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 border-r border-[var(--panel-border-soft)] bg-[var(--bg-base)]/92 backdrop-blur-xl flex-col py-4 transition-[width] duration-300 ease-out"
        style={{ width: desktopRailCollapsed ? 'var(--desktop-rail-width-collapsed)' : 'var(--desktop-rail-width-expanded)' }}
      >
        <div className={clsx('px-3 flex items-center', desktopRailCollapsed ? 'justify-center' : 'justify-between')}>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
            <Coffee size={20} />
          </div>
        </div>

        <div className="px-3 mt-3">
          <button
            type="button"
            onClick={() => setDesktopRailCollapsed(!desktopRailCollapsed)}
            className="w-full min-h-[40px] rounded-xl panel-soft text-secondary hover:text-primary flex items-center justify-center transition-colors"
            aria-label={desktopRailCollapsed ? t.navExpand : t.navCollapse}
            title={desktopRailCollapsed ? t.navExpand : t.navCollapse}
          >
            {desktopRailCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="flex-1 w-full px-2 py-4 flex flex-col gap-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={(event) => {
                if (path !== '/chat') return;
                if (isChatRoute) {
                  event.preventDefault();
                  if (desktopChatNavOpen) {
                    closeChatWorkspace();
                  } else {
                    setDesktopChatNavOpen(true);
                    setDesktopChatNavTab('history');
                    setDesktopChatSidebarCollapsed(false);
                  }
                } else {
                  setDesktopChatNavOpen(true);
                  setDesktopChatNavTab('history');
                  setDesktopChatSidebarCollapsed(false);
                }
              }}
              className={({ isActive }) =>
                clsx(
                  'w-full min-h-[52px] rounded-2xl flex items-center transition-all',
                  desktopRailCollapsed ? 'justify-center px-2' : 'justify-start gap-2.5 px-3',
                  isActive
                    ? 'bg-blue-500/12 text-blue-500 shadow-[0_6px_16px_rgba(0,122,255,0.16)]'
                    : 'text-tertiary hover:text-primary hover:bg-surface-alpha',
                )
              }
              title={label}
              aria-label={label}
            >
              <Icon size={18} />
              {!desktopRailCollapsed && (
                <span className="text-xs leading-none font-semibold truncate flex-1">{label}</span>
              )}
              {!desktopRailCollapsed && path === '/chat' && isChatRoute && (
                <>
                  {desktopChatNavOpen ? <ChevronDown size={14} className="text-tertiary shrink-0" /> : <ChevronRight size={14} className="text-tertiary shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="h-8" />
      </aside>

      {isChatRoute && desktopChatNavOpen && (
        <section
          ref={chatPanelRef}
          className="hidden lg:flex fixed z-30 flex-col overflow-hidden rounded-[1.6rem] border panel-divider-subtle panel-soft-strong shadow-[0_20px_42px_rgba(15,23,42,0.18)]"
          style={{
            left: 'calc(var(--desktop-rail-current-width, var(--desktop-rail-width-expanded)) + 0.75rem)',
            top: 'calc(var(--safe-top) + 0.75rem)',
            bottom: '0.75rem',
            width: 'var(--desktop-chat-panel-current-width, var(--chat-history-width-expanded))',
          }}
          aria-label={t.chatWorkspace}
        >
          {desktopChatSidebarCollapsed ? (
            <div className="flex items-center justify-center gap-1 border-b panel-divider-subtle px-1.5 py-3">
              <button
                type="button"
                onClick={() => setDesktopChatSidebarCollapsed(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface-alpha text-secondary hover:text-primary transition-colors"
                aria-label={t.navExpand}
                title={t.navExpand}
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={closeChatWorkspace}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface-alpha text-secondary hover:text-primary transition-colors"
                aria-label={t.close}
                title={t.close}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 border-b panel-divider-subtle px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">{t.chatWorkspace}</p>
                <p className="mt-1 truncate text-sm font-semibold text-primary">{chatPanelTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDesktopChatSidebarCollapsed(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alpha text-secondary hover:text-primary transition-colors"
                  aria-label={t.navCollapse}
                  title={t.navCollapse}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeChatWorkspace}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alpha text-secondary hover:text-primary transition-colors"
                  aria-label={t.close}
                  title={t.close}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {desktopChatSidebarCollapsed ? (
            <div className="flex flex-1 flex-col items-center gap-3 px-2 py-4">
              {compactWorkspaceTabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setDesktopChatNavTab(id);
                    setDesktopChatSidebarCollapsed(false);
                  }}
                  className={clsx(
                    'inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-colors',
                    desktopChatNavTab === id
                      ? 'bg-blue-500/12 text-blue-600 shadow-[0_8px_18px_rgba(37,99,235,0.18)]'
                      : 'bg-surface-alpha text-secondary hover:text-primary',
                  )}
                  aria-label={label}
                  title={label}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          ) : (
            <ChatWorkspacePanel
              tab={desktopChatNavTab}
              onTabChange={setDesktopChatNavTab}
              isDesktop
              className="min-h-0 flex-1"
            />
          )}
        </section>
      )}
    </>
  );
}
