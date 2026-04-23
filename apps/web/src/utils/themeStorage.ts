export type AppTheme = 'dark' | 'light';

const DEFAULT_THEME: AppTheme = 'dark';
const THEME_STORAGE_KEY = 'BARISTA_THEME';

function normalizeTheme(value: string | null | undefined): AppTheme | null {
  if (value === 'dark' || value === 'light') return value;
  return null;
}

export function ensureStoredTheme(storage: Pick<Storage, 'getItem' | 'setItem'>): AppTheme {
  try {
    const existing = normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
    if (existing) return existing;
    storage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
    return DEFAULT_THEME;
  } catch {
    // Keep app boot resilient when storage is blocked (private mode/quota/policy).
    return DEFAULT_THEME;
  }
}