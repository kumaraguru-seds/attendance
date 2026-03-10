// sw.js - SEDS Attendance Portal (Caching + Status Updates)
const CACHE_NAME = 'seds-attendance-v2'; // Incremented version for update
const MEETING_URL = "https://script.google.com/macros/s/AKfycbzwGbsWYyC1c3klRqpFrN3lymBx1oXNU7kp8AZe4RJzgwUj5E6g26nJgNbrfZWKsWDfGg/exec";

const FILES_TO_CACHE = [
  './', 
  './index.html',
  './style.css',
  './script.js',
  './src/img/SEDS3.png',
  './manifest.json'
];

// --- Lifecycle Events ---
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

// --- Fetch: Network-first Strategy ---
self.addEventListener('fetch', (e) => {
  if (e.request.method !== "GET") return; // Don't cache POST requests
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// --- NEW FEATURE: NOTIFICATION INTERACTIONS ---
self.addEventListener('notificationclick', function(event) {
    const action = event.action;
    const meetingId = event.notification.data.meetingId;
    event.notification.close();

    // 1. Logic for "✅ Started" button
    if (action === 'started') {
        event.waitUntil(
            fetch(MEETING_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: "updateMeetingStatus", 
                    id: meetingId, 
                    status: "In Progress" 
                })
            }).then(response => {
                console.log("Sheet Updated: In Progress");
            })
        );
    } 
    // 2. Logic for Delay buttons
    else if (action.startsWith('delay_')) {
        const mins = action.split('_')[1];
        console.log(`Delay requested: ${mins}m`);
        // Future logic: You could add a fetch here to update the Sheet time too.
    }

    // Always open/focus the app
    event.waitUntil(clients.openWindow('/'));
});

// --- Message Listener (For Timers & Updates) ---
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handles scheduling the local notifications from script.js
  if (event.data.action === 'scheduleNotify') {
    const { title, options, delay } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, options);
    }, delay);
  }
});