const CACHE="sky-river-run-v2";
const FILES=["./","./index.html","./css/styles.css","./js/game.js","./js/player.js","./js/enemies.js","./js/river.js","./js/effects.js","./js/ui.js","./js/audio.js","./manifest.webmanifest","./assets/sprites/player.png","./assets/sprites/helicopter.png","./assets/sprites/ufo.png","./assets/sprites/boat.png","./assets/sprites/submarine.png","./assets/sprites/truck.png","./assets/sprites/explosion.png","./assets/sprites/cloud.png","./assets/sprites/water_strip.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
