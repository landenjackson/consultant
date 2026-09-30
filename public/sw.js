const CACHE_NAME = 'consultant-studio-v2026-argon';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
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
          // Delete all older cached versions immediately
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

// Network-first strategy for index.html and app assets to guarantee latest launch version
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // Never cache API routes

  e.respondWith(
    fetch(e.request)
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
