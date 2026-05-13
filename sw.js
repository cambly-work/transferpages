// Morrison Premium Transfer — Service Worker (minimal: offline fallback only)
const CACHE = 'morrison-shell-v3';
const OFFLINE_URL = '/transferpages/offline.html';
const PRECACHE = [OFFLINE_URL, '/transferpages/favicon.svg', '/transferpages/assets/style.css', '/transferpages/assets/script.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // For HTML navigations: network-first, fallback to /offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For shell assets: stale-while-revalidate
  if (PRECACHE.some((p) => req.url.endsWith(p))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((resp) => {
          caches.open(CACHE).then((cache) => cache.put(req, resp.clone()));
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
