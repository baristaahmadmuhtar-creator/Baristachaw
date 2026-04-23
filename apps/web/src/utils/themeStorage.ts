export type AppTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'BARISTA_THEME';

function normalizeTheme(value: string | null | undefined): AppTheme | null {
  if (value === 'dark' || value === 'light') return value;
  return null;
}

export function resolveSystemTheme(): AppTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function ensureStoredTheme(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  options: { preferSystem?: boolean } = {},
): AppTheme {
  const systemTheme = resolveSystemTheme();
  try {
    const existing = normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
    if (existing && !options.preferSystem) return existing;
    if (!existing && !options.preferSystem) storage.setItem(THEME_STORAGE_KEY, systemTheme);
    return systemTheme;
  } catch {
    // Keep app boot resilient when storage is blocked (private mode/quota/policy).
    return systemTheme;
  }
}
