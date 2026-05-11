const CACHE_NAME = 'ABSENSI-JSKN-V1.4';
const URLS_TO_CACHE = [
  '/absensi-JSKN/',
  '/absensi-JSKN/index.html',
  '/absensi-JSKN/app.js',
  '/absensi-JSKN/manifest.json',
  '/absensi-JSKN/icon-192.png',
  '/absensi-JSKN/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k!== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('nominatim.openstreetmap.org')) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
