import test from 'node:test';
import assert from 'node:assert/strict';

import type { CollectionItem, Folder } from '../../apps/web/src/types.ts';
import {
  filterCollectionFolders,
  getCollectionFolderItemCount,
  getCollectionHomeFolderPreview,
  sortCollectionFoldersForHome,
  validateCollectionFolderName,
} from '../../apps/web/src/features/collection/collectionViewModel.ts';

const folder = (id: string, name: string, createdAt = 1, updatedAt = createdAt): Folder => ({
  id,
  name,
  createdAt,
  updatedAt,
});

const item = (id: string, folderId: string | undefined, updatedAt: number): CollectionItem => ({
  id,
  type: 'ai_canvas',
  folderId,
  title: id,
  content: { kind: 'note', markdown: id },
  createdAt: updatedAt,
  updatedAt,
});

test('collection folder home preview stays compact at three folders', () => {
  const folders = Array.from({ length: 20 }, (_, index) => folder(`f${index}`, `Folder ${index}`, index, index));
  const preview = getCollectionHomeFolderPreview(folders, [], 3);

  assert.equal(preview.preview.length, 3);
  assert.equal(preview.remainingCount, 17);
});

test('collection folder sort favors recent item updates, non-empty folders, then folder recency', () => {
  const folders = [
    folder('empty-new', 'Empty New', 10, 10),
    folder('has-old', 'Has Old', 1, 1),
    folder('has-recent', 'Has Recent', 2, 2),
  ];
  const items = [
    item('old-note', 'has-old', 20),
    item('recent-note', 'has-recent', 30),
  ];

  const sorted = sortCollectionFoldersForHome(folders, items);

  assert.equal(sorted[0]?.id, 'has-recent');
  assert.equal(sorted[1]?.id, 'has-old');
  assert.equal(sorted[2]?.id, 'empty-new');
});

test('collection folder validation blocks empty, duplicate, and long names', () => {
  const folders = [folder('f1', 'Manual Brew')];

  assert.deepEqual(validateCollectionFolderName('   ', folders), { ok: false, reason: 'empty' });
  assert.deepEqual(validateCollectionFolderName('manual brew', folders), { ok: false, reason: 'duplicate' });
  assert.deepEqual(validateCollectionFolderName('x'.repeat(41), folders), { ok: false, reason: 'too_long' });
  assert.deepEqual(validateCollectionFolderName('  Espresso  ', folders), { ok: true, value: 'Espresso' });
});

test('collection folder filters and counts are scoped correctly', () => {
  const folders = [folder('v60', 'V60 Notes'), folder('espresso', 'Espresso')];
  const items = [item('a', 'v60', 1), item('b', 'v60', 2), item('c', undefined, 3)];

  assert.equal(getCollectionFolderItemCount(items, 'v60'), 2);
  assert.deepEqual(filterCollectionFolders(folders, 'v60').map((entry) => entry.id), ['v60']);
});
