import type { VercelRequest, VercelResponse } from '@vercel/node';
import { persistCatalogSuggestion } from '../../lib/catalog/suggestions.js';
import { initCatalogRequest } from '../_catalog.js';

type SuggestionBody = {
  kind?: 'water' | 'dripper' | 'grinder';
  brand?: string;
  model?: string;
  region?: string;
  notes?: string;
};

function parseBody(body: unknown): SuggestionBody {
  if (!body || typeof body !== 'object') return {};
  return body as SuggestionBody;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const init = initCatalogRequest(req, res, 'POST');
  if (!init) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId: init.requestId, error: 'Method not allowed' });
  }

  const body = parseBody(req.body);
  const brand = (body.brand || '').trim();
  const kind = body.kind || 'water';
  const region = (body.region || '').trim();
  const model = (body.model || '').trim();

  if (!brand || !region) {
    return res.status(400).json({
      ok: false,
      requestId: init.requestId,
      error: 'brand and region are required',
    });
  }

  const record = await persistCatalogSuggestion({
    kind,
    brand,
    model: model || undefined,
    region,
    notes: (body.notes || '').trim() || undefined,
  });

  return res.status(202).json({
    ok: true,
    requestId: init.requestId,
    item: record,
  });
}
