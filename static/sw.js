const CACHE_NAME = 'shikimx-cache-v1.5.0';
const STATIC_ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/css/profile.css',
  '/static/css/rates.css',
  '/static/css/explore.css',
  '/static/css/media.css',
  '/static/css/anime.css',
  '/static/css/manga.css',
  '/static/css/friend.css',
  '/static/css/settings.css',
  '/static/js/logger.js',
  '/static/js/translations.js',
  '/static/js/core.js',
  '/static/js/anime.js',
  '/static/js/manga.js',
  '/static/js/friend.js',
  '/static/js/friends.js',
  '/static/js/profile.js',
  '/static/js/history.js',
  '/static/js/favourites.js',
  '/static/js/rates.js',
  '/static/js/explore.js',
  '/static/js/settings.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Cache addAll partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Do not cache OAuth or mutation API requests
  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/login') ||
    requestUrl.pathname.startsWith('/auth') ||
    requestUrl.pathname.startsWith('/logout') ||
    requestUrl.pathname.startsWith('/api/rate')
  ) {
    return;
  }

  // Network-first for dynamic API routes, cache-first for static CSS/JS/fonts
  if (requestUrl.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Fetch fresh copy in background
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
