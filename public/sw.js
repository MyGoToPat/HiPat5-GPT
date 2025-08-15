// Minimal Service Worker for PWA offline resilience
const CACHE_NAME = 'interval-timer-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.log('Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return a basic offline page
        if (event.request.destination === 'document') {
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>Interval Timer - Offline</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: system-ui; text-align: center; padding: 2rem; }
                .offline { color: #666; }
              </style>
            </head>
            <body>
              <h1>Interval Timer</h1>
              <p class="offline">You're offline, but your timer data is saved locally.</p>
              <p>Reconnect to sync your presets.</p>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
      })
  );
});