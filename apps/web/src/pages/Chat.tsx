import { Suspense, lazy, useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent, type CSSProperties } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, BrainCircuit, Volume2, Zap, Brain, Plus,
  History, Copy, Check, X, MessageSquare, Trash2,
  AlertCircle, Bookmark, BookmarkCheck, FileText, ArrowLeftRight, ExternalLink,
} from 'lucide-react';
import {
  createChatSession,
  sendMessageSafe,
  generateSpeech,
  fastResponseDetailed,
  balancedResponseDetailed,
  deepThinkingResponseDetailed,
  generateImage,
  transcribeAudio,
  analyzeAttachment,
  analyzeTextDocument,
  resolveServerAiTimeoutMs,
  resolveServerChatTimeoutMs,
  type DeepThinkingDetailedPayload,
} from '../services/gemini';
import {
  CHAT_INPUT_MAX_CHARS,
  CHAT_INPUT_WARNING_CHARS,
  appendAttachmentResponseStyle,
  buildAttachmentSmartPrompt,
  buildConversationContext,
  buildResponseOrchestration,
  extractDurablePreferenceUpdates,
  isReusableDraftSession,
  normalizeAgentProfileMemory,
  resolveAgentProfileNamespace,
  type DeepResponseMeta,
  type AgentProfileMemory,
  type ResponseMode,
  type StructuredSearchSource,
} from '@baristachaw/shared';
import {
  saveChatSession,
  saveMessage,
  ensureMessage,
  getChatSession,
  buildPreview,
  buildSessionTitle,
  saveCollectionItem,
  getAgentProfileMemory,
  resetAgentProfileMemory,
  saveAgentProfileMemory,
  subscribeAgentProfileUpdates,
} from '../services/storageService';
import { useGlobalState } from '../context/GlobalState';
import { useNavbar } from '../context/NavbarContext';
import { useAuthModal } from '../context/AuthModalContext';
import { useIOSKeyboardFix } from '../hooks/useIOSKeyboardFix';
import { usePinchZoomLock } from '../hooks/usePinchZoomLock';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useRuntimeDisplayMode } from '../hooks/useRuntimeDisplayMode';
import type { ChatAttachment, ChatMessage } from '../types';
import { ensureCameraPermission } from '../utils/cameraPermission';
import {
  CHAT_ATTACHMENT_LIMITS,
  attachmentKindLabel,
  buildAudioAttachment,
  formatBytes,
  prepareAttachmentDraftFromFile,
  type PreparedAttachmentDraft,
} from '../utils/chatAttachments';
import { resolveAudioPlaybackUrl } from '../utils/chatAudio';
import { subscribeMediaQueryChange } from '../utils/mediaQuery';
import {
  ArrowUp as AppArrowUpIcon,
  Camera as AppCameraIcon,
  FileText as AppFileTextIcon,
  Home as AppHomeIcon,
  ImagePlus as AppImagePlusIcon,
  Mic as AppMicIcon,
  Paperclip as AppPaperclipIcon,
} from '../components/icons';
import { useAiAccessGate } from '../components/billing/AiAccessGate';
import {
  buildChatDomainBlockReply,
  classifyChatUserRequest,
  guardChatAnswer,
} from '../features/chat/antiHallucination';
import { scoreAnswerRelevance } from '../features/chat/relevance';
import { buildStrictRegenerationPrompt, formatDirectFallbackAnswer } from '../features/chat/responseModeContracts';

const ChatWorkspacePanel = lazy(() =>
  import('../components/chat/ChatWorkspacePanel').then((module) => ({ default: module.ChatWorkspacePanel }))
);
const MarkdownRenderer = lazy(() => import('react-markdown'));

type SidebarTab = 'history' | 'library' | 'memory';
type ChatLoadingPhase = 'idle' | 'sending' | 'thinking' | 'rendering';

type ModeResponsePayload = {
  text: string;
  sources?: StructuredSearchSource[];
  deepMeta?: DeepResponseMeta;
  degraded?: boolean;
  provider?: string;
  details?: string;
};

function clampChatPayloadText(value: string) {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim();
  if (normalized.length <= CHAT_INPUT_MAX_CHARS) return normalized;
  return normalized.slice(0, CHAT_INPUT_MAX_CHARS);
}

const COMPOSER_MENU_ITEMS = ['photo', 'file', 'camera'] as const;
const DEEP_THINKING_PHASE_KEYS = [
  'chatDeepThinkingPhaseContext',
  'chatDeepThinkingPhaseAnalyze',
  'chatDeepThinkingPhaseTradeoff',
  'chatDeepThinkingPhaseFinalize',
] as const;

function actionForResponseMode(mode: ResponseMode): 'fast' | 'balanced' | 'deep_think' {
  if (mode === 'fast') return 'fast';
  if (mode === 'deep') return 'deep_think';
  return 'balanced';
}

function resolveChatSafetyTimeoutMs(mode: ResponseMode, attachmentMimeType?: string): number {
  const actionTimeout = resolveServerAiTimeoutMs(actionForResponseMode(mode));
  const attachmentTimeout = attachmentMimeType
    ? resolveServerAiTimeoutMs(attachmentMimeType.startsWith('text/') ? 'analyze_text' : 'analyze_attachment')
    : 0;
  const fallbackTimeout = mode === 'deep'
    ? resolveServerChatTimeoutMs(70_000)
    : resolveServerChatTimeoutMs();
  const responseTimeout = Math.max(actionTimeout, attachmentTimeout, fallbackTimeout);
  return responseTimeout + (mode === 'deep' ? 15_000 : 10_000);
}
const CHAT_MOBILE_SWIPE_HINT_STORAGE_KEY = 'baristachaw_chat_mobile_swipe_hint_count_v1';
const CHAT_MOBILE_SWIPE_HINT_MAX_SHOWS = 3;

function planSupportsDeepThink(planCode: string | null | undefined) {
  return planCode === 'pro' || planCode === 'team' || planCode === 'enterprise';
}

function getDayKey(value: number) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function resolveAttachmentDraftErrorMessage(rawMessage: string, t: Record<string, string>) {
  const msg = rawMessage.toLowerCase();
  if (!msg) return t.chatAttachmentPrepareFailed;
  if (msg.includes('unsupported file type')) return t.chatAttachmentUnsupportedType;
  if (msg.includes('image too large') || msg.includes('pdf too large')) return t.chatAttachmentFileTooLarge;
  if (msg.includes('text file is empty')) return t.chatTextAttachmentEmpty;
  return t.chatAttachmentPrepareFailed;
}

function resolveChatRuntimeErrorMessage(rawMessage: string, t: Record<string, string>) {
  if (!rawMessage) return t.chatGenericErrorRetry;
  if (rawMessage === t.chatTextAttachmentEmpty) return rawMessage;
  if (rawMessage === t.chatAttachmentPayloadUnavailable) return rawMessage;
  return t.chatGenericErrorRetry;
}

function splitByRecency<T extends { updatedAt?: number; lastMessageAt?: number; createdAt?: number }>(list: T[]) {
  const now = Date.now();
  const today = getDayKey(now);
  const yesterday = getDayKey(now - 86_400_000);

  const buckets = { today: [] as T[], yesterday: [] as T[], older: [] as T[] };
  list.forEach((item) => {
    const ts = item.updatedAt || item.lastMessageAt || item.createdAt || 0;
    const key = getDayKey(ts);
    if (key === today) buckets.today.push(item);
    else if (key === yesterday) buckets.yesterday.push(item);
    else buckets.older.push(item);
  });

  return buckets;
}

export function Chat() {
  const {
    t,
    language,
    aiSettings,
    messages,
    setMessages,
    activeSessionId,
    sessions,
    createNewChat,
    selectSession,
    removeSession,
    renameSessionAction,
    moveSessionAction,
    refreshChatState,
    chatFolders,
    addChatFolder,
    editChatFolder,
    removeChatFolder,
  } = useGlobalState();
  const {
    hideNav,
    showNav,
  } = useNavbar();
  const { isAuthenticated, authChecking, authBusy, openAuthModal, user } = useAuthModal();
  const { ensureAiAccess, effectivePlanCode, aiAccessGateModal } = useAiAccessGate('chat');
  const { isOnline } = useNetworkStatus();
  const { isPwa } = useRuntimeDisplayMode();
  const navigate = useNavigate();

  const defaultAssistantName = aiSettings?.name || t.chatBrandName;
  const globalUiLanguage = aiSettings?.language || language || 'en';

  const [input, setInput] = useState('');
  const [inputLimitNotice, setInputLimitNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<ChatLoadingPhase>('idle');
  const [activeRequestMode, setActiveRequestMode] = useState<ResponseMode | null>(null);
  const [deepThinkingPhaseIndex, setDeepThinkingPhaseIndex] = useState(0);
  const [revealMessageId, setRevealMessageId] = useState<string | null>(null);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isDeepThinkMode, setIsDeepThinkMode] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedResetTimeoutRef = useRef<number | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [savingMessageIds, setSavingMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const composerMenuRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftAttachmentRef = useRef<ChatAttachment | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const keyboardFix = useIOSKeyboardFix({ composerRef: inputContainerRef });
  const [isComposerMenuOpen, setIsComposerMenuOpen] = useState(false);
  const [draftAttachment, setDraftAttachment] = useState<ChatAttachment | null>(null);
  const [draftAttachmentAiText, setDraftAttachmentAiText] = useState<string | null>(null);
  const [draftAttachmentError, setDraftAttachmentError] = useState<string | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  usePinchZoomLock(isPwa && !isDesktop);

  // Smart navbar: hide when mobile sidebar or keyboard is open, show otherwise.
  // Avoid hiding on focus-before-keyboard because it causes an extra layout jump on iOS.
  useEffect(() => {
    const mobileSidebarOpen = !isDesktop && showSidebar;
    if (mobileSidebarOpen || keyboardFix.isKeyboardOpen) hideNav();
    else showNav();
    return () => showNav(); // always show on unmount/navigate
  }, [isDesktop, showSidebar, keyboardFix.isKeyboardOpen, hideNav, showNav]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      const nextDesktop = media.matches;
      setIsDesktop(nextDesktop);
      if (nextDesktop) setShowSidebar(false);
    };
    onChange();
    const unsubscribe = subscribeMediaQueryChange(media, onChange);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDesktop || showSidebar || keyboardFix.isKeyboardOpen) {
      setShowSwipeHint(false);
      return;
    }

    let count = 0;
    try {
      count = Number.parseInt(window.localStorage.getItem(CHAT_MOBILE_SWIPE_HINT_STORAGE_KEY) || '0', 10);
    } catch {
      count = 0;
    }
    if (!Number.isFinite(count) || count < 0) count = 0;
    if (count >= CHAT_MOBILE_SWIPE_HINT_MAX_SHOWS) return;

    setShowSwipeHint(true);
    const timer = window.setTimeout(() => {
      setShowSwipeHint(false);
      try {
        window.localStorage.setItem(CHAT_MOBILE_SWIPE_HINT_STORAGE_KEY, String(Math.min(CHAT_MOBILE_SWIPE_HINT_MAX_SHOWS, count + 1)));
      } catch { }
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [isDesktop, showSidebar, keyboardFix.isKeyboardOpen]);

  // Sidebar states
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  // Voice recording state
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Library (Image Gen) states
  const [images, setImages] = useState<{ url: string; prompt: string }[]>([]);
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory({
    preferredLanguage: globalUiLanguage,
    languageSource: 'global',
    assistantName: defaultAssistantName,
    userDisplayName: user?.name,
  }));
  const agentProfileNamespace = useMemo(() => resolveAgentProfileNamespace(user?.id), [user?.id]);
  const mergeAgentProfileWithLanguage = useCallback((profile?: Partial<AgentProfileMemory> | null) => {
    const normalized = normalizeAgentProfileMemory({
      ...(profile || {}),
      assistantName: profile?.assistantName || defaultAssistantName,
      userDisplayName: profile?.userDisplayName || user?.name,
    });
    const languageSource = normalized.languageSource === 'manual' && normalized.preferredLanguage ? 'manual' : 'global';
    return normalizeAgentProfileMemory({
      ...normalized,
      preferredLanguage: languageSource === 'manual'
        ? (normalized.preferredLanguage || globalUiLanguage)
        : globalUiLanguage,
      languageSource,
      assistantName: normalized.assistantName || defaultAssistantName,
      userDisplayName: normalized.userDisplayName || user?.name,
    });
  }, [defaultAssistantName, globalUiLanguage, user?.name]);

  // ─── Init ───
  useEffect(() => {
    setChatSession(createChatSession());
  }, []);

  useEffect(() => {
    if (isAuthenticated) setAuthError(null);
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const storedProfile = await getAgentProfileMemory(agentProfileNamespace);
      if (cancelled) return;
      setAgentProfile(mergeAgentProfileWithLanguage(storedProfile));
    })();
    return () => {
      cancelled = true;
    };
  }, [agentProfileNamespace, mergeAgentProfileWithLanguage]);

  useEffect(() => {
    return subscribeAgentProfileUpdates((detail) => {
      if (detail.namespace !== agentProfileNamespace) return;
      setAgentProfile(mergeAgentProfileWithLanguage(detail.profile));
    });
  }, [agentProfileNamespace, mergeAgentProfileWithLanguage]);

  useEffect(() => {
    const nextProfile = mergeAgentProfileWithLanguage(agentProfile);
    if (
      nextProfile.preferredLanguage === agentProfile.preferredLanguage
      && nextProfile.languageSource === agentProfile.languageSource
      && nextProfile.assistantName === agentProfile.assistantName
      && nextProfile.userDisplayName === agentProfile.userDisplayName
    ) {
      return;
    }
    setAgentProfile(nextProfile);
    if (nextProfile.languageSource === 'manual') {
      void saveAgentProfileMemory(agentProfileNamespace, {
        assistantName: defaultAssistantName,
        userDisplayName: user?.name,
      });
      return;
    }
    void saveAgentProfileMemory(agentProfileNamespace, {
      preferredLanguage: globalUiLanguage,
      languageSource: 'global',
      assistantName: defaultAssistantName,
      userDisplayName: user?.name,
    });
  }, [agentProfile, agentProfileNamespace, defaultAssistantName, globalUiLanguage, mergeAgentProfileWithLanguage, user?.name]);

  useEffect(() => {
    if (!activeSessionId) return;
    const nextLanguage = agentProfile.preferredLanguage || globalUiLanguage;
    void (async () => {
      const session = await getChatSession(activeSessionId);
      if (!session || session.preferredResponseLanguage === nextLanguage) return;
      await saveChatSession({
        ...session,
        preferredResponseLanguage: nextLanguage,
        updatedAt: Date.now(),
      });
      await refreshChatState();
    })();
  }, [activeSessionId, agentProfile.preferredLanguage, globalUiLanguage, refreshChatState]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 160) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!activeSessionId) return;
    setChatSession(createChatSession());
  }, [activeSessionId]);

  useEffect(() => {
    if (!loading || loadingPhase !== 'sending') return;
    const timer = window.setTimeout(() => setLoadingPhase('thinking'), 260);
    return () => window.clearTimeout(timer);
  }, [loading, loadingPhase]);

  useEffect(() => {
    if (!loading || loadingPhase !== 'thinking') return;
    if (activeRequestMode !== 'deep') {
      setDeepThinkingPhaseIndex(0);
      return;
    }
    setDeepThinkingPhaseIndex(0);
    const timer = window.setInterval(() => {
      setDeepThinkingPhaseIndex((prev) => Math.min(prev + 1, DEEP_THINKING_PHASE_KEYS.length - 1));
    }, 2100);
    return () => window.clearInterval(timer);
  }, [loading, loadingPhase, activeRequestMode]);

  useEffect(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;

    const MIN_H = 24;
    const MAX_H = 132;

    textarea.style.height = `${MIN_H}px`;
    const nextHeight = Math.max(MIN_H, Math.min(textarea.scrollHeight, MAX_H));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_H ? 'auto' : 'hidden';
  }, [input]);

  useEffect(() => {
    if (!isComposerMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (inputContainerRef.current?.contains(target)) return;
      if (composerMenuRef.current?.contains(target)) return;
      setIsComposerMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [isComposerMenuOpen]);

  useEffect(() => {
    if (!isComposerMenuOpen) return;
    if (showSidebar || keyboardFix.isKeyboardOpen) {
      setIsComposerMenuOpen(false);
    }
  }, [isComposerMenuOpen, showSidebar, keyboardFix.isKeyboardOpen]);

  const getActiveResponseMode = useCallback((): ResponseMode => {
    if (isFastMode) return 'fast';
    if (isDeepThinkMode) return 'deep';
    return 'normal';
  }, [isFastMode, isDeepThinkMode]);

  const applyInputLimit = useCallback((nextValue: string) => {
    const normalized = nextValue.replace(/\r\n/g, '\n');
    if (normalized.length > CHAT_INPUT_MAX_CHARS) {
      setInput(normalized.slice(0, CHAT_INPUT_MAX_CHARS));
      setInputLimitNotice(t.chatInputTooLong);
      return;
    }
    setInput(normalized);
    setInputLimitNotice(null);
  }, [t.chatInputTooLong]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );
  const canCreateFreshChat = !isReusableDraftSession(activeSession);
  const chatQuickPrompts = useMemo(() => ([
    {
      id: 'explain_recipe',
      label: t.chatQuickExplainRecipe || 'Explain recipe',
      prompt: t.chatQuickExplainRecipePrompt || 'Explain this coffee recipe like a barista: recipe goal, ratio, grind, temperature, timing, and what to taste for.',
    },
    {
      id: 'troubleshoot',
      label: t.chatQuickTroubleshoot || 'Fix taste',
      prompt: t.chatQuickTroubleshootPrompt || 'Help troubleshoot my coffee taste. Ask one clarifying question if needed, then give the smallest safe next-cup adjustment.',
    },
    {
      id: 'build_recipe',
      label: t.chatQuickBuildRecipe || 'Build recipe',
      prompt: t.chatQuickBuildRecipePrompt || 'Create a practical V60 recipe for 15 g coffee with a balanced cup, including grind, water temperature, ratio, pours, timing, and why each step matters.',
    },
    {
      id: 'iced_coffee',
      label: t.chatQuickIcedCoffee || 'Iced Coffee',
      prompt: t.chatQuickIcedCoffeePrompt || 'Formulate a professional iced coffee or flash-brew recipe. Include the exact coffee-to-water ratio, ice ratio, grind size, brewing method, and tips to preserve aroma and prevent dilution.',
    },
    {
      id: 'matcha_recipe',
      label: t.chatQuickMatcha || 'Matcha Recipe',
      prompt: t.chatQuickMatchaPrompt || 'Create a premium cafe-style matcha latte recipe. Detail the matcha powder grade, water temperature for whisking, ratio of matcha to liquid, sweetening options, and techniques for a smooth, clump-free texture.',
    },
    {
      id: 'menu_costing',
      label: t.chatQuickCosting || 'Menu Costing',
      prompt: t.chatQuickCostingPrompt || 'Act as a cafe consultant and help me calculate the Cost of Goods Sold (COGS) for a menu item. Guide me on how to measure material costs, packaging, wastage, and determine a profitable selling price.',
    },
  ]), [t]);

  const applyQuickPrompt = useCallback((prompt: string) => {
    setIsComposerMenuOpen(false);
    applyInputLimit(prompt);
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  }, [applyInputLimit]);

  const persistAgentProfile = useCallback(async (patch: Partial<AgentProfileMemory>) => {
    const requestedLanguage = typeof patch.preferredLanguage === 'string'
      ? patch.preferredLanguage.trim()
      : patch.preferredLanguage;
    const next = await saveAgentProfileMemory(agentProfileNamespace, {
      ...patch,
      assistantName: patch.assistantName || agentProfile.assistantName || defaultAssistantName,
      userDisplayName: patch.userDisplayName || agentProfile.userDisplayName || user?.name,
      preferredLanguage: requestedLanguage || agentProfile.preferredLanguage || globalUiLanguage,
      languageSource: requestedLanguage ? (patch.languageSource || 'manual') : 'global',
    });
    const merged = mergeAgentProfileWithLanguage(next);
    setAgentProfile(merged);
    return merged;
  }, [agentProfile, agentProfileNamespace, defaultAssistantName, globalUiLanguage, mergeAgentProfileWithLanguage, user?.name]);

  const resetAgentProfileState = useCallback(async () => {
    const next = await resetAgentProfileMemory(agentProfileNamespace, {
      preferredLanguage: globalUiLanguage,
      languageSource: 'global',
      assistantName: defaultAssistantName,
      userDisplayName: user?.name,
    });
    const merged = mergeAgentProfileWithLanguage(next);
    setAgentProfile(merged);
    return merged;
  }, [agentProfileNamespace, defaultAssistantName, globalUiLanguage, mergeAgentProfileWithLanguage, user?.name]);

  const buildRequestContext = useCallback((
    rawUserText: string,
    mode: ResponseMode,
    profileOverride?: AgentProfileMemory,
    historyMessages: Array<Pick<ChatMessage, 'role' | 'text'>> = messages,
  ) => {
    const boundedUserText = clampChatPayloadText(rawUserText);
    const effectiveProfile = mergeAgentProfileWithLanguage(profileOverride || agentProfile);
    const uiLanguage = globalUiLanguage;
    const replyLanguage = effectiveProfile.preferredLanguage || uiLanguage;
    const effectiveAgentProfile = normalizeAgentProfileMemory({
      ...effectiveProfile,
      preferredLanguage: replyLanguage,
      assistantName: effectiveProfile.assistantName || defaultAssistantName,
      userDisplayName: effectiveProfile.userDisplayName || user?.name,
    });
    const acceptLanguage = typeof navigator !== 'undefined'
      ? navigator.languages?.join(',') || navigator.language || uiLanguage
      : uiLanguage;
    const platform: 'web' | 'pwa' = isPwa ? 'pwa' : 'web';
    const preferredLanguageLock = replyLanguage;
    const recentCount = mode === 'fast' ? 4 : mode === 'deep' ? 12 : 8;
    const conversationContext = buildConversationContext({
      messages: historyMessages,
      summary: activeSession?.summary,
      preferredLanguage: preferredLanguageLock,
      sessionTitle: activeSession?.title,
      recentCount,
      latestUserText: boundedUserText,
      mode,
    });
    const resolved = buildResponseOrchestration(
      boundedUserText,
      mode,
      undefined,
      {
        platform,
        appLanguage: uiLanguage,
        acceptLanguage,
      },
      conversationContext,
      effectiveAgentProfile,
    );

    return {
      responseProfile: {
        language: resolved.language,
        verbosity: resolved.expectation.verbosity,
        format: resolved.expectation.format,
        tone: resolved.expectation.tone,
        ambiguityPolicy: resolved.expectation.ambiguityPolicy,
      },
      clientContext: {
        platform,
        appLanguage: uiLanguage,
        acceptLanguage,
      },
      conversationContext: {
        ...conversationContext,
        preferredLanguage: resolved.language,
      },
      agentProfile: effectiveAgentProfile,
    };
  }, [activeSession, agentProfile, defaultAssistantName, globalUiLanguage, isPwa, mergeAgentProfileWithLanguage, messages, user?.name]);

  const requestAiResponseByMode = useCallback(async (
    rawUserText: string,
    forcedMode?: ResponseMode,
    explicitRequestContext?: ReturnType<typeof buildRequestContext>,
  ): Promise<ModeResponsePayload> => {
    const boundedUserText = clampChatPayloadText(rawUserText);
    const mode = forcedMode || getActiveResponseMode();
    const requestContext = explicitRequestContext || buildRequestContext(boundedUserText, mode);

    if (mode === 'fast') {
      const fastResult = await fastResponseDetailed(boundedUserText, requestContext);
      return {
        text: fastResult.text || '',
        degraded: fastResult.degraded,
        provider: fastResult.provider,
        details: fastResult.details,
      };
    }

    if (mode === 'normal') {
      const balancedResult = await balancedResponseDetailed(boundedUserText, requestContext);
      return {
        text: balancedResult.text || '',
        degraded: balancedResult.degraded,
        provider: balancedResult.provider,
        details: balancedResult.details,
      };
    }

    if (mode === 'deep') {
      if (!chatSession) throw new Error('Chat session not ready');
      try {
        const deepResult: DeepThinkingDetailedPayload = await deepThinkingResponseDetailed(boundedUserText, requestContext);
        return {
          text: deepResult.text || '',
          sources: deepResult.sources || [],
          deepMeta: deepResult.deepMeta,
          degraded: deepResult.degraded,
          provider: deepResult.provider,
          details: deepResult.details,
        };
      } catch (error) {
        const fallback = await sendMessageSafe(
          chatSession,
          boundedUserText,
          (newSession) => setChatSession(newSession),
          requestContext,
          { timeoutMs: 70_000 },
        );
        if (fallback.session !== chatSession) setChatSession(fallback.session);
        return {
          text: fallback.text || '',
          degraded: true,
          provider: 'chat_race',
          details: `deep_fallback:${error instanceof Error ? error.message : 'request_failed'}`,
          deepMeta: {
            mode: 'deep',
            grounded: false,
            degraded: true,
            fallbackUsed: true,
            qualityPass: true,
            latencyMs: 0,
            sourceCount: 0,
          },
        };
      }
    }

    return { text: '' };
  }, [chatSession, getActiveResponseMode, buildRequestContext]);

  const mapResponsePayloadToMessageMeta = useCallback((response: ModeResponsePayload) => ({
    provider: response.provider,
    sources: response.sources?.map(source => source.uri) || undefined,
    sourceDetails: response.sources,
    deepMeta: response.deepMeta
      ? {
          ...response.deepMeta,
          degraded: response.deepMeta.degraded || Boolean(response.degraded),
        }
      : (response.degraded
        ? {
            mode: 'deep' as const,
            grounded: Boolean(response.sources?.length),
            degraded: true,
            fallbackUsed: true,
            qualityPass: false,
            latencyMs: 0,
            sourceCount: response.sources?.length || 0,
          }
        : undefined),
  }), []);

  const guardModeResponse = useCallback(async (
    userText: string,
    response: ModeResponsePayload,
    mode: ResponseMode,
    requestContext: ReturnType<typeof buildRequestContext>,
  ): Promise<{
    response: ModeResponsePayload;
    meta: Pick<ChatMessage, 'responseMode' | 'relevanceScore' | 'regenerated' | 'caveatApplied' | 'guardRisk' | 'guardReason' | 'missingEntities'>;
  }> => {
    let nextResponse = response;
    let guard = guardChatAnswer({ userMessage: userText, answer: nextResponse.text, mode });
    let regenerated = false;
    let caveatApplied = false;

    if (guard.risk === 'irrelevant' || guard.risk === 'blocked') {
      const strictPrompt = buildStrictRegenerationPrompt({
        userMessage: userText,
        missingEntities: guard.missingEntities || [],
        mode,
      });
      regenerated = true;
      const regeneratedResponse = await requestAiResponseByMode(strictPrompt, mode, requestContext);
      const regeneratedGuard = guardChatAnswer({ userMessage: userText, answer: regeneratedResponse.text, mode });

      if (regeneratedGuard.risk === 'safe' || regeneratedGuard.risk === 'needs_caveat') {
        nextResponse = regeneratedResponse;
        guard = regeneratedGuard;
      } else {
        const fallbackText = formatDirectFallbackAnswer(
          userText,
          regeneratedGuard.missingEntities?.length
            ? regeneratedGuard.missingEntities
            : guard.missingEntities || [],
        );
        nextResponse = {
          ...regeneratedResponse,
          text: fallbackText,
          degraded: true,
          details: [regeneratedResponse.details, `guard_fallback:${regeneratedGuard.reason || guard.reason || 'irrelevant'}`].filter(Boolean).join('|'),
        };
        guard = guardChatAnswer({ userMessage: userText, answer: fallbackText, mode });
        caveatApplied = true;
      }
    }

    if (guard.risk === 'needs_caveat' && /\b(?:harga terbaru|price today|current price|hari ini|terbaru|stock|stok|deploy|repo status|production status)\b/i.test(userText)) {
      nextResponse = {
        ...nextResponse,
        text: [
          'Catatan: data terbaru perlu sumber/live check yang valid; saya tidak akan mengarang angka atau status.',
          '',
          nextResponse.text,
        ].join('\n'),
      };
      caveatApplied = true;
    }

    const relevance = scoreAnswerRelevance(userText, nextResponse.text);
    return {
      response: nextResponse,
      meta: {
        responseMode: mode,
        relevanceScore: Math.round(relevance.score * 100) / 100,
        regenerated,
        caveatApplied,
        guardRisk: guard.risk,
        guardReason: guard.reason,
        missingEntities: relevance.missingRequiredEntities,
      },
    };
  }, [requestAiResponseByMode]);

  const syncSessionMemory = useCallback(async (
    nextMessages: ChatMessage[],
    preferredLanguage?: string,
  ) => {
    if (!activeSessionId) return;
    const session = await getChatSession(activeSessionId);
    if (!session) return;

    const summary = buildConversationContext({
      messages: nextMessages,
      summary: session.summary,
      preferredLanguage: preferredLanguage || session.preferredResponseLanguage,
      sessionTitle: session.title,
      recentCount: 10,
    }).summary || '';

    session.messageCount = nextMessages.length;
    session.lastMessageAt = Date.now();
    session.updatedAt = Date.now();
    session.preview = buildPreview(nextMessages);
    session.summary = summary;
    session.hasUserMessage = nextMessages.some((message) => message.role === 'user' && message.text.trim().length > 0);
    session.preferredResponseLanguage = preferredLanguage || session.preferredResponseLanguage;
    if (nextMessages.filter((message) => message.role === 'user' && message.text.trim().length > 0).length === 1) {
      session.title = buildSessionTitle(nextMessages);
    }
    await saveChatSession(session);
    await refreshChatState();
  }, [activeSessionId, refreshChatState]);

  const clearDraftAttachment = useCallback(() => {
    setDraftAttachment((prev) => {
      if (prev?.objectUrl && prev.objectUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(prev.objectUrl); } catch { }
      }
      return null;
    });
    setDraftAttachmentAiText(null);
    setDraftAttachmentError(null);
  }, []);

  useEffect(() => {
    draftAttachmentRef.current = draftAttachment;
  }, [draftAttachment]);

  useEffect(() => {
    return () => {
      const current = draftAttachmentRef.current;
      if (current?.objectUrl && current.objectUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(current.objectUrl); } catch { }
      }
    };
  }, []);

  const applyPreparedDraft = useCallback((prepared: PreparedAttachmentDraft) => {
    setDraftAttachment((prev) => {
      if (prev?.objectUrl && prev.objectUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(prev.objectUrl); } catch { }
      }
      return prepared.attachment;
    });
    setDraftAttachmentAiText(prepared.aiTextContent || null);
    setDraftAttachmentError(null);
  }, []);

  const handlePickAttachmentFile = useCallback(async (file: File | null | undefined, source: 'photo' | 'camera' | 'file') => {
    if (!file) return;
    try {
      const prepared = await prepareAttachmentDraftFromFile(file, source);
      applyPreparedDraft(prepared);
      setIsComposerMenuOpen(false);
    } catch (error) {
      const message = resolveAttachmentDraftErrorMessage(error instanceof Error ? error.message : '', t);
      setDraftAttachmentError(message);
    }
  }, [applyPreparedDraft, t]);

  const handleAttachmentInputChange = useCallback(
    (source: 'photo' | 'camera' | 'file') => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.currentTarget.value = '';
      await handlePickAttachmentFile(file, source);
    },
    [handlePickAttachmentFile]
  );

  const openAttachmentPicker = useCallback(async (source: 'photo' | 'camera' | 'file') => {
    setIsComposerMenuOpen(false);
    setDraftAttachmentError(null);
    composerTextareaRef.current?.blur();
    if (source === 'photo') photoInputRef.current?.click();
    if (source === 'file') fileInputRef.current?.click();
    if (source === 'camera') {
      const permission = await ensureCameraPermission();
      if (permission.granted) {
        cameraInputRef.current?.click();
        return;
      }
      setDraftAttachmentError(t.chatCameraDeniedUsePhotoFile);
      photoInputRef.current?.click();
    }
  }, []);

  // iOS keyboard handler — adjust input position when software keyboard opens
  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      if (recordingStopTimerRef.current !== null) {
        window.clearTimeout(recordingStopTimerRef.current);
        recordingStopTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ─── Recording ───
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStopTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const toggleRecording = async () => {
    setVoiceError(null);
    if (!ensureAiAccess('chat_voice')) {
      return;
    }
    if (!isOnline) {
      setVoiceError(t.chatVoiceOffline);
      return;
    }
    if (isRecording) {
      if (recordingStopTimerRef.current !== null) {
        window.clearTimeout(recordingStopTimerRef.current);
        recordingStopTimerRef.current = null;
      }
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (recordingStopTimerRef.current !== null) {
          window.clearTimeout(recordingStopTimerRef.current);
          recordingStopTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioBlobUrl = URL.createObjectURL(audioBlob);
        const durationMs = recordingStartedAtRef.current ? Math.max(0, Date.now() - recordingStartedAtRef.current) : 0;
        recordingStartedAtRef.current = null;
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > CHAT_ATTACHMENT_LIMITS.audioMaxBytes) {
          try { URL.revokeObjectURL(audioBlobUrl); } catch { }
          setVoiceError(t.chatVoiceTooLarge);
          return;
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const match = base64Audio.match(/^data:(audio\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (!match) return;

            const estimatedBytes = Math.floor((match[2].length * 3) / 4);
            const audioAttachment = buildAudioAttachment({
              fileName: `voice-${Date.now()}.webm`,
              mimeType: match[1],
              sizeBytes: estimatedBytes,
              audioUrl: audioBlobUrl,
              inlineBase64: estimatedBytes <= CHAT_ATTACHMENT_LIMITS.audioMaxBytes ? match[2] : undefined,
              durationMs,
            });

            const audioMsg: ChatMessage = {
              id: Date.now().toString(),
              sessionId: activeSessionId || undefined,
              role: 'user',
              text: t.chatVoiceNoteLabel,
              timestamp: Date.now(),
              status: 'sent',
              audioUrl: audioBlobUrl,
              attachments: [audioAttachment],
              attachmentMeta: {
                mimeType: match[1],
                sizeBytes: estimatedBytes,
                fileName: audioAttachment.fileName,
              },
            };
            const voiceBaseMessages = [...messages, audioMsg];
            setMessages((prev: ChatMessage[]) => [...prev, audioMsg]);
            await persistMessage(audioMsg, undefined, voiceBaseMessages);

            const voiceMode = getActiveResponseMode();
            setLoading(true);
            setLoadingPhase('thinking');
            setActiveRequestMode(voiceMode);
            setDeepThinkingPhaseIndex(0);
            try {
              const transcript = await transcribeAudio(match[2], match[1]);
              if (transcript && transcript.length > 2) {
                const boundedTranscript = clampChatPayloadText(transcript);
                const internalTranscriptMsg: ChatMessage = {
                  id: `${audioMsg.id}_transcript`,
                  sessionId: activeSessionId || undefined,
                  role: 'user',
                  text: boundedTranscript,
                  timestamp: Date.now(),
                  status: 'sent',
                };
                const transcriptMessages = [...voiceBaseMessages, internalTranscriptMsg];
                const transcriptProfilePatch = extractDurablePreferenceUpdates(boundedTranscript, agentProfile);
                const transcriptProfile = Object.keys(transcriptProfilePatch).length
                  ? await persistAgentProfile(transcriptProfilePatch)
                  : agentProfile;
                const transcriptRequestContext = buildRequestContext(
                  boundedTranscript,
                  voiceMode,
                  transcriptProfile,
                  transcriptMessages,
                );
                const preferredLanguage = transcriptRequestContext.conversationContext?.preferredLanguage;

                const modelMsg: ChatMessage = {
                  id: (Date.now() + 2).toString(),
                  sessionId: activeSessionId || undefined,
                  role: 'model',
                  ...(await (async () => {
                    const response = await requestAiResponseByMode(boundedTranscript, voiceMode, transcriptRequestContext);
                    const guarded = await guardModeResponse(boundedTranscript, response, voiceMode, transcriptRequestContext);
                    return {
                      text: guarded.response.text,
                      ...mapResponsePayloadToMessageMeta(guarded.response),
                      ...guarded.meta,
                    };
                  })()),
                  timestamp: Date.now(),
                  status: 'sent',
                };
                setMessages((prev: ChatMessage[]) => [...prev, modelMsg]);
                setRevealMessageId(modelMsg.id);
                window.setTimeout(() => {
                  setRevealMessageId((prev) => (prev === modelMsg.id ? null : prev));
                }, 720);
                await persistMessage(modelMsg, preferredLanguage, [...transcriptMessages, modelMsg]);
              } else {
                const noTranscriptMsg: ChatMessage = {
                  id: (Date.now() + 3).toString(),
                  sessionId: activeSessionId || undefined,
                  role: 'model',
                  text: t.chatVoiceTranscriptionUnclear,
                  timestamp: Date.now(),
                  status: 'error',
                };
                setMessages((prev: ChatMessage[]) => [...prev, noTranscriptMsg]);
                await persistMessage(noTranscriptMsg, undefined, [...voiceBaseMessages, noTranscriptMsg]);
              }
            } catch (error) {
              console.error('Transcription failed', error);
              const errMsg: ChatMessage = {
                id: (Date.now() + 4).toString(),
                sessionId: activeSessionId || undefined,
                role: 'model',
                text: t.chatVoiceTranscriptionFailedRetry,
                timestamp: Date.now(),
                status: 'error',
              };
              setMessages((prev: ChatMessage[]) => [...prev, errMsg]);
              await persistMessage(errMsg, undefined, [...voiceBaseMessages, errMsg]);
            } finally {
              setLoading(false);
              setLoadingPhase('idle');
              setActiveRequestMode(null);
              setDeepThinkingPhaseIndex(0);
            }
          };
        } catch {
          setVoiceError(t.chatVoiceProcessFailed);
        }
      };

      mediaRecorder.start();
      recordingStopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 60_000);
      setIsRecording(true);
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        setVoiceError(t.chatMicDenied);
      } else {
        setVoiceError(t.chatMicUnavailable);
      }
      console.error('Error accessing microphone', error);
    }
  };

  // ─── Persistence ───
  const persistMessage = useCallback(async (
    msg: ChatMessage,
    preferredLanguage?: string,
    allMessagesOverride?: ChatMessage[],
  ) => {
    if (!activeSessionId) return;
    const message = ensureMessage({ ...msg, sessionId: activeSessionId });
    await saveMessage(message);
    await syncSessionMemory(allMessagesOverride || [...messages, msg], preferredLanguage);
  }, [activeSessionId, messages, syncSessionMemory]);

  // ─── Send ───
  const handleSend = async () => {
    if (!chatSession) return;

    const trimmedInput = input.trim();
    const draftToSend = draftAttachment ? { ...draftAttachment, status: 'sent' as const } : null;
    const textPayloadForDraft = draftAttachmentAiText;
    if (!trimmedInput && !draftToSend) return;
    const requestMode = getActiveResponseMode();
    if (requestMode === 'deep' && isAuthenticated && !planSupportsDeepThink(effectivePlanCode)) {
      setAuthError(t.chatDeepProOnly);
      setIsDeepThinkMode(false);
      return;
    }
    if (trimmedInput.length > CHAT_INPUT_MAX_CHARS) {
      setInputLimitNotice(t.chatInputTooLong);
      return;
    }
    const userMessageText = trimmedInput || (draftToSend ? `[${t.chatAttachmentLabel}] ${draftToSend.fileName || t.chatFileFallbackName}` : '');
    const profilePatch = extractDurablePreferenceUpdates(trimmedInput, agentProfile);
    const effectiveAgentProfile = Object.keys(profilePatch).length
      ? await persistAgentProfile(profilePatch)
      : agentProfile;
    const attachmentMeta = draftToSend ? {
      mimeType: draftToSend.mimeType,
      sizeBytes: draftToSend.sizeBytes,
      fileName: draftToSend.fileName,
      width: draftToSend.width,
      height: draftToSend.height,
    } : undefined;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sessionId: activeSessionId || undefined,
      role: 'user',
      text: userMessageText,
      timestamp: Date.now(),
      status: 'sent',
      attachments: draftToSend ? [draftToSend] : undefined,
      image: draftToSend && (draftToSend.kind === 'image' || draftToSend.kind === 'camera') ? draftToSend.previewDataUrl : undefined,
      attachmentPrompt: trimmedInput || undefined,
      attachmentMeta,
    };
    const nextConversationMessages = [...messages, userMsg];
    const requestContext = buildRequestContext(
      userMessageText || draftToSend?.fileName || t.chatAttachmentAlt,
      requestMode,
      effectiveAgentProfile,
      nextConversationMessages,
    );
    const preferredLanguage = requestContext.conversationContext?.preferredLanguage;

    const requestClassification = classifyChatUserRequest(userMessageText);
    if (!draftToSend && !requestClassification.allowed) {
      const blockMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sessionId: activeSessionId || undefined,
        role: 'model',
        text: buildChatDomainBlockReply(preferredLanguage || language),
        timestamp: Date.now(),
        status: 'sent',
        responseMode: requestMode,
        relevanceScore: 0,
        guardRisk: 'blocked',
        guardReason: requestClassification.reason,
      };
      const blockedConversationMessages = [...messages, userMsg, blockMsg];
      setMessages((prev: ChatMessage[]) => [...prev, userMsg, blockMsg]);
      setInput('');
      setInputLimitNotice(null);
      setIsComposerMenuOpen(false);
      clearDraftAttachment();
      await persistMessage(userMsg, preferredLanguage, [...messages, userMsg]);
      await persistMessage(blockMsg, preferredLanguage, blockedConversationMessages);
      return;
    }

    if (!ensureAiAccess('chat_send')) {
      return;
    }
    if (!isOnline) {
      setAuthError(t.chatOfflineSendUnavailable);
      return;
    }

    setMessages((prev: ChatMessage[]) => [...prev, userMsg]);
    setInput('');
    setInputLimitNotice(null);
    setIsComposerMenuOpen(false);
    clearDraftAttachment();
    setLoading(true);
    setLoadingPhase('sending');
    setActiveRequestMode(requestMode);
    setDeepThinkingPhaseIndex(0);
    await persistMessage(userMsg, preferredLanguage, nextConversationMessages);

    const safetyTimeoutMs = resolveChatSafetyTimeoutMs(requestMode, draftToSend?.mimeType);
    let didSafetyTimeout = false;
    let timeoutMessageId: string | null = null;
    const safetyTimeout = setTimeout(() => {
      didSafetyTimeout = true;
      setLoading(false);
      setLoadingPhase('idle');
      setActiveRequestMode(null);
      timeoutMessageId = (Date.now() + 1).toString();
      const timeoutMsg: ChatMessage = {
        id: timeoutMessageId,
        sessionId: activeSessionId || undefined,
        role: 'model',
        text: t.chatResponseTimeoutRetry,
        timestamp: Date.now(),
        status: 'error',
      };
      setMessages((prev: ChatMessage[]) => [...prev, timeoutMsg]);
    }, safetyTimeoutMs);

    let renderedSuccess = false;
    try {
      let responsePayload: ModeResponsePayload = { text: '' };

      if (draftToSend) {
        const promptKind = draftToSend.mimeType === 'application/pdf'
          ? 'pdf'
          : draftToSend.mimeType.startsWith('text/')
            ? 'txt'
            : draftToSend.kind;
        const smartPromptBase = appendAttachmentResponseStyle(
          buildAttachmentSmartPrompt(promptKind as any, draftToSend.fileName, trimmedInput),
          requestMode
        );
        const responseLanguage = requestContext.responseProfile?.language || language || 'en';
        const smartPrompt = /^id(?:-|$)/i.test(responseLanguage)
          ? `${smartPromptBase}\n\nKunci bahasa: jawab sepenuhnya dalam Bahasa Indonesia. Jangan gunakan bahasa lain untuk judul, daftar, label, ataupun fallback.`
          : /^ar(?:-|$)/i.test(responseLanguage)
            ? `${smartPromptBase}\n\nقفل اللغة: أجب باللغة العربية بالكامل. لا تستخدم أي لغة أخرى في العناوين أو القوائم أو التسميات أو رسائل الخطأ الاحتياطية.`
          : smartPromptBase + '\n\nLanguage lock: respond fully in ' + responseLanguage + '.';

        if (draftToSend.mimeType.startsWith('text/')) {
          const textContent = (textPayloadForDraft || draftToSend.extractedText || '').trim();
          if (!textContent) throw new Error(t.chatTextAttachmentEmpty);
          responsePayload = { text: await analyzeTextDocument(textContent, smartPrompt, requestContext) };
        } else {
          if (!draftToSend.inlineBase64) throw new Error(t.chatAttachmentPayloadUnavailable);
          responsePayload = { text: await analyzeAttachment(draftToSend.inlineBase64, draftToSend.mimeType, smartPrompt, requestContext) };
        }
      } else {
        responsePayload = await requestAiResponseByMode(userMsg.text, requestMode, requestContext);
      }

      const guardedResponse = await guardModeResponse(userMsg.text, responsePayload, requestMode, requestContext);
      responsePayload = guardedResponse.response;

      clearTimeout(safetyTimeout);
      setLoadingPhase('rendering');

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sessionId: activeSessionId || undefined,
        role: 'model',
        text: responsePayload.text,
        ...mapResponsePayloadToMessageMeta(responsePayload),
        ...guardedResponse.meta,
        timestamp: Date.now(),
        status: 'sent',
      };
      setMessages((prev: ChatMessage[]) => {
        if (didSafetyTimeout && timeoutMessageId) {
          return prev.map((message) => (message.id === timeoutMessageId ? modelMsg : message));
        }
        return [...prev, modelMsg];
      });
      setRevealMessageId(modelMsg.id);
      window.setTimeout(() => {
        setRevealMessageId((prev) => (prev === modelMsg.id ? null : prev));
      }, 720);
      await persistMessage(modelMsg, preferredLanguage, [...nextConversationMessages, modelMsg]);
      renderedSuccess = true;
    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error(error);
      setLoadingPhase('idle');
      const errorText = error instanceof Error && error.message.trim()
        ? error.message.trim()
        : t.chatGenericErrorRetry;
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sessionId: activeSessionId || undefined,
        role: 'model',
        text: errorText,
        timestamp: Date.now(),
        status: 'error',
      };
      setMessages((prev: ChatMessage[]) => {
        if (didSafetyTimeout && timeoutMessageId) {
          return prev.map((message) => (message.id === timeoutMessageId ? errorMsg : message));
        }
        return [...prev, errorMsg];
      });
      await persistMessage(errorMsg, preferredLanguage, [...nextConversationMessages, errorMsg]);
    } finally {
      setLoading(false);
      if (renderedSuccess) {
        window.setTimeout(() => setLoadingPhase('idle'), 260);
      } else {
        setLoadingPhase('idle');
      }
      setActiveRequestMode(null);
      setDeepThinkingPhaseIndex(0);
    }
  };

  // ─── Audio ───
  const handleComposerSend = () => {
    setIsComposerMenuOpen(false);
    void handleSend();
  };

  const stopActiveAudioPlayback = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.onended = null;
    audioRef.current.pause();
    audioRef.current.src = '';
    audioRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopActiveAudioPlayback();
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
        copiedResetTimeoutRef.current = null;
      }
    };
  }, [stopActiveAudioPlayback]);

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (playingAudioId === messageId && audioRef.current) {
      stopActiveAudioPlayback();
      setPlayingAudioId(null);
      return;
    }
    try {
      setPlayingAudioId(messageId);
      const audioUrl = await generateSpeech(text);
      if (audioUrl) {
        stopActiveAudioPlayback();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setPlayingAudioId(null);
        audio.play();
      } else {
        setPlayingAudioId(null);
      }
    } catch {
      stopActiveAudioPlayback();
      setPlayingAudioId(null);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }
      copiedResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedId(null);
        copiedResetTimeoutRef.current = null;
      }, 2000);
    } catch { }
  };

  const toggleMode = (mode: 'fast' | 'deep') => {
    if (mode === 'fast') {
      setIsFastMode(!isFastMode);
      if (!isFastMode) setIsDeepThinkMode(false);
    } else {
      setIsDeepThinkMode(!isDeepThinkMode);
      if (!isDeepThinkMode) setIsFastMode(false);
    }
  };

  // ─── Save to Collection ───
  const isSaveableContent = (text: string): boolean => {
    const value = String(text || '').trim();
    if (!value) return false;
    if (/(?:^|\n)##\s*(?:Recipe|Brew Guide|Troubleshooting|SOP)\b/i.test(value)) return true;

    const hasStructuredSteps = /(^|\n)\s*(?:\d+\.\s+|[-*]\s+)/m.test(value);
    const hasRecipeSignals = /\b(recipe|resep|brew|seduh|espresso|v60|aeropress|chemex|latte|cappuccino|kopi susu|gula aren|ingredients|bahan|dose|dosis|ratio|rasio|grind|gilingan|temperature|suhu)\b/i.test(value);
    const hasOpsSignals = /\b(troubleshoot|diagnos|diagnostic|sop|workflow|checklist)\b/i.test(value);

    return hasStructuredSteps && (hasRecipeSignals || hasOpsSignals);
  };

  const detectContentKind = (text: string): 'recipe_sop' | 'brew_guide' | 'qa_context' | 'note' => {
    if (/\b(recipe|resep|espresso|v60|aeropress|chemex|latte|cappuccino|kopi susu|gula aren|ingredients|bahan|dose|dosis|ratio|rasio)\b/i.test(text)) return 'recipe_sop';
    if (/\b(brew guide|manual brew|pour structure|drawdown|bloom)\b/i.test(text)) return 'brew_guide';
    if (/\b(troubleshoot|diagnos|diagnostic|root cause|issue|masalah)\b/i.test(text)) return 'qa_context';
    return 'note';
  };

  const handleSaveToCollection = async (msg: ChatMessage) => {
    if (savedMessageIds.has(msg.id) || savingMessageIds.has(msg.id)) return;
    const kind = detectContentKind(msg.text);
    const titleMatch = msg.text.match(/(?:^|\n)##\s*(?:[☕📋🔧📝]\s*)?(?:Recipe:|Brew Guide:|Troubleshooting:|SOP:)?\s*(.+)/i)
      || msg.text.match(/^(.{12,100})$/m);
    const generatedKindLabel = kind.replace('_', ' ');
    const generatedTitle = t.chatCollectionFallbackTitle
      .replace('{kind}', generatedKindLabel)
      .replace('{date}', new Date().toLocaleDateString());
    const title = titleMatch?.[1]?.trim().slice(0, 100) || generatedTitle;

    setSavingMessageIds((prev) => new Set([...prev, msg.id]));
    try {
      await saveCollectionItem({
        id: `ai_${msg.id}_${Date.now()}`,
        type: 'ai_canvas',
        title,
        content: {
          markdown: msg.text,
          kind,
          sessionId: activeSessionId || undefined,
          messageId: msg.id,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setSavedMessageIds(prev => new Set([...prev, msg.id]));
    } finally {
      setSavingMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  // ─── Sidebar Actions ───
  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    await renameSessionAction(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = async (id: string) => {
    await removeSession(id);
    setContextMenuId(null);
  };

  const handleMoveToFolder = async (sessionId: string, folderId?: string) => {
    await moveSessionAction(sessionId, folderId);
    setMovingSessionId(null);
    setContextMenuId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await addChatFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const toggleFolderExpand = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Image Generation ───
  const handleChatLogin = () => {
    setAuthError(null);
    openAuthModal({ source: 'chat_send' });
  };

  const handleGenerateImage = async () => {
    if (!ensureAiAccess('chat_image_generation')) {
      return;
    }
    if (!isOnline) {
      setAuthError(t.chatImageOffline);
      return;
    }
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    try {
      const url = await generateImage(`High quality professional coffee photography. ${imgPrompt}`);
      if (url) {
        setImages(prev => [{ url, prompt: imgPrompt }, ...prev]);
        setImgPrompt('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setImgLoading(false);
    }
  };

  // ─── Filtered Sessions ───
  const filteredSessions = sessions
    .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.updatedAt || b.lastMessageAt || b.createdAt || 0) - (a.updatedAt || a.lastMessageAt || a.createdAt || 0));
  const ungroupedSessions = filteredSessions.filter(s => !s.folderId);
  const ungroupedSections = splitByRecency(ungroupedSessions);
  const getSessionsForFolder = (folderId: string) => filteredSessions.filter(s => s.folderId === folderId);
  const resetSidebarTransientState = useCallback(() => {
    setSidebarTab('history');
  }, []);
  const openSidebarPanel = useCallback(() => {
    resetSidebarTransientState();
    setShowSidebar(true);
  }, [resetSidebarTransientState]);
  const closeSidebarPanel = useCallback(() => {
    resetSidebarTransientState();
    if (isDesktop) return;
    setShowSidebar(false);
  }, [isDesktop, resetSidebarTransientState]);

  const handleSidebarDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -450) {
      closeSidebarPanel();
    }
  }, [closeSidebarPanel]);

  const composerDockedToKeyboard = !isDesktop && keyboardFix.isKeyboardOpen;
  const shouldHideComposerOnMobileSidebar = !isDesktop && showSidebar;
  const mobileComposerMessageGap = 'var(--composer-message-gap, var(--mobile-nav-floating-gap, 0px))';
  const mobileComposerBottomOffset = 'var(--composer-bottom-offset, var(--mobile-nav-floating-gap, 0px))';
  const mobileMessageListBottomPadding = keyboardFix.isKeyboardOpen
    ? `calc(${keyboardFix.composerHeight}px + 0.75rem)`
    : `calc(${keyboardFix.composerHeight}px + ${mobileComposerMessageGap} + 0.75rem)`;
  const messageListBottomPadding = isDesktop
    ? '7.25rem'
    : mobileMessageListBottomPadding;
  const keyboardDockBottom = keyboardFix.composerBottom;
  const restingComposerBottom = isDesktop
    ? '12px'
    : (!isDesktop && showSidebar ? '8px' : mobileComposerBottomOffset);
  const desktopShellOffset = isDesktop
    ? 'var(--desktop-chat-shell-offset, var(--desktop-rail-current-width, var(--desktop-rail-width-expanded)))'
    : '0px';
  const interactionDisabled = loading || authChecking || authBusy;
  const deepThinkLocked = isAuthenticated && !planSupportsDeepThink(effectivePlanCode);
  const deepRequestInFlight = loading && activeRequestMode === 'deep';
  const deepThinkingPhases = DEEP_THINKING_PHASE_KEYS.map((key) => t[key] || key);
  const deepPhaseLabel = deepThinkingPhases[Math.min(deepThinkingPhaseIndex, deepThinkingPhases.length - 1)];
  const loadingLabel = loadingPhase === 'sending'
    ? (t.chatSending || t.connecting)
    : (deepRequestInFlight ? deepPhaseLabel : t.thinking);
  const composerDisabledReason = !isOnline
    ? t.chatOfflineSendUnavailable
    : (!isAuthenticated ? t.signInRequired : null);
  const showComposerMeta = Boolean(inputLimitNotice || input.length >= CHAT_INPUT_WARNING_CHARS || composerDisabledReason);
  const showComposerQuickPrompts = !input.trim() && !draftAttachment && !loading && !keyboardFix.isKeyboardOpen;

  // ─── Render ───
  return (
    <div
      className="chat-container w-full max-w-[1600px] mx-auto relative min-h-0 desktop-noise-bg"
    >
      {/* Header */}
      <header
        className="shrink-0 z-20"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
          paddingBottom: '0.25rem',
        }}
      >
        <div className="chat-liquid-header px-2.5 sm:px-3.5 py-1.5 sm:py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {!isDesktop && (
                <button
                  onClick={() => {
                    if (showSidebar) closeSidebarPanel();
                    else openSidebarPanel();
                  }}
                  className="icon-touch-button icon-touch-button-sm rounded-full text-secondary hover:text-primary hover:bg-surface-alpha transition-all focus-soft"
                  aria-label={t.chatToggleSidebar}
                >
                  <History size={18} />
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-blue-500/12 flex items-center justify-center text-blue-500 shadow-inner shrink-0">
                <BrainCircuit size={16} />
              </div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">{t.chatBrandName}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (canCreateFreshChat) createNewChat();
                }}
                disabled={!canCreateFreshChat}
                className={`icon-touch-button icon-touch-button-sm rounded-full transition-all focus-soft ${canCreateFreshChat ? 'text-secondary hover:text-primary hover:bg-surface-alpha' : 'text-secondary/45 cursor-not-allowed opacity-60'}`}
                title={canCreateFreshChat ? t.newChat : t.chatNewChatDisabledHint}
                aria-label={canCreateFreshChat ? t.newChat : t.chatNewChatDisabledAria}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="mt-2 overflow-x-auto hide-scrollbar">
            <div className="inline-flex items-center gap-1 p-1 rounded-full min-w-max border border-white/35 dark:border-white/10 bg-white/45 dark:bg-white/5">
              <button
                onClick={() => toggleMode('fast')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ease-out ${isFastMode ? 'bg-amber-500/15 text-amber-600 shadow-sm dark:text-amber-400' : 'text-secondary hover:text-primary'}`}
                aria-label={t.chatFastModeAria}
                aria-pressed={isFastMode}
              >
                <Zap size={13} className={isFastMode ? 'fill-amber-600 dark:fill-amber-400' : ''} />
                {t.fastMode}
              </button>
              <button
                onClick={() => { if (isFastMode) toggleMode('fast'); if (isDeepThinkMode) toggleMode('deep'); }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ease-out ${!isFastMode && !isDeepThinkMode ? 'bg-blue-500/15 text-blue-600 shadow-sm dark:text-blue-400' : 'text-secondary hover:text-primary'}`}
                aria-label={`${t.chatMemoryDetailBalanced} (${t.chatNormalModeAria})`}
                aria-pressed={!isFastMode && !isDeepThinkMode}
              >
                <BrainCircuit size={13} />
                {t.chatMemoryDetailBalanced}
              </button>
              <button
                onClick={() => {
                  if (deepThinkLocked) {
                    setAuthError(t.chatDeepProOnly);
                    return;
                  }
                  toggleMode('deep');
                }}
                disabled={deepThinkLocked}
                title={deepThinkLocked ? t.chatDeepProOnly : t.chatDeepModeAria}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ease-out ${deepThinkLocked ? 'cursor-not-allowed opacity-55' : isDeepThinkMode ? 'bg-purple-500/15 text-purple-600 shadow-sm dark:text-purple-400' : 'text-secondary hover:text-primary'}`}
                aria-label={deepThinkLocked ? t.chatDeepProOnly : t.chatDeepModeAria}
                aria-pressed={isDeepThinkMode}
              >
                <Brain size={13} className={isDeepThinkMode ? 'fill-purple-600 dark:fill-purple-400' : ''} />
                {t.deepThink}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Mobile Sidebar ─── */}
      <AnimatePresence>
        {!isDesktop && showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
              onClick={closeSidebarPanel}
            />
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="x"
              dragDirectionLock
              dragElastic={{ left: 0.18, right: 0 }}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleSidebarDragEnd}
              className="fixed top-0 bottom-0 panel-soft-strong border-r panel-divider-subtle z-40 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label={t.chatWorkspace}
              style={{
                left: 0,
                width: 'min(22rem,92vw)',
                paddingTop: 'var(--safe-top)',
                paddingBottom: '0px',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
              }}
            >
              <Suspense fallback={<div className="h-full w-full" role="status" aria-live="polite" aria-busy="true" aria-label={t.loading} />}>
                <ChatWorkspacePanel
                  tab={sidebarTab}
                  onTabChange={setSidebarTab}
                  isDesktop={false}
                  onRequestClose={closeSidebarPanel}
                  closeOnSessionSelect
                  className="h-full"
                  agentProfile={agentProfile}
                  onSaveAgentProfile={async (next) => { await persistAgentProfile(next); }}
                  onResetAgentProfile={async () => { await resetAgentProfileState(); }}
                />
              </Suspense>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Messages ─── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 scroll-smooth"
        style={{
          paddingBottom: messageListBottomPadding,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Messages */}
        {/* Voice error toast */}
        {voiceError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
            <div className="glass-card px-4 py-3 flex items-center gap-2 text-red-500 text-sm max-w-md">
              <AlertCircle size={16} />
              <span>{voiceError}</span>
              <button onClick={() => setVoiceError(null)} className="ml-auto p-1 rounded-full hover:bg-surface-alpha" aria-label={t.close}><X size={14} /></button>
            </div>
          </motion.div>
        )}

        {authError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
            <div className="glass-card px-4 py-3 flex items-center gap-2 text-red-500 text-sm max-w-md">
              <AlertCircle size={16} />
              <span>{authError}</span>
              <button onClick={() => setAuthError(null)} className="ml-auto p-1 rounded-full hover:bg-surface-alpha" aria-label={t.close}><X size={14} /></button>
            </div>
          </motion.div>
        )}

        {authChecking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center py-8" role="status" aria-live="polite" aria-busy="true">
            <div className="glass-card px-5 py-4 flex items-center gap-3 text-secondary text-sm">
              <Loader2 size={16} className="animate-spin" />
              {t.chatVerifyingSession}
            </div>
          </motion.div>
        )}

        {!authChecking && !isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center py-4">
            <div className="panel-soft flex max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm">
              <p className="min-w-0 text-secondary">{t.chatProtectedBody}</p>
              <button
                onClick={handleChatLogin}
                disabled={authBusy}
                className="glass-button shrink-0 px-3 py-2 text-xs font-semibold"
              >
                {authBusy ? t.opening : t.signIn}
              </button>
            </div>
          </motion.div>
        )}

        {messages.map((msg: ChatMessage) => {
          const primaryAttachment = Array.isArray(msg.attachments) ? msg.attachments[0] : undefined;
          const audioBubbleUrl = resolveAudioPlaybackUrl(msg, primaryAttachment);
          const hasNonAudioAttachment = !!primaryAttachment && primaryAttachment.kind !== 'audio';
          const imagePreviewUrl = primaryAttachment?.previewDataUrl || (!primaryAttachment ? msg.image : undefined);
          const hasText = typeof msg.text === 'string' && msg.text.trim().length > 0;
          const fallbackSources = Array.isArray(msg.sources)
            ? msg.sources
                .filter((uri): uri is string => typeof uri === 'string' && /^https?:\/\//i.test(uri))
                .map((uri) => ({ uri, title: undefined, domain: undefined }))
            : [];
          const sourceDetails = (Array.isArray(msg.sourceDetails) && msg.sourceDetails.length > 0
            ? msg.sourceDetails
            : fallbackSources).slice(0, 5);
          const isRevealBubble = msg.id === revealMessageId;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={`flex min-w-0 max-w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`${msg.role === 'user'
                ? 'min-w-0 max-w-[88%] overflow-hidden bg-blue-500 text-white rounded-[1.6rem] rounded-br-[0.5rem] px-4 py-3.5 shadow-[0_4px_16px_rgba(0,122,255,0.2)] [overflow-wrap:anywhere] sm:max-w-[74%]'
                : 'min-w-0 w-full max-w-full overflow-hidden glass-card px-4 py-3 rounded-bl-[0.5rem] [overflow-wrap:anywhere] sm:w-auto sm:max-w-[80%] lg:max-w-[42rem]'
                } ${isRevealBubble ? 'response-reveal' : ''}`}>
                {(hasNonAudioAttachment || (!!imagePreviewUrl && !primaryAttachment)) && (
                  <div className="mb-3">
                    {imagePreviewUrl && (primaryAttachment ? primaryAttachment.mimeType.startsWith('image/') : true) ? (
                      <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/10">
                        <img
                          src={imagePreviewUrl}
                          alt={primaryAttachment.fileName || t.chatAttachmentAlt}
                          className="block max-h-[18rem] w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`rounded-2xl border px-3 py-3 ${msg.role === 'user' ? 'border-white/20 bg-white/10' : 'border-glass bg-surface-alpha/70'}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white/15' : 'bg-surface-alpha'}`}>
                            {primaryAttachment.mimeType === 'application/pdf' ? <FileText size={16} /> : <FileText size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{primaryAttachment.fileName || attachmentKindLabel(primaryAttachment.kind, primaryAttachment.mimeType)}</p>
                            <p className={`text-xs ${msg.role === 'user' ? 'text-white/75' : 'text-tertiary'}`}>
                              {attachmentKindLabel(primaryAttachment.kind, primaryAttachment.mimeType)} • {formatBytes(primaryAttachment.sizeBytes)}
                            </p>
                            {primaryAttachment.mimeType.startsWith('text/') && primaryAttachment.extractedText && (
                              <p className={`mt-1 text-xs line-clamp-3 ${msg.role === 'user' ? 'text-white/80' : 'text-secondary'}`}>
                                {primaryAttachment.extractedText}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {audioBubbleUrl ? (
                  <AudioBubble url={audioBubbleUrl} isUser={msg.role === 'user'} />
                ) : hasText ? (
                  <div className={`prose prose-sm min-w-0 max-w-none overflow-hidden break-words [overflow-wrap:anywhere] prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-pre:my-3 prose-pre:max-w-full prose-pre:overflow-x-auto prose-blockquote:my-3 prose-headings:my-2 ${msg.role === 'user' ? 'text-white prose-p:text-white prose-headings:text-white' : 'chat-markdown chat-bubble-markdown chat-bubble-text'}`}>
                    <Suspense fallback={(
                      <p className={`whitespace-pre-wrap break-words ${msg.role === 'user' ? 'text-white' : 'chat-bubble-text'}`}>
                        {msg.text}
                      </p>
                    )}>
                      <MarkdownRenderer>{msg.text}</MarkdownRenderer>
                    </Suspense>
                  </div>
                ) : null}

                {msg.role === 'model' && sourceDetails.length > 0 && (
                  <div className="mt-3 min-w-0 overflow-hidden border-t border-white/15 pt-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-tertiary mb-1.5">{t.chatSources}</p>
                    <div className="space-y-1.5">
                      {sourceDetails.map((source, idx) => {
                        const label = source.title?.trim() || source.domain || (t.chatSources + ' ' + (idx + 1));
                        return (
                          <a
                            key={`${msg.id}_source_${idx}_${source.uri}`}
                            href={source.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="chat-source-link inline-flex min-w-0 max-w-full items-start gap-1 break-words text-[12px] text-blue-600 hover:underline dark:text-blue-300 [overflow-wrap:anywhere]"
                          >
                            <ExternalLink size={12} className="mt-0.5 shrink-0" />
                            <span className="min-w-0">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {msg.role === 'model' && import.meta.env.DEV && (msg.regenerated || msg.caveatApplied) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide text-tertiary">
                    {msg.regenerated && (
                      <span className="rounded-full border panel-divider-subtle bg-surface-alpha px-2 py-1">
                        regenerated: yes
                      </span>
                    )}
                    {msg.caveatApplied && (
                      <span className="rounded-full border panel-divider-subtle bg-surface-alpha px-2 py-1">
                        caveat applied
                      </span>
                    )}
                  </div>
                )}

                {msg.role === 'model' && (
                <div className="mt-3 flex justify-end gap-1">
                  {isSaveableContent(msg.text) && (
                    <button
                      type="button"
                      onClick={() => handleSaveToCollection(msg)}
                      disabled={savedMessageIds.has(msg.id) || savingMessageIds.has(msg.id)}
                      className={`p-2 rounded-full transition-all duration-300 ease-out ${savedMessageIds.has(msg.id) ? 'text-emerald-500' : 'text-tertiary hover:text-blue-500 hover:bg-blue-500/10'}`}
                      aria-label={savedMessageIds.has(msg.id) ? t.chatSavedToCollection : t.saveToCollection}
                      title={savedMessageIds.has(msg.id) ? t.chatSavedToCollection : t.saveToCollection}
                    >
                      {savedMessageIds.has(msg.id) ? <BookmarkCheck size={14} /> : savingMessageIds.has(msg.id) ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.text)}
                    className="p-2 rounded-full transition-all duration-300 ease-out text-tertiary hover:text-secondary hover:bg-surface-alpha"
                    aria-label={t.chatCopy}
                    title={t.chatCopy}
                  >
                    {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => handlePlayAudio(msg.id, msg.text)}
                    className={`p-2 rounded-full transition-all duration-300 ease-out ${playingAudioId === msg.id ? 'bg-blue-500/15 text-blue-600 scale-110' : 'text-tertiary hover:text-secondary hover:bg-surface-alpha'}`}
                    aria-label={playingAudioId === msg.id ? t.chatStopAudio : t.chatPlayAudio}
                    title={playingAudioId === msg.id ? t.chatStopAudio : t.chatPlayAudio}
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              )}
              </div>
            </motion.div>
          );
        })}

        {loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start" role="status" aria-live="polite" aria-busy="true">
            <div className={`glass-card px-5 py-4 text-secondary rounded-bl-[0.5rem] relative overflow-hidden ${deepRequestInFlight ? 'deep-thinking-card' : 'flex items-center gap-3'}`}>
              <div className="absolute inset-0 loading-shimmer opacity-30 pointer-events-none" />
              {deepRequestInFlight ? (
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500/80 thinking-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600 dark:text-blue-300">{t.deepThink}</span>
                  </div>
                  <p className="text-sm font-medium text-primary mb-2.5">{loadingLabel}</p>
                  <div className="flex gap-1.5">
                    {deepThinkingPhases.map((phase, idx) => (
                      <span
                        key={phase}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx <= deepThinkingPhaseIndex ? 'w-6 bg-blue-500/80' : 'w-3 bg-white/25'}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 relative z-10">
                    <span className="w-2 h-2 rounded-full bg-amber-500/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-600/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite 0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-700/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite 0.4s' }} />
                  </div>
                  <span className="text-sm font-medium relative z-10">{loadingLabel}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* ─── Input ─── */}
      {!shouldHideComposerOnMobileSidebar && (
        <div
          ref={inputContainerRef}
          data-testid="chat-composer-dock"
          data-disable-page-swipe
          className="relative shrink-0 px-3 pt-2 pb-2 sm:px-4"
          style={{
            position: 'fixed',
            left: isDesktop ? desktopShellOffset : 0,
            right: 0,
            bottom: composerDockedToKeyboard ? keyboardDockBottom : restingComposerBottom,
            zIndex: 45,
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
            paddingBottom: composerDockedToKeyboard ? '4px' : 'var(--composer-bottom-padding, 0px)',
            background: composerDockedToKeyboard ? 'transparent' : 'var(--composer-bottom-bg, transparent)',
          }}
        >
        <AnimatePresence>
          {!isDesktop && !keyboardFix.isKeyboardOpen && showSwipeHint && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-none absolute left-0 right-0 -top-11 z-[65] flex justify-center"
            >
              <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/35 dark:border-white/15 bg-white/80 dark:bg-black/55 backdrop-blur-md px-3 py-1.5 text-[11px] text-primary shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
                <ArrowLeftRight size={13} className="text-blue-500 shrink-0" />
                <span>{t.chatSwipeHint}</span>
                <button
                  type="button"
                  onClick={() => setShowSwipeHint(false)}
                  aria-label={t.chatDismissSwipeHint}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-tertiary hover:text-primary hover:bg-surface-alpha transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComposerMenuOpen && (
            <motion.div
              id="chat-composer-menu"
              ref={composerMenuRef}
              role="menu"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="absolute right-3 bottom-[calc(100%+0.55rem)] z-[70] pointer-events-auto sm:right-4"
            >
              <div className="min-w-[13.25rem] rounded-[1.35rem] border panel-divider-subtle bg-[var(--bg-base)]/96 backdrop-blur-xl p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
                {COMPOSER_MENU_ITEMS.map((item) => (
                  <button
                    key={item}
                      type="button"
                      role="menuitem"
                      onClick={() => { void openAttachmentPicker(item); }}
                      className="w-full min-h-[48px] text-left px-3 py-2.5 rounded-[1rem] text-sm font-medium text-primary hover:bg-surface-alpha transition-colors flex items-center gap-3 focus-soft"
                    >
                    <span className="inline-flex h-9 w-9 items-center justify-center shrink-0">
                      {item === 'photo' && <AppImagePlusIcon size={36} variant="tile" tone="green" />}
                      {item === 'file' && <AppFileTextIcon size={36} variant="tile" tone="ice" />}
                      {item === 'camera' && <AppCameraIcon size={36} variant="tile" tone="amber" />}
                    </span>
                    {item === 'photo' ? t.chatComposerPhoto : item === 'file' ? t.chatComposerFile : t.chatComposerCamera}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showComposerQuickPrompts && (
          <div className="chat-quick-prompt-strip mb-2 flex min-w-0 max-w-full gap-2 overflow-x-auto hide-scrollbar pb-1 px-1" data-testid="chat-quick-prompts">
            {chatQuickPrompts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => applyQuickPrompt(item.prompt)}
                className="shrink-0 whitespace-nowrap min-w-0 rounded-full border panel-divider-subtle bg-[var(--nav-bg)]/90 px-3 py-2 text-left text-[11px] font-semibold text-primary shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-colors hover:bg-surface-alpha-hover focus-soft sm:text-xs"
                data-testid={`chat-quick-prompt-${item.id}`}
              >
                <span className="flex min-w-0 items-center justify-center gap-1.5">
                  <MessageSquare size={12} className="shrink-0 text-blue-500" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t.chatRecordingHint}
          </div>
        )}

        {draftAttachmentError && (
          <div className="mb-2 flex max-h-[72px] items-center gap-2 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            <AlertCircle size={14} />
            <span className="flex-1">{draftAttachmentError}</span>
            <button type="button" onClick={() => setDraftAttachmentError(null)} className="min-h-8 min-w-8 rounded-full hover:bg-red-500/10 focus-soft">
              <X size={12} />
            </button>
          </div>
        )}

        {draftAttachment && (
          <div className="mb-2 max-h-[104px] overflow-hidden rounded-2xl border panel-divider-subtle bg-[var(--nav-bg)]/95 p-2">
            <div className="flex items-center gap-2">
              {draftAttachment.previewDataUrl && draftAttachment.mimeType.startsWith('image/') ? (
                <img
                  src={draftAttachment.previewDataUrl}
                  alt={draftAttachment.fileName || t.chatAttachmentAlt}
                  className="w-14 h-14 rounded-[14px] object-cover border panel-divider-subtle shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-[14px] border panel-divider-subtle bg-surface-alpha flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-secondary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-primary">
                  {draftAttachment.fileName || attachmentKindLabel(draftAttachment.kind, draftAttachment.mimeType)}
                </p>
                <p className="text-xs text-tertiary">
                  {attachmentKindLabel(draftAttachment.kind, draftAttachment.mimeType)} • {formatBytes(draftAttachment.sizeBytes)}
                </p>
                {draftAttachment.mimeType.startsWith('text/') && draftAttachment.extractedText && (
                  <p className="mt-1 text-xs text-secondary line-clamp-2">{draftAttachment.extractedText}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearDraftAttachment}
                className="w-8 h-8 rounded-full border panel-divider-subtle bg-surface-alpha flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-alpha-hover shrink-0 focus-soft"
                aria-label={t.chatRemoveAttachment}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="relative flex min-w-0 items-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setIsComposerMenuOpen(false);
              navigate('/');
            }}
            aria-label={t.chatGoHome}
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-glass bg-[var(--bg-base)]/82 text-primary shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all duration-200 hover:bg-surface-alpha-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-soft sm:h-12 sm:w-12"
          >
            <AppHomeIcon size={20} variant="glyph" tone="blue" />
          </button>

          <div className="chat-composer-shell flex-1 min-w-0 overflow-hidden rounded-[1.65rem] border">
            <div className="flex min-w-0 items-end gap-1 px-1.5 py-1.5 sm:gap-2 sm:px-2.5 sm:py-2">
              <textarea
                ref={composerTextareaRef}
                value={input}
                onChange={(e) => applyInputLimit(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (!pasted) return;
                  const target = e.currentTarget;
                  const selectionStart = target.selectionStart ?? input.length;
                  const selectionEnd = target.selectionEnd ?? input.length;
                  const candidate = `${input.slice(0, selectionStart)}${pasted}${input.slice(selectionEnd)}`;
                  if (candidate.length > CHAT_INPUT_MAX_CHARS) {
                    e.preventDefault();
                    applyInputLimit(candidate);
                  }
                }}
                onFocus={() => { setIsComposerMenuOpen(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComposerSend();
                  }
                }}
                placeholder={t.typeMessage}
                className="min-h-[42px] min-w-0 max-h-[132px] flex-1 resize-none border-none bg-transparent px-2 py-2 text-base leading-6 text-primary placeholder:text-tertiary focus:outline-none focus:ring-0 sm:min-h-[44px] sm:px-2.5 sm:py-2.5"
                rows={1}
                maxLength={CHAT_INPUT_MAX_CHARS}
                disabled={interactionDisabled}
                enterKeyHint="send"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck
              />

              <div className="flex shrink-0 items-center gap-0.5 pb-0.5 pr-0.5 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsComposerMenuOpen((prev) => !prev)}
                  disabled={interactionDisabled}
                  aria-label={t.chatOpenAttachmentMenu}
                  aria-haspopup="menu"
                  aria-expanded={isComposerMenuOpen}
                  aria-controls="chat-composer-menu"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-glass bg-surface-alpha text-secondary transition-all duration-200 hover:bg-surface-alpha-hover hover:text-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-soft sm:h-11 sm:w-11"
                >
                  <AppPaperclipIcon size={19} variant="glyph" tone="neutral" />
                </button>

                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={interactionDisabled}
                  aria-label={isRecording ? t.chatStopRecording : t.chatRecordVoice}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 focus-soft disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11 ${isRecording
                    ? 'border-red-400/30 bg-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.28)] animate-pulse'
                    : 'border-glass bg-surface-alpha text-secondary hover:bg-surface-alpha-hover hover:text-primary'
                    }`}
                >
                  <AppMicIcon
                    size={19}
                    variant="glyph"
                    tone={isRecording ? 'neutral' : 'purple'}
                    style={isRecording ? ({ '--icon-glyph-color': '#ffffff' } as CSSProperties) : undefined}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleComposerSend}
                  disabled={(!input.trim() && !draftAttachment) || interactionDisabled}
                  aria-label={t.chatSendMessageAria}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 focus-soft sm:h-11 sm:w-11 ${(input.trim() || draftAttachment) && !interactionDisabled
                    ? 'border-blue-500/35 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] hover:bg-blue-700 hover:scale-[1.03] active:scale-95'
                    : 'border-glass bg-surface-alpha text-tertiary'
                    } ${loadingPhase === 'sending' ? 'chat-send-morph' : ''}`}
                >
                  {loadingPhase === 'sending' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <AppArrowUpIcon
                      size={18}
                      variant="glyph"
                      tone={(input.trim() || draftAttachment) && !interactionDisabled ? 'neutral' : 'blue'}
                      style={(input.trim() || draftAttachment) && !interactionDisabled ? ({ '--icon-glyph-color': '#ffffff' } as CSSProperties) : undefined}
                    />
                  )}
                </button>
              </div>
            </div>
            {showComposerMeta && (
              <div className="flex items-center gap-3 px-4 pb-2.5">
                <span className={`text-[11px] leading-4 ${inputLimitNotice || input.length >= CHAT_INPUT_WARNING_CHARS ? 'text-amber-600 dark:text-amber-400' : 'text-tertiary'}`}>
                  {inputLimitNotice || (input.length >= CHAT_INPUT_WARNING_CHARS ? t.chatNearLimit : composerDisabledReason)}
                </span>
              </div>
            )}
          </div>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAttachmentInputChange('photo')}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,text/plain,.txt"
          className="hidden"
          onChange={handleAttachmentInputChange('file')}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleAttachmentInputChange('camera')}
        />
        </div>
      )}
      {aiAccessGateModal}
    </div>
  );
}

// ─── Audio Bubble Sub-Component ───
function AudioBubble({ url, isUser }: { url: string; isUser: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioElRef.current = audio;
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioElRef.current = null;
    };
  }, [url]);

  const toggle = () => {
    const audio = audioElRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => { }); }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${isUser ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-500'}`}>
        {playing ? (
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1 rounded-full bg-current opacity-20 overflow-hidden">
          <div className="h-full rounded-full bg-current opacity-80 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] opacity-70">{fmt(currentTime)}</span>
          <span className="text-[10px] opacity-70">{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}




