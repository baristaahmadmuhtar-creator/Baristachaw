import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
type RouteMatch = { load: () => Promise<Handler>; before?: () => void };

function routeSegments(req: VercelRequest): string[] {
  const raw = req.query.route;
  if (Array.isArray(raw)) return raw.map(item => String(item || '').trim()).filter(Boolean);
  const text = String(raw || '').trim();
  if (text) return [text];

  const urlPath = String(req.url || '').split('?')[0] || '';
  const prefix = '/api/';
  const idx = urlPath.indexOf(prefix);
  if (idx >= 0) {
    const suffix = urlPath.slice(idx + prefix.length).trim();
    if (!suffix) return [];
    return suffix.split('/').map(item => item.trim()).filter(Boolean);
  }

  return [];
}

async function loadDefaultHandler(loader: () => Promise<{ default: Handler }>): Promise<Handler> {
  const module = await loader();
  return module.default as Handler;
}

const ROUTE_LOADERS: Record<string, () => Promise<{ default: Handler }>> = {
  'health': () => import('../server-api/health.js'),
  'chat': () => import('../server-api/chat.js'),
  'ai': () => import('../server-api/ai.js'),
  'waters/search': () => import('../server-api/waters/search.js'),
  'waters/[id]': () => import('../server-api/waters/[id].js'),
  'drippers/search': () => import('../server-api/drippers/search.js'),
  'grinders/search': () => import('../server-api/grinders/search.js'),
  'suggestions/brand': () => import('../server-api/suggestions/brand.js'),
  'auth/mobile': () => import('../server-api/auth/mobile/[...route].js'),
  'auth/url': () => import('../server-api/auth/url.js'),
  'auth/callback': () => import('../server-api/auth/callback.js'),
  'auth/me': () => import('../server-api/auth/me.js'),
  'auth/logout': () => import('../server-api/auth/logout.js'),
  'account/status': () => import('../server-api/account/status.js'),
  'admin/management': () => import('../server-api/admin/management.js'),
  'test-auth/login': () => import('../server-api/test-auth/login.js'),
  'test-auth/logout': () => import('../server-api/test-auth/logout.js'),
};

function matchRoute(req: VercelRequest): RouteMatch | null {
  const segments = routeSegments(req);
  const joined = segments.join('/');

  const directLoader = ROUTE_LOADERS[joined];
  if (directLoader) {
    return { load: () => loadDefaultHandler(directLoader) };
  }

  if (segments[0] === 'waters' && segments.length === 2) {
    return {
      load: () => loadDefaultHandler(ROUTE_LOADERS['waters/[id]']),
      before: () => {
        req.query.id = segments[1];
      },
    };
  }

  if (
    joined === 'auth/mobile/start'
    || joined === 'auth/mobile/callback'
    || joined === 'auth/mobile/exchange'
    || joined === 'auth/mobile/apple/exchange'
  ) {
    return { load: () => loadDefaultHandler(ROUTE_LOADERS['auth/mobile']) };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const matched = matchRoute(req);
  if (!matched) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    matched.before?.();
    const routeHandler = await matched.load();
    return routeHandler(req, res);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error || 'unknown_error');
    return res.status(500).json({
      error: 'Route handler failed',
      errorCode: 'route_handler_failed',
      details: details.slice(0, 240),
    });
  }
}
