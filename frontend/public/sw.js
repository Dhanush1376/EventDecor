// Siri Arts & Crafts — Service Worker for offline support and caching
// Cache version: update this string on each deployment to bust stale caches
const CACHE_VERSION = '2026-05-20';
const CACHE_NAME = `siri-arts-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/manifest.json',
];

// Install: cache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // API calls: network only (don't cache dynamic data)
  if (url.pathname.startsWith('/api/')) return;

  // HTML / Navigation requests: Network-First (ensures online users get the latest index.html pointing to new chunk hashes)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html') || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html') || caches.match(request);
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached); // Fallback to cache if offline

      return cached || fetchPromise;
    })
  );
});
