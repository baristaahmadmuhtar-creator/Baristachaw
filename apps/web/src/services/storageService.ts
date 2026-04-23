import {
    AgentBrainState,
    AgentCalibration,
    AgentIntentMode,
    Recipe,
    ChatAttachment,
    ChatFolder,
    ChatMessage,
    ChatSession,
    CollectionFolder,
    CollectionItem,
    CollectionUpdateAction,
    CollectionUpdateEntity,
    CollectionUpdateEventDetail,
    PersonalityEvolutionState,
    UserSkillProfile,
} from '../types';
import {
    normalizeAgentProfileMemory,
    resolveAgentProfileNamespace,
    type AgentProfileMemory,
} from '@baristachaw/shared';
import { DB_STORES, idbClear, idbDelete, idbGet, idbGetAll, idbGetAllByIndex, idbPut, idbPutMany } from './db';

// ─── Helpers ───
const now = () => Date.now();
const genId = (prefix: string) => `${prefix}_${now()}_${Math.random().toString(36).slice(2, 8)}`;

function byUpdatedDesc<T extends { updatedAt: number }>(a: T, b: T) {
    return b.updatedAt - a.updatedAt;
}

const normalizeText = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const MAX_PERSIST_TEXT_ATTACHMENT_CHARS = 20_000;
const MAX_PERSIST_BASE64_CHARS = 2_800_000; // ~2.1MB binary
const MAX_PERSIST_DATA_URL_CHARS = 3_200_000;

function cleanCollectionText(value: unknown, fallback = '', maxLen = 240) {
    const raw = normalizeText(value);
    return raw ? raw.slice(0, maxLen) : fallback;
}
function safeLocalStorageSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Swallow storage errors (private mode/quota/security policy) to keep app flow crash-free.
    }
}

function safeLocalStorageRemoveItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // Swallow storage errors (private mode/quota/security policy) to keep app flow crash-free.
    }
}

function sanitizeMessageAttachments(attachments?: ChatAttachment[]): ChatAttachment[] | undefined {
    if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
    return attachments.slice(0, 3).map((att) => ({
        ...att,
        objectUrl: undefined, // runtime only
        extractedText: typeof att.extractedText === 'string'
            ? att.extractedText.slice(0, MAX_PERSIST_TEXT_ATTACHMENT_CHARS)
            : undefined,
        inlineBase64: typeof att.inlineBase64 === 'string' && att.inlineBase64.length <= MAX_PERSIST_BASE64_CHARS
            ? att.inlineBase64
            : undefined,
        previewDataUrl: typeof att.previewDataUrl === 'string' && att.previewDataUrl.length <= MAX_PERSIST_DATA_URL_CHARS
            ? att.previewDataUrl
            : undefined,
    }));
}

const DEFAULT_ALLOWED_EMOJIS = ['☕', '🙂', '🔥', '✅', '😄', '🤝', '✨'];
const DEFAULT_BLOCKED_WORDS = ['bro', 'siap', 'gua', 'gue', 'lu', 'lo', 'mantap'];

// ─── Collection Event System ───
const COLLECTION_UPDATED_EVENT = 'baristachaw:collection-updated';
const AGENT_PROFILE_UPDATED_EVENT = 'baristachaw:agent-profile-updated';

export function emitCollectionUpdated(
    entity: CollectionUpdateEntity,
    action: CollectionUpdateAction,
    detail?: Partial<CollectionUpdateEventDetail>
) {
    const payload: CollectionUpdateEventDetail = {
        entity,
        action,
        timestamp: now(),
        ...detail,
    };
    window.dispatchEvent(new CustomEvent(COLLECTION_UPDATED_EVENT, { detail: payload }));
}

export function subscribeCollectionUpdates(
    handler: (detail: CollectionUpdateEventDetail) => void
): () => void {
    const listener = (event: Event) => {
        const detail = (event as CustomEvent<CollectionUpdateEventDetail>).detail;
        if (detail) handler(detail);
    };
    window.addEventListener(COLLECTION_UPDATED_EVENT, listener);
    return () => window.removeEventListener(COLLECTION_UPDATED_EVENT, listener);
}

// ─── Session Helpers ───
export function buildPreview(messages: ChatMessage[]) {
    const last = messages.filter((m) => m.role === 'model').pop();
    return last ? last.text.slice(0, 100) : '';
}

export function buildSessionTitle(messages: ChatMessage[]) {
    const first = messages.find((m) => m.role === 'user');
    return first ? first.text.slice(0, 60) : 'New Chat';
}

// ─── Normalization ───
export function normalizeAgentCalibration(value?: Partial<AgentCalibration> | null): AgentCalibration {
    const v = value || {};
    return {
        schemaVersion: 2,
        userName: v.userName || '',
        callName: v.callName || '',
        alternateName: v.alternateName || '',
        aiName: v.aiName || 'Baristachaw',
        preferredLanguage: v.preferredLanguage || 'en',
        timeZone: v.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        responseStyle: v.responseStyle || '',
        allowedEmojis: Array.isArray(v.allowedEmojis) ? v.allowedEmojis : DEFAULT_ALLOWED_EMOJIS,
        blockedWords: Array.isArray(v.blockedWords) ? v.blockedWords : DEFAULT_BLOCKED_WORDS,
        styleNotes: v.styleNotes || '',
        updatedAt: v.updatedAt || now(),
    };
}

export function normalizeUserSkillProfile(value: any): UserSkillProfile {
    const v = value || {};
    const clamp01 = (n: unknown) => {
        const num = Number(n);
        return isNaN(num) ? 0 : Math.max(0, Math.min(1, num));
    };
    return {
        extraction: clamp01(v.extraction),
        espressoDialIn: clamp01(v.espressoDialIn),
        manualBrewControl: clamp01(v.manualBrewControl),
        sensory: clamp01(v.sensory),
        milkTexturing: clamp01(v.milkTexturing),
        cafeWorkflow: clamp01(v.cafeWorkflow),
        confidence: clamp01(v.confidence),
        evidenceCount: Math.max(0, Number(v.evidenceCount) || 0),
        detectedLevel: ['beginner', 'intermediate', 'advanced'].includes(v.detectedLevel) ? v.detectedLevel : 'beginner',
    };
}

export function defaultAgentBrainState(): AgentBrainState {
    return {
        version: 2,
        profile: normalizeUserSkillProfile(null),
        evolution: normalizePersonalityEvolution(null),
        updatedAt: now(),
    };
}

function normalizePersonalityEvolution(value: any): PersonalityEvolutionState {
    const v = value || {};
    return {
        interactionCount: Math.max(0, Number(v.interactionCount) || 0),
        preferredCoachingStyle: ['direct', 'mentor', 'technical'].includes(v.preferredCoachingStyle)
            ? v.preferredCoachingStyle
            : 'mentor',
        detailTolerance: ['low', 'medium', 'high'].includes(v.detailTolerance) ? v.detailTolerance : 'medium',
        frequentlyUsedBrewMethod: v.frequentlyUsedBrewMethod || undefined,
        commandUsage: v.commandUsage || {},
        lastIntentMode: v.lastIntentMode || undefined,
        adaptiveDepthBias: Number(v.adaptiveDepthBias) || 0,
        updatedAt: v.updatedAt || now(),
    };
}

// ─── Ensure Helpers ───
export function ensureCollectionFolder(folder: Partial<CollectionFolder> & { name: string }): CollectionFolder {
    return {
        id: folder.id || genId('cfol'),
        name: folder.name.trim(),
        createdAt: folder.createdAt || now(),
        updatedAt: folder.updatedAt || now(),
    };
}

export function ensureChatFolder(folder: Partial<ChatFolder> & { name: string }): ChatFolder {
    return {
        id: folder.id || genId('chfol'),
        name: folder.name.trim(),
        createdAt: folder.createdAt || now(),
        updatedAt: folder.updatedAt || now(),
    };
}

export function ensureSession(session: Partial<ChatSession> & { id?: string; title: string }): ChatSession {
    const ts = now();
    return {
        id: session.id || genId('ses'),
        title: session.title,
        preview: session.preview || '',
        createdAt: session.createdAt || ts,
        updatedAt: session.updatedAt || ts,
        messageCount: session.messageCount || 0,
        lastMessageAt: session.lastMessageAt || ts,
        folderId: session.folderId,
        summary: typeof session.summary === 'string' ? session.summary : '',
        preferredResponseLanguage: session.preferredResponseLanguage,
        hasUserMessage: Boolean(session.hasUserMessage),
    };
}

export function emitAgentProfileUpdated(namespace: string, profile: AgentProfileMemory) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(AGENT_PROFILE_UPDATED_EVENT, {
        detail: {
            namespace,
            profile,
        },
    }));
}

export function subscribeAgentProfileUpdates(
    handler: (detail: { namespace: string; profile: AgentProfileMemory }) => void,
): () => void {
    const listener = (event: Event) => {
        const detail = (event as CustomEvent<{ namespace: string; profile: AgentProfileMemory }>).detail;
        if (detail?.namespace && detail.profile) handler(detail);
    };
    window.addEventListener(AGENT_PROFILE_UPDATED_EVENT, listener);
    return () => window.removeEventListener(AGENT_PROFILE_UPDATED_EVENT, listener);
}

export function ensureMessage(
    message: Partial<ChatMessage> & { role: 'user' | 'model'; text: string; sessionId: string }
): ChatMessage {
    const attachments = sanitizeMessageAttachments(message.attachments);
    return {
        id: message.id || genId('msg'),
        sessionId: message.sessionId,
        role: message.role,
        text: message.text,
        image: message.image,
        audioUrl: message.audioUrl,
        attachments,
        transcriptText: typeof message.transcriptText === 'string'
            ? message.transcriptText.slice(0, MAX_PERSIST_TEXT_ATTACHMENT_CHARS)
            : undefined,
        attachmentPrompt: typeof message.attachmentPrompt === 'string'
            ? message.attachmentPrompt.slice(0, 4_000)
            : undefined,
        provider: message.provider,
        sources: message.sources,
        sourceDetails: message.sourceDetails,
        deepMeta: message.deepMeta,
        timestamp: message.timestamp || now(),
        status: message.status || 'sent',
        attachmentMeta: message.attachmentMeta,
    };
}

// ─── Chat Sessions CRUD ───
export async function getChatSessions(): Promise<ChatSession[]> {
    const all = await idbGetAll<ChatSession>(DB_STORES.CHAT_SESSIONS);
    return all.filter((s) => !s.deletedAt).sort(byUpdatedDesc);
}

export async function getChatSession(id: string): Promise<ChatSession | undefined> {
    return idbGet<ChatSession>(DB_STORES.CHAT_SESSIONS, id);
}

export async function saveChatSession(session: ChatSession): Promise<void> {
    await idbPut(DB_STORES.CHAT_SESSIONS, session);
}

export async function softDeleteSession(id: string): Promise<void> {
    const session = await getChatSession(id);
    if (session) {
        session.deletedAt = now();
        session.updatedAt = now();
        await saveChatSession(session);
    }
}

export async function restoreSession(id: string): Promise<void> {
    const session = await getChatSession(id);
    if (session) {
        delete session.deletedAt;
        session.updatedAt = now();
        await saveChatSession(session);
    }
}

export async function deleteChatSession(id: string): Promise<void> {
    await idbDelete(DB_STORES.CHAT_SESSIONS, id);
    // Also delete associated messages
    const messages = await getSessionMessages(id);
    for (const msg of messages) {
        await idbDelete(DB_STORES.CHAT_MESSAGES, msg.id);
    }
}

export async function renameSession(id: string, title: string): Promise<void> {
    const session = await getChatSession(id);
    if (session) {
        session.title = title;
        session.updatedAt = now();
        await saveChatSession(session);
    }
}

export async function moveSession(id: string, folderId?: string): Promise<void> {
    const session = await getChatSession(id);
    if (session) {
        session.folderId = folderId;
        session.updatedAt = now();
        await saveChatSession(session);
    }
}

// ─── Chat Messages CRUD ───
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const all = await idbGetAllByIndex<ChatMessage>(DB_STORES.CHAT_MESSAGES, 'sessionId', sessionId);
    return all.filter((m) => !m.deletedAt).sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveMessage(message: ChatMessage): Promise<void> {
    await idbPut(DB_STORES.CHAT_MESSAGES, message);
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
    await idbPutMany(DB_STORES.CHAT_MESSAGES, messages);
}

export async function softDeleteMessage(id: string): Promise<void> {
    const msg = await idbGet<ChatMessage>(DB_STORES.CHAT_MESSAGES, id);
    if (msg) {
        msg.deletedAt = now();
        await idbPut(DB_STORES.CHAT_MESSAGES, msg);
    }
}

// ─── Chat Folders CRUD ───
export async function listChatFolders(): Promise<ChatFolder[]> {
    const all = await idbGetAll<ChatFolder>(DB_STORES.CHAT_FOLDERS);
    return all.filter((f) => !f.deletedAt).sort(byUpdatedDesc);
}

export async function createChatFolder(name: string): Promise<ChatFolder> {
    const folder = ensureChatFolder({ name });
    await idbPut(DB_STORES.CHAT_FOLDERS, folder);
    return folder;
}

export async function renameChatFolder(id: string, name: string): Promise<void> {
    const folder = await idbGet<ChatFolder>(DB_STORES.CHAT_FOLDERS, id);
    if (folder) {
        folder.name = name.trim();
        folder.updatedAt = now();
        await idbPut(DB_STORES.CHAT_FOLDERS, folder);
    }
}

export async function softDeleteChatFolder(id: string): Promise<void> {
    const folder = await idbGet<ChatFolder>(DB_STORES.CHAT_FOLDERS, id);
    if (folder) {
        folder.deletedAt = now();
        folder.updatedAt = now();
        await idbPut(DB_STORES.CHAT_FOLDERS, folder);
    }
}

// ─── Collection Items CRUD ───
export async function listCollectionItems(): Promise<CollectionItem[]> {
    const all = await idbGetAll<CollectionItem>(DB_STORES.COLLECTION_ITEMS);
    return all.filter((i) => !i.deletedAt).sort(byUpdatedDesc);
}

export async function saveCollectionItem(item: CollectionItem): Promise<void> {
    await idbPut(DB_STORES.COLLECTION_ITEMS, item);
    emitCollectionUpdated('item', item.deletedAt ? 'delete' : 'create', { id: item.id, itemType: item.type });
}

export async function softDeleteCollectionItem(id: string): Promise<void> {
    const item = await idbGet<CollectionItem>(DB_STORES.COLLECTION_ITEMS, id);
    if (item) {
        item.deletedAt = now();
        item.updatedAt = now();
        await idbPut(DB_STORES.COLLECTION_ITEMS, item);
        emitCollectionUpdated('item', 'delete', { id: item.id, itemType: item.type });
    }
}

export async function restoreCollectionItem(id: string): Promise<void> {
    const item = await idbGet<CollectionItem>(DB_STORES.COLLECTION_ITEMS, id);
    if (item) {
        delete item.deletedAt;
        item.updatedAt = now();
        await idbPut(DB_STORES.COLLECTION_ITEMS, item);
        emitCollectionUpdated('item', 'restore', { id: item.id, itemType: item.type });
    }
}

export function createNoteCollectionItem(params: {
    id?: string;
    title: string;
    markdown: string;
    folderId?: string;
}): CollectionItem {
    const ts = now();
    return {
        id: params.id || genId('note'),
        type: 'ai_canvas',
        folderId: params.folderId,
        title: cleanCollectionText(params.title, 'Untitled Note', 120),
        content: {
            markdown: cleanCollectionText(params.markdown, '', 100_000),
            kind: 'note',
        },
        createdAt: ts,
        updatedAt: ts,
    };
}

export function createRecipeCollectionItem(params: {
    id?: string;
    title: string;
    recipe: Recipe;
    folderId?: string;
}): CollectionItem {
    const ts = now();
    return {
        id: params.id || genId('recipe'),
        type: 'recipe',
        folderId: params.folderId,
        title: cleanCollectionText(params.title, 'Untitled Recipe', 120),
        content: {
            ...params.recipe,
            name: cleanCollectionText(params.recipe.name, params.title, 120),
            description: cleanCollectionText(params.recipe.description, '', 1_500),
            ingredients: Array.isArray(params.recipe.ingredients)
                ? params.recipe.ingredients.slice(0, 12).map((ingredient) => ({
                    name: cleanCollectionText(ingredient?.name, '', 80),
                    amount: cleanCollectionText(ingredient?.amount, '', 80),
                }))
                : [],
            steps: Array.isArray(params.recipe.steps)
                ? params.recipe.steps.slice(0, 24).map((step) => cleanCollectionText(step, '', 500))
                : [],
        },
        createdAt: ts,
        updatedAt: ts,
    };
}

export async function updateCollectionItem(
    id: string,
    patch: {
        title?: string;
        folderId?: string;
        content?: CollectionItem['content'];
    }
): Promise<CollectionItem | undefined> {
    const item = await idbGet<CollectionItem>(DB_STORES.COLLECTION_ITEMS, id);
    if (!item || item.deletedAt) return undefined;

    const next = {
        ...item,
        title: patch.title !== undefined ? cleanCollectionText(patch.title, item.title, 120) : item.title,
        folderId: patch.folderId !== undefined ? patch.folderId : item.folderId,
        content: patch.content !== undefined ? patch.content : item.content,
        updatedAt: now(),
    } as CollectionItem;
    await idbPut(DB_STORES.COLLECTION_ITEMS, next);
    emitCollectionUpdated('item', 'update', { id: next.id, folderId: next.folderId, itemType: next.type });
    return next;
}

export async function moveCollectionItemToFolder(id: string, folderId?: string): Promise<void> {
    await updateCollectionItem(id, { folderId });
}

// ─── Collection Folders CRUD ───
export async function listCollectionFolders(): Promise<CollectionFolder[]> {
    const all = await idbGetAll<CollectionFolder>(DB_STORES.COLLECTION_FOLDERS);
    return all.filter((f) => !f.deletedAt).sort(byUpdatedDesc);
}

export async function createCollectionFolder(name: string): Promise<CollectionFolder> {
    const folder = ensureCollectionFolder({ name });
    await idbPut(DB_STORES.COLLECTION_FOLDERS, folder);
    emitCollectionUpdated('folder', 'create', { id: folder.id });
    return folder;
}

export async function renameCollectionFolder(id: string, name: string): Promise<void> {
    const folder = await idbGet<CollectionFolder>(DB_STORES.COLLECTION_FOLDERS, id);
    if (folder) {
        folder.name = name.trim();
        folder.updatedAt = now();
        await idbPut(DB_STORES.COLLECTION_FOLDERS, folder);
        emitCollectionUpdated('folder', 'update', { id: folder.id });
    }
}

export async function softDeleteCollectionFolder(id: string): Promise<void> {
    const folder = await idbGet<CollectionFolder>(DB_STORES.COLLECTION_FOLDERS, id);
    if (folder) {
        folder.deletedAt = now();
        folder.updatedAt = now();
        await idbPut(DB_STORES.COLLECTION_FOLDERS, folder);
        emitCollectionUpdated('folder', 'delete', { id: folder.id });
    }
}

// ─── Saved Recipes (Legacy compat) ───
const SAVED_RECIPES_KEY = 'BARISTA_SAVED_RECIPES';

export function getSavedRecipes(): any[] {
    try {
        return JSON.parse(localStorage.getItem(SAVED_RECIPES_KEY) || '[]');
    } catch {
        return [];
    }
}

export function saveRecipe(recipe: any): void {
    const recipes = getSavedRecipes();
    recipes.unshift({ ...recipe, id: genId('rec'), createdAt: now() });
    safeLocalStorageSetItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
    emitCollectionUpdated('recipe', 'create');
}

export function deleteRecipe(id: string): void {
    const recipes = getSavedRecipes().filter((r: any) => r.id !== id);
    safeLocalStorageSetItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
    emitCollectionUpdated('recipe', 'delete', { id });
}

// ─── Agent Calibration Memory ───
const CALIBRATION_KEY = 'BARISTA_AGENT_CALIBRATION';
const AGENT_PROFILE_MEMORY_KEY_PREFIX = 'BARISTACHAW_AGENT_PROFILE_MEMORY::';

function getAgentProfileStorageKey(namespace: string) {
    return `${AGENT_PROFILE_MEMORY_KEY_PREFIX}${namespace}`;
}

function migrateCalibrationToAgentProfile(calibration?: Partial<AgentCalibration> | null): AgentProfileMemory {
    const normalizedCalibration = normalizeAgentCalibration(calibration);
    return normalizeAgentProfileMemory({
        preferredLanguage: normalizedCalibration.preferredLanguage,
        userDisplayName: normalizedCalibration.callName || normalizedCalibration.userName || normalizedCalibration.alternateName,
        assistantName: normalizedCalibration.aiName,
        blockedWords: normalizedCalibration.blockedWords,
        styleNotes: normalizedCalibration.styleNotes,
        updatedAt: normalizedCalibration.updatedAt || now(),
    });
}

function hasAgentProfileValue(profile: Partial<AgentProfileMemory> | null | undefined): boolean {
    if (!profile) return false;
    return Boolean(
        profile.preferredLanguage ||
        profile.userDisplayName ||
        profile.assistantName ||
        profile.responseStyle ||
        profile.tonePreference ||
        profile.detailPreference ||
        profile.workspaceRole ||
        profile.workflowFocus ||
        profile.skillFocus?.length ||
        profile.emojiPolicy ||
        profile.blockedWords?.length ||
        profile.styleNotes,
    );
}

export async function getAgentCalibration(): Promise<AgentCalibration> {
    try {
        const raw = localStorage.getItem(CALIBRATION_KEY);
        return normalizeAgentCalibration(raw ? JSON.parse(raw) : null);
    } catch {
        return normalizeAgentCalibration(null);
    }
}

export async function saveAgentCalibration(patch: Partial<AgentCalibration>): Promise<AgentCalibration> {
    const current = await getAgentCalibration();
    const merged = { ...current, ...patch, updatedAt: now() };
    safeLocalStorageSetItem(CALIBRATION_KEY, JSON.stringify(merged));
    return merged;
}

export async function getAgentProfileMemory(namespace = resolveAgentProfileNamespace()): Promise<AgentProfileMemory> {
    const storageKey = getAgentProfileStorageKey(namespace);
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            return normalizeAgentProfileMemory(JSON.parse(raw));
        }
    } catch {
        // Fall through to migration/default profile.
    }

    if (namespace === 'guest') {
        try {
            const legacyRaw = localStorage.getItem(CALIBRATION_KEY);
            const migrated = legacyRaw
                ? migrateCalibrationToAgentProfile(JSON.parse(legacyRaw))
                : normalizeAgentProfileMemory({
                    preferredLanguage: 'en',
                    assistantName: 'Baristachaw',
                });
            localStorage.setItem(storageKey, JSON.stringify(migrated));
            emitAgentProfileUpdated(namespace, migrated);
            return migrated;
        } catch {
            // Ignore broken legacy data.
        }
    }

    return normalizeAgentProfileMemory({
        preferredLanguage: 'en',
        assistantName: 'Baristachaw',
    });
}

export async function saveAgentProfileMemory(
    namespace = resolveAgentProfileNamespace(),
    patch: Partial<AgentProfileMemory>,
): Promise<AgentProfileMemory> {
    const current = await getAgentProfileMemory(namespace);
    const next = normalizeAgentProfileMemory({
        ...current,
        ...patch,
        updatedAt: now(),
    });
    safeLocalStorageSetItem(getAgentProfileStorageKey(namespace), JSON.stringify(next));
    emitAgentProfileUpdated(namespace, next);
    return next;
}

export async function resetAgentProfileMemory(
    namespace = resolveAgentProfileNamespace(),
    seed?: Partial<AgentProfileMemory>,
): Promise<AgentProfileMemory> {
    const next = normalizeAgentProfileMemory({
        preferredLanguage: 'en',
        assistantName: 'Baristachaw',
        ...(seed || {}),
        updatedAt: now(),
    });
    if (!hasAgentProfileValue(seed)) {
        safeLocalStorageRemoveItem(getAgentProfileStorageKey(namespace));
        emitAgentProfileUpdated(namespace, next);
        return next;
    }
    safeLocalStorageSetItem(getAgentProfileStorageKey(namespace), JSON.stringify(next));
    emitAgentProfileUpdated(namespace, next);
    return next;
}

// ─── Agent Brain State ───
const BRAIN_STATE_KEY = 'BARISTA_AGENT_BRAIN_STATE';

export async function getAgentBrainState(): Promise<AgentBrainState> {
    try {
        const raw = localStorage.getItem(BRAIN_STATE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                version: 2,
                profile: normalizeUserSkillProfile(parsed.profile),
                evolution: normalizePersonalityEvolution(parsed.evolution),
                updatedAt: parsed.updatedAt || now(),
            };
        }
    } catch { }
    return defaultAgentBrainState();
}

export async function saveAgentBrainState(state: AgentBrainState): Promise<void> {
    safeLocalStorageSetItem(BRAIN_STATE_KEY, JSON.stringify(state));
}

// ─── Clear All Data ───
export async function clearAllAppData(): Promise<void> {
    const keys = Object.values(DB_STORES);
    for (const storeName of keys) {
        try {
            await idbClear(storeName);
        } catch { }
    }
    safeLocalStorageRemoveItem(SAVED_RECIPES_KEY);
    safeLocalStorageRemoveItem(CALIBRATION_KEY);
    safeLocalStorageRemoveItem(BRAIN_STATE_KEY);
    for (const key of Object.keys(localStorage)) {
        if (key.startsWith(AGENT_PROFILE_MEMORY_KEY_PREFIX)) {
            safeLocalStorageRemoveItem(key);
        }
    }
}





