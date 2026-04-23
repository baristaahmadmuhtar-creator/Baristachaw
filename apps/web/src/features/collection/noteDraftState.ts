const MAX_NOTE_DRAFT_TITLE_LENGTH = 160;
const MAX_NOTE_DRAFT_MARKDOWN_LENGTH = 20_000;
const MAX_NOTE_DRAFT_FOLDER_ID_LENGTH = 120;

export type NoteDraftState = {
  title: string;
  markdown: string;
  folderId: string;
};

const DEFAULT_NOTE_DRAFT: NoteDraftState = {
  title: '',
  markdown: '',
  folderId: '',
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function sanitizeFolderId(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_NOTE_DRAFT_FOLDER_ID_LENGTH);
}

export function parseNoteDraftFromStorage(raw: string | null): NoteDraftState {
  if (!raw) return DEFAULT_NOTE_DRAFT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_NOTE_DRAFT;

    const candidate = parsed as Partial<NoteDraftState>;
    return {
      title: sanitizeText(candidate.title, MAX_NOTE_DRAFT_TITLE_LENGTH),
      markdown: sanitizeText(candidate.markdown, MAX_NOTE_DRAFT_MARKDOWN_LENGTH),
      folderId: sanitizeFolderId(candidate.folderId),
    };
  } catch {
    return DEFAULT_NOTE_DRAFT;
  }
}

export function sanitizeNoteDraftForStorage(draft: NoteDraftState): NoteDraftState {
  return {
    title: sanitizeText(draft.title, MAX_NOTE_DRAFT_TITLE_LENGTH),
    markdown: sanitizeText(draft.markdown, MAX_NOTE_DRAFT_MARKDOWN_LENGTH),
    folderId: sanitizeFolderId(draft.folderId),
  };
}
