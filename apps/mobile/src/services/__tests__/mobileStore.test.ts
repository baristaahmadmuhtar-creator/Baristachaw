// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  appendMessage,
  createCollectionFolder,
  createChatSession,
  listChatSessions,
  listMessagesForSession,
  moveCollectionItem,
  quickSaveInsight,
  readMobileStoreState,
  saveCollectionItem,
  softDeleteCollectionFolder,
  softDeleteCollectionItem,
} from '../mobileStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      getItem: jest.fn(async (key) => store.get(key) ?? null),
      removeItem: jest.fn(async (key) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

describe('mobileStore parity state', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('creates chat session and stores appended messages', async () => {
    const session = await createChatSession('QA Session');
    await appendMessage({
      sessionId: session.id,
      role: 'user',
      text: 'hello',
    }, {
      preferredLanguage: 'id',
    });

    const sessions = await listChatSessions();
    const messages = await listMessagesForSession(session.id);

    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].id).toBe(session.id);
    expect(sessions[0].preferredResponseLanguage).toBe('id');
    expect(sessions[0].hasUserMessage).toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('hello');
  });

  test('reuses empty draft session instead of creating duplicate blank chats', async () => {
    const first = await createChatSession('Draft');
    const second = await createChatSession('Another Draft');

    expect(second.id).toBe(first.id);
  });

  test('quickSaveInsight persists ai_canvas note into collection', async () => {
    await quickSaveInsight({
      title: 'Saved Insight',
      markdown: '## espresso tip',
      source: 'chat',
    });

    const state = await readMobileStoreState();
    expect(state.collectionItems).toHaveLength(1);
    expect(state.collectionItems[0].type).toBe('ai_canvas');
    if (state.collectionItems[0].type === 'ai_canvas') {
      expect(state.collectionItems[0].content.markdown).toContain('espresso');
      expect(state.collectionItems[0].content.kind).toBe('note');
    }
  });

  test('soft deleting a collection folder moves contained items to uncategorized', async () => {
    const folder = await createCollectionFolder('Dial In');
    expect(folder).not.toBeNull();

    await saveCollectionItem({
      id: 'note_1',
      type: 'ai_canvas',
      title: 'V60 note',
      folderId: folder!.id,
      content: {
        markdown: 'Bloom and pour note',
        kind: 'note',
      },
      createdAt: 1,
      updatedAt: 1,
    });

    await softDeleteCollectionFolder(folder!.id);
    const state = await readMobileStoreState();

    expect(state.collectionFolders.find((item) => item.id === folder!.id)?.deletedAt).toBeTruthy();
    expect(state.collectionItems.find((item) => item.id === 'note_1')?.folderId).toBeUndefined();
  });

  test('moving and deleting collection items does not leave stale visible folder state', async () => {
    const folder = await createCollectionFolder('Recipes');
    expect(folder).not.toBeNull();

    await saveCollectionItem({
      id: 'recipe_1',
      type: 'recipe',
      title: 'Saved recipe',
      folderId: folder!.id,
      content: {
        name: 'Saved recipe',
        description: 'Recipe body',
        ingredients: [],
        steps: ['Brew'],
        difficulty: 'Easy',
        time: '3 min',
      },
      createdAt: 1,
      updatedAt: 1,
    });

    await moveCollectionItem('recipe_1', undefined);
    let state = await readMobileStoreState();
    expect(state.collectionItems.find((item) => item.id === 'recipe_1')?.folderId).toBeUndefined();

    await softDeleteCollectionItem('recipe_1');
    state = await readMobileStoreState();
    const deleted = state.collectionItems.find((item) => item.id === 'recipe_1');
    expect(deleted?.deletedAt).toBeTruthy();
    expect(deleted?.folderId).toBeUndefined();
  });
});
