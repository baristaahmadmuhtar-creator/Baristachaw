const SHELL_CACHE = 'baristachaw-shell-v17';
const API_CACHE = 'baristachaw-api-v17';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico?v=20260423c',
  '/favicon.svg?v=20260423c',
  '/manifest.json?v=20260423c',
  '/icons/favicon-16x16.png?v=20260423c',
  '/icons/favicon-32x32.png?v=20260423c',
  '/icons/apple-touch-icon.png?v=20260423c',
  '/icons/icon-192.png?v=20260423c',
  '/icons/icon-192-maskable.png?v=20260423c',
  '/icons/icon-512.png?v=20260423c',
  '/icons/icon-512-maskable.png?v=20260423c',
  '/icons/icon-1024.png?v=20260423c',
  '/icons/google-g.png?v=20260423c',
  '/data/ai-brew/drippers.v2026-03.json',
  '/data/ai-brew/grinders.v2026-03.json',
  '/data/ai-brew/target-profiles.v2026-03.json',
  '/data/ai-brew/processes.v2026-06.json',
  '/data/ai-brew/varieties.v2026-06.json',
  '/data/ai-brew/water-guidance.v2026-06.json',
  '/data/ai-brew/device-brew-profiles.v2026-06.json',
  '/data/ai-brew/grinder-settings.v2026-06.json',
  '/data/ai-brew/market-signals.v2026-06.json',
  '/data/catalog/phase1/meta.json',
  '/data/catalog/phase1/waters.catalog.json',
  '/data/catalog/phase1/waters.search.json',
  '/data/catalog/phase1/drippers.search.json',
  '/data/catalog/phase1/grinders.search.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name !== SHELL_CACHE && name !== API_CACHE)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirstApi(request, url) {
  try {
    const response = await fetch(request);
    if (
      response.ok
      && request.method === 'GET'
      && !url.pathname.startsWith('/api/auth/')
    ) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.method === 'GET' && !url.pathname.startsWith('/api/auth/')) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return new Response(
      JSON.stringify({ error: 'Offline. Please reconnect and try again.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && request.method === 'GET') {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match('/index.html');
    if (cached) return cached;
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request, url));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstStatic(request));
});
