import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { isReusableDraftSession } from '@baristaclaw/shared';
import {
    AiSettings,
    ChatFolder,
    ChatMessage,
    ChatSession,
    Folder,
    Language,
} from '../types';
import {
    DEFAULT_LANGUAGE,
    getLanguageDirection,
    getTranslations,
    isSupportedLanguage,
    Translations,
} from '../constants';
import {
    createChatFolder,
    createCollectionFolder,
    getChatSession,
    getChatSessions,
    getSessionMessages,
    listChatFolders,
    listCollectionFolders,
    renameChatFolder,
    renameSession,
    moveSession,
    saveChatSession,
    saveMessage,
    softDeleteChatFolder,
    softDeleteSession,
    ensureSession,
    ensureMessage,
    restoreSession,
    deleteChatSession,
    softDeleteCollectionFolder,
    renameCollectionFolder,
} from '../services/storageService';
import { getUserBio, saveUserBio, getStoredUserName } from '../services/gemini';

// ─── Types ───
interface GlobalStateContextType {
    language: Language;
    setLanguage: React.Dispatch<React.SetStateAction<Language>>;
    t: Translations;
    aiSettings: AiSettings;
    setAiSettings: React.Dispatch<React.SetStateAction<AiSettings>>;

    // Chat sessions
    sessions: ChatSession[];
    activeSessionId: string | null;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    refreshChatState: () => Promise<void>;
    createNewChat: () => Promise<string>;
    selectSession: (id: string) => Promise<void>;
    removeSession: (id: string) => Promise<void>;
    restoreSessionAction: (id: string) => Promise<void>;
    renameSessionAction: (id: string, title: string) => Promise<void>;
    moveSessionAction: (id: string, folderId?: string) => Promise<void>;
    clearChat: () => void;

    // Chat folders
    chatFolders: ChatFolder[];
    addChatFolder: (name: string) => Promise<ChatFolder>;
    editChatFolder: (id: string, name: string) => Promise<void>;
    removeChatFolder: (id: string) => Promise<void>;

    // Collection folders
    folders: Folder[];
    refreshFolders: () => Promise<void>;
    addFolder: (name: string) => Promise<Folder>;
    removeFolder: (id: string) => Promise<void>;
    editFolder: (id: string, name: string) => Promise<void>;

    // User info
    userName: string;
    userBio: string;
    setUserBio: (bio: string) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

const ACTIVE_SESSION_KEY = 'BARISTA_ACTIVE_SESSION_ID';
const AI_SETTINGS_KEY = 'BARISTA_AI_SETTINGS';
const LANGUAGE_KEY = 'BARISTA_LANGUAGE';

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
function safeGetLocalStorageItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSetLocalStorageItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch { }
}

function safeRemoveLocalStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch { }
}

function makeWelcomeMessage(text: string, sessionId: string): ChatMessage {
    return {
        id: genId('msg'),
        sessionId,
        role: 'model',
        text,
        timestamp: Date.now(),
        status: 'sent',
    };
}

// ─── Default Settings ───
function loadAiSettings(): AiSettings {
    try {
        const raw = safeGetLocalStorageItem(AI_SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as AiSettings;
            return {
                ...parsed,
                language: isSupportedLanguage(parsed?.language) ? parsed.language : DEFAULT_LANGUAGE,
            };
        }
    } catch { }
    return {
        name: 'BaristaClaw',
        tone: 'Professional',
        language: DEFAULT_LANGUAGE,
        chatEngine: 'default',
    };
}

function loadLanguage(): Language {
    const stored = safeGetLocalStorageItem(LANGUAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;
    try {
        const rawSettings = safeGetLocalStorageItem(AI_SETTINGS_KEY);
        if (rawSettings) {
            const parsed = JSON.parse(rawSettings) as AiSettings;
            if (isSupportedLanguage(parsed?.language)) return parsed.language;
        }
    } catch { }
    return DEFAULT_LANGUAGE;
}

// ─── Provider ───
export function GlobalProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(loadLanguage);
    const [aiSettings, setAiSettings] = useState<AiSettings>(loadAiSettings);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [chatFolders, setChatFolders] = useState<ChatFolder[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(
        safeGetLocalStorageItem(ACTIVE_SESSION_KEY)
    );
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [userBio, setUserBioState] = useState(getUserBio());
    const bootstrapped = useRef(false);

    const t = useMemo(() => getTranslations(language), [language]);
    const userName = useMemo(() => getStoredUserName() || aiSettings.name || 'BaristaClaw', [aiSettings.name]);

    // Persist settings
    useEffect(() => {
        safeSetLocalStorageItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
    }, [aiSettings]);

    useEffect(() => {
        safeSetLocalStorageItem(LANGUAGE_KEY, language);
    }, [language]);

    useEffect(() => {
        if (aiSettings.language === language) return;
        setAiSettings((prev) => ({ ...prev, language }));
    }, [aiSettings.language, language]);

    useEffect(() => {
        const root = document.documentElement;
        const direction = getLanguageDirection(language);
        root.lang = language;
        root.dir = direction;

        // Keep global direction/language consistent for body-level overlays and portals.
        if (document.body) {
            document.body.lang = language;
            document.body.dir = direction;
        }
    }, [language]);

    // ─── Chat State ───
    const refreshChatState = async () => {
        const [allSessions, allFolders] = await Promise.all([getChatSessions(), listChatFolders()]);
        setSessions(allSessions);
        setChatFolders(allFolders);
    };

    const loadSessionIntoState = async (sessionId: string): Promise<boolean> => {
        const session = await getChatSession(sessionId);
        if (!session || session.deletedAt) return false;
        const msgs = await getSessionMessages(sessionId);
        setMessages(msgs);
        setActiveSessionId(sessionId);
        safeSetLocalStorageItem(ACTIVE_SESSION_KEY, sessionId);
        return true;
    };

    const createNewChat = async (): Promise<string> => {
        if (activeSessionId) {
            const currentSession = await getChatSession(activeSessionId);
            if (isReusableDraftSession(currentSession)) {
                const currentMessages = await getSessionMessages(activeSessionId);
                setMessages(currentMessages);
                setActiveSessionId(activeSessionId);
                safeSetLocalStorageItem(ACTIVE_SESSION_KEY, activeSessionId);
                return activeSessionId;
            }
        }

        const reusable = sessions.find((session) => isReusableDraftSession(session));
        if (reusable) {
            const nextMessages = await getSessionMessages(reusable.id);
            setMessages(nextMessages);
            setActiveSessionId(reusable.id);
            safeSetLocalStorageItem(ACTIVE_SESSION_KEY, reusable.id);
            return reusable.id;
        }

        const sessionId = genId('ses');
        const welcomeText = t.chatWelcome;

        const welcomeMsg = makeWelcomeMessage(welcomeText, sessionId);
        const session = ensureSession({
            id: sessionId,
            title: t.newChat,
            preview: welcomeText.slice(0, 100),
            messageCount: 1,
            hasUserMessage: false,
        });

        await saveChatSession(session);
        await saveMessage(welcomeMsg);

        setMessages([welcomeMsg]);
        setActiveSessionId(sessionId);
        safeSetLocalStorageItem(ACTIVE_SESSION_KEY, sessionId);
        await refreshChatState();
        return sessionId;
    };

    const clearChat = () => {
        setMessages([]);
        setActiveSessionId(null);
        safeRemoveLocalStorageItem(ACTIVE_SESSION_KEY);
    };

    const selectSession = async (id: string) => {
        const ok = await loadSessionIntoState(id);
        if (!ok) {
            await createNewChat();
        }
    };

    const removeSession = async (id: string) => {
        await softDeleteSession(id);
        if (activeSessionId === id) {
            await createNewChat();
        }
        await refreshChatState();
    };

    const restoreSessionAction = async (id: string) => {
        await restoreSession(id);
        await refreshChatState();
    };

    const renameSessionAction = async (id: string, title: string) => {
        await renameSession(id, title);
        await refreshChatState();
    };

    const moveSessionAction = async (id: string, folderId?: string) => {
        await moveSession(id, folderId);
        await refreshChatState();
    };

    // ─── Chat Folders ───
    const addChatFolder = async (name: string): Promise<ChatFolder> => {
        const folder = await createChatFolder(name);
        await refreshChatState();
        return folder;
    };

    const editChatFolder = async (id: string, name: string) => {
        await renameChatFolder(id, name);
        await refreshChatState();
    };

    const removeChatFolder = async (id: string) => {
        await softDeleteChatFolder(id);
        await refreshChatState();
    };

    // ─── Collection Folders ───
    const refreshFolders = async () => {
        const allFolders = await listCollectionFolders();
        setFolders(allFolders);
    };

    const addFolder = async (name: string): Promise<Folder> => {
        const folder = await createCollectionFolder(name);
        await refreshFolders();
        return folder;
    };

    const removeFolder = async (id: string) => {
        await softDeleteCollectionFolder(id);
        await refreshFolders();
    };

    const editFolder = async (id: string, name: string) => {
        await renameCollectionFolder(id, name);
        await refreshFolders();
    };

    // ─── User Bio ───
    const handleSetUserBio = (bio: string) => {
        saveUserBio(bio);
        setUserBioState(bio);
    };

    // ─── Bootstrap ───
    useEffect(() => {
        if (bootstrapped.current) return;
        bootstrapped.current = true;

        const bootstrap = async () => {
            await refreshChatState();
            await refreshFolders();

            const storedId = safeGetLocalStorageItem(ACTIVE_SESSION_KEY);
            if (storedId) {
                const ok = await loadSessionIntoState(storedId);
                if (!ok) {
                    await createNewChat();
                }
            } else {
                await createNewChat();
            }
        };

        bootstrap().catch(console.error);
    }, [t]);

    const value: GlobalStateContextType = {
        language,
        setLanguage,
        t,
        aiSettings,
        setAiSettings,
        sessions,
        activeSessionId,
        messages,
        setMessages,
        refreshChatState,
        createNewChat,
        selectSession,
        removeSession,
        restoreSessionAction,
        renameSessionAction,
        moveSessionAction,
        clearChat,
        chatFolders,
        addChatFolder,
        editChatFolder,
        removeChatFolder,
        folders,
        refreshFolders,
        addFolder,
        removeFolder,
        editFolder,
        userName,
        userBio,
        setUserBio: handleSetUserBio,
    };

    return (
        <GlobalStateContext.Provider value={value}>
            {children}
        </GlobalStateContext.Provider>
    );
}

export function useGlobalState() {
    const context = useContext(GlobalStateContext);
    if (!context) {
        throw new Error('useGlobalState must be used within a GlobalProvider');
    }
    return context;
}






