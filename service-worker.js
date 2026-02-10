
// Service Worker for PWA functionality
const CACHE_NAME = 'jamb-quiz-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',        // ← No /css/ folder
  '/app.js',            // ← No /js/ folder
  '/quiz.js',
  '/manifest.json',
  '/service-worker.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  // Data files
  '/data/english.json',
  '/data/mathematics.json',
  '/data/physics.json',
  '/data/chemistry.json',
  '/data/biology.json',
  '/data/government.json',
  '/data/economics.json',
  '/data/literature.json',
  '/data/commerce.json',
  '/data/crs.json',
  '/data/geography.json',
  '/data/history.json',
  '/data/marketing.json',
  '/data/agriculture.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
