import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Check, ChevronDown, Copy, CreditCard, ExternalLink, Globe, LogIn, LogOut, Moon, RefreshCcw, Search, ShieldCheck, Sparkles, Sun, Wrench, X, Bookmark } from "lucide-react";
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
import { useAccountStatus } from "../context/AccountStatusContext";
import type { AccountFeatureFlag, AccountStatusSnapshot } from "../services/accountStatus";
import { BillingApiError, openBillingPortal } from "../services/billing";
import { isDisplayableAvatarUrl } from "../utils/avatarUrl";
import { useAiAccessGate } from "../components/billing/AiAccessGate";
import { PlanGrowthSurface } from "../components/billing/PlanGrowthSurface";
import { AccountPrivacyPanel } from "../components/account/AccountPrivacyPanel";
import { resolveWorkspaceStatus } from "../utils/workspaceStatus";
import {
  BookOpen as AppBookOpenIcon,
  Camera as AppCameraIcon,
  Coffee as AppCoffeeIcon,
  Gauge as AppGaugeIcon,
  Sparkles as AppSparklesIcon,
} from "../components/icons";
import { normalizeAgentProfileMemory, resolveAgentProfileNamespace, type AgentProfileMemory } from "@baristachaw/shared";
import { getLanguageDirection, getLanguageLocale, LANGUAGE_OPTIONS } from "../constants";

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const SEARCH_CACHE_KEY = 'home_search';
const SUPPORT_WHATSAPP_URL = `https://wa.me/6738270092?text=${encodeURIComponent('Halo Baristachaw, saya ingin menanyakan status pembayaran yang sedang menunggu review admin.')}`;

type HomeSearchResult = SearchResultPayload & {
  query: string;
  fromCache?: boolean;
};

function formatCompactNumber(value: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatStatusValue(value: string, language: string): string {
  const normalized = value.replace(/_/g, ' ').trim();
  if (language !== 'id') return normalized;
  const idMap: Record<string, string> = {
    none: 'tidak ada',
    active: 'aktif',
    trialing: 'uji coba',
    past_due: 'tertunggak',
    cancelled: 'dibatalkan',
    expired: 'kedaluwarsa',
    refunded: 'dikembalikan',
    available: 'tersedia',
    maintenance: 'pemeliharaan',
    disabled: 'nonaktif',
    web: 'Web',
    pwa: 'PWA',
    mobile: 'seluler',
  };
  return idMap[value] || normalized;
}

function formatPlanName(value: string, language: string): string {
  if (language !== 'id') return value;
  const normalized = value.trim().toLowerCase();
  const idMap: Record<string, string> = {
    free: 'Gratis',
    starter: 'Starter',
    pro: 'Pro',
    team: 'Tim',
    enterprise: 'Enterprise',
  };
  return idMap[normalized] || value;
}

function formatRecommendedUpgradeReason(
  snapshot: AccountStatusSnapshot | null,
  language: string,
  locale: string,
): string {
  const upgrade = snapshot?.recommendedUpgrade;
  if (!upgrade?.reason) return '';
  if (language !== 'id') return upgrade.reason;
  const plan = snapshot?.plans.find((item) => item.code === upgrade.planCode);
  if (!plan) return upgrade.reason;
  if (upgrade.action === 'checkout') {
    return `Paket ${formatPlanName(plan.name, language)} membuka ${formatCompactNumber(plan.aiDailyLimit, locale)} permintaan AI/hari dan ${formatCompactNumber(plan.deepDailyLimit, locale)} permintaan Deep/hari.`;
  }
  if (upgrade.action === 'manage') {
    return `Kelola pembayaran untuk menjaga akses paket ${formatPlanName(plan.name, language)} tetap aktif.`;
  }
  if (upgrade.action === 'contact_support') {
    return `Hubungi dukungan untuk mengaktifkan paket ${formatPlanName(plan.name, language)}.`;
  }
  return upgrade.reason;
}

function featureUnavailableMessage(flag: AccountFeatureFlag, t: Record<string, string>): string {
  return flag.message || t.homeFeatureUnavailableMessage
    .replace('{feature}', flag.label)
    .replace('{status}', flag.status);
}

function featureCardStateClass(flag?: AccountFeatureFlag | null): string {
  if (!flag || flag.status === 'available') return '';
  if (flag.status === 'disabled') return 'opacity-70 grayscale-[0.15] ring-1 ring-rose-500/25';
  return 'ring-1 ring-amber-500/25';
}

function FeatureStatusBadge({ flag, t }: { flag?: AccountFeatureFlag | null; t: Record<string, string> }) {
  if (!flag || flag.status === 'available') return null;
  const tone = flag.status === 'disabled'
    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${tone}`}
      title={featureUnavailableMessage(flag, t)}
    >
      <Wrench size={12} />
      {flag.status === 'disabled' ? t.homeFeatureUnavailable : t.homeFeatureMaintenance}
    </span>
  );
}

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
  const [billingBusy, setBillingBusy] = useState(false);
  const [showPlanCatalog, setShowPlanCatalog] = useState(false);
  const [showAccountPrivacy, setShowAccountPrivacy] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [userPictureFailed, setUserPictureFailed] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const statusIntervalRef = useRef<number | null>(null);
  const savedResetTimeoutRef = useRef<number | null>(null);
  const copiedResetTimeoutRef = useRef<number | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory({
    preferredLanguage: typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en',
    assistantName: t.chatBrandName,
  }));
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const resultModalRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const searchRequestIdRef = useRef(0);
  const { hideNav, showNav } = useNavbar();
  const { user, isAuthenticated, isGuest, openAuthModal, logout } = useAuthModal();
  const { isOffline } = useNetworkStatus();
  const {
    snapshot: accountSnapshot,
    loading: accountStatusLoading,
    error: accountStatusError,
    maintenance,
    surface,
    refreshAccountStatus,
  } = useAccountStatus();
  const { ensureAiAccess, aiAccessGateModal } = useAiAccessGate('search');
  const agentProfileNamespace = useMemo(() => resolveAgentProfileNamespace(user?.id), [user?.id]);
  const locale = useMemo(() => getLanguageLocale(language), [language]);
  const direction = useMemo(() => getLanguageDirection(language), [language]);
  const isRtl = direction === 'rtl';
  const userAvatarUrl = user?.picture && isDisplayableAvatarUrl(user.picture) ? user.picture : '';
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

  const accountAccessStatus = accountSnapshot?.appAccess.status || 'ok';
  const accountBlocked = isAuthenticated && accountAccessStatus === 'blocked';
  const workspaceStatus = useMemo(() => resolveWorkspaceStatus({
    snapshot: accountSnapshot,
    loading: accountStatusLoading,
    error: accountStatusError?.message || '',
    maintenance,
    language,
    locale,
  }), [accountSnapshot, accountStatusError, accountStatusLoading, language, locale, maintenance]);
  const workspaceStatusTone = workspaceStatus.severity === 'danger'
    ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    : workspaceStatus.severity === 'warning'
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : workspaceStatus.severity === 'success'
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300';
  const WorkspaceStatusIcon = workspaceStatus.kind === 'blocked' || workspaceStatus.kind === 'past_due' || workspaceStatus.kind === 'inactive'
    ? AlertTriangle
    : workspaceStatus.kind === 'maintenance'
      ? Wrench
      : workspaceStatus.kind === 'pending_review' || workspaceStatus.kind === 'expiring'
        ? CreditCard
        : ShieldCheck;
  const billingStatusLabel = accountSnapshot?.billing.status || 'none';
  const recommendedUpgrade = accountSnapshot?.recommendedUpgrade;
  const showWorkspaceStatusPanel = isAuthenticated && !isGuest;
  const hasPendingPaymentReview = workspaceStatus.kind === 'pending_review';
  const recommendedUpgradeReason = useMemo(
    () => formatRecommendedUpgradeReason(accountSnapshot, language, locale),
    [accountSnapshot, language, locale],
  );
  const featureFlagByKey = useMemo(() => {
    const map = new Map<string, AccountFeatureFlag>();
    for (const flag of accountSnapshot?.featureFlags || []) {
      map.set(flag.key, flag);
    }
    return map;
  }, [accountSnapshot?.featureFlags]);
  const globalFeatureFlag = featureFlagByKey.get('global_app');
  const chatFeatureFlag = [featureFlagByKey.get('chat'), globalFeatureFlag].find((flag) => flag && flag.status !== 'available') || null;
  const scannerFeatureFlag = [featureFlagByKey.get('scanner'), globalFeatureFlag].find((flag) => flag && flag.status !== 'available') || null;
  const aiBrewFeatureFlag = [featureFlagByKey.get('ai_brew'), globalFeatureFlag].find((flag) => flag && flag.status !== 'available') || null;
  const collectionFeatureFlag = [featureFlagByKey.get('collection'), globalFeatureFlag].find((flag) => flag && flag.status !== 'available') || null;
  const toolsFeatureFlag = globalFeatureFlag && globalFeatureFlag.status !== 'available' ? globalFeatureFlag : null;

  const clearStatusTicker = () => {
    if (statusIntervalRef.current !== null) {
      window.clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  // Smart navbar: hide when a modal is open
  useEffect(() => {
    if (showResultModal || showPlanCatalog || showAccountPrivacy) hideNav();
    else showNav();
    return () => showNav();
  }, [showResultModal, showPlanCatalog, showAccountPrivacy, hideNav, showNav]);

  useEffect(() => {
    if (!showResultModal) return;
    const timer = window.setTimeout(() => {
      resultModalRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [showResultModal]);

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
    setUserPictureFailed(false);
  }, [user?.picture]);

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
    if (loading) return;
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    if (!ensureAiAccess('home_search')) {
      return;
    }

    if (accountBlocked) {
      setActiveQuery(searchQuery.trim());
      setSearchError(accountSnapshot?.appAccess.message || t.homeAccountBlocked);
      setShowResultModal(true);
      return;
    }

    const requestId = ++searchRequestIdRef.current;

    setActiveQuery(trimmedQuery);
    setLoading(true);
    setSaved(false);
    setCopied(false);
    setSavingResult(false);
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

  const handleBillingAction = async () => {
    if (!accountSnapshot || !recommendedUpgrade || recommendedUpgrade.action === 'none') return;
    if (recommendedUpgrade.action === 'contact_support') {
      setActiveQuery(t.homeBillingSubtitle);
      setSearchError(recommendedUpgrade.reason);
      setShowResultModal(true);
      return;
    }
    if (recommendedUpgrade.action === 'checkout') {
      setShowPlanCatalog(true);
      return;
    }
    setBillingBusy(true);
    try {
      const response = recommendedUpgrade.action === 'manage' ? await openBillingPortal() : null;
      if (response?.mode === 'redirect' && response.url) {
        window.location.assign(response.url);
        return;
      }
      if (response?.mode === 'manual_support') {
        setActiveQuery(t.homeBillingSubtitle);
        setSearchError(t.homeBillingUnavailable);
        setShowResultModal(true);
        return;
      }
      throw new BillingApiError('Billing support is not configured yet.', {
        status: 0,
        errorCode: 'billing_not_configured',
      });
    } catch (error) {
      const message = error instanceof BillingApiError && error.errorCode === 'billing_not_configured'
        ? t.homeBillingUnavailable
        : error instanceof BillingApiError
          ? error.message
          : t.homeBillingUnavailable;
      setActiveQuery(t.homeBillingSubtitle);
      setSearchError(message);
      setShowResultModal(true);
    } finally {
      setBillingBusy(false);
    }
  };

  const handleWorkspaceStatusAction = async () => {
    if (workspaceStatus.kind === 'pending_review') {
      window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    if (workspaceStatus.action === 'checkout') {
      setShowPlanCatalog(true);
      return;
    }
    if (workspaceStatus.action === 'contact_support') {
      setActiveQuery(t.homeBillingSubtitle);
      setSearchError(workspaceStatus.message || recommendedUpgrade?.reason || t.homeBillingUnavailable);
      setShowResultModal(true);
      return;
    }
    if (workspaceStatus.action === 'manage') {
      await handleBillingAction();
    }
  };

  const handleRetrySearch = async () => {
    const target = activeQuery || query;
    if (!target.trim()) return;
    await executeSearch(target);
  };

  const handleFeatureNavigation = (event: React.MouseEvent<HTMLAnchorElement>, flag?: AccountFeatureFlag | null) => {
    if (!flag || flag.status !== 'disabled') return;
    event.preventDefault();
    searchRequestIdRef.current += 1;
    clearStatusTicker();
    setActiveQuery(flag.label);
    setResult(null);
    setCachedResult(null);
    setLoading(false);
    setSearchError(featureUnavailableMessage(flag, t));
    setShowResultModal(true);
  };

  const handleViewCachedResult = () => {
    if (!cachedResult) return;
    setResult(cachedResult);
    setSearchError('');
  };

  const handleSaveToCollection = async () => {
    if (!result || saved || savingResult) return;
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
    setSavingResult(true);
    try {
      await saveCollectionItem(item);
      setSaved(true);
      if (savedResetTimeoutRef.current !== null) {
        window.clearTimeout(savedResetTimeoutRef.current);
      }
      savedResetTimeoutRef.current = window.setTimeout(() => {
        setSaved(false);
        savedResetTimeoutRef.current = null;
      }, 3000);
    } finally {
      setSavingResult(false);
    }
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
              bottom: 'calc(max(12px, var(--safe-ui-bottom, var(--safe-bottom, 0px))) + 8px)',
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

  const isBillingModal = activeQuery === t.homeBillingSubtitle && Boolean(searchError) && !result;

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
            {userAvatarUrl && !userPictureFailed ? (
              <img
                src={userAvatarUrl}
                alt={user.name || t.signedIn}
                className="w-6 h-6 rounded-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setUserPictureFailed(true)}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-semibold">
                {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className={`text-sm font-medium text-primary hidden sm:block ${isRtl ? 'text-right' : 'text-left'}`}>{user.name || user.email || t.signedIn}</span>
            <button onClick={() => setShowAccountPrivacy(true)} className="p-1.5 text-secondary hover:text-primary transition-colors" aria-label={t.accountPrivacyTitle} title={t.accountPrivacyTitle}>
              <ShieldCheck size={16} />
            </button>
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
            type="search"
            name="home-ai-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={accountBlocked ? t.homeSearchBlockedPlaceholder : isAuthenticated && !isGuest ? t.homeSearchPlaceholderAuth : t.homeSearchPlaceholderGuest}
            disabled={accountBlocked || loading}
            aria-label={t.homeAskTitle}
            enterKeyHint="search"
            autoComplete="off"
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

      {/* Operational status: only surface when it needs attention */}
      {showWorkspaceStatusPanel ? (
        <section
          dir={direction}
          className={`mb-6 max-w-xl lg:max-w-6xl mx-auto w-full rounded-[1.35rem] border px-4 py-4 shadow-[var(--panel-elev-1)] ${workspaceStatusTone}`}
        >
          <div className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${isRtl ? 'lg:flex-row-reverse' : ''}`}>
            <div className={`flex min-w-0 items-start gap-3 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-base)]/70">
                <WorkspaceStatusIcon size={18} />
              </span>
              <div className="min-w-0">
                <div className={`flex flex-wrap items-center gap-2 ${isRtl ? 'justify-end' : ''}`}>
                  <h2 className="text-sm font-semibold text-primary">{t.homeWorkspaceStatus}</h2>
                  <span className="rounded-full bg-[var(--bg-base)]/70 px-2 py-0.5 text-[11px] font-semibold">
                    {workspaceStatus.label}
                  </span>
                  <span className="rounded-full bg-[var(--bg-base)]/70 px-2 py-0.5 text-[11px] font-semibold">
                    {workspaceStatus.badge}
                  </span>
                  <span className="rounded-full bg-[var(--bg-base)]/70 px-2 py-0.5 text-[11px] font-semibold capitalize">
                    {formatStatusValue(surface, language)}
                  </span>
                  {accountSnapshot && !hasPendingPaymentReview ? (
                    <span className="rounded-full bg-[var(--bg-base)]/70 px-2 py-0.5 text-[11px] font-semibold capitalize">
                      {formatText(t.homeBillingStatus, { status: formatStatusValue(billingStatusLabel, language) })}
                    </span>
                  ) : null}
                </div>
                {workspaceStatus.message ? (
                  <p className="mt-1 text-sm leading-5 text-secondary">
                    {workspaceStatus.message}
                  </p>
                ) : null}
                {workspaceStatus.helper ? (
                  <p className="mt-1 text-xs leading-5 text-secondary">
                    {workspaceStatus.helper}
                  </p>
                ) : null}
                {recommendedUpgradeReason && recommendedUpgrade?.action !== 'checkout' && workspaceStatus.kind !== 'pending_review' ? (
                  <p className="mt-1 text-xs leading-5 text-secondary">
                    {recommendedUpgradeReason}
                  </p>
                ) : null}
                {maintenance.length ? (
                  <div className={`mt-2 flex flex-wrap gap-1.5 ${isRtl ? 'justify-end' : ''}`}>
                    {maintenance.slice(0, 3).map((flag) => (
                      <span key={flag.key} className="rounded-full bg-[var(--bg-base)]/70 px-2 py-1 text-[11px] font-semibold">
                        {flag.label}: {formatStatusValue(flag.status, language)}
                      </span>
                    ))}
                    {maintenance.length > 3 ? (
                      <span className="rounded-full bg-[var(--bg-base)]/70 px-2 py-1 text-[11px] font-semibold">
                        {formatText(t.homeMoreFlags, { count: maintenance.length - 3 })}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {workspaceStatus.action !== 'none' ? (
                <button
                  type="button"
                  onClick={() => void handleWorkspaceStatusAction()}
                  disabled={billingBusy}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <CreditCard size={15} />
                  {billingBusy
                    ? t.opening
                    : workspaceStatus.action === 'manage'
                      ? t.homeManageBilling
                      : workspaceStatus.action === 'contact_support'
                        ? t.homeContactSupport
                        : t.homeUpgradePlan}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void refreshAccountStatus()}
                disabled={accountStatusLoading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-current/15 bg-[var(--bg-base)]/70 px-3 text-sm font-semibold text-primary transition-colors hover:bg-[var(--bg-base)] disabled:opacity-50"
              >
                <RefreshCcw size={15} className={accountStatusLoading ? 'animate-spin' : ''} />
                {t.homeSyncStatus}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isAuthenticated && accountSnapshot && !hasPendingPaymentReview ? (
        <PlanGrowthSurface
          snapshot={accountSnapshot}
          t={t}
          language={language}
          locale={locale}
          direction={direction}
          isOpen={showPlanCatalog}
          onOpen={() => setShowPlanCatalog(true)}
          onClose={() => setShowPlanCatalog(false)}
        />
      ) : null}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 max-w-xl md:max-w-3xl lg:max-w-6xl mx-auto items-stretch w-full"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }} className="md:col-span-2 lg:col-span-3">
          <Link to="/chat" onClick={(event) => handleFeatureNavigation(event, chatFeatureFlag)} aria-disabled={chatFeatureFlag?.status === 'disabled'} className="block h-full" data-testid="home-primary-action-card">
            <div className={`glass-card-interactive min-h-[9.75rem] lg:min-h-[10.75rem] p-6 lg:p-7 relative overflow-hidden group ${featureCardStateClass(chatFeatureFlag)}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`flex h-full items-center gap-5 lg:gap-6 relative z-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <AppSparklesIcon size={64} variant="tile" tone="blue" className="shrink-0 group-hover:scale-110 transition-transform duration-300 ease-out" />
                <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className={`mb-1 flex flex-wrap items-center gap-2 ${isRtl ? 'justify-end' : ''}`}>
                    <h2 className="text-2xl font-semibold">{t.homeAskTitle}</h2>
                    <FeatureStatusBadge flag={chatFeatureFlag} t={t} />
                  </div>
                  <p className="text-secondary text-base max-w-2xl">{t.homeAskSubtitle}</p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/tools?tab=ratio&panel=grind-size" onClick={(event) => handleFeatureNavigation(event, toolsFeatureFlag)} aria-disabled={toolsFeatureFlag?.status === 'disabled'} className="block h-full" data-testid="home-primary-action-card">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'} ${featureCardStateClass(toolsFeatureFlag)}`}>
              <AppGaugeIcon size={56} variant="tile" tone="green" className="group-hover:scale-110 transition-transform duration-300 ease-out" />
              <div className="w-full">
                <div className={`flex flex-wrap items-center justify-center gap-2 ${isRtl ? 'lg:justify-end' : 'lg:justify-start'}`}>
                  <h3 className="font-semibold text-lg">{t.homeGrindTitle}</h3>
                  <FeatureStatusBadge flag={toolsFeatureFlag} t={t} />
                </div>
                <p className="text-sm text-secondary mt-1">{t.homeGrindSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/tools?tab=ai-brew" onClick={(event) => handleFeatureNavigation(event, aiBrewFeatureFlag)} aria-disabled={aiBrewFeatureFlag?.status === 'disabled'} className="block h-full" data-testid="home-primary-action-card">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'} ${featureCardStateClass(aiBrewFeatureFlag)}`}>
              <AppSparklesIcon size={56} variant="tile" tone="blue" className="group-hover:scale-110 transition-transform duration-300 ease-out" />
              <div className="w-full">
                <div className={`flex flex-wrap items-center justify-center gap-2 ${isRtl ? 'lg:justify-end' : 'lg:justify-start'}`}>
                  <h3 className="font-semibold text-lg">{t.homeAiBrewTitle}</h3>
                  <FeatureStatusBadge flag={aiBrewFeatureFlag} t={t} />
                </div>
                <p className="text-sm text-secondary mt-1">{t.homeAiBrewSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/tools" onClick={(event) => handleFeatureNavigation(event, toolsFeatureFlag)} aria-disabled={toolsFeatureFlag?.status === 'disabled'} className="block h-full" data-testid="home-primary-action-card">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'} ${featureCardStateClass(toolsFeatureFlag)}`}>
              <AppCoffeeIcon size={56} variant="tile" tone="amber" className="group-hover:scale-110 transition-transform duration-300 ease-out" />
              <div className="w-full">
                <div className={`flex flex-wrap items-center justify-center gap-2 ${isRtl ? 'lg:justify-end' : 'lg:justify-start'}`}>
                  <h3 className="font-semibold text-lg">{t.homeToolsTitle}</h3>
                  <FeatureStatusBadge flag={toolsFeatureFlag} t={t} />
                </div>
                <p className="text-sm text-secondary mt-1">{t.homeToolsSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}>
          <Link to="/scanner" onClick={(event) => handleFeatureNavigation(event, scannerFeatureFlag)} aria-disabled={scannerFeatureFlag?.status === 'disabled'} className="block h-full" data-testid="home-primary-action-card">
            <div className={`glass-card-interactive min-h-[12rem] lg:min-h-[13rem] p-6 flex flex-col items-center justify-center text-center gap-3 lg:justify-between group ${isRtl ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'} ${featureCardStateClass(scannerFeatureFlag)}`}>
              <AppCameraIcon size={56} variant="tile" tone="amber" className="group-hover:scale-110 transition-transform duration-300 ease-out" />
              <div className="w-full">
                <div className={`flex flex-wrap items-center justify-center gap-2 ${isRtl ? 'lg:justify-end' : 'lg:justify-start'}`}>
                  <h3 className="font-semibold text-lg">{t.homeScannerTitle}</h3>
                  <FeatureStatusBadge flag={scannerFeatureFlag} t={t} />
                </div>
                <p className="text-sm text-secondary mt-1">{t.homeScannerSubtitle}</p>
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }} className="md:col-span-2 lg:col-span-3">
          <Link to="/collection" onClick={(event) => handleFeatureNavigation(event, collectionFeatureFlag)} aria-disabled={collectionFeatureFlag?.status === 'disabled'} className="block h-full" data-testid="home-primary-action-card">
            <div className={`glass-card-interactive min-h-[9rem] lg:min-h-[9.75rem] p-6 lg:p-7 flex items-center gap-5 group ${isRtl ? 'flex-row-reverse' : ''} ${featureCardStateClass(collectionFeatureFlag)}`}>
              <AppBookOpenIcon size={56} variant="tile" tone="green" className="shrink-0 group-hover:scale-110 transition-transform duration-300 ease-out" />
              <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className={`flex flex-wrap items-center gap-2 ${isRtl ? 'justify-end' : ''}`}>
                  <h3 className="font-semibold text-lg">{t.homeCollectionTitle}</h3>
                  <FeatureStatusBadge flag={collectionFeatureFlag} t={t} />
                </div>
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
              onClick={() => {
                if (!savingResult) closeModal();
              }}
            />

            {/* Modal */}
            <motion.div
              ref={resultModalRef}
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed z-50 flex flex-col glass-card overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label={isBillingModal ? t.homeBillingSubtitle : t.homeSearchResult}
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !savingResult) {
                  event.preventDefault();
                  closeModal();
                }
              }}
              style={{
                top: 'max(calc(var(--safe-top, 0px) + 0.5rem), 1rem)',
                bottom: 'max(calc(var(--safe-ui-bottom, var(--safe-bottom, 0px)) + 0.5rem), 1rem)',
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
                    {isBillingModal ? <CreditCard size={16} /> : <Search size={16} />}
                  </div>
                  <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <h2 className="font-semibold text-sm truncate">{result?.query || activeQuery || query}</h2>
                    <p className="text-[11px] text-tertiary">{isBillingModal ? t.homeBillingSubtitle : t.homeSearchResult}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {/* Copy */}
                  {!isBillingModal ? (
                    <button
                      type="button"
                      onClick={handleCopyResult}
                      disabled={!result || loading}
                      className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-alpha transition-all disabled:opacity-40"
                      aria-label={t.copySummary}
                      title={t.copySummary}
                    >
                      {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  ) : null}
                  {/* Save to Collection */}
                  {!isBillingModal ? (
                    <button
                      type="button"
                      onClick={handleSaveToCollection}
                      disabled={!result || loading || saved || savingResult}
                      className={`p-2 rounded-xl transition-all disabled:opacity-40 ${saved ? 'text-emerald-500 bg-emerald-500/10' : 'text-secondary hover:text-primary hover:bg-surface-alpha'}`}
                      aria-label={saved ? t.homeSavedToCollection : t.saveToCollection}
                      title={t.saveToCollection}
                    >
                      {saved ? <Check size={16} /> : savingResult ? <RefreshCcw size={16} className="animate-spin" /> : <Bookmark size={16} />}
                    </button>
                  ) : null}
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
                        onClick={() => {
                          if (isBillingModal) void handleBillingAction();
                          else void handleRetrySearch();
                        }}
                        disabled={isBillingModal && billingBusy}
                        className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {isBillingModal ? (billingBusy ? t.opening : t.homeBillingRetry) : t.homeRetryLiveSearch}
                      </button>
                      {!isBillingModal ? (
                        <button
                          onClick={handleViewCachedResult}
                          disabled={!cachedResult}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-glass text-secondary hover:text-primary disabled:opacity-40"
                        >
                          {t.homeViewCachedResult}
                        </button>
                      ) : null}
                    </div>
                    {!isBillingModal && cachedResult?.retrievedAt ? (
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
      <AccountPrivacyPanel
        isOpen={showAccountPrivacy}
        onClose={() => setShowAccountPrivacy(false)}
        t={t}
        direction={direction}
      />
      {aiAccessGateModal}
    </motion.div>
  );
}
