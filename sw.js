// Spark PWA Service Worker
// Handles offline caching so the app works without internet after first load

const CACHE_NAME = 'spark-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@200;300;400&display=swap'
];

// Install — cache core assets immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

// Fetch — network first for same-origin, cache first for fonts/external
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and API calls (Anthropic API, Nominatim)
  if (event.request.method !== 'GET') return;
  if (url.hostname === 'api.anthropic.com') return;
  if (url.hostname === 'nominatim.openstreetmap.org') return;

  if (url.origin === self.location.origin) {
    // Same-origin: network first, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // External (fonts, etc.): cache first, fall back to network
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        });
      })
    );
  }
});
