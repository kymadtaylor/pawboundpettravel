/* Pawbound v4.8 beta offline shell. Does not cache external pet policy pages or Google Photos. */
const CACHE='pawbound-shell-v4-8-beta';
const ASSETS=['./','./index.html','./manifest.webmanifest','./pawbound-hero-cat-dog.jpg','./pet-placeholder.jpg','./legacy-hero.jpg','./embedded-image-1.png','./pawbound-icon.png','./apple-touch-icon.png','./icons/pawbound-192.png','./icons/pawbound-512.png','./pawbound-cloud.js','./pawbound-member-ui.js','./pawbound-auth-gate.js','./pawbound-auth-gate.css','./privacy.html','./terms.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pawbound-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const path=new URL(req.url).pathname;
 const shell=ASSETS.map(x=>new URL(x,self.registration.scope).pathname);
 if(req.mode==='navigate'){event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(new URL('./index.html',self.registration.scope),copy))}return res}).catch(()=>caches.match(new URL('./index.html',self.registration.scope))));return}
 if(!shell.includes(path))return;
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}return res})))
});
