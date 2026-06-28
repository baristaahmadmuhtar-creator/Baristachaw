import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { genId } from '@baristachaw/shared';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  AppShell,
  BottomActionDock,
  HeroHeader,
  InfoPill,
  ResultSheet,
  SectionCard,
  SegmentedControl,
} from '../design-system';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import {
  createCollectionFolder,
  listCollectionFolders,
  listCollectionItems,
  moveCollectionItem,
  renameCollectionFolder,
  saveCollectionItem,
  softDeleteCollectionFolder,
  softDeleteCollectionItem,
} from '../services/mobileStore';
import { trackEvent } from '../services/telemetry';
import { uiTokens } from '../theme/tokens';
import type { AuthSession, CollectionFolderRecord, CollectionItemRecord } from '../types';
import { getMobileLocalization } from '../utils/localization';
import {
  buildCollectionPreview,
  buildFolderCounts,
  filterCollectionFolders,
  filterCollectionItems,
  getFolderPreview,
  isCollectionNote,
  isSelectedFolderStale,
  resolveActiveFolder,
  resolveCollectionMode,
  validateCollectionFolderName,
  type CollectionFilterType,
  type CollectionMode,
} from './collectionScreenModel';

type CollectionScreenProps = {
  session?: AuthSession | null;
  guestModeEnabled?: boolean;
};

type FolderFormState =
  | { mode: 'create' }
  | { mode: 'rename'; folder: CollectionFolderRecord };

type ConfirmState =
  | { kind: 'deleteFolder'; folder: CollectionFolderRecord }
  | { kind: 'deleteItem'; item: CollectionItemRecord };

type CollectionCopy = {
  add: string;
  addNoteToFolder: string;
  allFolders: string;
  allFoldersSubtitle: string;
  backToCollection: string;
  browseOnly: string;
  cancel: string;
  canvas: string;
  close: string;
  collectionHomeSubtitle: string;
  confirmDelete: string;
  createFolder: string;
  delete: string;
  deleteFolder: string;
  deleteFolderBody: (count: number) => string;
  deleteItem: string;
  deleteItemBody: string;
  duplicateFolderName: string;
  emptyDefault: string;
  emptyFolder: string;
  emptyFolderSearch: string;
  emptyFolderSearchTitle: string;
  emptyFolders: string;
  emptyFolderTitle: string;
  emptyPreview: string;
  emptySearch: string;
  emptySearchTitle: string;
  folderAlreadyExists: string;
  folderCreated: string;
  folderDeleted: string;
  folderFallback: string;
  folderName: string;
  folderNameEmpty: string;
  folderNameTooLong: string;
  folderRenamed: string;
  foldersTitle: string;
  folderSubtitle: string;
  folderUpdated: string;
  insideFolder: string;
  itemDeleted: string;
  items: string;
  moveToFolder: string;
  movedToFolder: string;
  newFolder: string;
  noFolder: string;
  noFolderMatches: string;
  note: string;
  noteBodyPlaceholder: string;
  noteContentRequired: string;
  noteSaved: string;
  noteSubtitle: string;
  noteUpdated: string;
  open: string;
  otherFolders: (count: number) => string;
  quickNote: string;
  readOnlyBody: string;
  readOnlyTitle: string;
  recipe: string;
  recipeItem: string;
  rename: string;
  renameFolder: string;
  save: string;
  savedToFolder: (folder: string) => string;
  searchAll: string;
  searchFolder: string;
  searchFolders: string;
  searchTitle: string;
  seeAllFolders: string;
  share: string;
  tidyFolders: string;
  uncategorized: string;
  updateError: string;
  updated: string;
};

const EN_COPY: CollectionCopy = {
  add: 'Add',
  addNoteToFolder: 'Add note to this folder',
  allFolders: 'All folders',
  allFoldersSubtitle: 'Find, open, rename, or clean up folders.',
  backToCollection: 'Back to Collection',
  browseOnly: 'Local notes.',
  cancel: 'Cancel',
  canvas: 'Canvas',
  close: 'Close',
  collectionHomeSubtitle: 'Saved recipes, notes, and AI work in one tidy place.',
  confirmDelete: 'Confirm delete',
  createFolder: 'Create folder',
  delete: 'Delete',
  deleteFolder: 'Delete folder',
  deleteFolderBody: (count) => count > 0
    ? `This folder contains ${count} item${count === 1 ? '' : 's'}. Items will move to Uncategorized.`
    : 'This empty folder will be removed.',
  deleteItem: 'Delete item',
  deleteItemBody: 'This item will be removed from Collection.',
  duplicateFolderName: 'A folder with this name already exists.',
  emptyDefault: 'No saved items yet. Save recipes, notes, or AI insights to find them here.',
  emptyFolder: 'Add the first note or move an item into this folder.',
  emptyFolderSearch: 'No result in this folder.',
  emptyFolderSearchTitle: 'No folder result',
  emptyFolders: 'Create a folder when you want to group recipes or notes.',
  emptyFolderTitle: 'This folder is still empty',
  emptyPreview: 'No preview yet.',
  emptySearch: 'No saved item matches this search.',
  emptySearchTitle: 'No result',
  folderAlreadyExists: 'Folder already exists.',
  folderCreated: 'Folder created.',
  folderDeleted: 'Folder deleted.',
  folderFallback: 'Folder',
  folderName: 'Folder name',
  folderNameEmpty: 'Folder name cannot be empty.',
  folderNameTooLong: 'Use 40 characters or fewer.',
  folderRenamed: 'Folder renamed.',
  foldersTitle: 'Folders',
  folderSubtitle: 'Keep recipes and notes easy to find.',
  folderUpdated: 'Updated',
  insideFolder: 'Inside folder',
  itemDeleted: 'Item deleted.',
  items: 'items',
  moveToFolder: 'Move to folder',
  movedToFolder: 'Moved to folder.',
  newFolder: 'New folder',
  noFolder: 'Uncategorized',
  noFolderMatches: 'No folder matches this search.',
  note: 'Note',
  noteBodyPlaceholder: 'Write a useful note...',
  noteContentRequired: 'Add a title or note before saving.',
  noteSaved: 'Note saved.',
  noteSubtitle: 'Keep it short, useful, and easy to revisit.',
  noteUpdated: 'Note updated.',
  open: 'Open',
  otherFolders: (count) => `+${count} other folder${count === 1 ? '' : 's'}`,
  quickNote: 'Quick Note',
  readOnlyBody: 'Notes and folders are saved locally on this device. Sign in only when you want account sync or protected AI features.',
  readOnlyTitle: 'Local Collection',
  recipe: 'Recipe',
  recipeItem: 'Recipe item',
  rename: 'Rename',
  renameFolder: 'Rename folder',
  save: 'Save',
  savedToFolder: (folder) => `Saved to: ${folder}`,
  searchAll: 'Search notes, recipes, or folders...',
  searchFolder: 'Search this folder...',
  searchFolders: 'Search folders...',
  searchTitle: 'Search',
  seeAllFolders: 'See all folders',
  share: 'Share',
  tidyFolders: 'Keep recipes and notes tidy without crowding the page.',
  uncategorized: 'Uncategorized',
  updateError: 'Unable to update Collection right now.',
  updated: 'Updated',
};

const ID_COPY: CollectionCopy = {
  ...EN_COPY,
  add: 'Tambah',
  addNoteToFolder: 'Tambah catatan di folder ini',
  allFolders: 'Semua folder',
  allFoldersSubtitle: 'Cari, buka, ubah nama, atau rapikan folder.',
  backToCollection: 'Kembali ke Koleksi',
  browseOnly: 'Catatan lokal.',
  cancel: 'Batal',
  canvas: 'Kanvas',
  close: 'Tutup',
  collectionHomeSubtitle: 'Resep, catatan, dan kerja AI tersimpan dalam satu tempat rapi.',
  confirmDelete: 'Konfirmasi hapus',
  createFolder: 'Tambah folder',
  delete: 'Hapus',
  deleteFolder: 'Hapus folder',
  deleteFolderBody: (count) => count > 0
    ? `Folder berisi ${count} item. Item akan dipindahkan ke Belum dikategorikan.`
    : 'Folder kosong ini akan dihapus.',
  deleteItem: 'Hapus item',
  deleteItemBody: 'Item ini akan dihapus dari Koleksi.',
  duplicateFolderName: 'Nama folder sudah ada.',
  emptyDefault: 'Belum ada item tersimpan. Simpan resep, catatan, atau insight AI agar muncul di sini.',
  emptyFolder: 'Tambah catatan pertama atau pindahkan item ke folder ini.',
  emptyFolderSearch: 'Tidak ada hasil di folder ini.',
  emptyFolderSearchTitle: 'Tidak ada hasil',
  emptyFolders: 'Buat folder saat ingin mengelompokkan resep atau catatan.',
  emptyFolderTitle: 'Folder ini masih kosong',
  emptyPreview: 'Belum ada pratinjau.',
  emptySearch: 'Tidak ada item tersimpan yang cocok.',
  emptySearchTitle: 'Tidak ada hasil',
  folderAlreadyExists: 'Nama folder sudah ada.',
  folderCreated: 'Folder dibuat.',
  folderDeleted: 'Folder dihapus.',
  folderFallback: 'Folder',
  folderName: 'Nama folder',
  folderNameEmpty: 'Nama folder tidak boleh kosong.',
  folderNameTooLong: 'Maksimal 40 karakter.',
  folderRenamed: 'Nama folder diperbarui.',
  foldersTitle: 'Folder',
  folderSubtitle: 'Kelola resep dan catatan agar tetap rapi.',
  folderUpdated: 'Diperbarui',
  insideFolder: 'Di dalam folder',
  itemDeleted: 'Item dihapus.',
  items: 'item',
  moveToFolder: 'Pindahkan ke folder',
  movedToFolder: 'Dipindahkan ke folder.',
  newFolder: 'Folder baru',
  noFolder: 'Belum dikategorikan',
  noFolderMatches: 'Tidak ada folder yang cocok.',
  note: 'Catatan',
  noteBodyPlaceholder: 'Tulis catatan yang berguna...',
  noteContentRequired: 'Isi judul atau catatan sebelum menyimpan.',
  noteSaved: 'Catatan disimpan.',
  noteSubtitle: 'Buat singkat, berguna, dan mudah dibaca ulang.',
  noteUpdated: 'Catatan diperbarui.',
  open: 'Buka',
  otherFolders: (count) => `+${count} folder lainnya`,
  quickNote: 'Catatan Cepat',
  readOnlyBody: 'Catatan dan folder disimpan lokal di perangkat ini. Masuk hanya saat ingin sinkron akun atau fitur AI terlindungi.',
  readOnlyTitle: 'Koleksi lokal',
  recipe: 'Resep',
  recipeItem: 'Item resep',
  rename: 'Ubah nama',
  renameFolder: 'Ubah nama folder',
  save: 'Simpan',
  savedToFolder: (folder) => `Disimpan di: ${folder}`,
  searchAll: 'Cari catatan, resep, atau folder...',
  searchFolder: 'Cari di folder ini...',
  searchFolders: 'Cari folder...',
  searchTitle: 'Cari',
  seeAllFolders: 'Lihat semua folder',
  share: 'Bagikan',
  tidyFolders: 'Rapikan resep dan catatan tanpa membuat halaman penuh.',
  uncategorized: 'Belum dikategorikan',
  updateError: 'Koleksi belum bisa diperbarui sekarang.',
  updated: 'Diperbarui',
};

export function getCollectionCopy(language: string): CollectionCopy {
  return language === 'id' ? ID_COPY : EN_COPY;
}

function formatItemCount(count: number, copy: CollectionCopy): string {
  return `${count} ${copy.items}`;
}

function getSearchPlaceholder(mode: CollectionMode, copy: CollectionCopy): string {
  if (mode === 'folders') return copy.searchFolders;
  if (mode === 'folder') return copy.searchFolder;
  return copy.searchAll;
}

export function CollectionScreen({ session = null, guestModeEnabled = false }: CollectionScreenProps) {
  const preferredLanguage = usePreferredMobileLanguage(session?.user.id);
  const { direction, language, locale, web: webT } = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const isRtl = direction === 'rtl';
  const isFocused = useIsFocused();
  const copy = useMemo(() => getCollectionCopy(language), [language]);

  const [items, setItems] = useState<CollectionItemRecord[]>([]);
  const [folders, setFolders] = useState<CollectionFolderRecord[]>([]);
  const [filter, setFilter] = useState<CollectionFilterType>('all');
  const [query, setQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [allFoldersOpen, setAllFoldersOpen] = useState(false);
  const [listError, setListError] = useState('');

  const [detailItem, setDetailItem] = useState<CollectionItemRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMarkdown, setNoteMarkdown] = useState('');
  const [noteFolderId, setNoteFolderId] = useState('');
  const [noteError, setNoteError] = useState('');

  const [folderForm, setFolderForm] = useState<FolderFormState | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderNameError, setFolderNameError] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const guestLocalMode = guestModeEnabled && !session;
  const activeFolder = resolveActiveFolder(selectedFolderId, folders);
  const mode = resolveCollectionMode({ allFoldersOpen, selectedFolderId, folders });
  const folderCounts = useMemo(() => buildFolderCounts(items), [items]);
  const folderPreview = useMemo(() => getFolderPreview(folders, items), [folders, items]);
  const filteredFolders = useMemo(
    () => filterCollectionFolders({ folders, items, query }),
    [folders, items, query],
  );
  const scopedFolderId = mode === 'folder' && activeFolder ? activeFolder.id : null;
  const filteredItems = useMemo(
    () => filterCollectionItems({
      items,
      filter,
      query,
      selectedFolderId: scopedFolderId,
    }),
    [filter, items, query, scopedFolderId],
  );
  const allItemsCount = items.length;

  const filterItems = useMemo(() => ([
    { value: 'all' as const, label: webT.allItems },
    { value: 'recipe' as const, label: webT.recipes },
    { value: 'ai_canvas' as const, label: webT.aiCanvas },
    { value: 'note' as const, label: webT.notes },
  ]), [webT.aiCanvas, webT.allItems, webT.notes, webT.recipes]);

  const reload = async () => {
    try {
      const [nextItems, nextFolders] = await Promise.all([
        listCollectionItems(),
        listCollectionFolders(),
      ]);

      setItems(nextItems);
      setFolders(nextFolders);
      setListError('');
    } catch (error) {
      setListError(copy.updateError);
      trackEvent('screen_error', {
        screen: 'collection',
        reason: 'reload_failed',
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    trackEvent('screen_ready', { screen: 'collection', guestLocalMode });
    void reload();
  }, [guestLocalMode, isFocused]);

  useEffect(() => {
    if (guestLocalMode) {
      trackEvent('local_collection_seen', { surface: 'collection', guestModeEnabled });
    }
  }, [guestModeEnabled, guestLocalMode]);

  useEffect(() => {
    if (isSelectedFolderStale(selectedFolderId, folders)) {
      setSelectedFolderId(null);
      setAllFoldersOpen(false);
    }
  }, [folders, selectedFolderId]);

  const runCollectionMutation = async (action: string, mutation: () => Promise<void>, onSuccess?: () => void) => {
    try {
      setListError('');
      await mutation();
      trackEvent('action_succeeded', { action });
      if (onSuccess) onSuccess();
      await reload();
    } catch (error) {
      setListError(copy.updateError);
      trackEvent('action_failed', {
        action,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  const goHome = () => {
    setAllFoldersOpen(false);
    setSelectedFolderId(null);
    setQuery('');
  };

  const openFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setAllFoldersOpen(false);
    setQuery('');
  };

  const openCreateFolder = () => {
    setFolderNameInput('');
    setFolderNameError('');
    setFolderForm({ mode: 'create' });
  };

  const openRenameFolder = (folder: CollectionFolderRecord) => {
    setFolderNameInput(folder.name);
    setFolderNameError('');
    setFolderForm({ mode: 'rename', folder });
  };

  const saveFolderForm = async () => {
    if (!folderForm) return;
    const validation = validateCollectionFolderName({
      name: folderNameInput,
      folders,
      editingFolderId: folderForm.mode === 'rename' ? folderForm.folder.id : undefined,
    });

    if (!validation.ok) {
      setFolderNameError(
        validation.reason === 'empty'
          ? copy.folderNameEmpty
          : validation.reason === 'too_long'
            ? copy.folderNameTooLong
            : copy.duplicateFolderName,
      );
      return;
    }

    await runCollectionMutation(
      folderForm.mode === 'rename' ? 'collection_rename_folder' : 'collection_create_folder',
      async () => {
        if (folderForm.mode === 'rename') {
          await renameCollectionFolder(folderForm.folder.id, validation.value);
        } else {
          await createCollectionFolder(validation.value);
        }
      },
      () => {
        setFolderForm(null);
        setFolderNameInput('');
        setFolderNameError(folderForm.mode === 'rename' ? copy.folderRenamed : copy.folderCreated);
      },
    );
  };

  const openCreateNote = () => {
    setEditingNoteId('');
    setNoteTitle('');
    setNoteMarkdown('');
    setNoteError('');
    setNoteFolderId(activeFolder ? activeFolder.id : '');
    setEditorOpen(true);
  };

  const openEditNote = (item: CollectionItemRecord) => {
    if (!isCollectionNote(item)) return;
    setEditingNoteId(item.id);
    setNoteTitle(item.title || '');
    setNoteMarkdown(item.content.markdown || '');
    setNoteFolderId(item.folderId || '');
    setNoteError('');
    setDetailItem(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingNoteId('');
    setNoteTitle('');
    setNoteMarkdown('');
    setNoteFolderId('');
    setNoteError('');
  };

  const saveNote = async () => {
    const markdown = noteMarkdown.trim();
    const trimmedTitle = noteTitle.trim();
    if (!markdown && !trimmedTitle) {
      setNoteError(copy.noteContentRequired);
      return;
    }

    const title = trimmedTitle || copy.quickNote;
    const id = editingNoteId || genId('col');

    await runCollectionMutation(editingNoteId ? 'collection_update_note' : 'collection_save_note', async () => {
      await saveCollectionItem({
        id,
        type: 'ai_canvas',
        title,
        folderId: noteFolderId || undefined,
        content: {
          markdown,
          kind: 'note',
        },
        createdAt: editingNoteId ? (items.find((item) => item.id === editingNoteId)?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
      });
    }, closeEditor);
  };

  const shareItem = async (item: CollectionItemRecord) => {
    const message = item.type === 'recipe'
      ? `${item.title}\n\n${item.content.description || copy.recipeItem}`
      : `${item.title}\n\n${item.content.markdown || ''}`;

    await Share.share({
      title: item.title || webT.collection,
      message,
    });
    trackEvent('action_succeeded', { action: 'collection_share_item', itemType: item.type });
  };

  const confirmDelete = async () => {
    if (!confirmState) return;
    if (confirmState.kind === 'deleteFolder') {
      const folderId = confirmState.folder.id;
      await runCollectionMutation('collection_delete_folder', async () => {
        await softDeleteCollectionFolder(folderId);
      }, () => {
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
          setAllFoldersOpen(false);
        }
        setConfirmState(null);
      });
      return;
    }

    await runCollectionMutation('collection_delete_item', async () => {
      await softDeleteCollectionItem(confirmState.item.id);
    }, () => {
      setDetailItem(null);
      setConfirmState(null);
    });
  };

  const moveDetailItem = async (folderId?: string) => {
    if (!detailItem) return;
    await runCollectionMutation('collection_move_item', async () => {
      await moveCollectionItem(detailItem.id, folderId);
    }, () => {
      setDetailItem((current) => current ? { ...current, folderId } : current);
    });
  };

  const statusLabel = mode === 'folders'
    ? formatItemCount(folders.length, copy)
    : mode === 'folder' && activeFolder
      ? formatItemCount(folderCounts.get(activeFolder.id) || 0, copy)
      : formatItemCount(filteredItems.length || allItemsCount, copy);

  const dockHidden = editorOpen || folderForm !== null || confirmState !== null || Boolean(detailItem);
  const showFolderPicker = editingNoteId || !activeFolder;
  const currentNoteFolder = folders.find((folder) => folder.id === noteFolderId) || null;
  const searchPlaceholder = getSearchPlaceholder(mode, copy);

  const renderSearch = () => (
    <SectionCard title={copy.searchTitle} compact>
      <View style={styles.searchField}>
        <Ionicons name="search" size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
        <TextInput
          accessibilityLabel={searchPlaceholder}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={uiTokens.text.muted}
          style={[styles.searchInput, isRtl ? styles.textRtl : null]}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            style={styles.clearButton}
            onPress={() => setQuery('')}
          >
            <Ionicons name="close" size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
          </Pressable>
        ) : null}
      </View>
      {mode !== 'folders' ? (
        <SegmentedControl items={filterItems} value={filter} onChange={setFilter} direction={direction} />
      ) : null}
    </SectionCard>
  );

  const renderFolderCard = (folder: CollectionFolderRecord, compactActions = false) => {
    const count = folderCounts.get(folder.id) || 0;
    return (
      <Pressable
        key={folder.id}
        accessibilityRole="button"
        accessibilityLabel={`${copy.open} ${folder.name}`}
        onPress={() => openFolder(folder.id)}
      >
        <SectionCard
          title={folder.name}
          subtitle={`${formatItemCount(count, copy)} · ${copy.folderUpdated} ${new Date(folder.updatedAt).toLocaleDateString(locale)}`}
          compact
          footer={compactActions ? (
            <View style={[styles.actionRow, isRtl ? styles.rowRtl : null]}>
              <ActionButton label={copy.open} compact tone="primary" onPress={() => openFolder(folder.id)} />
              <ActionButton label={copy.rename} compact onPress={() => openRenameFolder(folder)} />
              <ActionButton label={copy.delete} compact tone="danger" onPress={() => setConfirmState({ kind: 'deleteFolder', folder })} />
            </View>
          ) : (
            <View style={styles.itemFooter}>
              <InfoPill label={formatItemCount(count, copy)} tone={count > 0 ? 'success' : 'warning'} />
            </View>
          )}
        />
      </Pressable>
    );
  };

  const renderItemCard = (item: CollectionItemRecord, showFolderBadge: boolean) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={`${copy.open} ${item.title}`}
      onPress={() => setDetailItem(item)}
    >
      <SectionCard
        title={item.title}
        subtitle={buildCollectionPreview(item, copy.emptyPreview)}
        compact
        footer={(
          <View style={styles.itemFooter}>
            <InfoPill label={item.type === 'recipe' ? copy.recipe : isCollectionNote(item) ? copy.note : copy.canvas} tone="accent" />
            {showFolderBadge ? (
              item.folderId ? (
                <InfoPill
                  label={folders.find((folder) => folder.id === item.folderId)?.name || copy.folderFallback}
                  tone="success"
                />
              ) : (
                <InfoPill label={copy.noFolder} />
              )
            ) : null}
            <Text style={styles.updatedAt}>{copy.updated} {new Date(item.updatedAt).toLocaleDateString(locale)}</Text>
          </View>
        )}
      />
    </Pressable>
  );

  const renderHome = () => (
    <>
      {renderSearch()}
      <SectionCard
        title={copy.foldersTitle}
        subtitle={copy.folderSubtitle}
        compact
        footer={folders.length > 0 ? (
          <View style={[styles.actionRow, isRtl ? styles.rowRtl : null]}>
            <ActionButton label={copy.seeAllFolders} compact tone="ghost" onPress={() => { setAllFoldersOpen(true); setQuery(''); }} />
            {folderPreview.remainingCount > 0 ? <InfoPill label={copy.otherFolders(folderPreview.remainingCount)} /> : null}
          </View>
        ) : undefined}
      >
        {folderPreview.folders.length > 0 ? (
          <View style={styles.listSection}>{folderPreview.folders.map((folder) => renderFolderCard(folder))}</View>
        ) : (
          <Text style={[styles.bodyText, isRtl ? styles.textRtl : null]}>{copy.emptyFolders}</Text>
        )}
      </SectionCard>
      <View style={styles.listSection}>
        {filteredItems.length > 0 ? filteredItems.map((item) => renderItemCard(item, true)) : (
          <SectionCard
            tone="subtle"
            title={query.trim() ? copy.emptySearchTitle : copy.emptySearchTitle}
            subtitle={query.trim() ? copy.emptySearch : guestLocalMode ? copy.readOnlyBody : copy.emptyDefault}
            compact
          />
        )}
      </View>
    </>
  );

  const renderAllFolders = () => (
    <>
      {renderSearch()}
      <SectionCard
        title={copy.allFolders}
        subtitle={copy.allFoldersSubtitle}
        compact
        footer={<ActionButton label={copy.createFolder} compact tone="primary" onPress={openCreateFolder} />}
      >
        <View style={styles.listSection}>
          {filteredFolders.length > 0 ? filteredFolders.map((folder) => renderFolderCard(folder, true)) : (
            <SectionCard tone="subtle" title={copy.emptySearchTitle} subtitle={query.trim() ? copy.noFolderMatches : copy.emptyFolders} compact />
          )}
        </View>
      </SectionCard>
    </>
  );

  const renderFolder = () => {
    if (!activeFolder) return null;
    const count = folderCounts.get(activeFolder.id) || 0;
    return (
      <>
        <SectionCard
          title={activeFolder.name}
          subtitle={`${copy.insideFolder} · ${formatItemCount(count, copy)}`}
          tone="accent"
          compact
        >
          <Text style={[styles.bodyText, isRtl ? styles.textRtl : null]}>{webT.collection} &gt; {activeFolder.name}</Text>
          <View style={[styles.actionRow, isRtl ? styles.rowRtl : null]}>
            <ActionButton label={copy.backToCollection} compact tone="secondary" onPress={goHome} />
            <ActionButton label={copy.renameFolder} compact onPress={() => openRenameFolder(activeFolder)} />
            <ActionButton label={copy.deleteFolder} compact tone="danger" onPress={() => setConfirmState({ kind: 'deleteFolder', folder: activeFolder })} />
          </View>
        </SectionCard>
        {renderSearch()}
        <View style={styles.listSection}>
          {filteredItems.length > 0 ? filteredItems.map((item) => renderItemCard(item, false)) : (
            <SectionCard
              tone="subtle"
              title={query.trim() ? copy.emptyFolderSearchTitle : copy.emptyFolderTitle}
              subtitle={query.trim() ? copy.emptyFolderSearch : copy.emptyFolder}
              compact
            />
          )}
        </View>
      </>
    );
  };

  return (
    <>
      <AppShell
        header={(
          <HeroHeader
            eyebrow={mode === 'folder' ? copy.insideFolder : webT.collection}
            title={mode === 'folders' ? copy.allFolders : mode === 'folder' && activeFolder ? activeFolder.name : webT.collection}
            subtitle={mode === 'folders' ? copy.allFoldersSubtitle : mode === 'folder' ? copy.folderSubtitle : copy.collectionHomeSubtitle}
            direction={direction}
            status={<InfoPill label={guestLocalMode ? copy.browseOnly : statusLabel} tone={guestLocalMode ? 'warning' : 'accent'} />}
          />
        )}
        bottomDock={!dockHidden ? (
          <BottomActionDock
            primaryAction={{
              label: mode === 'folders' ? copy.createFolder : mode === 'folder' ? copy.addNoteToFolder : webT.newNote,
              onPress: mode === 'folders' ? openCreateFolder : openCreateNote,
            }}
            secondaryActions={mode === 'home' ? [
              { label: copy.createFolder, onPress: openCreateFolder },
            ] : [
              { label: copy.backToCollection, onPress: goHome },
            ]}
          />
        ) : undefined}
      >
        {listError ? <SectionCard tone="warning" title={copy.readOnlyTitle} subtitle={listError} compact /> : null}
        {mode === 'folders' ? renderAllFolders() : mode === 'folder' ? renderFolder() : renderHome()}
      </AppShell>

      <ResultSheet
        visible={Boolean(detailItem)}
        direction={direction}
        closeAccessibilityLabel={copy.close}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title || webT.collection}
        subtitle={detailItem ? new Date(detailItem.updatedAt).toLocaleString(locale) : undefined}
        actions={detailItem ? [
          {
            label: copy.share,
            tone: 'secondary',
            onPress: () => void shareItem(detailItem),
          },
          ...(detailItem && isCollectionNote(detailItem) ? [{
            label: `${webT.edit} ${copy.note}`,
            tone: 'primary' as const,
            onPress: () => openEditNote(detailItem),
          }] : []),
          {
            label: copy.deleteItem,
            tone: 'danger' as const,
            onPress: () => setConfirmState({ kind: 'deleteItem', item: detailItem }),
          },
        ] : []}
        content={detailItem ? (
          <View style={styles.sheetContent}>
            <Text style={[styles.detailBody, isRtl ? styles.textRtl : null]}>{buildCollectionPreview(detailItem, copy.emptyPreview)}</Text>
            <SectionCard title={copy.moveToFolder} compact>
              <View style={[styles.folderMoveRow, isRtl ? styles.rowRtl : null]}>
                <ActionButton
                  label={copy.noFolder}
                  compact
                  tone={!detailItem.folderId ? 'primary' : 'secondary'}
                  onPress={() => void moveDetailItem(undefined)}
                />
                {folders.map((folder) => (
                  <ActionButton
                    key={folder.id}
                    label={folder.name}
                    compact
                    tone={detailItem.folderId === folder.id ? 'primary' : 'secondary'}
                    onPress={() => void moveDetailItem(folder.id)}
                  />
                ))}
              </View>
            </SectionCard>
          </View>
        ) : <View />}
      />

      <ResultSheet
        visible={editorOpen}
        direction={direction}
        closeAccessibilityLabel={copy.close}
        onClose={closeEditor}
        title={editingNoteId ? webT.editNote : webT.newNote}
        subtitle={copy.noteSubtitle}
        actions={[
          {
            label: editingNoteId ? webT.updateNote : webT.saveNote,
            tone: 'primary',
            onPress: () => void saveNote(),
            disabled: !noteTitle.trim() && !noteMarkdown.trim(),
          },
          {
            label: copy.cancel,
            tone: 'secondary',
            onPress: closeEditor,
          },
        ]}
        content={(
          <View style={styles.sheetContent}>
            {noteError ? <Text style={styles.errorText}>{noteError}</Text> : null}
            <TextInput
              accessibilityLabel={webT.noteTitle}
              value={noteTitle}
              onChangeText={(value) => {
                setNoteTitle(value);
                setNoteError('');
              }}
              placeholder={webT.noteTitle}
              placeholderTextColor={uiTokens.text.muted}
              style={[styles.fieldInput, isRtl ? styles.textRtl : null]}
            />
            <TextInput
              accessibilityLabel={copy.noteBodyPlaceholder}
              value={noteMarkdown}
              onChangeText={(value) => {
                setNoteMarkdown(value);
                setNoteError('');
              }}
              placeholder={copy.noteBodyPlaceholder}
              placeholderTextColor={uiTokens.text.muted}
              style={[styles.fieldTextArea, isRtl ? styles.textRtl : null]}
              multiline
              textAlignVertical="top"
            />
            {showFolderPicker ? (
              <SectionCard title={copy.moveToFolder} compact>
                <View style={[styles.folderMoveRow, isRtl ? styles.rowRtl : null]}>
                  <ActionButton
                    label={copy.noFolder}
                    compact
                    tone={!noteFolderId ? 'primary' : 'secondary'}
                    onPress={() => setNoteFolderId('')}
                  />
                  {folders.map((folder) => (
                    <ActionButton
                      key={folder.id}
                      label={folder.name}
                      compact
                      tone={noteFolderId === folder.id ? 'primary' : 'secondary'}
                      onPress={() => setNoteFolderId(folder.id)}
                    />
                  ))}
                </View>
              </SectionCard>
            ) : currentNoteFolder ? (
              <SectionCard title={copy.folderFallback} subtitle={copy.savedToFolder(currentNoteFolder.name)} compact />
            ) : null}
          </View>
        )}
      />

      <ResultSheet
        visible={Boolean(folderForm)}
        direction={direction}
        closeAccessibilityLabel={copy.close}
        onClose={() => {
          setFolderForm(null);
          setFolderNameInput('');
          setFolderNameError('');
        }}
        title={folderForm?.mode === 'rename' ? copy.renameFolder : copy.newFolder}
        subtitle={copy.folderSubtitle}
        actions={[
          {
            label: folderForm?.mode === 'rename' ? copy.save : copy.createFolder,
            tone: 'primary',
            onPress: () => void saveFolderForm(),
            disabled: !folderNameInput.trim(),
          },
          {
            label: copy.cancel,
            tone: 'secondary',
            onPress: () => {
              setFolderForm(null);
              setFolderNameInput('');
              setFolderNameError('');
            },
          },
        ]}
        content={(
          <View style={styles.sheetContent}>
            {folderNameError ? <Text style={styles.errorText}>{folderNameError}</Text> : null}
            <TextInput
              accessibilityLabel={copy.folderName}
              value={folderNameInput}
              onChangeText={(value) => {
                setFolderNameInput(value);
                setFolderNameError('');
              }}
              placeholder={copy.folderName}
              placeholderTextColor={uiTokens.text.muted}
              style={[styles.fieldInput, isRtl ? styles.textRtl : null]}
              maxLength={48}
            />
          </View>
        )}
      />

      <ResultSheet
        visible={Boolean(confirmState)}
        direction={direction}
        closeAccessibilityLabel={copy.close}
        onClose={() => setConfirmState(null)}
        title={confirmState?.kind === 'deleteFolder' ? copy.deleteFolder : copy.deleteItem}
        subtitle={copy.confirmDelete}
        actions={[
          {
            label: copy.delete,
            tone: 'danger',
            onPress: () => void confirmDelete(),
          },
          {
            label: copy.cancel,
            tone: 'secondary',
            onPress: () => setConfirmState(null),
          },
        ]}
        content={(
          <View style={styles.sheetContent}>
            <Text style={[styles.detailBody, isRtl ? styles.textRtl : null]}>
              {confirmState?.kind === 'deleteFolder'
                ? copy.deleteFolderBody(folderCounts.get(confirmState.folder.id) || 0)
                : copy.deleteItemBody}
            </Text>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    minHeight: uiTokens.size.touchTarget,
  },
  searchInput: {
    flex: 1,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    paddingVertical: 12,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.soft,
  },
  listSection: {
    gap: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  updatedAt: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  bodyText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  sheetContent: {
    gap: 12,
  },
  detailBody: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: 22,
  },
  errorText: {
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  textRtl: {
    textAlign: 'right',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  folderMoveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldInput: {
    minHeight: uiTokens.size.touchTarget,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  fieldTextArea: {
    minHeight: 160,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: 22,
  },
});
