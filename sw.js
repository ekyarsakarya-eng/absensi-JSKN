const CACHE='absensi-jskn-v9';
const files=['./','./index.html','./app.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(files)));self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.url.includes('script.google.com'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
