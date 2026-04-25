export function isDisplayableAvatarUrl(value?: string | null): value is string {
  const source = (value || '').trim();
  if (!source) return false;
  if (source.startsWith('data:image/') || source.startsWith('blob:') || source.startsWith('/')) return true;

  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(source, baseOrigin);
    if (typeof window !== 'undefined' && url.origin === window.location.origin) return true;
    return url.protocol === 'https:' && url.hostname.toLowerCase().endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}
