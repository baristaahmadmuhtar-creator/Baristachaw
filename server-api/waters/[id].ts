import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadCatalogState } from '../../lib/catalog/load.js';
import { initCatalogRequest } from '../_catalog.js';

function readId(req: VercelRequest): string {
  const raw = req.query.id;
  if (Array.isArray(raw)) return (raw[0] || '').trim();
  return (raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const init = initCatalogRequest(req, res, 'GET');
  if (!init) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId: init.requestId, error: 'Method not allowed' });
  }

  const id = readId(req);
  const catalog = await loadCatalogState();
  const record = catalog.waters.find(item => item.id === id && item.published);
  if (!record) {
    return res.status(404).json({ ok: false, requestId: init.requestId, error: 'Water not found' });
  }

  return res.status(200).json({ ok: true, requestId: init.requestId, item: record });
}
