const CACHE='sky-river-run-3d-4603';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./css/styles.css?v=4603','./css/mobile-4603.css?v=4603','./js/bootstrap-loader-safe.js?v=4603','./js/patches-4603.js?v=4603','./js/bootstrap-loader.js?v=4600','./js/bootstrap.js?v=4603','./js/main.js?v=4603','./vendor/three.module.js?v=4603','./vendor/three.core.js']))) });
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request))));
