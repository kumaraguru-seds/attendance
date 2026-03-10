const CACHE_NAME = 'seds-mission-control-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './src/img/SEDS3.png' // Your logo for the splash screen
];

// INSTALL: Pre-cache all essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Mission Control: Pre-caching System Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// ACTIVATE: Clean up old caches if the version changes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Mission Control: Purging Obsolete Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// FETCH: Network-First Strategy with Cache Fallback
// This ensures data stays fresh but the app still opens offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// NOTIFICATION: Handle incoming push events (Optional for future)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New Mission Update Available',
    icon: './src/img/SEDS3.png',
    badge: './src/img/SEDS3.png',
    vibrate: [100, 50, 100]
  };
  event.waitUntil(
    self.registration.showNotification('SEDS Attendance Portal', options)
  );
});
