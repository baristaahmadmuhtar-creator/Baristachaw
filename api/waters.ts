import type { VercelRequest, VercelResponse } from '@vercel/node';
import waterDetailHandler from '../server-api/waters/[id].js';
import waterSearchHandler from '../server-api/waters/search.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  if (path === 'search') {
    return (waterSearchHandler as Handler)(req, res);
  }

  if (path) {
    req.query.id = path;
    return (waterDetailHandler as Handler)(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
