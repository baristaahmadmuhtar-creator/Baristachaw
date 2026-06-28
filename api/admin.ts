import type { VercelRequest, VercelResponse } from '@vercel/node';
import adminManagementHandler from '../server-api/admin/management.js';
import adminProofViewHandler from '../server-api/admin/proofView.js';
import adminPricingHandler from '../server-api/admin/pricing.js';
import { applyPrivateApiNoStoreHeaders } from '../server-api/_shared.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyPrivateApiNoStoreHeaders('/api/admin', res);
  const path = getPath(req);
  if (path === 'management' || path === '') {
    return (adminManagementHandler as Handler)(req, res);
  }
  if (path === 'proof-view' || path === 'proof_view') {
    return (adminProofViewHandler as Handler)(req, res);
  }
  if (path === 'pricing' || path.startsWith('pricing/')) {
    return (adminPricingHandler as Handler)(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
