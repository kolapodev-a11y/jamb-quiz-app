const CACHE_NAME = 'jamb-quiz-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/quiz.js',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  // JSON files in data/ folder (CORRECT PATHS)
  '/data/english.json',
  '/data/mathematics.json',
  '/data/physics.json',
  '/data/chemistry.json',
  '/data/biology.json',
  '/data/government.json',
  '/data/economics.json',
  '/data/literature.json',
  '/data/commerce.json',
  '/data/accounting.json',
  '/data/crs.json',
  '/data/geography.json',
  '/data/history.json',
  '/data/marketing.json',
  '/data/agric.json' // ✅ NOT agriculture.json
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
