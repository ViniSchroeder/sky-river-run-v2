const CACHE='sky-river-run-3d-4200';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./css/styles.css?v=4200','./js/main.js?v=4200','./vendor/three.module.js','./vendor/three.core.js'])))});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request))));
