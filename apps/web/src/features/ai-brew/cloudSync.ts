import type { CollectionItem } from '../../types';
import type { BrewJournalEntry } from './types';

export type CloudCollectionItem = CollectionItem & {
  source?: 'collection' | 'ai_brew' | 'import';
  metadata?: Record<string, unknown>;
};

type LibrarySyncPayload = {
  aiBrewJournal?: BrewJournalEntry[];
  collectionItems?: CloudCollectionItem[];
};

type LibrarySyncResult = {
  ok: boolean;
  synced?: boolean;
  reason?: string;
  journalCount?: number;
  collectionCount?: number;
};

function hasItems(payload: LibrarySyncPayload): boolean {
  return Boolean(payload.aiBrewJournal?.length || payload.collectionItems?.length);
}

function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  const hostname = window.location?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export async function syncAiBrewLibraryToCloud(payload: LibrarySyncPayload): Promise<LibrarySyncResult> {
  if (!hasItems(payload)) return { ok: true, synced: false, reason: 'empty_payload' };
  if (typeof window === 'undefined') return { ok: true, synced: false, reason: 'server_render' };
  if (isLocalDevHost()) return { ok: true, synced: false, reason: 'local_dev' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: true, synced: false, reason: 'offline' };
  }

  try {
    const response = await fetch('/api/library/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({})) as Partial<LibrarySyncResult>;
    return {
      ok: response.ok && data.ok !== false,
      synced: Boolean(data.synced),
      reason: data.reason,
      journalCount: data.journalCount,
      collectionCount: data.collectionCount,
    };
  } catch {
    return { ok: false, synced: false, reason: 'network_error' };
  }
}
