import type { VercelRequest, VercelResponse } from '@vercel/node';
import accountDeleteHandler from '../server-api/account/delete.js';
import accountExportHandler from '../server-api/account/export.js';
import accountStatusHandler from '../server-api/account/status.js';
import { applyPrivateApiNoStoreHeaders } from '../server-api/_shared.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyPrivateApiNoStoreHeaders('/api/account', res);
  const path = getPath(req);
  if (path === 'status' || path === '') {
    return (accountStatusHandler as Handler)(req, res);
  }
  if (path === 'export') return (accountExportHandler as Handler)(req, res);
  if (path === 'delete') return (accountDeleteHandler as Handler)(req, res);

  return res.status(404).json({ error: 'Not found' });
}
