const CACHE="lumi-home-less-double-v1-11";
const ASSETS=["./","./index.html","./styles.css","./app.js","./manifest.json","./icon-192.png","./icon-512.png"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
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
  const req=event.request;
  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put("./index.html",copy));
        return response;
      }).catch(()=>caches.match("./index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached=>{
      const network=fetch(req).then(response=>{
        if(response && response.status===200){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});

self.addEventListener("message",event=>{
  if(event.data==="SKIP_WAITING") self.skipWaiting();
});
