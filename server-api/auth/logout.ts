import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, createRequestId, enforceTrustedRequestOrigin } from '../_shared.js';

function buildCookieAttributes(options: {
    maxAgeSeconds: number;
    secure: boolean;
    sameSite: 'lax' | 'none' | 'strict';
}): string {
    const sameSite = options.sameSite === 'none'
        ? 'None'
        : options.sameSite === 'strict'
            ? 'Strict'
            : 'Lax';
    return [
        'Path=/',
        `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
        'HttpOnly',
        options.secure ? 'Secure' : '',
        `SameSite=${sameSite}`,
    ]
        .filter(Boolean)
        .join('; ');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
    const requestId = createRequestId(req);
    applyCors(req, res, 'POST, OPTIONS');
    res.setHeader('X-Request-Id', requestId);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
    }
    if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    res.setHeader('Set-Cookie', [
        `auth_token=; ${buildCookieAttributes({
            maxAgeSeconds: 0,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        })}`,
        `oauth_state=; ${buildCookieAttributes({
            maxAgeSeconds: 0,
            secure: isProduction,
            sameSite: 'lax',
        })}`,
        `oauth_return_to=; ${buildCookieAttributes({
            maxAgeSeconds: 0,
            secure: isProduction,
            sameSite: 'lax',
        })}`,
        `oauth_provider=; ${buildCookieAttributes({
            maxAgeSeconds: 0,
            secure: isProduction,
            sameSite: 'lax',
        })}`,
    ]);
    res.json({ ok: true, requestId, success: true });
}
