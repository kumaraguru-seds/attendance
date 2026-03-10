const CACHE_NAME = 'seds-portal-v1';
const ASSETS = [
  './',
  './index.html',
  './src/img/SEDS3.png',
  // Add your CSS and JS file paths here so they work offline
  './style.css', 
  './script.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch Assets from Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

