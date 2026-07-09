const CACHE = "nail-studio-pwa-v305-hard-reset";
const FILES = [
  "./",
  "./index.html?v=3.05",
  "./style.css?v=3.05",
  "./app.js?v=3.05",
  "./studio-licenses.json",
  "./manifest.json?v=3.05",
  "./icon.svg",
  "./logo-192.png",
  "./logo-512.png",
  "./logo-header.png",
  "./lotus-lt-system-logo.png",
  "./backup-modern-icon.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => caches.open(CACHE))
      .then(cache => cache.addAll(FILES).catch(() => undefined))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);
  const isAppShell = /\/(index\.html|app\.js|style\.css|manifest\.json|sw\.js|reset-cache\.html)$/.test(url.pathname) || url.pathname.endsWith("/");

  if(isAppShell){
    event.respondWith(
      fetch(request, {cache:"no-store"})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
      return response;
    }))
  );
});
