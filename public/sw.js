const CACHE_NAME = 'consultant-studio-v1.6-' + Date.now();

// Install: Skip waiting immediately
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Activate: Delete ALL old caches immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network-First ALWAYS (fallback to cache only if offline)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
