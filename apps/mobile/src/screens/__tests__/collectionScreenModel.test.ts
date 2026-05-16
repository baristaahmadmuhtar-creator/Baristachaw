import type { CollectionFolderRecord, CollectionItemRecord } from '../../types';
import { getCollectionCopy } from '../CollectionScreen';
import {
  buildFolderCounts,
  filterCollectionFolders,
  filterCollectionItems,
  getFolderPreview,
  isSelectedFolderStale,
  resolveActiveFolder,
  resolveCollectionMode,
  sortFoldersForPreview,
  validateCollectionFolderName,
} from '../collectionScreenModel';

function folder(id: string, name: string, updatedAt = 1): CollectionFolderRecord {
  return {
    id,
    name,
    createdAt: updatedAt,
    updatedAt,
  };
}

function note(id: string, title: string, markdown: string, folderId?: string, updatedAt = 1): CollectionItemRecord {
  return {
    id,
    type: 'ai_canvas',
    title,
    folderId,
    content: {
      markdown,
      kind: 'note',
    },
    createdAt: updatedAt,
    updatedAt,
  };
}

function recipe(id: string, title: string, folderId?: string, updatedAt = 1): CollectionItemRecord {
  return {
    id,
    type: 'recipe',
    title,
    folderId,
    content: {
      name: title,
      description: 'V60 brew recipe',
      ingredients: [],
      steps: ['Bloom', 'Pour'],
      difficulty: 'Easy',
      time: '3 min',
    },
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('collection screen model', () => {
  test('limits home folder preview without hiding the remaining count', () => {
    const folders = Array.from({ length: 20 }, (_, index) => folder(`f${index}`, `Folder ${index}`, index));

    expect(getFolderPreview([], [])).toEqual({ folders: [], remainingCount: 0 });
    expect(getFolderPreview(folders.slice(0, 1), []).folders).toHaveLength(1);
    expect(getFolderPreview(folders.slice(0, 3), []).folders).toHaveLength(3);

    const four = getFolderPreview(folders.slice(0, 4), []);
    expect(four.folders).toHaveLength(3);
    expect(four.remainingCount).toBe(1);

    const twenty = getFolderPreview(folders, []);
    expect(twenty.folders).toHaveLength(3);
    expect(twenty.remainingCount).toBe(17);
  });

  test('sorts preview by recent folder item, non-empty folders, then updated folder', () => {
    const alpha = folder('a', 'Alpha', 100);
    const beta = folder('b', 'Beta', 200);
    const gamma = folder('c', 'Gamma', 300);
    const items = [
      note('n1', 'Old Alpha', 'old', 'a', 500),
      note('n2', 'New Beta', 'new', 'b', 900),
    ];

    expect(sortFoldersForPreview([gamma, alpha, beta], items).map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  test('resolves explicit home, all folders, and inside folder modes', () => {
    const folders = [folder('f1', 'Bar')];

    expect(resolveCollectionMode({ allFoldersOpen: false, selectedFolderId: null, folders })).toBe('home');
    expect(resolveCollectionMode({ allFoldersOpen: true, selectedFolderId: null, folders })).toBe('folders');
    expect(resolveCollectionMode({ allFoldersOpen: false, selectedFolderId: 'f1', folders })).toBe('folder');
    expect(resolveActiveFolder('f1', folders)?.name).toBe('Bar');
    expect(isSelectedFolderStale('missing', folders)).toBe(true);
  });

  test('scopes item search to active folder and preserves all-items behavior on home', () => {
    const items = [
      note('n1', 'Folder note', 'ethiopia natural', 'f1'),
      note('n2', 'Outside note', 'ethiopia washed', undefined),
      recipe('r1', 'Recipe', 'f1'),
    ];

    expect(filterCollectionItems({ items, filter: 'all', query: 'ethiopia' })).toHaveLength(2);
    expect(filterCollectionItems({ items, filter: 'note', query: 'ethiopia', selectedFolderId: 'f1' }).map((item) => item.id)).toEqual(['n1']);
    expect(filterCollectionItems({ items, filter: 'all', query: '', selectedFolderId: 'uncategorized' }).map((item) => item.id)).toEqual(['n2']);
  });

  test('searches folder names and contained item text in all-folders mode', () => {
    const folders = [folder('f1', 'Espresso'), folder('f2', 'Manual Brew')];
    const items = [note('n1', 'Hidden title', 'anaerobic process note', 'f2')];

    expect(filterCollectionFolders({ folders, items, query: 'espresso' }).map((item) => item.id)).toEqual(['f1']);
    expect(filterCollectionFolders({ folders, items, query: 'anaerobic' }).map((item) => item.id)).toEqual(['f2']);
  });

  test('validates folder names consistently', () => {
    const folders = [folder('f1', 'Dial In')];

    expect(validateCollectionFolderName({ name: '   ', folders })).toEqual({ ok: false, reason: 'empty' });
    expect(validateCollectionFolderName({ name: 'x'.repeat(41), folders })).toEqual({ ok: false, reason: 'too_long' });
    expect(validateCollectionFolderName({ name: 'dial in', folders })).toEqual({ ok: false, reason: 'duplicate' });
    expect(validateCollectionFolderName({ name: ' dial   in ', folders, editingFolderId: 'f1' })).toEqual({ ok: true, value: 'dial in' });
  });

  test('counts deleted-folder items as uncategorized after store policy moves them', () => {
    const counts = buildFolderCounts([
      note('n1', 'A', 'A', undefined),
      note('n2', 'B', 'B', 'folder'),
    ]);

    expect(counts.get('uncategorized')).toBe(1);
    expect(counts.get('folder')).toBe(1);
  });
});

describe('collection screen copy', () => {
  test('keeps Indonesian collection copy free from critical English labels', () => {
    const copy = getCollectionCopy('id');
    const visibleCopy = [
      copy.allFolders,
      copy.insideFolder,
      copy.backToCollection,
      copy.addNoteToFolder,
      copy.searchAll,
      copy.searchFolder,
      copy.createFolder,
      copy.renameFolder,
      copy.deleteFolder,
      copy.noFolder,
    ].join(' ');

    expect(visibleCopy).toContain('Koleksi');
    expect(visibleCopy).not.toMatch(/All folders|Inside folder|Back to Collection|Create folder|Rename folder|Delete folder|Uncategorized/);
  });

  test('keeps English collection copy English', () => {
    const copy = getCollectionCopy('en');

    expect(copy.allFolders).toBe('All folders');
    expect(copy.insideFolder).toBe('Inside folder');
    expect(copy.noFolder).toBe('Uncategorized');
  });
});
