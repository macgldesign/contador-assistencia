const CACHE_NAME = 'contador-assistencia-v1.0.41';
const ASSETS = [
  '/contador-assistencia/',
  '/contador-assistencia/index.html',
  '/contador-assistencia/manifest.json'
];

// 1. Instala e força a ativação imediata do novo Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. Deleta os caches das versões antigas e assume o controle do aplicativo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estratégia Network-First: busca a versão atualizada da internet primeiro
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // Usa o cache somente se estiver offline
  );
});
