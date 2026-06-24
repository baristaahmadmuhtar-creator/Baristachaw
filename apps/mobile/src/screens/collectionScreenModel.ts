import { normalizeSearchValue } from '@baristachaw/shared';
import type { CollectionFolderRecord, CollectionItemRecord } from '../types';

export type CollectionFilterType = 'all' | 'recipe' | 'ai_canvas' | 'note';
export type CollectionMode = 'home' | 'folders' | 'folder';

export const COLLECTION_FOLDER_PREVIEW_LIMIT = 3;
export const COLLECTION_FOLDER_NAME_MAX_LENGTH = 40;

export type FolderNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'duplicate' };

export function isCollectionNote(item: CollectionItemRecord): item is CollectionItemRecord & {
  type: 'ai_canvas';
  content: { markdown: string; kind?: string };
} {
  return item.type === 'ai_canvas' && item.content?.kind === 'note';
}

export function buildFolderCounts(items: CollectionItemRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    if (item.deletedAt) return;
    const key = item.folderId || 'uncategorized';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function getFolderLastItemUpdated(folder: CollectionFolderRecord, items: CollectionItemRecord[]): number {
  return items.reduce((latest, item) => {
    if (item.folderId !== folder.id || item.deletedAt) return latest;
    return Math.max(latest, item.updatedAt || item.createdAt || 0);
  }, 0);
}

export function sortFoldersForPreview(
  folders: CollectionFolderRecord[],
  items: CollectionItemRecord[],
): CollectionFolderRecord[] {
  const counts = buildFolderCounts(items);
  return [...folders].sort((a, b) => {
    const aRecentItem = getFolderLastItemUpdated(a, items);
    const bRecentItem = getFolderLastItemUpdated(b, items);
    if (aRecentItem !== bRecentItem) return bRecentItem - aRecentItem;

    const aHasItems = (counts.get(a.id) || 0) > 0 ? 1 : 0;
    const bHasItems = (counts.get(b.id) || 0) > 0 ? 1 : 0;
    if (aHasItems !== bHasItems) return bHasItems - aHasItems;

    const aUpdated = a.updatedAt || a.createdAt || 0;
    const bUpdated = b.updatedAt || b.createdAt || 0;
    if (aUpdated !== bUpdated) return bUpdated - aUpdated;

    return a.name.localeCompare(b.name);
  });
}

export function getFolderPreview(
  folders: CollectionFolderRecord[],
  items: CollectionItemRecord[],
  limit = COLLECTION_FOLDER_PREVIEW_LIMIT,
): { folders: CollectionFolderRecord[]; remainingCount: number } {
  const activeFolders = folders.filter(f => !f.deletedAt);
  const sorted = sortFoldersForPreview(activeFolders, items);
  return {
    folders: sorted.slice(0, limit),
    remainingCount: Math.max(0, sorted.length - limit),
  };
}

export function resolveActiveFolder(
  selectedFolderId: string | null,
  folders: CollectionFolderRecord[],
): CollectionFolderRecord | null {
  if (!selectedFolderId || selectedFolderId === 'uncategorized') return null;
  return folders.find((folder) => folder.id === selectedFolderId && !folder.deletedAt) || null;
}

export function resolveCollectionMode(input: {
  allFoldersOpen: boolean;
  selectedFolderId: string | null;
  folders: CollectionFolderRecord[];
}): CollectionMode {
  if (input.allFoldersOpen) return 'folders';
  return resolveActiveFolder(input.selectedFolderId, input.folders) ? 'folder' : 'home';
}

export function isSelectedFolderStale(
  selectedFolderId: string | null,
  folders: CollectionFolderRecord[],
): boolean {
  return Boolean(
    selectedFolderId &&
    selectedFolderId !== 'uncategorized' &&
    !folders.some((folder) => folder.id === selectedFolderId && !folder.deletedAt),
  );
}

export function validateCollectionFolderName(input: {
  name: string;
  folders: CollectionFolderRecord[];
  editingFolderId?: string;
}): FolderNameValidationResult {
  const value = input.name.trim().replace(/\s+/g, ' ');
  if (!value) return { ok: false, reason: 'empty' };
  if (value.length > COLLECTION_FOLDER_NAME_MAX_LENGTH) return { ok: false, reason: 'too_long' };

  const normalized = value.toLocaleLowerCase();
  const duplicate = input.folders.some((folder) =>
    folder.id !== input.editingFolderId &&
    !folder.deletedAt &&
    folder.name.trim().toLocaleLowerCase() === normalized,
  );
  if (duplicate) return { ok: false, reason: 'duplicate' };

  return { ok: true, value };
}

function itemMatchesFilter(item: CollectionItemRecord, filter: CollectionFilterType): boolean {
  if (filter === 'recipe') return item.type === 'recipe';
  if (filter === 'ai_canvas') return item.type === 'ai_canvas';
  if (filter === 'note') return isCollectionNote(item);
  return true;
}

function itemMatchesQuery(item: CollectionItemRecord, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const title = normalizeSearchValue(item.title || '');
  if (title.includes(normalizedQuery)) return true;

  if (item.type === 'recipe') {
    return normalizeSearchValue(`${item.content?.name || ''} ${item.content?.description || ''} ${(item.content?.steps || []).join(' ')}`)
      .includes(normalizedQuery);
  }

  return normalizeSearchValue(item.content?.markdown || '').includes(normalizedQuery);
}

export function filterCollectionItems(input: {
  items: CollectionItemRecord[];
  filter: CollectionFilterType;
  query: string;
  selectedFolderId?: string | null;
}): CollectionItemRecord[] {
  const normalizedQuery = normalizeSearchValue(input.query);
  return input.items.filter((item) => {
    if (item.deletedAt) return false;
    if (input.selectedFolderId === 'uncategorized' && item.folderId) return false;
    if (
      input.selectedFolderId &&
      input.selectedFolderId !== 'uncategorized' &&
      item.folderId !== input.selectedFolderId
    ) {
      return false;
    }
    return itemMatchesFilter(item, input.filter) && itemMatchesQuery(item, normalizedQuery);
  });
}

export function filterCollectionFolders(input: {
  folders: CollectionFolderRecord[];
  items: CollectionItemRecord[];
  query: string;
}): CollectionFolderRecord[] {
  const activeFolders = input.folders.filter(f => !f.deletedAt);
  const normalizedQuery = normalizeSearchValue(input.query);
  if (!normalizedQuery) return activeFolders;

  return activeFolders.filter((folder) => {
    if (normalizeSearchValue(folder.name).includes(normalizedQuery)) return true;
    return input.items.some((item) =>
      !item.deletedAt &&
      item.folderId === folder.id &&
      itemMatchesQuery(item, normalizedQuery),
    );
  });
}

export function buildCollectionPreview(item: CollectionItemRecord, emptyLabel: string): string {
  const raw = item.type === 'recipe'
    ? `${item.content.description || ''} ${(item.content.steps || []).join(' ')}`
    : item.content.markdown || '';
  const compact = raw.replace(/\s+/g, ' ').trim();
  if (!compact) return emptyLabel;
  return compact.length > 150 ? `${compact.slice(0, 147).trim()}...` : compact;
}
