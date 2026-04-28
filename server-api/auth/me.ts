import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../_shared.js';
import { getAdminAccess } from '../admin/_access.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res, 'GET, OPTIONS');
    const softQuery = Array.isArray(req.query.soft) ? req.query.soft[0] : req.query.soft;
    const soft = softQuery === '1';

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authResult = requireAuth(req);
    if (authResult.ok === false) {
        if (soft && (authResult.errorCode === 'auth_required' || authResult.errorCode === 'server_misconfigured')) {
            return res.status(200).json({
                authenticated: false,
                user: null,
            });
        }
        const hint = authResult.errorCode === 'server_misconfigured'
            ? 'Set JWT_SECRET in the active environment.'
            : undefined;
        return res.status(authResult.statusCode).json({
            error: authResult.error,
            errorCode: authResult.errorCode,
            hint,
        });
    }

    const session = {
        issuedAt: authResult.auth.sessionIssuedAt,
        expiresAt: authResult.auth.sessionExpiresAt,
    };
    const baseUser = {
        ...(authResult.auth.user || { id: authResult.auth.userId }),
        sessionIssuedAt: session.issuedAt,
        sessionExpiresAt: session.expiresAt,
    };
    const admin = getAdminAccess(authResult.auth);
    const user = admin.isAdmin
        ? {
            ...baseUser,
            role: admin.role,
            isAdmin: true,
        }
        : baseUser;
    return res.json({ authenticated: true, user, session });
}
