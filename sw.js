const CACHE_NAME = "nail-studio-pwa-v309-final-reset";
const ASSETS = ["./", "index.html", "style.css?v=3.09-final", "app.js?v=3.09-final", "manifest.json", "logo-192.png", "logo-512.png", "logo-header.png", "lotus-lt-system-logo.png"];
self.addEventListener("install", event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(()=>{})); });
self.addEventListener("activate", event => { event.waitUntil((async()=>{ const names=await caches.keys(); await Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))); await self.clients.claim(); })()); });
self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  event.respondWith((async()=>{
    try{
      const url=new URL(event.request.url);
      if(url.pathname.endsWith("index.html") || url.pathname.endsWith("app.js") || url.pathname.endsWith("style.css") || url.pathname.endsWith("sw.js")){
        return await fetch(event.request, {cache:"no-store"});
      }
      return await fetch(event.request);
    }catch(e){
      const cached=await caches.match(event.request);
      return cached || Response.error();
    }
  })());
});
