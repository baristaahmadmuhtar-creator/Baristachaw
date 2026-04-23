import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wand2,
  Loader2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { generateImage } from '../../services/gemini';
import { getAgentProfileMemory, resetAgentProfileMemory, saveAgentProfileMemory } from '../../services/storageService';
import { useGlobalState } from '../../context/GlobalState';
import { useAuthModal } from '../../context/AuthModalContext';
import { isReusableDraftSession, normalizeAgentProfileMemory, resolveAgentProfileNamespace, type AgentBaristaSkillFocus, type AgentProfileMemory } from '@baristachaw/shared';
import type { ChatSession } from '../../types';
import type { ChatWorkspaceTab } from './types';
import { SessionItem } from './SessionItem';
import { LANGUAGE_OPTIONS } from '../../constants';

const MEMORY_DETAIL_OPTIONS: Array<{ value: NonNullable<AgentProfileMemory['detailPreference']>; label: string }> = [
  { value: 'short', label: 'chatBeConcise' },
  { value: 'balanced', label: 'chatMemoryDetailBalanced' },
  { value: 'comprehensive', label: 'chatBeDetailed' },
];

const MEMORY_FORMAT_OPTIONS: Array<{ value: NonNullable<AgentProfileMemory['responseStyle']>; label: string }> = [
  { value: 'plain', label: 'chatMemoryFormatPlain' },
  { value: 'bullets', label: 'chatMemoryFormatBullets' },
  { value: 'steps', label: 'chatMemoryFormatSteps' },
  { value: 'table', label: 'chatMemoryFormatTable' },
];

const MEMORY_TONE_OPTIONS: Array<{ value: NonNullable<AgentProfileMemory['tonePreference']>; label: string }> = [
  { value: 'neutral', label: 'chatMemoryToneNeutral' },
  { value: 'professional', label: 'chatMemoryToneProfessional' },
  { value: 'friendly', label: 'chatMemoryToneFriendly' },
];

const MEMORY_EMOJI_OPTIONS: Array<{ value: NonNullable<AgentProfileMemory['emojiPolicy']>; label: string }> = [
  { value: 'default', label: 'chatMemoryEmojiDefault' },
  { value: 'minimal', label: 'chatMemoryEmojiMinimal' },
  { value: 'none', label: 'chatMemoryEmojiNone' },
];

const MEMORY_SKILL_OPTIONS: Array<{ value: AgentBaristaSkillFocus; label: string }> = [
  { value: 'espresso_dial_in', label: 'Espresso dial-in' },
  { value: 'brew_recipe_design', label: 'Recipe design' },
  { value: 'sensory_cupping', label: 'Sensory' },
  { value: 'milk_latte_art', label: 'Milk and latte art' },
  { value: 'water_chemistry', label: 'Water chemistry' },
  { value: 'grinder_equipment', label: 'Grinder and equipment' },
  { value: 'cafe_operations', label: 'Cafe operations' },
  { value: 'training_coaching', label: 'Training' },
  { value: 'menu_costing', label: 'Menu costing' },
  { value: 'coffee_origin_roast', label: 'Origin and roast' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
];

function serializeMemoryProfile(profile: AgentProfileMemory): string {
  return JSON.stringify({
    preferredLanguage: profile.preferredLanguage || '',
    languageSource: profile.languageSource || '',
    userDisplayName: profile.userDisplayName || '',
    assistantName: profile.assistantName || '',
    responseStyle: profile.responseStyle || '',
    tonePreference: profile.tonePreference || '',
    detailPreference: profile.detailPreference || '',
    workspaceRole: profile.workspaceRole || '',
    workflowFocus: profile.workflowFocus || '',
    skillFocus: profile.skillFocus || [],
    emojiPolicy: profile.emojiPolicy || '',
    blockedWords: profile.blockedWords || [],
    styleNotes: profile.styleNotes || '',
  });
}

function formatUpdatedAtLabel(timestamp: number | undefined, t: Record<string, string>): string {
  if (!timestamp || !Number.isFinite(timestamp)) return t.chatMemoryNotSavedYet;
  return t.chatMemoryUpdatedAt.replace(
    '{time}',
    new Date(timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
  );
}

function getDayKey(value: number) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

interface ChatWorkspacePanelProps {
  tab: ChatWorkspaceTab;
  onTabChange: (tab: ChatWorkspaceTab) => void;
  isDesktop: boolean;
  onRequestClose?: () => void;
  closeOnSessionSelect?: boolean;
  className?: string;
  agentProfile?: AgentProfileMemory;
  onSaveAgentProfile?: (next: AgentProfileMemory) => Promise<void> | void;
  onResetAgentProfile?: () => Promise<void> | void;
}

type MemorySectionId = 'identity' | 'reply' | 'workflow' | 'guardrails';

export function ChatWorkspacePanel({
  tab,
  onTabChange,
  isDesktop,
  onRequestClose,
  closeOnSessionSelect = false,
  className,
  agentProfile,
  onSaveAgentProfile,
  onResetAgentProfile,
}: ChatWorkspacePanelProps) {
  const {
    sessions,
    activeSessionId,
    t,
    language,
    createNewChat,
    selectSession,
    removeSession,
    renameSessionAction,
    moveSessionAction,
    chatFolders,
    addChatFolder,
    editChatFolder,
    removeChatFolder,
  } = useGlobalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<{ url: string; prompt: string }[]>([]);
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory(agentProfile));
  const [persistedMemory, setPersistedMemory] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory(agentProfile));
  const [memorySaving, setMemorySaving] = useState(false);
  const [memoryFeedback, setMemoryFeedback] = useState(t.chatMemoryStoredDeviceOnly);
  const [openMemorySection, setOpenMemorySection] = useState<MemorySectionId | null>(null);
  const { isAuthenticated, authChecking, openAuthModal, user } = useAuthModal();
  const agentProfileNamespace = resolveAgentProfileNamespace(user?.id);
  const memoryLanguageOptions = useMemo(
    () => LANGUAGE_OPTIONS.map((option) => ({
      value: option.value,
      label: /^en(?:-|$)/i.test(language) ? option.label : option.nativeLabel,
    })),
    [language],
  );

  useEffect(() => {
    const normalized = normalizeAgentProfileMemory(agentProfile);
    setMemoryDraft(normalized);
    setPersistedMemory(normalized);
  }, [agentProfile]);

  useEffect(() => {
    if (agentProfile || onSaveAgentProfile || onResetAgentProfile) return;
    let cancelled = false;
    void (async () => {
      const stored = await getAgentProfileMemory(agentProfileNamespace);
      if (!cancelled) {
        setMemoryDraft(stored);
        setPersistedMemory(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentProfile, agentProfileNamespace, onResetAgentProfile, onSaveAgentProfile]);

  const resetTransientState = useCallback(() => {
    setContextMenuId(null);
    setMovingSessionId(null);
    setShowNewFolder(false);
    setNewFolderName('');
  }, []);

  useEffect(() => {
    resetTransientState();
  }, [tab, resetTransientState]);

  useEffect(() => {
    if (tab !== 'memory') {
      setOpenMemorySection(null);
    }
  }, [tab]);

  const filteredSessions = useMemo(() => sessions
    .filter((session) => !searchQuery || session.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.updatedAt || b.lastMessageAt || b.createdAt || 0) - (a.updatedAt || a.lastMessageAt || a.createdAt || 0)), [searchQuery, sessions]);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );
  const canCreateFreshChat = !isReusableDraftSession(activeSession);
  const ungroupedSessions = filteredSessions.filter((session) => !session.folderId);
  const ungroupedSections = splitByRecency(ungroupedSessions);
  const getSessionsForFolder = (folderId: string) => filteredSessions.filter((session) => session.folderId === folderId);

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
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateImage = async () => {
    if (!isAuthenticated) {
      openAuthModal({ source: 'chat_image_generation' });
      return;
    }
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    try {
      const url = await generateImage(`High quality professional coffee photography. ${imgPrompt}`);
      if (url) {
        setImages((prev) => [{ url, prompt: imgPrompt }, ...prev]);
        setImgPrompt('');
      }
    } finally {
      setImgLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    await selectSession(sessionId);
    if (closeOnSessionSelect && onRequestClose) onRequestClose();
  };

  const handleNewChat = async () => {
    await createNewChat();
    if (closeOnSessionSelect && onRequestClose) onRequestClose();
  };

  const updateMemoryDraft = (patch: Partial<AgentProfileMemory>) => {
    setMemoryFeedback(t.chatMemoryUnsavedChanges);
    setMemoryDraft((current) => normalizeAgentProfileMemory({
      ...current,
      ...patch,
    }));
  };

  const handleSaveMemory = async () => {
    const normalized = normalizeAgentProfileMemory(memoryDraft);
    setMemorySaving(true);
    try {
      if (onSaveAgentProfile) {
        await onSaveAgentProfile(normalized);
      } else {
        await saveAgentProfileMemory(agentProfileNamespace, normalized);
      }
      setPersistedMemory(normalized);
      setMemoryDraft(normalized);
      setMemoryFeedback(t.chatSavedLocal);
    } finally {
      setMemorySaving(false);
    }
  };

  const handleQuickMemoryAction = async (patch: Partial<AgentProfileMemory>) => {
    const next = normalizeAgentProfileMemory({
      ...memoryDraft,
      ...patch,
    });
    setMemoryDraft(next);
    setMemorySaving(true);
    try {
      if (onSaveAgentProfile) {
        await onSaveAgentProfile(next);
      } else {
        await saveAgentProfileMemory(agentProfileNamespace, next);
      }
      setPersistedMemory(next);
      setMemoryFeedback(t.chatMemoryUpdatedLocal);
    } finally {
      setMemorySaving(false);
    }
  };

  const handleResetMemory = async () => {
    setMemorySaving(true);
    try {
      if (onResetAgentProfile) {
        await onResetAgentProfile();
      } else {
        await resetAgentProfileMemory(agentProfileNamespace);
      }
      const resetProfile = await getAgentProfileMemory(agentProfileNamespace);
      setMemoryDraft(resetProfile);
      setPersistedMemory(resetProfile);
      setMemoryFeedback(t.chatMemoryResetLocalDefaults);
    } finally {
      setMemorySaving(false);
    }
  };

  const isMemoryDirty = useMemo(
    () => serializeMemoryProfile(memoryDraft) !== serializeMemoryProfile(persistedMemory),
    [memoryDraft, persistedMemory],
  );
  const memorySummary = useMemo(() => [
    memoryDraft.preferredLanguage ? `${t.language} ${memoryDraft.preferredLanguage.toUpperCase()}` : t.chatMemoryLanguageAuto,
    memoryDraft.detailPreference ? (t[MEMORY_DETAIL_OPTIONS.find((option) => option.value === memoryDraft.detailPreference)?.label || ''] || t.chatMemoryAdaptiveDetail) : t.chatMemoryAdaptiveDetail,
    memoryDraft.responseStyle ? (t[MEMORY_FORMAT_OPTIONS.find((option) => option.value === memoryDraft.responseStyle)?.label || ''] || t.chatMemoryFlexibleFormat) : t.chatMemoryFlexibleFormat,
    memoryDraft.tonePreference ? (t[MEMORY_TONE_OPTIONS.find((option) => option.value === memoryDraft.tonePreference)?.label || ''] || t.chatMemoryToneNeutral) : t.chatMemoryToneNeutral,
  ].join(' | '), [memoryDraft, t]);
  const memoryIdentitySummary = useMemo(() => [
    memoryDraft.preferredLanguage ? memoryDraft.preferredLanguage.toUpperCase() : t.chatMemoryLanguageAuto,
    memoryDraft.userDisplayName ? t.chatMemoryCallYou.replace('{name}', memoryDraft.userDisplayName) : t.chatMemoryDefaultName,
    memoryDraft.assistantName ? memoryDraft.assistantName : t.chatMemoryDefaultAssistantName,
  ].join(' | '), [memoryDraft.assistantName, memoryDraft.preferredLanguage, memoryDraft.userDisplayName, t]);
  const memoryReplySummary = useMemo(() => [
    memoryDraft.detailPreference ? (t[MEMORY_DETAIL_OPTIONS.find((option) => option.value === memoryDraft.detailPreference)?.label || ''] || t.chatMemoryAdaptiveDetail) : t.chatMemoryAdaptiveDetail,
    memoryDraft.responseStyle ? (t[MEMORY_FORMAT_OPTIONS.find((option) => option.value === memoryDraft.responseStyle)?.label || ''] || t.chatMemoryFlexibleFormat) : t.chatMemoryFlexibleFormat,
    memoryDraft.tonePreference ? (t[MEMORY_TONE_OPTIONS.find((option) => option.value === memoryDraft.tonePreference)?.label || ''] || t.chatMemoryToneNeutral) : t.chatMemoryToneNeutral,
  ].join(' | '), [memoryDraft.detailPreference, memoryDraft.responseStyle, memoryDraft.tonePreference, t]);
  const memoryWorkflowSummary = useMemo(() => [
    memoryDraft.workspaceRole || t.chatMemoryNoWorkspaceRole,
    memoryDraft.workflowFocus || t.chatMemoryNoWorkflowFocus,
    memoryDraft.skillFocus?.length
      ? `${t.chatSkillFocus}: ${MEMORY_SKILL_OPTIONS
          .filter((option) => memoryDraft.skillFocus?.includes(option.value))
          .map((option) => option.label)
          .join(', ')}`
      : t.chatMemoryNoSkillFocus,
    memoryDraft.styleNotes ? t.chatMemoryStyleNoteSaved : t.chatMemoryNoStyleNotes,
  ].join(' | '), [memoryDraft.skillFocus, memoryDraft.styleNotes, memoryDraft.workflowFocus, memoryDraft.workspaceRole, t]);
  const memoryGuardrailSummary = useMemo(() => [
    memoryDraft.emojiPolicy ? (t[MEMORY_EMOJI_OPTIONS.find((option) => option.value === memoryDraft.emojiPolicy)?.label || ''] || t.chatMemoryEmojiDefault) : t.chatMemoryEmojiDefault,
    (memoryDraft.blockedWords?.length || 0) > 0 ? t.chatMemoryBlockedWordsCount.replace('{count}', String(memoryDraft.blockedWords?.length || 0)) : t.chatMemoryNoBlockedWords,
  ].join(' | '), [memoryDraft.blockedWords, memoryDraft.emojiPolicy, t]);

  const memoryChoiceClass = useCallback((active: boolean) => (
    `rounded-xl border px-3 py-2 text-sm font-medium transition-all focus-soft ${
      active
        ? 'border-blue-500/40 bg-blue-500/12 text-blue-700 dark:text-blue-300'
        : 'border-[color:var(--panel-border-soft)] bg-transparent text-secondary hover:bg-surface-alpha'
    }`
  ), []);
  const memoryInputClass = 'w-full rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-2 text-sm text-primary focus-soft placeholder:text-tertiary';
  const memoryTextareaClass = `${memoryInputClass} min-h-[96px] resize-none`;
  const memoryDisclosureClass = 'w-full flex items-center justify-between gap-3 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-3 text-left transition-all hover:bg-surface-alpha focus-soft';
  const toggleMemorySection = useCallback((section: MemorySectionId) => {
    setOpenMemorySection((current) => (current === section ? null : section));
  }, []);

  const renderSession = (session: ChatSession, indent = false) => (
    <SessionItem
      key={session.id}
      session={session}
      isActive={session.id === activeSessionId}
      contextMenuId={contextMenuId}
      renamingId={renamingId}
      renameValue={renameValue}
      movingSessionId={movingSessionId}
      chatFolders={chatFolders}
      onSelect={() => { void handleSelectSession(session.id); }}
      onContextMenu={(id) => setContextMenuId(contextMenuId === id ? null : id)}
      onRename={(id, name) => { setRenamingId(id); setRenameValue(name); setContextMenuId(null); }}
      onRenameSubmit={(id) => { void handleRename(id); }}
      onRenameChange={setRenameValue}
      onDelete={(id) => { void handleDelete(id); }}
      onMoveStart={(id) => { setMovingSessionId(id); setContextMenuId(null); }}
      onMoveToFolder={(sessionId, folderId) => { void handleMoveToFolder(sessionId, folderId); }}
      indent={indent}
    />
  );

  return (
    <div className={`flex flex-col min-h-0 ${className ?? ''}`}>
      <div className="p-3 border-b panel-divider-subtle flex items-center justify-between gap-2">
        <div className="flex gap-1 p-1 bg-surface-alpha rounded-xl">
          <button
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus-soft ${tab === 'history' ? 'bg-white shadow-sm text-black dark:bg-white/20 dark:text-white' : 'text-secondary'}`}
          >{t.chatWorkspaceTabHistory}</button>
          <button
            onClick={() => onTabChange('library')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus-soft ${tab === 'library' ? 'bg-white shadow-sm text-black dark:bg-white/20 dark:text-white' : 'text-secondary'}`}
          >{t.chatWorkspaceTabLibrary}</button>
          <button
            onClick={() => onTabChange('memory')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus-soft ${tab === 'memory' ? 'bg-white shadow-sm text-black dark:bg-white/20 dark:text-white' : 'text-secondary'}`}
          >{t.chatWorkspaceTabMemory}</button>
        </div>
        {!isDesktop && onRequestClose && (
          <button
            onClick={onRequestClose}
            className="icon-touch-button icon-touch-button-sm text-secondary hover:bg-surface-alpha"
            aria-label={t.chatCloseSidebar || t.close}
            title={t.chatCloseSidebar || t.close}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {tab === 'history' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 sticky top-0 z-10 bg-[var(--bg-base)]/88 backdrop-blur-xl border-b panel-divider-subtle">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.chatSearchPlaceholder}
                className="w-full bg-surface-alpha rounded-xl pl-9 pr-3 py-2.5 text-sm text-primary placeholder:text-tertiary border-none focus-soft"
              />
            </div>
          </div>

          <div className="px-3 flex gap-2 my-2">
            <button
              onClick={() => { if (canCreateFreshChat) void handleNewChat(); }}
              disabled={!canCreateFreshChat}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all focus-soft ${canCreateFreshChat ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15' : 'bg-surface-alpha text-tertiary cursor-not-allowed opacity-70'}`}
            >
              <Plus size={14} /> {t.newChat}
            </button>
            <button
              onClick={() => setShowNewFolder(true)}
              className="p-2.5 rounded-xl bg-surface-alpha text-secondary hover:text-primary transition-all focus-soft"
              title={t.createFolder}
            >
              <FolderPlus size={16} />
            </button>
          </div>

          <AnimatePresence>
            {showNewFolder && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 overflow-hidden">
                <div className="flex gap-2 py-2">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleCreateFolder()}
                    placeholder={t.folderName}
                    className="flex-1 bg-surface-alpha rounded-xl px-3 py-2 text-sm border-none focus-soft"
                    autoFocus
                  />
                  <button onClick={() => { void handleCreateFolder(); }} disabled={!newFolderName.trim()} className="px-3 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium disabled:opacity-50 focus-soft">{t.save}</button>
                  <button onClick={() => setShowNewFolder(false)} className="icon-touch-button icon-touch-button-sm text-secondary hover:bg-surface-alpha focus-soft" aria-label={t.cancel}>
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            {chatFolders.map((folder) => {
              const folderSessions = getSessionsForFolder(folder.id);
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <div key={folder.id}>
                  <div className="flex items-center gap-1 px-2 py-2 rounded-xl hover:bg-surface-alpha group">
                    <button onClick={() => toggleFolderExpand(folder.id)} className="flex items-center gap-2 flex-1 min-w-0 focus-soft rounded-lg px-1">
                      {isExpanded ? <ChevronDown size={14} className="text-tertiary shrink-0" /> : <ChevronRight size={14} className="text-tertiary shrink-0" />}
                      <Folder size={14} className="text-amber-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{folder.name}</span>
                      <span className="text-xs text-tertiary ml-auto shrink-0">{folderSessions.length}</span>
                    </button>
                    <button
                      onClick={() => setContextMenuId(contextMenuId === `f_${folder.id}` ? null : `f_${folder.id}`)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-lg text-tertiary hover:text-primary transition-all"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>

                  {contextMenuId === `f_${folder.id}` && (
                    <div className="mx-2 mb-1 p-1 bg-surface-alpha rounded-xl border panel-divider-subtle text-sm">
                      <button onClick={() => { setRenamingId(`f_${folder.id}`); setRenameValue(folder.name); setContextMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-alpha-hover text-primary">
                        <Edit3 size={13} /> {t.collectionRename}
                      </button>
                      <button onClick={() => { void removeChatFolder(folder.id); setContextMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500">
                        <Trash2 size={13} /> {t.delete}
                      </button>
                    </div>
                  )}

                  {renamingId === `f_${folder.id}` && (
                    <div className="mx-2 mb-1 flex gap-1">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { void editChatFolder(folder.id, renameValue.trim()); setRenamingId(null); } }}
                        className="flex-1 bg-surface-alpha rounded-lg px-3 py-1.5 text-sm border-none focus-soft"
                        autoFocus
                      />
                      <button onClick={() => { void editChatFolder(folder.id, renameValue.trim()); setRenamingId(null); }} className="px-2 py-1.5 rounded-lg bg-blue-500 text-white text-xs">{t.confirm}</button>
                    </div>
                  )}

                  {isExpanded && folderSessions.map((session) => renderSession(session, true))}
                </div>
              );
            })}

            {ungroupedSessions.length > 0 && chatFolders.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-tertiary uppercase tracking-widest">{t.chatHistory}</span>
              </div>
            )}

            {ungroupedSections.today.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1"><span className="text-[10px] font-semibold text-tertiary uppercase tracking-widest">{t.chatToday}</span></div>
                {ungroupedSections.today.map((session) => renderSession(session))}
              </>
            )}
            {ungroupedSections.yesterday.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1"><span className="text-[10px] font-semibold text-tertiary uppercase tracking-widest">{t.chatYesterday}</span></div>
                {ungroupedSections.yesterday.map((session) => renderSession(session))}
              </>
            )}
            {ungroupedSections.older.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1"><span className="text-[10px] font-semibold text-tertiary uppercase tracking-widest">{t.chatOlder}</span></div>
                {ungroupedSections.older.map((session) => renderSession(session))}
              </>
            )}

            {filteredSessions.length === 0 && (
              <div className="text-center py-10 text-tertiary text-sm">{t.chatNoChatsFound}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'library' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 space-y-3">
            {!isAuthenticated && !authChecking && (
              <button
                type="button"
                onClick={() => openAuthModal({ source: 'chat_image_generation' })}
                className="w-full text-left text-xs rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 hover:bg-amber-500/15 transition-colors"
              >
                {t.chatImageSigninRequired}
              </button>
            )}
            <textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder={t.chatDescribeImage}
              className="w-full bg-surface-alpha rounded-xl resize-none min-h-[70px] text-sm px-3 py-2.5 border-none focus-soft placeholder:text-tertiary"
            />
            <button
              onClick={() => { void handleGenerateImage(); }}
              disabled={imgLoading || !imgPrompt.trim() || !isAuthenticated || authChecking}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/90 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              {imgLoading ? <><Loader2 className="animate-spin" size={16} /> {t.chatGeneratingImage}</> : <><Wand2 size={16} /> {t.chatGenerateImage}</>}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            {images.length === 0 ? (
              <div className="text-center py-10 text-tertiary text-sm">
                <ImageIcon size={32} className="mx-auto mb-3 opacity-40" />
                <p>{t.chatGeneratedImagesPlaceholder}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, index) => (
                  <div key={`${img.url}-${index}`} className="relative rounded-xl overflow-hidden aspect-square bg-surface-alpha group">
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-[10px] line-clamp-2">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'memory' && (
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-3" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          <div className="rounded-[1.35rem] border panel-divider-subtle bg-surface-alpha px-4 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-primary">{memorySummary}</p>
              <span className={`text-[11px] font-semibold ${isMemoryDirty ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {isMemoryDirty ? t.chatMemoryUnsaved : t.chatMemorySaved}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
              <span>{memoryFeedback}</span>
              <span className="text-tertiary">|</span>
              <span>{formatUpdatedAtLabel(persistedMemory.updatedAt, t)}</span>
            </div>
          </div>

          <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-primary">{t.chatQuickPresets}</p>
              <p className="mt-1 text-xs text-secondary">{t.chatQuickPresetBody}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { void handleQuickMemoryAction({ preferredLanguage: 'id', languageSource: 'manual' }); }} className={memoryChoiceClass(memoryDraft.preferredLanguage === 'id')}>{t.chatLanguagePresetId}</button>
              <button onClick={() => { void handleQuickMemoryAction({ preferredLanguage: 'en', languageSource: 'manual' }); }} className={memoryChoiceClass(memoryDraft.preferredLanguage === 'en')}>{t.chatLanguagePresetEn}</button>
              <button onClick={() => { void handleQuickMemoryAction({ detailPreference: 'short' }); }} className={memoryChoiceClass(memoryDraft.detailPreference === 'short')}>{t.chatBeConcise}</button>
              <button onClick={() => { void handleQuickMemoryAction({ detailPreference: 'comprehensive' }); }} className={memoryChoiceClass(memoryDraft.detailPreference === 'comprehensive')}>{t.chatBeDetailed}</button>
            </div>
          </div>

          <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3">
            <button onClick={() => toggleMemorySection('identity')} className={memoryDisclosureClass}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{t.chatIdentity}</p>
                <p className="mt-1 text-xs text-secondary">{memoryIdentitySummary}</p>
              </div>
              {openMemorySection === 'identity' ? <ChevronDown size={16} className="shrink-0 text-tertiary" /> : <ChevronRight size={16} className="shrink-0 text-tertiary" />}
            </button>
            <AnimatePresence initial={false}>
              {openMemorySection === 'identity' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.yourName}</span>
                      <input value={memoryDraft.userDisplayName || ''} onChange={(e) => updateMemoryDraft({ userDisplayName: e.target.value })} className={memoryInputClass} placeholder={t.chatYourNamePlaceholder} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.assistantName}</span>
                      <input value={memoryDraft.assistantName || ''} onChange={(e) => updateMemoryDraft({ assistantName: e.target.value })} className={memoryInputClass} placeholder={t.chatAssistantNamePlaceholder} />
                    </label>
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatPreferredLanguage}</span>
                    <div className="flex flex-wrap gap-2">
                  {memoryLanguageOptions.map((option) => (
                        <button key={option.value} onClick={() => updateMemoryDraft({ preferredLanguage: option.value, languageSource: 'manual' })} className={memoryChoiceClass(memoryDraft.preferredLanguage === option.value)}>
                          {t[option.label] || option.label}
                        </button>
                      ))}
                    </div>
                    <input value={memoryDraft.preferredLanguage || ''} onChange={(e) => updateMemoryDraft({ preferredLanguage: e.target.value, languageSource: 'manual' })} className={`mt-2 ${memoryInputClass}`} placeholder={t.chatLanguageCodePlaceholder} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3">
            <button onClick={() => toggleMemorySection('reply')} className={memoryDisclosureClass}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{t.chatReplyDefaults}</p>
                <p className="mt-1 text-xs text-secondary">{memoryReplySummary}</p>
              </div>
              {openMemorySection === 'reply' ? <ChevronDown size={16} className="shrink-0 text-tertiary" /> : <ChevronRight size={16} className="shrink-0 text-tertiary" />}
            </button>
            <AnimatePresence initial={false}>
              {openMemorySection === 'reply' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden">
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatDetail}</span>
                    <div className="flex flex-wrap gap-2">
                      {MEMORY_DETAIL_OPTIONS.map((option) => (
                        <button key={option.value} onClick={() => updateMemoryDraft({ detailPreference: option.value })} className={memoryChoiceClass(memoryDraft.detailPreference === option.value)}>
                          {t[option.label] || option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatFormat}</span>
                    <div className="flex flex-wrap gap-2">
                      {MEMORY_FORMAT_OPTIONS.map((option) => (
                        <button key={option.value} onClick={() => updateMemoryDraft({ responseStyle: option.value })} className={memoryChoiceClass(memoryDraft.responseStyle === option.value)}>
                          {t[option.label] || option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatTone}</span>
                    <div className="flex flex-wrap gap-2">
                      {MEMORY_TONE_OPTIONS.map((option) => (
                        <button key={option.value} onClick={() => updateMemoryDraft({ tonePreference: option.value })} className={memoryChoiceClass(memoryDraft.tonePreference === option.value)}>
                          {t[option.label] || option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3">
            <button onClick={() => toggleMemorySection('workflow')} className={memoryDisclosureClass}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{t.chatWorkflowContext}</p>
                <p className="mt-1 text-xs text-secondary">{memoryWorkflowSummary}</p>
              </div>
              {openMemorySection === 'workflow' ? <ChevronDown size={16} className="shrink-0 text-tertiary" /> : <ChevronRight size={16} className="shrink-0 text-tertiary" />}
            </button>
            <AnimatePresence initial={false}>
              {openMemorySection === 'workflow' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatWorkspaceRole}</span>
                    <input value={memoryDraft.workspaceRole || ''} onChange={(e) => updateMemoryDraft({ workspaceRole: e.target.value })} className={memoryInputClass} placeholder={t.chatWorkspaceRolePlaceholder} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatWorkflowFocus}</span>
                    <input value={memoryDraft.workflowFocus || ''} onChange={(e) => updateMemoryDraft({ workflowFocus: e.target.value })} className={memoryInputClass} placeholder={t.chatWorkflowFocusPlaceholder} />
                  </label>
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatSkillFocus}</span>
                    <div className="flex flex-wrap gap-2">
                      {MEMORY_SKILL_OPTIONS.map((option) => {
                        const active = Boolean(memoryDraft.skillFocus?.includes(option.value));
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              const next = new Set(memoryDraft.skillFocus || []);
                              if (next.has(option.value)) next.delete(option.value);
                              else next.add(option.value);
                              updateMemoryDraft({ skillFocus: [...next] });
                            }}
                            className={memoryChoiceClass(active)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatStyleNotes}</span>
                    <textarea value={memoryDraft.styleNotes || ''} onChange={(e) => updateMemoryDraft({ styleNotes: e.target.value })} className={memoryTextareaClass} placeholder={t.chatStyleNotesPlaceholder} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3">
            <button onClick={() => toggleMemorySection('guardrails')} className={memoryDisclosureClass}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{t.chatGuardrails}</p>
                <p className="mt-1 text-xs text-secondary">{memoryGuardrailSummary}</p>
              </div>
              {openMemorySection === 'guardrails' ? <ChevronDown size={16} className="shrink-0 text-tertiary" /> : <ChevronRight size={16} className="shrink-0 text-tertiary" />}
            </button>
            <AnimatePresence initial={false}>
              {openMemorySection === 'guardrails' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden">
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatEmojiPolicy}</span>
                    <div className="flex flex-wrap gap-2">
                      {MEMORY_EMOJI_OPTIONS.map((option) => (
                        <button key={option.value} onClick={() => updateMemoryDraft({ emojiPolicy: option.value })} className={memoryChoiceClass(memoryDraft.emojiPolicy === option.value)}>
                          {t[option.label] || option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{t.chatBlockedWords}</span>
                    <input value={(memoryDraft.blockedWords || []).join(', ')} onChange={(e) => updateMemoryDraft({ blockedWords: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className={memoryInputClass} placeholder={t.chatBlockedWordsPlaceholder} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => { void handleSaveMemory(); }} disabled={memorySaving || !isMemoryDirty} className="flex-1 rounded-xl bg-blue-500 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50 focus-soft">
                {memorySaving ? t.chatSaving : isMemoryDirty ? t.chatSaveMemory : t.chatSavedLocal}
              </button>
              <button onClick={() => { void handleResetMemory(); }} disabled={memorySaving} className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 focus-soft disabled:opacity-50">
                {t.chatResetMemory}
              </button>
            </div>
            <p className="mt-2 text-xs text-secondary">{t.chatMemoryDeviceOnly}</p>
          </div>
        </div>
      )}
    </div>
  );
}



