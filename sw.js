const CACHE_NAME='absensi-jskn-v8';
const urlsToCache=['./','./index.html','./app.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.hostname.includes('script.google.com'))return;if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin){caches.open(CACHE_NAME).then(ca=>ca.put(e.request,r.clone()));}return r;}).catch(()=>caches.match('./index.html'))));});
