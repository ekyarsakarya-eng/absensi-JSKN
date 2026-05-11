const CACHE_NAME = 'jaskin-v3'; // Naikin versinya tiap update

self.addEventListener('install', event => {
  self.skipWaiting(); // Langsung aktif, skip cache pas install
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(() => self.clients.claim())
  );
});

// Cache pas fetch aja, bukan pas install
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
