import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Camera, Coffee, Search, Moon, Sun, LogIn, LogOut, X, Bookmark, Check, Copy, ExternalLink, BookOpen, Globe, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { searchWithGemini, SearchWebError, type SearchResultPayload } from "../services/gemini";
import {
  normalizeHomeSearchCachePayload,
  shouldPersistHomeSearchCache,
  type HomeSearchCachePayload,
} from "../services/searchCache";
import { getAgentProfileMemory, saveAgentProfileMemory, saveCollectionItem } from "../services/storageService";
import { getByFeatureKey, setByFeatureKey } from "../services/offlineCache";
import { useNavbar } from "../context/NavbarContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useGlobalState } from "../context/GlobalState";
import type { CollectionItem } from "../types";
import Markdown from "react-markdown";
import { useRuntimeDisplayMode } from "../hooks/useRuntimeDisplayMode";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { subscribeMediaQueryChange } from "../utils/mediaQuery";
import { normalizeAgentProfileMemory, resolveAgentProfileNamespace, type AgentProfileMemory } from "@baristachaw/shared";
import { getLanguageDirection, getLanguageLocale, LANGUAGE_OPTIONS } from "../constants";

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const SEARCH_CACHE_KEY = 'home_search';

type HomeSearchResult = SearchResultPayload & {
  query: string;
  fromCache?: boolean;
};

export function Home() {
  const { t, language, setLanguage } = useGlobalState();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HomeSearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [cachedResult, setCachedResult] = useState<HomeSearchResult | null>(null);
  const [activeQuery, setActiveQuery] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const statusIntervalRef = useRef<number | null>(null);
  const savedResetTimeoutRef = useRef<number | null>(null);
  const copiedResetTimeoutRef = useRef<number | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory({
    preferredLanguage: typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en',
    assistantName: t.chatBrandName,
  }));
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const searchRequestIdRef = useRef(0);
  const { hideNav, showNav } = useNavbar();
  const { user, isAuthenticated, openAuthModal, logout } = useAuthModal();
  const { isOffline } = useNetworkStatus();
  const agentProfileNamespace = useMemo(() => resolveAgentProfileNamespace(user?.id), [user?.id]);
  const locale = useMemo(() => getLanguageLocale(language), [language]);
  const direction = useMemo(() => getLanguageDirection(language), [language]);
  const isRtl = direction === 'rtl';
  const mergeProfileWithUiLanguage = useCallback((profile?: Partial<AgentProfileMemory> | null, nextLanguage?: string) => (
    normalizeAgentProfileMemory({
      ...(profile || {}),
      preferredLanguage: profile?.languageSource === 'manual' && profile?.preferredLanguage
        ? profile?.preferredLanguage
        : (nextLanguage || profile?.preferredLanguage || language || 'en'),
      languageSource: profile?.languageSource === 'manual' && profile?.preferredLanguage ? 'manual' : 'global',
    })
  ), [language]);

  const statusMessages = [
    t.homeStatusSearching,
    t.homeStatusAnalyzing,
    t.homeStatusCrossRef,
    t.homeStatusCrafting,
    t.homeStatusBrewing,
  ];

  const clearStatusTicker = () => {
    if (statusIntervalRef.current !== null) {
      window.clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  // Smart navbar: hide when search modal is open
  useEffect(() => {
    if (showResultModal) hideNav();
    else showNav();
    return () => showNav();
  }, [showResultModal, hideNav, showNav]);

  // Save-to-collection state
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isIosStandalone } = useRuntimeDisplayMode();
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const useLanguageSheet = isCompactViewport || isIosStandalone;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    let unsubscribeMediaChange: (() => void) | null = null;

    const syncThemeState = () => {
      const prefersDark = Boolean(media?.matches);
      setIsDark(root.classList.contains('dark') || (!root.classList.contains('light') && prefersDark));
    };

    syncThemeState();

    const observer = new MutationObserver(syncThemeState);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    if (media) {
      unsubscribeMediaChange = subscribeMediaQueryChange(media, syncThemeState);
    }
    window.addEventListener('storage', syncThemeState);

    return () => {
      observer.disconnect();
      unsubscribeMediaChange?.();
      window.removeEventListener('storage', syncThemeState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewportMode = () => setIsCompactViewport(media.matches);
    updateViewportMode();
    const unsubscribe = subscribeMediaQueryChange(media, updateViewportMode);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!showLanguageMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      if (useLanguageSheet) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (languageMenuRef.current?.contains(target)) return;
      setShowLanguageMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowLanguageMenu(false);
      }
    };
    if (!useLanguageSheet) {
      document.addEventListener('pointerdown', onPointerDown, true);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      if (!useLanguageSheet) {
        document.removeEventListener('pointerdown', onPointerDown, true);
      }
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showLanguageMenu, useLanguageSheet]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearStatusTicker();
      if (savedResetTimeoutRef.current !== null) {
        window.clearTimeout(savedResetTimeoutRef.current);
        savedResetTimeoutRef.current = null;
      }
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
        copiedResetTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await getAgentProfileMemory(agentProfileNamespace);
      if (!cancelled) {
        setAgentProfile(normalizeAgentProfileMemory({
          ...mergeProfileWithUiLanguage(stored, language),
          userDisplayName: stored.userDisplayName || user?.name,
          assistantName: stored.assistantName || t.chatBrandName,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentProfileNamespace, language, mergeProfileWithUiLanguage, t.chatBrandName, user?.name]);

  useEffect(() => {
    setAgentProfile((prev) => mergeProfileWithUiLanguage(prev, language));
  }, [language, mergeProfileWithUiLanguage]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('BARISTA_THEME', 'light');
      setIsDark(false);
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      localStorage.setItem('BARISTA_THEME', 'dark');
      setIsDark(true);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.goodMorning;
    if (hour < 18) return t.goodAfternoon;
    return t.goodEvening;
  };

  const formatText = (template: string, replacements: Record<string, string | number>) =>
    Object.entries(replacements).reduce(
      (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
      template,
    );

  const formatSourceCount = (count: number) =>
    formatText(count === 1 ? t.homeSourceSingle : t.homeSourcePlural, { count });

  const loadCachedSearchResult = async (searchQuery: string): Promise<HomeSearchResult | null> => {
    const cached = await getByFeatureKey<HomeSearchCachePayload>(SEARCH_CACHE_KEY, searchQuery);
    const normalized = normalizeHomeSearchCachePayload(searchQuery, cached);
    if (!normalized) return null;
    return {
      ...normalized,
      query: searchQuery,
      fromCache: true,
    };
  };

  const executeSearch = async (searchQuery: string) => {
    if (!isAuthenticated) {
      openAuthModal({ source: 'home_search' });
      return;
    }
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    const requestId = ++searchRequestIdRef.current;

    setActiveQuery(trimmedQuery);
    setLoading(true);
    setSaved(false);
    setCopied(false);
    setShowResultModal(true);
    setResult(null);
    setSearchError('');
    setCachedResult(null);
    setStatusIdx(0);
    // Rotate status messages
    clearStatusTicker();
    statusIntervalRef.current = window.setInterval(() => {
      setStatusIdx(prev => (prev + 1) % statusMessages.length);
    }, 2200);
    try {
      if (isOffline) {
        const cached = await loadCachedSearchResult(trimmedQuery);
        if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;
        setCachedResult(cached);
        setSearchError(t.homeOfflineSearchUnavailable);
        return;
      }

      const res = await searchWithGemini(trimmedQuery, {
        responseProfile: {
          language,
        },
        clientContext: {
          platform: isIosStandalone ? 'pwa' : 'web',
          surface: 'home',
          appLanguage: document.documentElement.lang || undefined,
        },
        agentProfile: {
          ...agentProfile,
          preferredLanguage: language,
        },
      });
      if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;
      const liveResult: HomeSearchResult = { ...res, query: trimmedQuery, fromCache: false };
      setResult(liveResult);
      if (res.liveSearchUnavailable) {
        setSearchError(t.homeLiveSearchUnavailable);
      }
      if (shouldPersistHomeSearchCache(res)) {
        await setByFeatureKey(SEARCH_CACHE_KEY, trimmedQuery, {
          text: res.text,
          chunks: res.chunks || [],
          sources: res.sources || [],
          sourceCount: res.sourceCount,
          retrievedAt: res.retrievedAt,
        });
      }
    } catch (error) {
      console.error(error);
      const cached = await loadCachedSearchResult(trimmedQuery);
      if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;
      setCachedResult(cached);
      if (error instanceof SearchWebError) {
        setSearchError(t.homeLiveSearchRetry || error.message);
      } else {
        setSearchError(t.homeLiveSearchRetry);
      }
    } finally {
      clearStatusTicker();
      if (!isMountedRef.current || searchRequestIdRef.current !== requestId) return;
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSearch(query);
  };

  const handleRetrySearch = async () => {
    const target = activeQuery || query;
    if (!target.trim()) return;
    await executeSearch(target);
  };

  const handleViewCachedResult = () => {
    if (!cachedResult) return;
    setResult(cachedResult);
    setSearchError('');
  };

  const handleSaveToCollection = async () => {
    if (!result || saved) return;
    const item: CollectionItem = {
      id: genId('col'),
      title: result.query || t.homeSearchResult,
      type: 'ai_canvas',
      content: {
        markdown: result.text,
        sources: result.sources?.map(source => source.uri) || [],
        kind: 'note' as const,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveCollectionItem(item);
    setSaved(true);
    if (savedResetTimeoutRef.current !== null) {
      window.clearTimeout(savedResetTimeoutRef.current);
    }
    savedResetTimeoutRef.current = window.setTimeout(() => {
      setSaved(false);
      savedResetTimeoutRef.current = null;
    }, 3000);
  };

  const handleCopyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }
      copiedResetTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedResetTimeoutRef.current = null;
      }, 2000);
    } catch { }
  };

  const closeModal = () => {
    searchRequestIdRef.current += 1;
    clearStatusTicker();
    setLoading(false);
    setShowResultModal(false);
    setSearchError('');
    setCachedResult(null);
  };

  const handleLanguageSelect = (nextLanguage: typeof language) => {
    setLanguage(nextLanguage);
    setAgentProfile((prev) => mergeProfileWithUiLanguage(prev, nextLanguage));
    void saveAgentProfileMemory(agentProfileNamespace, {
      preferredLanguage: nextLanguage,
      languageSource: 'global',
    });
    setShowLanguageMenu(false);
  };

  const handleLanguageMenuToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (useLanguageSheet) {
      window.requestAnimationFrame(() => {
        setShowLanguageMenu(true);
      });
      return;
    }
    setShowLanguageMenu((prev) => !prev);
  };

  const renderLanguageOptions = () => (
    <div className="max-h-80 overflow-y-auto">
      {LANGUAGE_OPTIONS.map((option) => {
        const primaryLanguageLabel = option.nativeLabel;
        const secondaryLanguageLabel = option.nativeLabel !== option.label
          ? option.label
          : '';
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleLanguageSelect(option.value)}
            className={`w-full px-3 py-2.5 rounded-2xl transition-colors flex items-center gap-3 ${language === option.value ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'text-primary hover:bg-surface-alpha'}`}
          >
            <span className="flex-1 min-w-0">
              <span
                dir={option.dir}
                className={`block text-sm font-medium leading-snug whitespace-normal break-words ${option.dir === 'rtl' ? 'text-right' : 'text-left'}`}
              >
                {primaryLanguageLabel}
              </span>
              {secondaryLanguageLabel ? (
                <span className={`block text-[11px] leading-snug text-tertiary whitespace-normal break-words ${option.dir === 'rtl' ? 'text-right' : 'text-left'}`}>{secondaryLanguageLabel}</span>
              ) : null}
            </span>
            {language === option.value ? <Check size={14} className="shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );

  const languageDropdown = (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      dir={direction}
      className={`absolute mt-2 w-[min(92vw,22rem)] min-w-[18rem] rounded-3xl border border-glass bg-[var(--bg-base)]/96 backdrop-blur-xl p-2 shadow-[0_18px_46px_rgba(0,0,0,0.24)] z-20 ${isRtl ? 'left-0' : 'right-0'}`}
    >
      <p className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary ${isRtl ? 'text-right' : 'text-left'}`}>
        {t.selectLanguage}
      </p>
      {renderLanguageOptions()}
    </motion.div>
  );

  const languageSheet = showLanguageMenu && useLanguageSheet && typeof document !== 'undefined'
    ? createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140]"
        >
          <div className="absolute inset-0 bg-black/35" onClick={() => setShowLanguageMenu(false)} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            dir={direction}
            className="absolute left-0 right-0 z-10 rounded-[1.9rem] border border-glass bg-[var(--bg-base)]/98 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
            style={{
              insetInlineStart: 'max(12px, env(safe-area-inset-left, 0px))',
              insetInlineEnd: 'max(12px, env(safe-area-inset-right, 0px))',
              bottom: 'calc(max(12px, var(--bottom-safe-capped, 0px)) + 8px)',
              maxHeight: 'min(34rem, 72vh)',
            }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t.selectLanguage}
          >
            <div className={`flex items-center gap-3 px-3 py-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-semibold text-primary">{t.language}</p>
                <p className="text-[11px] text-tertiary">{t.selectLanguage}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLanguageMenu(false)}
                className="rounded-full p-2 text-secondary hover:bg-surface-alpha hover:text-primary"
                aria-label={t.close}
              >
                <X size={16} />
              </button>
            </div>
            {renderLanguageOptions()}
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body,
    )
    : null;

  return (
    <motion.div
      dir={direction}
      initial={isIosStandalone ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={isIosStandalone ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative page-container desktop-noise-bg w-full"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-1 flex-col">
      {/* Top bar */}
      <div
        dir={direction}
        className="flex items-center justify-end gap-3 mb-4 shrink-0"
      >
        {user ? (
          <div className={`flex items-center gap-3 panel-soft px-3 py-1.5 rounded-full ${isRtl ? 'flex-row-reverse' : ''}`}>
            {user.picture ? (
              <img src={user.picture} alt={user.name || t.signedIn} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-semibold">
                {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className={`text-sm font-medium text-primary hidden sm:block ${isRtl ? 'text-right' : 'text-left'}`}>{user.name || user.email || t.signedIn}</span>
            <button onClick={handleLogout} className="p-1.5 text-secondary hover:text-primary transition-colors" aria-label={t.signOut}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal({ source: 'home_search' })}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass-button hover:scale-105 transition-transform text-sm font-medium"
          >
            <LogIn size={16} />
            <span>{t.signIn}</span>
          </button>
        )}
        <div ref={languageMenuRef} className="relative">
          <button
            type="button"
            onClick={handleLanguageMenuToggle}
            className="flex items-center gap-2 px-3 py-2 rounded-full glass-button hover:scale-105 transition-transform text-sm font-medium"
            aria-label={t.openLanguageMenu}
            aria-expanded={showLanguageMenu}
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{t.language}</span>
            <ChevronDown size={14} />
          </button>
          <AnimatePresence>
            {showLanguageMenu && (
              !useLanguageSheet ? languageDropdown : null
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full glass-button hover:scale-105 transition-transform"
          aria-label={t.toggleTheme}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Greeting */}
      <header className="mb-6 text-center shrink-0 panel-soft rounded-3xl px-5 py-5 lg:py-6">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-balance bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">{getGreeting()}</h1>
        <p className="text-secondary text-lg font-medium">{t.homePrompt}</p>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6 relative max-w-xl lg:max-w-3xl mx-auto shrink-0 w-full">
        <div className="relative flex items-center group">
          <Search
            className={`absolute ${isRtl ? 'right-6' : 'left-6'} text-secondary group-focus-within:text-blue-500 transition-colors duration-300`}
            size={22}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAuthenticated ? t.homeSearchPlaceholderAuth : t.homeSearchPlaceholderGuest}
            disabled={!isAuthenticated}
            className={`w-full glass-input py-5 text-lg font-medium ${isRtl ? 'pr-16 pl-16 text-right' : 'pl-16 pr-16 text-left'}`}
          />
          {loading && (
            <div className={`absolute ${isRtl ? 'left-6' : 'right-6'} flex gap-1`}>
              <span className="w-2 h-2 rounded-full bg-blue-500/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500/50" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite 0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500/30" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite 0.4s' }} />
            </div>
          )}
        </div>
      </form>

      {/* Feature Cards — always visible */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 max-w-xl md:max-w-3xl lg:max-w-6xl mx-auto items-stretch w-full"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }} className="md:col-span-2 lg:col-span-3">
          <Link to="/chat" className="block h-full">
            <div className="glass-card-interactive min-h-[9.75rem] lg:min-h-[10.75rem] p-6 lg:p-7 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`flex h-full items-center gap-5 lg:gap-6 relative z-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className="w-16 h-16 rounded-[1.25rem] bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 ease-out">
                  <Sparkles size={32} />
                </div>
                <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h2 className="text-2xl font-semibold mb-1">{t.homeAskTitle}</h2>
                  <p className="text-secondary text-base max-w-2xl">{t.homeAskSubtitle}</p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/scanner" className="block h-full">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'}`}>
              <div className="w-14 h-14 rounded-[1.25rem] bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner group-hover:scale-110 transition-transform duration-300 ease-out">
                <Camera size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-semibold text-lg">{t.homeScannerTitle}</h3>
                <p className="text-sm text-secondary mt-1">{t.homeScannerSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/tools?tab=ai-brew" className="block h-full">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'}`}>
              <div className="w-14 h-14 rounded-[1.25rem] bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner group-hover:scale-110 transition-transform duration-300 ease-out">
                <Sparkles size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-semibold text-lg">{t.homeAiBrewTitle}</h3>
                <p className="text-sm text-secondary mt-1">{t.homeAiBrewSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/tools" className="block h-full">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'}`}>
              <div className="w-14 h-14 rounded-[1.25rem] bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner group-hover:scale-110 transition-transform duration-300 ease-out">
                <Coffee size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-semibold text-lg">{t.homeToolsTitle}</h3>
                <p className="text-sm text-secondary mt-1">{t.homeToolsSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }} className="md:col-span-2 lg:col-span-3">
          <Link to="/collection" className="block h-full">
            <div className={`glass-card-interactive min-h-[9rem] lg:min-h-[9.75rem] p-6 lg:p-7 flex items-center gap-5 group ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-14 h-14 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 ease-out">
                <BookOpen size={28} />
              </div>
              <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <h3 className="font-semibold text-lg">{t.homeCollectionTitle}</h3>
                <p className="text-sm text-secondary mt-1">{t.homeCollectionSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* ─── Search Results Modal ─── */}
      </div>

      <AnimatePresence>
        {showResultModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={closeModal}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed z-50 flex flex-col glass-card overflow-hidden"
              style={{
                top: 'max(calc(var(--safe-top, 0px) + 0.5rem), 1rem)',
                bottom: 'max(calc(var(--bottom-safe-capped, 0px) + 0.5rem), 1rem)',
                left: '1rem',
                right: '1rem',
                maxWidth: '42rem',
                marginInline: 'auto',
              }}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-glass flex items-center justify-between shrink-0">
                <div className={`flex items-center gap-3 min-w-0 flex-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-[0.75rem] bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Search size={16} />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <h2 className="font-semibold text-sm truncate">{result?.query || activeQuery || query}</h2>
                    <p className="text-[11px] text-tertiary">{t.homeSearchResult}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {/* Copy */}
                  <button
                    onClick={handleCopyResult}
                    disabled={!result || loading}
                    className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-alpha transition-all disabled:opacity-40"
                    title={t.copySummary}
                  >
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  {/* Save to Collection */}
                  <button
                    onClick={handleSaveToCollection}
                    disabled={!result || loading || saved}
                    className={`p-2 rounded-xl transition-all disabled:opacity-40 ${saved ? 'text-emerald-500 bg-emerald-500/10' : 'text-secondary hover:text-primary hover:bg-surface-alpha'}`}
                    title={t.saveToCollection}
                  >
                    {saved ? <Check size={16} /> : <Bookmark size={16} />}
                  </button>
                  {/* Close */}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-alpha transition-all"
                    aria-label={t.close}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                {loading && !result ? (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    {/* Coffee Cup Latte Art Animation */}
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 96 96" className="w-full h-full" style={{ animation: 'latte-swirl 3s ease-in-out infinite' }}>
                        {/* Cup body */}
                        <path d="M20 35 C20 30 26 26 36 26 L60 26 C70 26 76 30 76 35 L72 72 C72 78 66 82 48 82 C30 82 24 78 24 72 Z" fill="var(--surface-alpha)" stroke="var(--glass-border)" strokeWidth="1.5" />
                        {/* Coffee liquid */}
                        <ellipse cx="48" cy="42" rx="22" ry="8" fill="#8B6914" opacity="0.7">
                          <animate attributeName="ry" values="8;10;8" dur="2s" repeatCount="indefinite" />
                        </ellipse>
                        {/* Latte art heart */}
                        <path d="M48 40 C44 35 38 36 38 40 C38 44 48 50 48 50 C48 50 58 44 58 40 C58 36 52 35 48 40Z" fill="#D4A574" opacity="0.9">
                          <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
                        </path>
                        {/* Handle */}
                        <path d="M76 38 C82 38 86 44 86 50 C86 56 82 60 76 60" fill="none" stroke="var(--glass-border)" strokeWidth="2" strokeLinecap="round" />
                        {/* Steam */}
                        <path d="M38 22 Q36 16 38 10" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4">
                          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="d" values="M38 22 Q36 16 38 10;M38 22 Q40 15 38 10;M38 22 Q36 16 38 10" dur="2s" repeatCount="indefinite" />
                        </path>
                        <path d="M48 24 Q46 17 48 11" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3">
                          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite" />
                          <animate attributeName="d" values="M48 24 Q46 17 48 11;M48 24 Q50 16 48 11;M48 24 Q46 17 48 11" dur="2.2s" repeatCount="indefinite" />
                        </path>
                        <path d="M58 22 Q56 16 58 10" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35">
                          <animate attributeName="opacity" values="0.35;0.7;0.35" dur="1.6s" repeatCount="indefinite" />
                        </path>
                      </svg>
                      {/* Ripple rings */}
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" style={{ animation: 'coffee-ripple 2s ease-in-out infinite' }} />
                      <div className="absolute inset-[-8px] rounded-full border border-blue-500/10" style={{ animation: 'coffee-ripple 2s ease-in-out infinite 0.5s' }} />
                    </div>
                    {/* Rotating status text */}
                    <div className="text-center h-12 flex flex-col items-center justify-center">
                      <p className="font-medium text-primary text-sm">{statusMessages[statusIdx]}</p>
                      <p className="text-xs text-tertiary mt-1.5">"{activeQuery || query}"</p>
                    </div>
                    {/* Shimmer skeleton preview */}
                    <div className="w-full max-w-sm space-y-3 opacity-40">
                      <div className="h-3 rounded-full loading-shimmer" />
                      <div className="h-3 rounded-full loading-shimmer w-4/5" />
                      <div className="h-3 rounded-full loading-shimmer w-3/5" />
                    </div>
                  </div>
                ) : searchError && !result ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                    <p className="text-sm font-medium text-primary">{searchError}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={handleRetrySearch}
                        className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        {t.homeRetryLiveSearch}
                      </button>
                      <button
                        onClick={handleViewCachedResult}
                        disabled={!cachedResult}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-glass text-secondary hover:text-primary disabled:opacity-40"
                      >
                        {t.homeViewCachedResult}
                      </button>
                    </div>
                    {cachedResult?.retrievedAt ? (
                      <p className="text-xs text-tertiary">
                        {formatText(t.homeCachedFrom, { time: new Date(cachedResult.retrievedAt).toLocaleString(locale) })}
                      </p>
                    ) : null}
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    {/* AI Summary */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={14} className="text-blue-500" />
                        <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest">{t.homeAiSummary}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${result.fromCache ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'}`}>
                          {result.fromCache ? t.homeCachedResult : (result.liveSearchUnavailable ? t.homeDeepFallback : t.homeLiveWebSources)}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          {formatSourceCount(Number.isFinite(result.sourceCount) ? Number(result.sourceCount) : (result.sources?.length ?? 0))}
                        </span>
                        {result.liveSearchUnavailable ? (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            {t.homeLiveSourcesUnavailable}
                          </span>
                        ) : null}
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-alpha text-secondary">
                          {formatText(t.homeRetrievedAt, { time: new Date(result.retrievedAt).toLocaleString(locale) })}
                        </span>
                      </div>
                      <div className="chat-markdown search-result-markdown prose prose-sm max-w-none text-primary prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-primary prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-primary prose-code:text-primary">
                        <Markdown>{result.text}</Markdown>
                      </div>
                    </div>

                    {/* Sources */}
                    {result.sources && result.sources.length > 0 ? (
                      <div className="pt-4 border-t border-glass">
                        <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">{t.homeLiveWebSources}</h3>
                        <div className="space-y-2">
                          {result.sources.map((source, idx) => {
                            const domain = source.domain || (() => { try { return new URL(source.uri).hostname.replace('www.', ''); } catch { return ''; } })();
                            return (
                              <a
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-surface-alpha hover:bg-surface-alpha-hover transition-all group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                  <ExternalLink size={14} className="text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-primary truncate block group-hover:text-blue-500 transition-colors">
                                    {source.title || source.uri}
                                  </span>
                                  {domain && <span className="text-[11px] text-tertiary">{domain}</span>}
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-glass">
                        <p className="text-xs text-tertiary text-center py-2">
                          {t.homeNoSources}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Modal Footer — Save confirmation */}
              <AnimatePresence>
                {saved && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="px-6 py-3 border-t border-glass bg-emerald-500/10 flex items-center gap-2 shrink-0"
                  >
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-600">{t.homeSavedToCollection}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {languageSheet}
    </motion.div>
  );
}





















