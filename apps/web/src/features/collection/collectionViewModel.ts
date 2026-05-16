import type { CollectionItem, Folder } from '../../types';

export const COLLECTION_HOME_FOLDER_LIMIT = 3;
export const COLLECTION_FOLDER_NAME_MAX = 40;

export type CollectionFolderValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'duplicate' };

export function normalizeCollectionQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validateCollectionFolderName(
  value: string,
  folders: Folder[],
  currentFolderId?: string,
): CollectionFolderValidationResult {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, reason: 'empty' };
  if (name.length > COLLECTION_FOLDER_NAME_MAX) return { ok: false, reason: 'too_long' };
  const normalized = normalizeCollectionQuery(name);
  const duplicate = folders.some((folder) => (
    folder.id !== currentFolderId &&
    !folder.deletedAt &&
    normalizeCollectionQuery(folder.name) === normalized
  ));
  if (duplicate) return { ok: false, reason: 'duplicate' };
  return { ok: true, value: name };
}

export function getCollectionFolderItemCount(items: CollectionItem[], folderId: string) {
  return items.filter((item) => item.folderId === folderId && !item.deletedAt).length;
}

export function getCollectionFolderLastItemUpdatedAt(items: CollectionItem[], folderId: string) {
  return items.reduce((latest, item) => {
    if (item.folderId !== folderId || item.deletedAt) return latest;
    return Math.max(latest, Number(item.updatedAt || item.createdAt || 0));
  }, 0);
}

export function sortCollectionFoldersForHome(folders: Folder[], items: CollectionItem[]) {
  return [...folders].sort((left, right) => {
    const leftLastItem = getCollectionFolderLastItemUpdatedAt(items, left.id);
    const rightLastItem = getCollectionFolderLastItemUpdatedAt(items, right.id);
    if (leftLastItem !== rightLastItem) return rightLastItem - leftLastItem;

    const leftCount = getCollectionFolderItemCount(items, left.id);
    const rightCount = getCollectionFolderItemCount(items, right.id);
    if ((leftCount > 0) !== (rightCount > 0)) return leftCount > 0 ? -1 : 1;

    const leftUpdated = Number(left.updatedAt || left.createdAt || 0);
    const rightUpdated = Number(right.updatedAt || right.createdAt || 0);
    if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;

    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  });
}

export function getCollectionHomeFolderPreview(
  folders: Folder[],
  items: CollectionItem[],
  limit = COLLECTION_HOME_FOLDER_LIMIT,
) {
  const sorted = sortCollectionFoldersForHome(folders, items);
  const preview = sorted.slice(0, limit);
  return {
    preview,
    remainingCount: Math.max(0, sorted.length - preview.length),
    sorted,
  };
}

export function filterCollectionFolders(folders: Folder[], query: string) {
  const normalized = normalizeCollectionQuery(query);
  if (!normalized) return folders;
  return folders.filter((folder) => normalizeCollectionQuery(folder.name).includes(normalized));
}
