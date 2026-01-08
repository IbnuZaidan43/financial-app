const CACHE_NAME = 'keuangan-app-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/app-icons/icon-1024x1024.svg',
  '/app-icons/icon-512x512.png',
  '/screenshots/desktop.png',
  '/screenshots/mobile.jpg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🔧 SW: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🔧 SW: All files cached');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('🔧 SW: Cache error:', error);
        // Continue installation even if cache fails
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔧 SW: Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🔧 SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Service Worker
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Only cache GET requests
            if (event.request.method !== 'GET') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.log('🔧 SW: Cache put error:', error);
              });

            return response;
          }
        ).catch(() => {
          // Return offline page if fetch fails
          console.log('🔧 SW: Network failed, serving from cache');
          return caches.match('/');
        });
      })
  );
});

// Handle beforeinstallprompt event
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('🔧 SW: Install prompt detected');
  // Forward to client
  event.waitUntil(
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BEFORE_INSTALL_PROMPT',
          event: event
        });
      });
    })
  );
});

// Handle appinstalled event
self.addEventListener('appinstalled', (event) => {
  console.log('🔧 SW: App installed');
  // Forward to client
  event.waitUntil(
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'APP_INSTALLED'
        });
      });
    })
  );
});