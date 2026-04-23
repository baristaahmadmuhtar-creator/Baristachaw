import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadCatalogState } from '../../lib/catalog/load.js';
import { searchCatalog } from '../../lib/catalog/search.js';
import { initCatalogRequest, readLimit, readRegion, readSearchQuery } from '../_catalog.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const init = initCatalogRequest(req, res, 'GET');
  if (!init) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, requestId: init.requestId, error: 'Method not allowed' });
  }

  const region = readRegion(req);
  if (!region) {
    return res.status(400).json({
      ok: false,
      requestId: init.requestId,
      error: 'region query parameter is required',
    });
  }

  const catalog = await loadCatalogState();
  const result = searchCatalog(catalog.drippers, region, readSearchQuery(req), readLimit(req));
  return res.status(200).json({
    ok: true,
    requestId: init.requestId,
    region,
    ...result,
  });
}
