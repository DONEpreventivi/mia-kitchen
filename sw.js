/* MIA v2.7 Dark - aggiornamento e utilizzo offline. */
const CACHE_VERSION = 'mia-v2-7-dark';
const ROOT = new URL('./', self.registration.scope);
const path = name => new URL(name, ROOT).href;
const ENTRY = path('index.html');
const OPTIONAL = [path('./'), path('manifest.webmanifest'), path('icon-192.png'), path('icon-512.png')];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Il file principale è indispensabile. Se un'icona manca o arriva in ritardo
    // non blocchiamo tutta l'installazione della PWA.
    await cache.add(ENTRY);
    await Promise.allSettled(OPTIONAL.map(asset => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('mia-v') && k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (req.mode === 'navigate') {
    // Quando c'è rete preferiamo l'ultima release, altrimenti il file salvato.
    event.respondWith(fetch(req).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.put(req, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(req)) || (await caches.match(ENTRY)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.put(req, copy)));
    }
    return response;
  })));
});
