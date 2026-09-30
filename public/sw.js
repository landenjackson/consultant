const CACHE_NAME = 'consultant-studio-v2026-argon-final';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/brand/icon-192.png',
  '/brand/icon-512.png',
  '/brand/consultant_studio_official_icon.png',
  '/brand/consultant_studio_official_icon.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging stale cache:', k);
            return caches.delete(k);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Always bypass cache for live HTML and API routes
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then((cached) => cached || caches.match('/'));
      })
  );
});
