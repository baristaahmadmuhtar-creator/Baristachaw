// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readAgentProfileMemory,
  resetAgentProfileMemory,
  saveAgentProfileMemory,
} from '../agentProfileStore';

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

describe('agentProfileStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('keeps guest and user namespaces isolated', async () => {
    await saveAgentProfileMemory(null, { preferredLanguage: 'id' });
    await saveAgentProfileMemory('user-123', { preferredLanguage: 'en' });

    const guest = await readAgentProfileMemory();
    const user = await readAgentProfileMemory('user-123');

    expect(guest.preferredLanguage).toBe('id');
    expect(user.preferredLanguage).toBe('en');
  });

  test('resetAgentProfileMemory restores a fresh seeded profile', async () => {
    await saveAgentProfileMemory('user-456', { preferredLanguage: 'id', userDisplayName: 'Raka' });
    const reset = await resetAgentProfileMemory('user-456', { preferredLanguage: 'en', assistantName: 'Baristachaw' });

    expect(reset.preferredLanguage).toBe('en');
    expect(reset.assistantName).toBe('Baristachaw');
    expect(reset.userDisplayName).toBeUndefined();
  });
});
