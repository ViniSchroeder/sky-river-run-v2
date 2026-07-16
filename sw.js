const CACHE='sky-river-run-3d-4501';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./css/styles.css?v=4501','./js/bootstrap-loader.js?v=4501','./js/bootstrap.js?v=4500','./js/main.js?v=4500','./vendor/three.module.js?v=4500','./vendor/three.core.js']))) });
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request))));
