
const CACHE="domzor-v4-20260724-2";
const ASSETS=[
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/pricing.html",
  "/pricing.css",
  "/pricing.js?v=20260724-2",
  "/legal-terms.html",
  "/terms.js?v=20260724-2",
  "/offline.html"
];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).catch(()=>undefined)
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;

  const url=new URL(event.request.url);
  const isDynamicAsset=
    url.pathname.endsWith("/pricing.js") ||
    url.pathname.endsWith("/terms.js") ||
    url.pathname.endsWith("/pricing.html") ||
    url.pathname.endsWith("/legal-terms.html");

  if(isDynamicAsset){
    event.respondWith(
      fetch(event.request,{cache:"no-store"})
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return response;
        })
        .catch(()=>caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(()=>caches.match(event.request).then(response=>response||caches.match("/offline.html")))
  );
});
