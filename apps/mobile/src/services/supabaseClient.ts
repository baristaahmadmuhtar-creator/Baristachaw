import 'react-native-url-polyfill/auto';

import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseAuthConfigured, mobileEnv } from '../config/env';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const STORAGE_PREFIX = 'bc.supabase';
const STORAGE_CHUNK_SIZE = 1_700;

function hashKey(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function safeKey(input: string, suffix: string): string {
  const readable = input.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 64);
  return `${STORAGE_PREFIX}.${hashKey(input)}.${readable}.${suffix}`;
}

function chunkKey(key: string, index: number): string {
  return safeKey(key, `chunk.${index}`);
}

function metaKey(key: string): string {
  return safeKey(key, 'meta');
}

async function removeStoredChunks(key: string): Promise<void> {
  const rawMeta = await SecureStore.getItemAsync(metaKey(key)).catch(() => null);
  if (!rawMeta) return;

  try {
    const parsed = JSON.parse(rawMeta) as { chunks?: number };
    const chunks = Number(parsed.chunks);
    if (Number.isFinite(chunks) && chunks > 0) {
      await Promise.all(
        Array.from({ length: chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))),
      );
    }
  } catch {
    // Ignore malformed metadata and overwrite it on the next save.
  }

  await SecureStore.deleteItemAsync(metaKey(key)).catch(() => undefined);
}

const secureChunkedStorage: StorageAdapter = {
  async getItem(key) {
    const rawMeta = await SecureStore.getItemAsync(metaKey(key));
    if (!rawMeta) return null;

    try {
      const parsed = JSON.parse(rawMeta) as { chunks?: number };
      const chunks = Number(parsed.chunks);
      if (!Number.isFinite(chunks) || chunks <= 0) return null;

      const parts = await Promise.all(
        Array.from({ length: chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
      );
      if (parts.some((part) => part === null)) return null;
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    await removeStoredChunks(key);
    const chunks = Math.max(1, Math.ceil(value.length / STORAGE_CHUNK_SIZE));
    await Promise.all(
      Array.from({ length: chunks }, (_, index) => (
        SecureStore.setItemAsync(chunkKey(key, index), value.slice(index * STORAGE_CHUNK_SIZE, (index + 1) * STORAGE_CHUNK_SIZE))
      )),
    );
    await SecureStore.setItemAsync(metaKey(key), JSON.stringify({ version: 1, chunks }));
  },

  async removeItem(key) {
    await removeStoredChunks(key);
  },
};

let supabaseClient: SupabaseClient | null = null;
let appStateSubscriptionStarted = false;

export function getSupabaseRedirectUri(): string {
  return `${mobileEnv.apiBaseUrl}/api/auth/mobile/supabase/callback`;
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseAuthConfigured) {
    throw new Error('Supabase Auth is not configured for this mobile build.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(mobileEnv.supabaseUrl, mobileEnv.supabasePublishableKey, {
      auth: {
        storage: secureChunkedStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      },
    });
  }

  if (!appStateSubscriptionStarted && Platform.OS !== 'web') {
    appStateSubscriptionStarted = true;
    AppState.addEventListener('change', (state) => {
      if (!supabaseClient) return;
      if (state === 'active') {
        void supabaseClient.auth.startAutoRefresh();
      } else {
        void supabaseClient.auth.stopAutoRefresh();
      }
    });
  }

  return supabaseClient;
}

export async function signOutSupabaseClient(): Promise<void> {
  if (!isSupabaseAuthConfigured || !supabaseClient) return;
  await supabaseClient.auth.signOut({ scope: 'local' });
}
