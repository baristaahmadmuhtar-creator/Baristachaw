import type { VercelRequest, VercelResponse } from '@vercel/node';
import checkoutHandler from '../server-api/billing/checkout.js';
import portalHandler from '../server-api/billing/portal.js';
import proofHandler from '../server-api/billing/proof.js';
import syncHandler from '../server-api/billing/sync.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  if (path === 'checkout') return (checkoutHandler as Handler)(req, res);
  if (path === 'portal') return (portalHandler as Handler)(req, res);
  if (path === 'proof') return (proofHandler as Handler)(req, res);
  if (path === 'sync') return (syncHandler as Handler)(req, res);

  return res.status(404).json({ error: 'Not found' });
}
