import type { VercelRequest } from '@vercel/node';

const LOCAL_DEFAULT_ORIGIN = 'http://localhost:3000';

function normalizeBaseUrl(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch {
    return '';
  }
}

export function resolveAuthAppUrl(req: Pick<VercelRequest, 'headers'>): string {
  const appUrl = normalizeBaseUrl(process.env.APP_URL || '');
  if (appUrl) return appUrl;

  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  if (vercelUrl) {
    const vercelOrigin = normalizeBaseUrl(`https://${vercelUrl}`);
    if (vercelOrigin) return vercelOrigin;
  }

  const hostHeader = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const host = String(hostHeader || '').trim();
  if (!host) return LOCAL_DEFAULT_ORIGIN;

  const forwardedProtoHeader = Array.isArray(req.headers['x-forwarded-proto'])
    ? req.headers['x-forwarded-proto'][0]
    : req.headers['x-forwarded-proto'];
  const proto = String(forwardedProtoHeader || '').split(',')[0]?.trim().toLowerCase() === 'https'
    ? 'https'
    : 'http';

  return normalizeBaseUrl(`${proto}://${host}`) || LOCAL_DEFAULT_ORIGIN;
}
