import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, FolderPlus, Loader2, BookOpen, FileText, Trash2, ChevronRight, ArrowLeft, X, Edit3, MoreHorizontal, NotebookPen, Search } from 'lucide-react';
import {
  listCollectionItems,
  softDeleteCollectionItem,
  getSavedRecipes,
  deleteRecipe,
  subscribeCollectionUpdates,
  createNoteCollectionItem,
  updateCollectionItem,
  moveCollectionItemToFolder,
  saveCollectionItem,
  softDeleteCollectionFolder,
} from '../services/storageService';
import { useGlobalState } from '../context/GlobalState';
import { useNavbar } from '../context/NavbarContext';
import { useIOSKeyboardFix } from '../hooks/useIOSKeyboardFix';
import { useRuntimeDisplayMode } from '../hooks/useRuntimeDisplayMode';
import { ConfirmActionDialog } from '../components/ConfirmActionDialog';
import Markdown from 'react-markdown';
import type { CollectionItem } from '../types';
import { parseNoteDraftFromStorage, sanitizeNoteDraftForStorage, type NoteDraftState } from '../features/collection/noteDraftState';

type FilterType = 'all' | 'recipe' | 'ai_canvas' | 'note';
type PendingDeleteTarget =
  | { kind: 'item'; id: string; label: string }
  | { kind: 'recipe'; id: string; label: string }
  | { kind: 'folder'; id: string; label: string };
const NOTE_DRAFT_STORAGE_KEY = 'BARISTA_COLLECTION_NOTE_DRAFT_V1';

const normalizeSearchValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function isNoteItem(item: CollectionItem) {
  return item.type === 'ai_canvas' && (item.content as any)?.kind === 'note';
}

function isLatteArtItem(item: CollectionItem) {
  return item.type === 'ai_canvas' && (item.content as any)?.kind === 'latte_art';
}

export function Collection() {
  const { t, folders, refreshFolders, addFolder, editFolder } = useGlobalState();
  const { hideNav, showNav } = useNavbar();
  const { isIosStandalone } = useRuntimeDisplayMode();
  const disableEntranceMotion = isIosStandalone || (typeof navigator !== 'undefined' && navigator.webdriver);

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMarkdown, setNoteMarkdown] = useState('');
  const [noteFolderId, setNoteFolderId] = useState('');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [isNoteEditingInModal, setIsNoteEditingInModal] = useState(false);
  const [modalNoteTitleDraft, setModalNoteTitleDraft] = useState('');
  const [modalNoteBodyDraft, setModalNoteBodyDraft] = useState('');
  const [modalNoteFolderDraft, setModalNoteFolderDraft] = useState('');
  const [savingModalNote, setSavingModalNote] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Folder management
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const newFolderFormRef = useRef<HTMLDivElement | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement | null>(null);
  const noteEditorRef = useRef<HTMLDivElement | null>(null);
  const itemDetailRef = useRef<HTMLDivElement | null>(null);
  const pageTopAnchorRef = useRef<HTMLDivElement | null>(null);
  const collectionKeyboardFix = useIOSKeyboardFix({
    focusScopeRef: selectedItem ? itemDetailRef : showNoteEditor ? noteEditorRef : newFolderFormRef,
    enableScrollIntoViewOnFocus: showNewFolder || showNoteEditor || isNoteEditingInModal,
    scrollIntoViewBlock: 'center',
  });
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [optimisticDeletedFolderIds, setOptimisticDeletedFolderIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    const [collectionItems, recipes] = await Promise.all([
      listCollectionItems(),
      Promise.resolve(getSavedRecipes()),
    ]);
    setItems(collectionItems);
    setSavedRecipes(recipes);
    void refreshFolders().catch(() => undefined);
  }, [refreshFolders]);

  useEffect(() => {
    setOptimisticDeletedFolderIds((previous) => {
      if (previous.size === 0) return previous;
      const existingFolderIds = new Set(folders.map((folder) => folder.id));
      const next = new Set([...previous].filter((id) => existingFolderIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [folders]);

  useEffect(() => {
    refresh();
    return subscribeCollectionUpdates(() => refresh());
  }, [refresh]);

  useEffect(() => {
    const shouldHideForInputs = (showNewFolder || showNoteEditor) && (
      collectionKeyboardFix.isKeyboardOpen || collectionKeyboardFix.focusWithin
    );

    if (selectedItem || shouldHideForInputs) hideNav();
    else showNav();
    return () => showNav();
  }, [
    selectedItem,
    showNewFolder,
    showNoteEditor,
    collectionKeyboardFix.isKeyboardOpen,
    collectionKeyboardFix.focusWithin,
    hideNav,
    showNav,
  ]);

  useEffect(() => {
    if (!showNoteEditor || editingNoteId) return;
    const draft: NoteDraftState = sanitizeNoteDraftForStorage({
      title: noteTitle,
      markdown: noteMarkdown,
      folderId: noteFolderId,
    });
    try {
      localStorage.setItem(NOTE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore quota/private-mode write failures and keep in-memory draft only.
    }
  }, [showNoteEditor, editingNoteId, noteTitle, noteMarkdown, noteFolderId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(normalizeSearchValue(noteSearchQuery));
    }, 160);
    return () => clearTimeout(timer);
  }, [noteSearchQuery]);

  useEffect(() => {
    setIsNoteEditingInModal(false);
    setModalNoteTitleDraft('');
    setModalNoteBodyDraft('');
    setModalNoteFolderDraft('');
    setSavingModalNote(false);
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!selectedItem) return;
    const timer = window.setTimeout(() => {
      itemDetailRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [selectedItem]);

  const requestDeleteItem = (item: CollectionItem) => {
    setPendingDelete({ kind: 'item', id: item.id, label: item.title || t.aiCanvas });
  };

  const requestDeleteRecipe = (recipe: any) => {
    setPendingDelete({ kind: 'recipe', id: recipe.id, label: recipe.name || t.untitledRecipe });
  };

  const closeCreateFolder = useCallback(() => {
    setShowNewFolder(false);
    setNewFolderName('');
    setIsCreatingFolder(false);
  }, []);

  const focusCreateFolderInput = useCallback(() => {
    requestAnimationFrame(() => {
      newFolderInputRef.current?.focus();
      setTimeout(() => newFolderInputRef.current?.focus(), 40);
    });
  }, []);

  const handleCreateFolder = async () => {
    if (isCreatingFolder) return;
    const nextName = newFolderName.trim();
    if (!nextName) return;

    setIsCreatingFolder(true);
    try {
      await addFolder(nextName);
      setNewFolderName('');
      closeCreateFolder();
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameFolderValue.trim()) return;
    await editFolder(id, renameFolderValue.trim());
    setRenamingFolderId(null);
    setRenameFolderValue('');
  };

  const openCreateFolder = useCallback(() => {
    setShowNoteEditor(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteMarkdown('');
    setNoteFolderId('');
    setFolderMenuId(null);
    setRenamingFolderId(null);
    setRenameFolderValue('');
    setShowNewFolder(true);
    requestAnimationFrame(() => {
      pageTopAnchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
      focusCreateFolderInput();
    });
  }, [focusCreateFolderInput]);

  const requestDeleteFolder = (id: string, label: string) => {
    setPendingDelete({ kind: 'folder', id, label });
    setFolderMenuId(null);
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete || deleteBusy) return;
    const target = pendingDelete;
    setDeleteBusy(true);
    try {
      if (target.kind === 'item') {
        setItems((currentItems) => currentItems.filter((item) => item.id !== target.id));
        if (selectedItem?.id === target.id) {
          setSelectedItem(null);
          setIsNoteEditingInModal(false);
          setModalNoteTitleDraft('');
          setModalNoteBodyDraft('');
          setModalNoteFolderDraft('');
        }
        setPendingDelete(null);
        setDeleteBusy(false);
        void softDeleteCollectionItem(target.id)
          .then(() => {
            void refresh().catch(() => undefined);
          })
          .catch(() => {
            void refresh().catch(() => undefined);
          });
        return;
      } else if (target.kind === 'recipe') {
        deleteRecipe(target.id);
        setSavedRecipes((currentRecipes) => currentRecipes.filter((recipe: any) => recipe.id !== target.id));
      } else {
        setOptimisticDeletedFolderIds((currentIds) => new Set(currentIds).add(target.id));
        if (selectedFolderId === target.id) setSelectedFolderId(null);
        setPendingDelete(null);
        setDeleteBusy(false);
        void softDeleteCollectionFolder(target.id)
          .then(() => {
            void refreshFolders().catch(() => undefined);
            void refresh().catch(() => undefined);
          })
          .catch(() => {
            void refreshFolders().catch(() => undefined);
            void refresh().catch(() => undefined);
          });
        return;
      }
      setPendingDelete(null);
      void refresh().catch(() => undefined);
    } finally {
      setDeleteBusy(false);
    }
  };

  const closeNoteEditor = useCallback(() => {
    setShowNoteEditor(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteMarkdown('');
    setNoteFolderId('');
    setSavingNote(false);
  }, []);

  const closeSelectedItem = useCallback(() => {
    setSelectedItem(null);
    setIsNoteEditingInModal(false);
    setModalNoteTitleDraft('');
    setModalNoteBodyDraft('');
    setModalNoteFolderDraft('');
    setSavingModalNote(false);
  }, []);

  const openCreateNote = useCallback(() => {
    setSelectedItem(null);
    setShowNewFolder(false);
    setFolderMenuId(null);
    setRenamingFolderId(null);
    setRenameFolderValue('');
    setEditingNoteId(null);

    let rawDraft: string | null = null;
    try {
      rawDraft = localStorage.getItem(NOTE_DRAFT_STORAGE_KEY);
    } catch {
      rawDraft = null;
    }
    const loadedDraft = parseNoteDraftFromStorage(rawDraft);

    setNoteTitle(loadedDraft.title);
    setNoteMarkdown(loadedDraft.markdown);
    setNoteFolderId(loadedDraft.folderId);
    setShowNoteEditor(true);
    requestAnimationFrame(() => {
      pageTopAnchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, []);

  const openEditNote = useCallback((item: CollectionItem) => {
    if (!isNoteItem(item)) return;
    setShowNoteEditor(false);
    setShowNewFolder(false);
    setEditingNoteId(null);
    setSelectedItem(item);
    setIsNoteEditingInModal(true);
    setModalNoteTitleDraft(item.title || '');
    setModalNoteBodyDraft((item.content as any)?.markdown || '');
    setModalNoteFolderDraft(item.folderId || '');
  }, []);

  const beginModalNoteEdit = useCallback((item: CollectionItem) => {
    if (!isNoteItem(item)) return;
    setIsNoteEditingInModal(true);
    setModalNoteTitleDraft(item.title || '');
    setModalNoteBodyDraft((item.content as any)?.markdown || '');
    setModalNoteFolderDraft(item.folderId || '');
  }, []);

  const cancelModalNoteEdit = useCallback(() => {
    setIsNoteEditingInModal(false);
    setModalNoteTitleDraft('');
    setModalNoteBodyDraft('');
    setModalNoteFolderDraft('');
    setSavingModalNote(false);
  }, []);

  const handleSaveModalNote = useCallback(async () => {
    if (!selectedItem || !isNoteItem(selectedItem) || !isNoteEditingInModal || savingModalNote) return;
    const nextTitle = modalNoteTitleDraft.trim();
    const nextMarkdown = modalNoteBodyDraft.trim();
    if (!nextTitle || !nextMarkdown) return;

    setSavingModalNote(true);
    try {
      const updated = await updateCollectionItem(selectedItem.id, {
        title: nextTitle,
        folderId: modalNoteFolderDraft || undefined,
        content: {
          markdown: nextMarkdown,
          kind: 'note',
        },
      });
      await refresh();
      if (updated) {
        setSelectedItem(updated);
      }
      cancelModalNoteEdit();
    } finally {
      setSavingModalNote(false);
    }
  }, [
    selectedItem,
    isNoteEditingInModal,
    savingModalNote,
    modalNoteTitleDraft,
    modalNoteBodyDraft,
    modalNoteFolderDraft,
    refresh,
    cancelModalNoteEdit,
  ]);

  const handleSaveNote = useCallback(async () => {
    const nextTitle = noteTitle.trim();
    const nextMarkdown = noteMarkdown.trim();
    if (!nextTitle || !nextMarkdown || savingNote) return;

    setSavingNote(true);
    try {
      if (editingNoteId) {
        await updateCollectionItem(editingNoteId, {
          title: nextTitle,
          folderId: noteFolderId || undefined,
          content: {
            markdown: nextMarkdown,
            kind: 'note',
          },
        });
      } else {
        const noteItem = createNoteCollectionItem({
          title: nextTitle,
          markdown: nextMarkdown,
          folderId: noteFolderId || undefined,
        });
        await saveCollectionItem(noteItem);
        localStorage.removeItem(NOTE_DRAFT_STORAGE_KEY);
      }
      closeNoteEditor();
      await refresh();
    } finally {
      setSavingNote(false);
    }
  }, [noteTitle, noteMarkdown, savingNote, editingNoteId, noteFolderId, closeNoteEditor, refresh]);

  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === 'note' && !isNoteItem(item)) return false;
    if (filter !== 'all' && filter !== 'note' && item.type !== filter) return false;

    if (debouncedSearchQuery) {
      const inTitle = normalizeSearchValue(item.title || '').includes(debouncedSearchQuery);
      const rawBody = item.type === 'ai_canvas'
        ? String((item.content as any)?.markdown || '')
        : String((item.content as any)?.description || '');
      const inBody = normalizeSearchValue(rawBody).includes(debouncedSearchQuery);
      if (!inTitle && !inBody) return false;
    }

    if (selectedFolderId && item.folderId !== selectedFolderId) return false;
    if (!selectedFolderId && !item.folderId) return true;
    if (selectedFolderId) return true;
    return true;
  }), [items, filter, debouncedSearchQuery, selectedFolderId]);

  const getItemCount = (folderId: string | 'uncategorized') => {
    if (folderId === 'uncategorized') return items.filter((i) => !i.folderId).length;
    return items.filter((i) => i.folderId === folderId).length;
  };

  const filterBtnClass = (f: FilterType) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-emerald-100 text-emerald-950 shadow-[0_4px_16px_rgba(4,120,87,0.16)]' : 'bg-surface-alpha text-secondary hover:text-primary'}`;
  const getItemLabel = (item: CollectionItem) => {
    if (isNoteItem(item)) return t.notes;
    if (isLatteArtItem(item)) return t.scannerModeLatte || t.aiCanvas;
    return item.type === 'recipe' ? (t.recipes) : (t.aiCanvas);
  };

  const visibleFolders = useMemo(
    () => folders.filter((folder) => !optimisticDeletedFolderIds.has(folder.id)),
    [folders, optimisticDeletedFolderIds]
  );
  const hasContent = items.length > 0 || savedRecipes.length > 0 || visibleFolders.length > 0;
  const noteCount = items.filter((item) => isNoteItem(item)).length;
  const isInFolder = selectedFolderId !== null;

  return (
    <motion.div
      initial={disableEntranceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={disableEntranceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="px-4 sm:px-6 max-w-4xl lg:max-w-[88rem] mx-auto page-container desktop-noise-bg"
    >
      <div ref={pageTopAnchorRef} />
      {/* Header */}
      <header className="mb-6 flex justify-between items-start shrink-0 panel-soft rounded-3xl px-4 py-4">
        <div className="flex items-center gap-3">
          {isInFolder && (
            <button
              type="button"
              onClick={() => { setSelectedFolderId(null); setSelectedItem(null); }}
              className="p-2 rounded-xl glass-button"
              aria-label={t.folderBack || t.close}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2 shadow-inner">
              <BookOpen size={24} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">{t.collection}</h1>
            <p className="text-secondary text-base">
              {isInFolder ? visibleFolders.find((f) => f.id === selectedFolderId)?.name || t.folderLabel : t.collectionSubtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateNote}
            className="h-11 px-4 rounded-xl glass-button hover:scale-105 transition-transform inline-flex items-center gap-2 text-sm font-medium"
            title={t.newNote}
          >
            <NotebookPen size={16} />
            <span>{t.newNote}</span>
          </button>
          <button
            type="button"
            onClick={openCreateFolder}
            className="icon-touch-button glass-button hover:scale-105 transition-transform"
            title={t.createFolder}
            aria-label={t.createFolder}
          >
            <FolderPlus size={20} />
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-2 shrink-0 panel-soft rounded-2xl px-2 py-2">
        <button type="button" onClick={() => setFilter('all')} className={`${filterBtnClass('all')} whitespace-nowrap`}>{t.allItems}</button>
        <button type="button" onClick={() => setFilter('recipe')} className={`${filterBtnClass('recipe')} whitespace-nowrap`}>{t.recipes}</button>
        <button type="button" onClick={() => setFilter('ai_canvas')} className={`${filterBtnClass('ai_canvas')} whitespace-nowrap`}>{t.aiCanvas}</button>
        <button type="button" onClick={() => setFilter('note')} className={`${filterBtnClass('note')} whitespace-nowrap`}>{t.notes} ({noteCount})</button>
      </div>

      <div className="mb-4 panel-soft rounded-2xl px-3 py-2">
        <label className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-tertiary" />
            <input
              type="search"
              name="collection-search"
              value={noteSearchQuery}
              onChange={(e) => setNoteSearchQuery(e.target.value)}
              placeholder={t.searchNotes}
              aria-label={t.searchNotes}
              enterKeyHint="search"
              className="w-full glass-input h-11 pl-10 pr-12 text-sm"
            />
          {noteSearchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setNoteSearchQuery('')}
              className="absolute right-1.5 h-11 w-11 rounded-xl inline-flex items-center justify-center text-tertiary hover:text-primary"
              aria-label={t.clearSearch}
            >
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      {showNoteEditor && (
        <div
          ref={noteEditorRef}
          className="mb-6 relative z-40 lg:sticky lg:top-[calc(var(--safe-top)+0.5rem)]"
          style={{
            scrollMarginTop: 'calc(var(--safe-top) + 5rem)',
            scrollMarginBottom: 'calc(var(--safe-bottom) + 1rem)',
          }}
        >
          <div className="panel-soft-strong rounded-3xl p-5 border panel-divider-subtle space-y-3">
            <p className="text-xs uppercase tracking-wide text-secondary">{editingNoteId ? t.editNote : t.newNote}</p>
              <input
                type="text"
                name="note-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder={t.noteTitle}
                aria-label={t.noteTitle}
                enterKeyHint="next"
                className="w-full glass-input h-11 px-4 text-base"
              />
              <textarea
                name="note-content"
                value={noteMarkdown}
                onChange={(e) => setNoteMarkdown(e.target.value)}
                placeholder={t.noteContent}
                aria-label={t.noteContent}
                className="w-full glass-input px-4 py-3 text-base min-h-[160px] resize-y"
              />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select
                value={noteFolderId}
                onChange={(e) => setNoteFolderId(e.target.value)}
                aria-label={t.moveToFolder}
                className="glass-input h-11 px-3 text-sm"
              >
                <option value="">{t.noFolder}</option>
                {visibleFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { void handleSaveNote(); }}
                disabled={savingNote || !noteTitle.trim() || !noteMarkdown.trim()}
                className="h-11 px-5 rounded-xl bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center min-w-[120px]"
              >
                {savingNote ? <Loader2 size={16} className="animate-spin" /> : (editingNoteId ? t.updateNote : t.saveNote)}
              </button>
              <button type="button" onClick={closeNoteEditor} className="icon-touch-button glass-button" aria-label={t.closeNoteEditor || t.close}>
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Inline Panel */}
      {showNewFolder && (
        <div
          ref={newFolderFormRef}
          className="mb-6 relative z-40 lg:sticky lg:top-[calc(var(--safe-top)+0.5rem)]"
          style={{
            scrollMarginTop: 'calc(var(--safe-top) + 5rem)',
            scrollMarginBottom: 'calc(var(--safe-bottom) + 1rem)',
          }}
        >
          <div className="panel-soft-strong rounded-3xl p-5 border panel-divider-subtle">
            <p className="text-xs uppercase tracking-wide text-secondary mb-3">{t.createFolder}</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <input
                ref={newFolderInputRef}
                type="text"
                name="collection-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreatingFolder) {
                    void handleCreateFolder();
                  }
                }}
                placeholder={t.folderName}
                aria-label={t.folderName}
                enterKeyHint="done"
                className="col-span-2 min-w-0 glass-input h-11 px-4 text-base sm:col-span-1"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { void handleCreateFolder(); }}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="h-11 min-w-0 rounded-xl bg-emerald-500 px-5 text-white font-medium disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center sm:min-w-[88px]"
              >
                {isCreatingFolder ? <Loader2 size={16} className="animate-spin" /> : (t.save)}
              </button>
              <button type="button" onClick={closeCreateFolder} className="icon-touch-button glass-button" aria-label={t.closeCreateFolder} data-testid="collection-close-create-folder">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Folder View ─── */}
      {!isInFolder && (
        <motion.div initial={disableEntranceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Folder Grid */}
          {visibleFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {visibleFolders.map((folder) => (
                <div
                  key={folder.id}
                  className={`relative group ${renamingFolderId === folder.id ? 'z-20' : ''}`}
                >
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="w-full glass-card p-5 text-left"
                    type="button"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Folder size={24} className="text-amber-500" />
                      <ChevronRight size={16} className="text-tertiary group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
                      <p className="text-xs text-secondary mt-1">{t.itemCount.replace('{count}', String(getItemCount(folder.id)))}</p>
                  </button>

                  {/* Folder hover actions */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === folder.id ? null : folder.id); }}
                    className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg bg-surface-alpha text-tertiary hover:text-primary transition-all z-10"
                    aria-label={(t.openFolderOptions || 'Open folder options') + ` ${folder.name}`}
                    aria-expanded={folderMenuId === folder.id}
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {/* Folder context menu */}
                  {folderMenuId === folder.id && (
                    <div className="absolute top-12 right-3 z-30 p-1 bg-[var(--bg-base)] rounded-xl border border-glass shadow-lg text-sm min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewFolder(false);
                          setRenamingFolderId(folder.id);
                          setRenameFolderValue(folder.name);
                          setFolderMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-alpha text-primary"
                      >
                        <Edit3 size={13} /> {t.collectionRename}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteFolder(folder.id, folder.name)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500"
                      >
                        <Trash2 size={13} /> {t.delete}
                      </button>
                    </div>
                  )}

                  {/* Folder rename inline */}
                  {renamingFolderId === folder.id && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] panel-soft rounded-2xl p-3 flex gap-2 border panel-divider-subtle shadow-2xl">
                      <input
                        value={renameFolderValue}
                        onChange={(e) => setRenameFolderValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                        className="flex-1 glass-input px-3 py-2 text-sm"
                        autoFocus
                      />
                      <button type="button" onClick={() => handleRenameFolder(folder.id)} className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium">{t.confirm}</button>
                      <button type="button" onClick={() => { setRenamingFolderId(null); setRenameFolderValue(''); }} className="icon-touch-button icon-touch-button-sm glass-button" aria-label={t.cancel}><X size={14} /></button>
                    </div>
                  )}
                </div>
              ))}

              {/* Uncategorized card */}
              <button
                type="button"
                onClick={() => setSelectedFolderId('')}
                className="glass-card p-5 text-left group border-dashed border-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <FileText size={24} className="text-secondary" />
                  <ChevronRight size={16} className="text-tertiary group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold text-sm">{t.collectionUncategorized}</h3>
                <p className="text-xs text-secondary mt-1">{t.itemCount.replace('{count}', String(getItemCount('uncategorized')))}</p>
              </button>
            </div>
          )}

          {/* Recent Items */}
          {filteredItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">{t.collectionRecentItems}</h2>
              <div className="space-y-3">
                {filteredItems.slice(0, 5).map((item) => (
                  <motion.div key={item.id} className="glass-card p-4 flex items-center gap-4 group cursor-pointer" onClick={() => setSelectedItem(item)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'recipe' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {item.type === 'recipe' ? <BookOpen size={18} /> : (isNoteItem(item) ? <NotebookPen size={18} /> : <FileText size={18} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{item.title}</h3>
                      <p className="text-xs text-secondary mt-0.5">{getItemLabel(item)}</p>
                    </div>
                    {isNoteItem(item) && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEditNote(item); }} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-tertiary hover:text-primary transition-all" aria-label={(t.editNote || 'Edit note') + ` ${item.title}`}>
                        <Edit3 size={16} />
                      </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); requestDeleteItem(item); }} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-tertiary hover:text-red-500 transition-all" aria-label={(t.delete || 'Delete') + ` ${item.title}`}>
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {filteredItems.length === 0 && debouncedSearchQuery && (
            <div className="mb-8 panel-soft rounded-2xl p-5 text-sm text-secondary">
              {t.collectionNoSearchResults}
            </div>
          )}

          {/* Legacy Recipes */}
          {savedRecipes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">{t.savedRecipes}</h2>
              <div className="space-y-3">
                {savedRecipes.map((recipe: any) => (
                  <motion.div key={recipe.id} className="glass-card p-4 flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{recipe.name || t.untitledRecipe}</h3>
                      <p className="text-xs text-secondary mt-0.5">{recipe.difficulty || t.recipes}</p>
                    </div>
                    <button type="button" onClick={() => requestDeleteRecipe(recipe)} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-tertiary hover:text-red-500 transition-all" aria-label={(t.delete || 'Delete') + ` ${recipe.name || t.untitledRecipe}`}>
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State — only when truly empty */}
          {!hasContent && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-surface-alpha flex items-center justify-center text-tertiary mb-5">
                <BookOpen size={40} />
              </div>
              <h3 className="font-semibold text-xl mb-2">{t.noItems}</h3>
              <p className="text-secondary text-base max-w-[280px]">{t.collectionEmptyBody}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Folder Contents (Inside a folder) ─── */}
      {isInFolder && (
        <motion.div initial={disableEntranceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-secondary">
                <p className="text-lg">{t.noItems}</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={disableEntranceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'recipe' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {item.type === 'recipe' ? <BookOpen size={18} /> : (isNoteItem(item) ? <NotebookPen size={18} /> : <FileText size={18} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.title}</h3>
                      <p className="text-sm text-secondary mt-1 line-clamp-2">
                        {item.type === 'recipe'
                          ? (item.content as any)?.description || ''
                          : isLatteArtItem(item)
                            ? (t.scannerLatteAfter || 'AI latte art result')
                            : (item.content as any)?.markdown?.slice(0, 120) || ''}
                      </p>
                      <p className="text-xs text-secondary mt-1">{getItemLabel(item)}</p>
                    </div>
                    {isNoteItem(item) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditNote(item); }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-tertiary hover:text-primary transition-all"
                        type="button"
                        aria-label={(t.editNote || 'Edit note') + ` ${item.title}`}
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); requestDeleteItem(item); }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-tertiary hover:text-red-500 transition-all"
                      aria-label={(t.delete || 'Delete') + ` ${item.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Item Detail Modal ─── */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => {
                if (!savingModalNote) closeSelectedItem();
              }}
            />
            <motion.div
              ref={itemDetailRef}
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed z-50 glass-card overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label={selectedItem.title || t.closeItemDetails || t.collection}
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !savingModalNote) {
                  event.preventDefault();
                  if (isNoteEditingInModal) cancelModalNoteEdit();
                  else closeSelectedItem();
                }
              }}
              style={{
                top: 'max(calc(var(--safe-top, 0px) + 1rem), 4.25rem)',
                bottom: collectionKeyboardFix.isKeyboardOpen
                  ? `calc(${collectionKeyboardFix.keyboardOffset}px + 0.5rem)`
                  : 'max(calc(var(--bottom-safe-capped, 0px) + 0.75rem), 1rem)',
                left: 'max(calc(var(--safe-left, 0px) + 0.75rem), 1rem)',
                right: 'max(calc(var(--safe-right, 0px) + 0.75rem), 1rem)',
                maxWidth: '42rem',
                marginInline: 'auto',
              }}
            >
              <div className="flex justify-between items-start gap-3 mb-4 p-6 pb-4 shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold min-w-0 break-words">{selectedItem.title}</h2>
                  {isNoteItem(selectedItem) && (
                    <p className="text-sm text-secondary mt-1">{t.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isNoteItem(selectedItem) && !isNoteEditingInModal && (
                    <button type="button" onClick={() => beginModalNoteEdit(selectedItem)} className="h-11 px-3 rounded-xl glass-button inline-flex items-center gap-2 text-sm">
                      <Edit3 size={15} />
                      <span>{t.editNote}</span>
                    </button>
                  )}
                  <button type="button" onClick={closeSelectedItem} className="icon-touch-button glass-button" aria-label={t.closeItemDetails || t.close}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              {isNoteItem(selectedItem) && (
                <div className="px-6 pb-3">
                  {isNoteEditingInModal ? (
                    <div className="space-y-2">
                      <label className="text-xs text-secondary block">{t.editNote}</label>
                      <input
                        type="text"
                        name="modal-note-title"
                        value={modalNoteTitleDraft}
                        onChange={(e) => setModalNoteTitleDraft(e.target.value)}
                        placeholder={t.noteTitle}
                        aria-label={t.noteTitle}
                        enterKeyHint="next"
                        className="w-full glass-input h-11 px-4 text-base"
                      />
                      <textarea
                        name="modal-note-content"
                        value={modalNoteBodyDraft}
                        onChange={(e) => setModalNoteBodyDraft(e.target.value)}
                        placeholder={t.noteContent}
                        aria-label={t.noteContent}
                        className="w-full glass-input px-4 py-3 text-base min-h-[180px] resize-y"
                      />
                      <select
                        value={modalNoteFolderDraft}
                        onChange={(e) => setModalNoteFolderDraft(e.target.value)}
                        aria-label={t.moveToFolder}
                        className="glass-input h-11 px-3 text-sm w-full"
                      >
                        <option value="">{t.noFolder}</option>
                        {visibleFolders.map((folder) => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelModalNoteEdit}
                          className="h-11 px-4 rounded-xl glass-button text-sm inline-flex items-center justify-center"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={() => { void handleSaveModalNote(); }}
                          disabled={savingModalNote || !modalNoteTitleDraft.trim() || !modalNoteBodyDraft.trim()}
                          className="h-11 px-4 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center min-w-[120px]"
                        >
                          {savingModalNote ? <Loader2 size={16} className="animate-spin" /> : (t.updateNote)}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="text-xs text-secondary block mb-1">{t.moveToFolder}</label>
                      <select
                        value={selectedItem.folderId || ''}
                        onChange={async (e) => {
                          await moveCollectionItemToFolder(selectedItem.id, e.target.value || undefined);
                          await refresh();
                          setSelectedItem((prev) => prev ? { ...prev, folderId: e.target.value || undefined, updatedAt: Date.now() } as CollectionItem : prev);
                        }}
                        aria-label={t.moveToFolder}
                        className="glass-input h-11 px-3 text-sm w-full"
                      >
                        <option value="">{t.noFolder}</option>
                        {visibleFolders.map((folder) => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
              <div
                className="prose prose-sm max-w-none text-primary px-6 pb-6 flex-1 overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  paddingBottom: collectionKeyboardFix.isKeyboardOpen
                    ? `calc(${collectionKeyboardFix.keyboardOffset}px + 1.25rem)`
                    : 'calc(var(--bottom-safe-capped, 0px) + 1.5rem)',
                  scrollPaddingBottom: collectionKeyboardFix.isKeyboardOpen
                    ? `calc(${collectionKeyboardFix.keyboardOffset}px + 1rem)`
                    : 'calc(var(--bottom-safe-capped, 0px) + 1rem)',
                }}
              >
                {isNoteItem(selectedItem) && isNoteEditingInModal ? null : selectedItem.type === 'ai_canvas' ? (
                  <div className="space-y-5">
                    {(selectedItem.content as any)?.imageDataUrl ? (
                      <img
                        src={(selectedItem.content as any).imageDataUrl}
                        alt={selectedItem.title}
                        className="w-full max-h-[56vh] object-contain rounded-2xl bg-surface-alpha"
                      />
                    ) : null}
                    <Markdown>{(selectedItem.content as any)?.markdown || ''}</Markdown>
                  </div>
                ) : (
                  <div>
                    <p>{(selectedItem.content as any)?.description || ''}</p>
                    {(selectedItem.content as any)?.steps?.length > 0 && (
                      <div className="mt-4">
                        <h3>{t.chatSteps}</h3>
                        <ol>
                          {(selectedItem.content as any).steps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete?.kind === 'folder'
            ? (t.deleteFolderConfirm || t.deleteFolder || t.delete)
            : pendingDelete?.kind === 'recipe'
              ? (t.deleteRecipeConfirm || t.delete)
              : (t.deleteItemConfirm || t.delete)
        }
        description={
          pendingDelete
            ? `${pendingDelete.label}. ${t.deleteActionCannotUndo || 'This cannot be undone.'}`
            : ''
        }
        confirmLabel={t.confirmDelete || t.delete}
        cancelLabel={t.cancel}
        busy={deleteBusy}
        onConfirm={confirmPendingDelete}
        onCancel={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
      />
    </motion.div>
  );
}





