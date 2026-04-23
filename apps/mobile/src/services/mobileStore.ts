import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildConversationSummary,
  genId,
  hasMeaningfulUserMessage,
  normalizeSearchValue,
  type ChatFolderRecord,
  type ChatMessageRecord,
  type ChatSessionRecord,
  type CollectionFolderRecord,
  type CollectionItemRecord,
  type ParityTodoItem,
} from '@baristachaw/shared';
import type { MobileQuickSavePayload, MobileStoreState } from '../types';

const STORE_KEY = 'BARISTACHAW_MOBILE_STATE_V2';
const LEGACY_COLLECTION_STORAGE_KEY = 'BARISTACHAW_MOBILE_COLLECTION_V1';

const now = () => Date.now();

const byUpdatedDesc = <T extends { updatedAt: number }>(a: T, b: T) => b.updatedAt - a.updatedAt;

const byTimestampAsc = <T extends { timestamp: number }>(a: T, b: T) => a.timestamp - b.timestamp;

function defaultStoreState(): MobileStoreState {
  return {
    schemaVersion: 2,
    chatSessions: [],
    chatMessages: [],
    chatFolders: [],
    collectionFolders: [],
    collectionItems: [],
    todos: [],
  };
}

function sanitizeStoreState(raw: Partial<MobileStoreState> | null | undefined): MobileStoreState {
  const base = defaultStoreState();
  if (!raw || raw.schemaVersion !== 2) return base;

  return {
    schemaVersion: 2,
    chatSessions: Array.isArray(raw.chatSessions) ? raw.chatSessions : [],
    chatMessages: Array.isArray(raw.chatMessages) ? raw.chatMessages : [],
    chatFolders: Array.isArray(raw.chatFolders) ? raw.chatFolders : [],
    collectionFolders: Array.isArray(raw.collectionFolders) ? raw.collectionFolders : [],
    collectionItems: Array.isArray(raw.collectionItems) ? raw.collectionItems : [],
    todos: Array.isArray(raw.todos) ? raw.todos : [],
  };
}

async function migrateLegacyCollection(state: MobileStoreState): Promise<MobileStoreState> {
  const legacyRaw = await AsyncStorage.getItem(LEGACY_COLLECTION_STORAGE_KEY);
  if (!legacyRaw) return state;

  try {
    const parsed = JSON.parse(legacyRaw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await AsyncStorage.removeItem(LEGACY_COLLECTION_STORAGE_KEY);
      return state;
    }

    const migratedItems: CollectionItemRecord[] = parsed
      .filter((item: any) => item && typeof item.id === 'string' && typeof item.content === 'string')
      .map((item: any) => ({
        id: item.id,
        type: 'ai_canvas',
        title: (item.title || 'Untitled').toString(),
        content: {
          markdown: String(item.content || ''),
          kind: 'note',
        },
        createdAt: Number(item.createdAt) || now(),
        updatedAt: Number(item.createdAt) || now(),
      }));

    const merged = {
      ...state,
      collectionItems: [...migratedItems, ...state.collectionItems],
    };

    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(merged));
    await AsyncStorage.removeItem(LEGACY_COLLECTION_STORAGE_KEY);
    return merged;
  } catch {
    return state;
  }
}

export async function readMobileStoreState(): Promise<MobileStoreState> {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (!raw) return migrateLegacyCollection(defaultStoreState());

  try {
    const parsed = JSON.parse(raw) as Partial<MobileStoreState>;
    const sanitized = sanitizeStoreState(parsed);
    return migrateLegacyCollection(sanitized);
  } catch {
    return migrateLegacyCollection(defaultStoreState());
  }
}

export async function saveMobileStoreState(next: MobileStoreState): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
}

async function mutateStore(mutator: (current: MobileStoreState) => MobileStoreState): Promise<MobileStoreState> {
  const current = await readMobileStoreState();
  const next = mutator(current);
  await saveMobileStoreState(next);
  return next;
}

function ensureChatSessionBase(patch?: Partial<ChatSessionRecord>): ChatSessionRecord {
  const ts = now();
  return {
    id: patch?.id || genId('ses'),
    title: patch?.title || 'New Chat',
    preview: patch?.preview || '',
    createdAt: patch?.createdAt || ts,
    updatedAt: patch?.updatedAt || ts,
    messageCount: Number(patch?.messageCount || 0),
    lastMessageAt: patch?.lastMessageAt || ts,
    folderId: patch?.folderId,
    summary: typeof patch?.summary === 'string' ? patch.summary : '',
    preferredResponseLanguage: patch?.preferredResponseLanguage,
    hasUserMessage: Boolean(patch?.hasUserMessage),
    deletedAt: patch?.deletedAt,
  };
}

function ensureChatFolder(name: string): ChatFolderRecord {
  const ts = now();
  return {
    id: genId('chfol'),
    name: name.trim(),
    createdAt: ts,
    updatedAt: ts,
  };
}

function ensureCollectionFolder(name: string): CollectionFolderRecord {
  const ts = now();
  return {
    id: genId('cfol'),
    name: name.trim(),
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function listChatSessions(): Promise<ChatSessionRecord[]> {
  const state = await readMobileStoreState();
  return state.chatSessions.filter((s) => !s.deletedAt).sort(byUpdatedDesc);
}

export async function createChatSession(title = 'New Chat'): Promise<ChatSessionRecord> {
  const reusable = (await listChatSessions()).find((session) => !session.hasUserMessage);
  if (reusable) {
    return reusable;
  }
  const session = ensureChatSessionBase({ title });
  await mutateStore((state) => ({
    ...state,
    chatSessions: [session, ...state.chatSessions],
  }));
  return session;
}

export async function saveChatSession(session: ChatSessionRecord): Promise<void> {
  await mutateStore((state) => {
    const existing = state.chatSessions.find((item) => item.id === session.id);
    const normalized = ensureChatSessionBase({
      ...session,
      createdAt: existing?.createdAt || session.createdAt,
      updatedAt: now(),
    });

    return {
      ...state,
      chatSessions: [normalized, ...state.chatSessions.filter((item) => item.id !== session.id)],
    };
  });
}

export async function renameChatSession(sessionId: string, title: string): Promise<void> {
  const nextTitle = title.trim();
  if (!nextTitle) return;
  await mutateStore((state) => ({
    ...state,
    chatSessions: state.chatSessions.map((item) =>
      item.id === sessionId
        ? { ...item, title: nextTitle, updatedAt: now() }
        : item,
    ),
  }));
}

export async function moveChatSession(sessionId: string, folderId?: string): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    chatSessions: state.chatSessions.map((item) =>
      item.id === sessionId
        ? { ...item, folderId, updatedAt: now() }
        : item,
    ),
  }));
}

export async function softDeleteChatSession(sessionId: string): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    chatSessions: state.chatSessions.map((item) =>
      item.id === sessionId
        ? { ...item, deletedAt: now(), updatedAt: now() }
        : item,
    ),
  }));
}

export async function listMessagesForSession(sessionId: string): Promise<ChatMessageRecord[]> {
  const state = await readMobileStoreState();
  return state.chatMessages
    .filter((message) => message.sessionId === sessionId && !message.deletedAt)
    .sort(byTimestampAsc);
}

export async function appendMessage(
  message: Omit<ChatMessageRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: number },
  options?: {
    preferredLanguage?: string;
  },
): Promise<ChatMessageRecord> {
  const entry: ChatMessageRecord = {
    ...message,
    id: message.id || genId('msg'),
    timestamp: message.timestamp || now(),
  };

  await mutateStore((state) => {
    const sessions = [...state.chatSessions];
    const sessionIdx = sessions.findIndex((session) => session.id === entry.sessionId);
    const existingSession = sessionIdx >= 0 ? sessions[sessionIdx] : null;
    const nextMessagesForSession = [...state.chatMessages, entry]
      .filter((message) => message.sessionId === entry.sessionId && !message.deletedAt)
      .sort(byTimestampAsc);
    const hasUserMessage = hasMeaningfulUserMessage(nextMessagesForSession);
    const session = ensureChatSessionBase({
      ...existingSession,
      id: entry.sessionId,
      title: existingSession?.title || (entry.role === 'user' ? entry.text.slice(0, 60) : 'New Chat'),
      preview: entry.text.slice(0, 100),
      messageCount: nextMessagesForSession.length,
      lastMessageAt: entry.timestamp,
      updatedAt: now(),
      summary: buildConversationSummary(nextMessagesForSession, {
        sessionTitle: existingSession?.title,
        preferredLanguage: options?.preferredLanguage || existingSession?.preferredResponseLanguage,
      }),
      preferredResponseLanguage: options?.preferredLanguage || existingSession?.preferredResponseLanguage,
      hasUserMessage,
    });

    if (sessionIdx >= 0) sessions.splice(sessionIdx, 1);

    return {
      ...state,
      chatMessages: [...state.chatMessages, entry],
      chatSessions: [session, ...sessions],
    };
  });

  return entry;
}

export async function listChatFolders(): Promise<ChatFolderRecord[]> {
  const state = await readMobileStoreState();
  return state.chatFolders.filter((item) => !item.deletedAt).sort(byUpdatedDesc);
}

export async function createChatFolder(name: string): Promise<ChatFolderRecord | null> {
  const normalizedName = name.trim();
  if (!normalizedName) return null;

  const folder = ensureChatFolder(normalizedName);
  await mutateStore((state) => ({ ...state, chatFolders: [folder, ...state.chatFolders] }));
  return folder;
}

export async function renameChatFolder(folderId: string, nextName: string): Promise<void> {
  const normalized = nextName.trim();
  if (!normalized) return;
  await mutateStore((state) => ({
    ...state,
    chatFolders: state.chatFolders.map((item) =>
      item.id === folderId
        ? { ...item, name: normalized, updatedAt: now() }
        : item,
    ),
  }));
}

export async function softDeleteChatFolder(folderId: string): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    chatFolders: state.chatFolders.map((item) =>
      item.id === folderId
        ? { ...item, deletedAt: now(), updatedAt: now() }
        : item,
    ),
    chatSessions: state.chatSessions.map((session) =>
      session.folderId === folderId
        ? { ...session, folderId: undefined, updatedAt: now() }
        : session,
    ),
  }));
}

export async function listCollectionFolders(): Promise<CollectionFolderRecord[]> {
  const state = await readMobileStoreState();
  return state.collectionFolders.filter((item) => !item.deletedAt).sort(byUpdatedDesc);
}

export async function createCollectionFolder(name: string): Promise<CollectionFolderRecord | null> {
  const normalizedName = name.trim();
  if (!normalizedName) return null;

  const folder = ensureCollectionFolder(normalizedName);
  await mutateStore((state) => ({ ...state, collectionFolders: [folder, ...state.collectionFolders] }));
  return folder;
}

export async function renameCollectionFolder(folderId: string, nextName: string): Promise<void> {
  const normalized = nextName.trim();
  if (!normalized) return;
  await mutateStore((state) => ({
    ...state,
    collectionFolders: state.collectionFolders.map((item) =>
      item.id === folderId
        ? { ...item, name: normalized, updatedAt: now() }
        : item,
    ),
  }));
}

export async function softDeleteCollectionFolder(folderId: string): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    collectionFolders: state.collectionFolders.map((item) =>
      item.id === folderId
        ? { ...item, deletedAt: now(), updatedAt: now() }
        : item,
    ),
    collectionItems: state.collectionItems.map((item) =>
      item.folderId === folderId
        ? { ...item, folderId: undefined, updatedAt: now() }
        : item,
    ),
  }));
}

export async function listCollectionItems(): Promise<CollectionItemRecord[]> {
  const state = await readMobileStoreState();
  return state.collectionItems
    .filter((item) => !item.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveCollectionItem(item: CollectionItemRecord): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    collectionItems: [
      { ...item, updatedAt: now() },
      ...state.collectionItems.filter((entry) => entry.id !== item.id),
    ],
  }));
}

export async function softDeleteCollectionItem(itemId: string): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    collectionItems: state.collectionItems.map((item) =>
      item.id === itemId
        ? { ...item, deletedAt: now(), updatedAt: now() }
        : item,
    ),
  }));
}

export async function moveCollectionItem(itemId: string, folderId?: string): Promise<void> {
  await mutateStore((state) => ({
    ...state,
    collectionItems: state.collectionItems.map((item) =>
      item.id === itemId
        ? { ...item, folderId, updatedAt: now() }
        : item,
    ),
  }));
}

export async function quickSaveInsight(payload: MobileQuickSavePayload): Promise<CollectionItemRecord> {
  const entry: CollectionItemRecord = {
    id: genId('col'),
    type: 'ai_canvas',
    title: payload.title.trim() || 'Untitled',
    content: {
      markdown: payload.markdown,
      kind: 'note',
      sources: payload.sources,
      sessionId: payload.sessionId,
      messageId: payload.messageId,
    },
    createdAt: now(),
    updatedAt: now(),
  };

  await saveCollectionItem(entry);
  return entry;
}

export async function listTodos(): Promise<ParityTodoItem[]> {
  const state = await readMobileStoreState();
  return [...state.todos].sort(byUpdatedDesc);
}

export async function saveTodos(items: ParityTodoItem[]): Promise<void> {
  await mutateStore((state) => ({ ...state, todos: items }));
}

export async function searchCollectionItems(query: string): Promise<CollectionItemRecord[]> {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return listCollectionItems();
  const all = await listCollectionItems();

  return all.filter((item) => {
    const inTitle = normalizeSearchValue(item.title || '').includes(normalizedQuery);
    if (inTitle) return true;

    if (item.type === 'recipe') {
      const source = `${item.content?.name || ''} ${item.content?.description || ''}`;
      return normalizeSearchValue(source).includes(normalizedQuery);
    }

    return normalizeSearchValue(item.content?.markdown || '').includes(normalizedQuery);
  });
}
