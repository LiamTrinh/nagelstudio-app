const CACHE = "nail-studio-pwa-v118-payment-pos-studio-id";
const FILES = ["./","./index.html","./style.css","./app.js","./studio-licenses.json","./manifest.json","./icon.svg","./logo-192.png","./logo-512.png","./logo-header.png","./lotus-lt-system-logo.png","./backup-modern-icon.png"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => e.respondWith(fetch(e.request).then(r => {
  const copy = r.clone();
  caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
  return r;
}).catch(() => caches.match(e.request))));
