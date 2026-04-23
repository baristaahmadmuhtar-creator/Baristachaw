import { Folder, FolderInput, MessageSquare, MoreHorizontal, Trash2, Edit3, X } from 'lucide-react';
import type { ChatFolder, ChatSession } from '../../types';
import { useGlobalState } from '../../context/GlobalState';

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  contextMenuId: string | null;
  renamingId: string | null;
  renameValue: string;
  movingSessionId: string | null;
  chatFolders: ChatFolder[];
  onSelect: () => void;
  onContextMenu: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameChange: (value: string) => void;
  onDelete: (id: string) => void;
  onMoveStart: (id: string) => void;
  onMoveToFolder: (sessionId: string, folderId?: string) => void;
  indent?: boolean;
}

export function SessionItem({
  session,
  isActive,
  contextMenuId,
  renamingId,
  renameValue,
  movingSessionId,
  chatFolders,
  onSelect,
  onContextMenu,
  onRename,
  onRenameSubmit,
  onRenameChange,
  onDelete,
  onMoveStart,
  onMoveToFolder,
  indent = false,
}: SessionItemProps) {
  const { t } = useGlobalState();
  const showMenu = contextMenuId === session.id;
  const isRenaming = renamingId === session.id;
  const isMoving = movingSessionId === session.id;
  const sessionTime = new Date(session.updatedAt || session.lastMessageAt || session.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={indent ? 'pl-4' : ''}>
      <div className={`flex items-center gap-1 px-2 py-2 rounded-xl transition-all group ${isActive ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-surface-alpha text-primary'}`}>
        <button onClick={onSelect} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <MessageSquare size={13} className="shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm truncate block">{session.title}</span>
              <span className="text-[10px] text-tertiary shrink-0">{sessionTime}</span>
            </div>
            {session.preview && <p className="text-[11px] text-tertiary line-clamp-1">{session.preview}</p>}
          </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(session.id); }}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-lg text-tertiary hover:text-primary transition-all shrink-0"
          aria-label={t.chatOpenSessionOptions}
          title={t.chatOpenSessionOptions}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {showMenu && (
        <div className="mx-2 mb-1 p-1 bg-surface-alpha rounded-xl border border-glass text-sm animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => onRename(session.id, session.title)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-alpha-hover text-primary"><Edit3 size={13} /> {t.collectionRename || t.edit}</button>
          <button onClick={() => onMoveStart(session.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-alpha-hover text-primary"><FolderInput size={13} /> {t.moveToFolder}</button>
          <button onClick={() => onDelete(session.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 size={13} /> {t.delete}</button>
        </div>
      )}

      {isRenaming && (
        <div className="mx-2 mb-1 flex gap-1">
          <input value={renameValue} onChange={(e) => onRenameChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onRenameSubmit(session.id)} className="flex-1 bg-surface-alpha rounded-lg px-3 py-1.5 text-sm border-none focus:ring-1 focus:ring-blue-500/30" autoFocus />
          <button onClick={() => onRenameSubmit(session.id)} className="px-2 py-1.5 rounded-lg bg-blue-500 text-white text-xs">{t.confirm}</button>
        </div>
      )}

      {isMoving && (
        <div className="mx-2 mb-1 p-1 bg-surface-alpha rounded-xl border border-glass text-sm">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-tertiary uppercase tracking-widest">{t.moveToFolder}</div>
          {chatFolders.map((folder) => (
            <button key={folder.id} onClick={() => onMoveToFolder(session.id, folder.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-alpha-hover text-primary">
              <Folder size={13} className="text-amber-500" /> {folder.name}
            </button>
          ))}
          {session.folderId && (
            <button onClick={() => onMoveToFolder(session.id, undefined)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-alpha-hover text-secondary">
              <X size={13} /> {t.chatRemoveFromFolder}
            </button>
          )}
        </div>
      )}
    </div>
  );
}


