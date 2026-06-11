import type { VercelRequest, VercelResponse } from '@vercel/node';
import { persistCatalogSuggestion } from '../../lib/catalog/suggestions.js';
import { initCatalogRequest } from '../_catalog.js';
import {
  applyRateLimitHeaders,
  checkRateLimit,
  enforceTrustedRequestOrigin,
} from '../_shared.js';

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

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const init = initCatalogRequest(req, res, 'POST');
  if (!init) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId: init.requestId, error: 'Method not allowed' });
  }
  if (!enforceTrustedRequestOrigin(req, res, init.requestId)) return;

  const rateLimit = checkRateLimit(req, '/api/suggestions/brand', 'anonymous', {
    maxRequests: 10,
    windowMs: 15 * 60_000,
    burstMaxRequests: 3,
    burstWindowMs: 10_000,
  });
  applyRateLimitHeaders(res, rateLimit);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId: init.requestId,
      error: 'Too many suggestions. Please try again later.',
    });
  }

  const body = parseBody(req.body);
  const kind = body.kind;
  if (kind !== 'water' && kind !== 'dripper' && kind !== 'grinder') {
    return res.status(400).json({
      ok: false,
      requestId: init.requestId,
      error: 'kind must be water, dripper, or grinder',
    });
  }

  const brand = cleanText(body.brand, 140) || (kind === 'water' ? '' : 'Unspecified');
  const region = cleanText(body.region, 120) || (kind === 'water' ? '' : 'Unspecified');
  const model = cleanText(body.model, 180);
  const notes = cleanText(body.notes, 1000);

  if (!brand || !region || (kind !== 'water' && !model)) {
    return res.status(400).json({
      ok: false,
      requestId: init.requestId,
      error: kind === 'water'
        ? 'brand and region are required for water suggestions'
        : 'model is required for equipment suggestions',
    });
  }

  const record = await persistCatalogSuggestion({
    kind,
    brand,
    model: model || undefined,
    region,
    notes: notes || undefined,
  });

  return res.status(202).json({
    ok: true,
    requestId: init.requestId,
    item: record,
  });
}
