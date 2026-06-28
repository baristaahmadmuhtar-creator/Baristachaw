const SHELL_CACHE = 'baristachaw-shell-v24';
const API_CACHE = 'baristachaw-api-v24';

const API_CACHE_ALLOWLIST = [
  '/api/waters/search',
  '/api/drippers/search',
  '/api/grinders/search',
];

const API_CACHE_DENYLIST = [
  '/api/account',
  '/api/admin',
  '/api/auth',
  '/api/billing',
  '/api/chat',
  '/api/ai',
  '/api/health',
  '/api/geo',
  '/api/library',
  '/api/payment',
];

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico?v=20260430c',
  '/favicon.svg?v=20260430c',
  '/manifest.json?v=20260430c',
  '/icons/favicon-16x16.png?v=20260430c',
  '/icons/favicon-32x32.png?v=20260430c',
  '/icons/apple-touch-icon.png?v=20260430c',
  '/icons/icon-192.png?v=20260430c',
  '/icons/icon-192-maskable.png?v=20260430c',
  '/icons/icon-512.png?v=20260430c',
  '/icons/icon-512-maskable.png?v=20260430c',
  '/icons/icon-1024.png?v=20260430c',
  '/icons/google-g.png?v=20260430c',
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

function isSafeApiCacheRequest(url) {
  const path = url.pathname;
  if (API_CACHE_DENYLIST.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return false;
  }
  return API_CACHE_ALLOWLIST.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function networkFirstApi(request, url) {
  try {
    const response = await fetch(request);
    if (
      response.ok
      && request.method === 'GET'
      && isSafeApiCacheRequest(url)
    ) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.method === 'GET' && isSafeApiCacheRequest(url)) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return new Response(
      JSON.stringify({ error: 'Offline. Please reconnect and try again.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
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

async function networkFirstStatic(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return Response.error();
  }
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

  if (url.pathname.startsWith('/data/ai-brew/') || url.pathname.startsWith('/data/catalog/')) {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  event.respondWith(cacheFirstStatic(request));
});
