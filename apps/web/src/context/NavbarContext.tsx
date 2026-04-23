import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ChatWorkspaceTab } from '../components/chat/types';

interface NavbarContextType {
    navHidden: boolean;
    hideNav: () => void;
    showNav: () => void;
    desktopRailCollapsed: boolean;
    setDesktopRailCollapsed: (next: boolean) => void;
    desktopChatSidebarCollapsed: boolean;
    setDesktopChatSidebarCollapsed: (next: boolean) => void;
    desktopChatNavOpen: boolean;
    setDesktopChatNavOpen: (next: boolean) => void;
    desktopChatNavTab: ChatWorkspaceTab;
    setDesktopChatNavTab: (next: ChatWorkspaceTab) => void;
}

const NavbarContext = createContext<NavbarContextType>({
    navHidden: false,
    hideNav: () => { },
    showNav: () => { },
    desktopRailCollapsed: false,
    setDesktopRailCollapsed: () => { },
    desktopChatSidebarCollapsed: false,
    setDesktopChatSidebarCollapsed: () => { },
    desktopChatNavOpen: false,
    setDesktopChatNavOpen: () => { },
    desktopChatNavTab: 'history',
    setDesktopChatNavTab: () => { },
});

export function NavbarProvider({ children }: { children: ReactNode }) {
    const [navHidden, setNavHidden] = useState(false);
    const [desktopRailCollapsed, setDesktopRailCollapsedState] = useState(false);
    const [desktopChatSidebarCollapsed, setDesktopChatSidebarCollapsedState] = useState(false);
    const [desktopChatNavOpen, setDesktopChatNavOpenState] = useState(false);
    const [desktopChatNavTab, setDesktopChatNavTabState] = useState<ChatWorkspaceTab>('history');
    const hideNav = useCallback(() => setNavHidden(true), []);
    const showNav = useCallback(() => setNavHidden(false), []);
    const setDesktopRailCollapsed = useCallback((next: boolean) => {
        setDesktopRailCollapsedState(next);
    }, []);
    const setDesktopChatSidebarCollapsed = useCallback((next: boolean) => {
        setDesktopChatSidebarCollapsedState(next);
    }, []);
    const setDesktopChatNavOpen = useCallback((next: boolean) => {
        setDesktopChatNavOpenState(next);
    }, []);
    const setDesktopChatNavTab = useCallback((next: ChatWorkspaceTab) => {
        setDesktopChatNavTabState(next);
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.dataset.navHidden = navHidden ? 'true' : 'false';
    }, [navHidden]);

    return (
        <NavbarContext.Provider value={{
            navHidden,
            hideNav,
            showNav,
            desktopRailCollapsed,
            setDesktopRailCollapsed,
            desktopChatSidebarCollapsed,
            setDesktopChatSidebarCollapsed,
            desktopChatNavOpen,
            setDesktopChatNavOpen,
            desktopChatNavTab,
            setDesktopChatNavTab,
        }}>
            {children}
        </NavbarContext.Provider>
    );
}

export function useNavbar() {
    return useContext(NavbarContext);
}
