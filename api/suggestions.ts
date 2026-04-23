import type { VercelRequest, VercelResponse } from '@vercel/node';
import brandSuggestionHandler from '../server-api/suggestions/brand.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path;
  const path = Array.isArray(raw) ? raw.join('/').trim() : String(raw || '').trim();
  if (path !== 'brand') {
    return res.status(404).json({ error: 'Not found' });
  }
  return brandSuggestionHandler(req, res);
}
