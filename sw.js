// sw.js - Service Worker for SEDS Attendance Portal (Network-First)

// 1. Define the cache name and the essential files for the initial install.
// We use v2 to ensure any previous "urlz" or "v1" caches are cleared.
const CACHE_NAME = 'seds-attendance-v2';

const FILES_TO_CACHE = [
  './', 
  './index.html',
  './style.css',
  './script.js',
  './src/img/SEDS3.png', // Updated logo path
  './manifest.json'
];

// --- Install Event: Pre-caching critical assets ---
self.addEventListener('install', (e) => {
  console.log('[SW] Installing SEDS Mission Control...');
  self.skipWaiting();

  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching SEDS3 assets.');
      return cache.addAll(FILES_TO_CACHE);
    }),
  );
});

// --- Activate Event: Immediate control and old cache cleanup ---
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating Systems and claiming clients.');
  e.waitUntil(self.clients.claim());

  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Deletes any old caches (like the previous urlz-site-store)
        if (key !== CACHE_NAME) {
          console.log('[SW] Deleting obsolete cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// --- Fetch Event: Network-First Strategy ---
// This strategy ensures the app stays updated with your latest GitHub pushes.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If network is successful, update the cache with the new version
        const responseClone = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache successful GET requests from your domain
          if (e.request.method === "GET" && response.status === 200 && e.request.url.indexOf('http') === 0) {
              cache.put(e.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        // If the user is offline (Network fails), fall back to the cached files.
        console.log('[SW] Offline Mode: Falling back to cached SEDS assets.');
        return caches.match(e.request);
      }),
  );
});
