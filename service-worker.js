// blakely-cinematics Service Worker (skeleton)
// Caches app shell for instant loads; network-first for API

const CACHE_PREFIX = 'blakely-cinematics';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-v1`;
const DATA_CACHE = `${CACHE_PREFIX}-data-v1`;

// Adjust if hosting under a subpath
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/admin/admin-mail.html',
  '/css/admin/admin-mail.css',
  '/js/admin-app.js',
];

const API_HOST = 'qtgzo3psyb.execute-api.us-east-1.amazonaws.com';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (!k.startsWith(CACHE_PREFIX) || (k !== SHELL_CACHE && k !== DATA_CACHE)) {
        return caches.delete(k);
      }
    }))).then(() => self.clients.claim())
  );
});

// Basic routing: cache-first for shell/static, network-first for API
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // API: network-first with cache fallback
  if (url.hostname === API_HOST) {
    event.respondWith(
      fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(DATA_CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Navigations: serve shell fallback if offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/admin/admin-mail.html').then((resp) => resp || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first
  const isStatic = (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.woff2'))
  );
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
        return resp;
      }))
    );
  }
});

// Messages (e.g., skipWaiting)
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync placeholder
self.addEventListener('sync', (event) => {
  if (event.tag === `${CACHE_PREFIX}-sync-mail`) {
    // Future: trigger folder refresh or queued mutations
    event.waitUntil(Promise.resolve());
  }
});

