import type { VercelRequest, VercelResponse } from '@vercel/node';
import syncHandler from '../server-api/library/sync.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function routePath(req: VercelRequest): string {
  const raw = req.query.route;
  if (Array.isArray(raw)) return raw.map((item) => String(item || '').trim()).filter(Boolean).join('/');
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const pathname = String(req.url || '').split('?')[0] || '';
  return pathname.replace(/^\/api\/library\/?/, '').replace(/^\/+|\/+$/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = routePath(req);
  if (path === 'sync' || path === '') {
    return (syncHandler as Handler)(req, res);
  }
  return res.status(404).json({ error: 'Not found' });
}

