/* MIA v2.1 Dark — cache offline applicativo (non sincronizza dati). */
const CACHE_VERSION = 'mia-v2-1-dark';
const ROOT = new URL('./', self.registration.scope);
const APP_FILES = [
  new URL('./', ROOT).href,
  new URL('index.html', ROOT).href,
  new URL('manifest.webmanifest', ROOT).href,
  new URL('icon-192.png', ROOT).href,
  new URL('icon-512.png', ROOT).href
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION)
    .then(cache => cache.addAll(APP_FILES))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
      .filter(key => key.startsWith('mia-v') && key !== CACHE_VERSION)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (req.mode === 'navigate') {
    // Cache-first: after installation app opens without downloading code again.
    // Browser may still check for updated service worker when online.
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy=res.clone(); event.waitUntil(caches.open(CACHE_VERSION).then(c=>c.put(req,copy))); }
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match(new URL('index.html', ROOT).href))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)
    .then(res => {
      if (res.ok) {
        const copy=res.clone();
        event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.put(req,copy)));
      }
      return res;
    })));
});
