import type { VercelRequest, VercelResponse } from '@vercel/node';
import accountStatusHandler from '../server-api/account/status.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  if (path === 'status' || path === '') {
    return (accountStatusHandler as Handler)(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
