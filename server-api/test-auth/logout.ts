import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTestAuthLogout } from '../../lib/test-auth/handlers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleTestAuthLogout(req, res);
}
