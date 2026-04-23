import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, createRequestId } from './_shared.js';

const REGION_ALIASES: Record<string, string> = {
  id: 'Indonesia',
  indonesia: 'Indonesia',
  bn: 'Brunei',
  brunei: 'Brunei',
  sg: 'Singapore',
  singapore: 'Singapore',
  my: 'Malaysia',
  malaysia: 'Malaysia',
  global: 'Global',
};

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] || '').trim();
  return (value || '').trim();
}

export function initCatalogRequest(
  req: VercelRequest,
  res: VercelResponse,
  methods: string,
): { requestId: string } | null {
  const requestId = createRequestId(req);
  applyCors(req, res, `${methods}, OPTIONS`);
  res.setHeader('X-Request-Id', requestId);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return null;
  }

  return { requestId };
}

export function readRegion(req: VercelRequest): string | null {
  const raw = readQueryValue(req.query.region);
  if (!raw) return null;
  return REGION_ALIASES[raw.toLowerCase()] || raw;
}

export function readSearchQuery(req: VercelRequest): string {
  return readQueryValue(req.query.q);
}

export function readLimit(req: VercelRequest, fallback = 10): number {
  const raw = Number(readQueryValue(req.query.limit));
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(raw, 25));
}

export function readMode(req: VercelRequest): 'published' | 'review' {
  const raw = readQueryValue(req.query.mode).toLowerCase();
  return raw === 'review' ? 'review' : 'published';
}
