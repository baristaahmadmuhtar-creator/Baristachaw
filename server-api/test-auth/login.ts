import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTestAuthLogin } from '../../lib/test-auth/handlers.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleTestAuthLogin(req, res);
}
