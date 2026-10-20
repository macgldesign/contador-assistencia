const CACHE_NAME = 'contador-assistencia-v1.1.0';
// Fontes ficam num cache à parte para sobreviver às atualizações do app
const FONT_CACHE = 'contador-assistencia-fonts-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NETWORK_TIMEOUT_MS = 4000;

const ASSETS = [
  '/contador-assistencia/',
  '/contador-assistencia/index.html',
  '/contador-assistencia/manifest.json'
];

// 1. Instala e força a ativação imediata do novo Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache: 'reload' ignora o cache HTTP (GitHub Pages guarda por ~10 min),
      // garantindo que a versão nova do app seja a que fica salva offline
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

// 2. Deleta os caches das versões antigas e assume o controle do aplicativo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== FONT_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estratégias de busca
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Fontes do Google: cache primeiro (raramente mudam) -> funciona offline
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontsCacheFirst(request));
    return;
  }

  // Qualquer outro site externo segue o caminho normal do navegador
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

// Rede primeiro (traz a versão mais nova). Se estiver offline OU a rede demorar
// demais (sinal fraco no salão), usa o que está salvo.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const appShell = await cache.match('/contador-assistencia/index.html');
      if (appShell) return appShell;
    }
    throw err;
  }
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

async function fontsCacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  // O CSS das fontes chega como resposta "opaque" (sem CORS); também vale guardar
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone());
  }
  return response;
}
