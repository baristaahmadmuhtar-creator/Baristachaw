import type { VercelRequest, VercelResponse } from '@vercel/node';
import adminManagementHandler from '../server-api/admin/management.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  if (path === 'management' || path === '') {
    return (adminManagementHandler as Handler)(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
