const CACHE_NAME = 'jamb-quiz-v3'; // Changed cache name to force refresh
const urlsToCache = [
  './index.html',
  './styles.css',
  './app.js',
  './quiz.js',
  './manifest.json',
  './images/icon-192.png',
  './images/icon-512.png',
  // JSON files
  './data/english.json',
  './data/mathematics.json',
  './data/physics.json',
  './data/chemistry.json',
  './data/biology.json',
  './data/government.json',
  './data/economics.json',
  './data/literature.json',
  './data/commerce.json',
  './data/accounting.json',
  './data/crs.json',
  './data/geography.json',
  './data/history.json',
  './data/marketing.json',
  './data/agric.json' // ✅ Correct filename
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
      .catch(err => console.error('Cache failed:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Skip cross-origin requests (like WhatsApp CDN)
  if (event.request.url.startsWith('http') && 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(err => {
        console.warn('Fetch failed:', err);
        return caches.match('./index.html'); // Fallback to home
      })
  );
});
