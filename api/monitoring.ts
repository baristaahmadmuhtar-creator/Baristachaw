import type { VercelRequest, VercelResponse } from '@vercel/node';
import errorHandler from '../server-api/monitoring/error.js';
import { applyPrivateApiNoStoreHeaders } from '../server-api/_shared.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyPrivateApiNoStoreHeaders('/api/monitoring', res);
  const path = getPath(req);
  if (path === 'error' || path === '') return (errorHandler as Handler)(req, res);
  return res.status(404).json({ error: 'Not found' });
}
