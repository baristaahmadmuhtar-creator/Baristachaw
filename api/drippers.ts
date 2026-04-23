import type { VercelRequest, VercelResponse } from '@vercel/node';
import dripperSearchHandler from '../server-api/drippers/search.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path;
  const path = Array.isArray(raw) ? raw.join('/').trim() : String(raw || '').trim();
  if (path !== 'search') {
    return res.status(404).json({ error: 'Not found' });
  }
  return dripperSearchHandler(req, res);
}
