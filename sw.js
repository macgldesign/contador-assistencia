const CACHE_NAME = 'contador-assistencia-v1.0.2';
const ASSETS = [
  '/contador-assistencia/',
  '/contador-assistencia/index.html',
  '/contador-assistencia/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
