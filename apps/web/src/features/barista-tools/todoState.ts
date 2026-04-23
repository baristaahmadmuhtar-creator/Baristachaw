export interface TodoItemState {
  id: string;
  text: string;
  done: boolean;
}

const MAX_TODO_ITEMS = 200;
const MAX_TODO_TEXT_LENGTH = 280;

function sanitizeTodoItem(value: unknown): TodoItemState | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { id?: unknown; text?: unknown; done?: unknown };
  if (typeof candidate.id !== 'string' || typeof candidate.text !== 'string' || typeof candidate.done !== 'boolean') {
    return null;
  }

  const id = candidate.id.trim();
  const text = candidate.text.trim();
  if (!id || !text) return null;

  return {
    id: id.slice(0, 120),
    text: text.slice(0, MAX_TODO_TEXT_LENGTH),
    done: candidate.done,
  };
}

export function parseTodoItemsFromStorage(raw: string | null): TodoItemState[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_TODO_ITEMS).map(sanitizeTodoItem).filter((item): item is TodoItemState => item !== null);
  } catch {
    return [];
  }
}
