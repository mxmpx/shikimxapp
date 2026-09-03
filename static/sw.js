const CACHE_NAME = 'shikimx-cache-b0611d97';
const FONT_CACHE_NAME = 'shikimx-fonts-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/static/bundle.css',
  '/static/bundle.js',
  '/static/mobile.css',
  '/static/mobile.js',
  '/static/fonts/tabler-icons.woff2',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png'
];

// Install Event: Pre-cache core application shell and static assets
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

// Activate Event: Clean up stale caches from older versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== FONT_CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Intelligent offline caching strategy
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  // 1. Skip OAuth and dynamic mutation routes
  if (
    requestUrl.pathname.startsWith('/login') ||
    requestUrl.pathname.startsWith('/auth') ||
    requestUrl.pathname.startsWith('/logout') ||
    requestUrl.pathname.startsWith('/api/rate')
  ) {
    return;
  }

  // 2. Google Fonts & Web Fonts (fonts.googleapis.com, fonts.gstatic.com)
  if (requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(FONT_CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
        });
      })
    );
    return;
  }

  // 3. Static Assets (/static/*, /favicon.ico, /manifest.json)
  // Cache-First with ignoreSearch: true so query params (?v=... or ?v3.46.0) always match
  if (
    requestUrl.pathname.startsWith('/static/') ||
    requestUrl.pathname === '/favicon.ico' ||
    requestUrl.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not found with request object, try matching by pathname directly in cache
        return caches.match(requestUrl.pathname).then(cachedByPath => {
          if (cachedByPath) {
            return cachedByPath;
          }
          return fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return networkResponse;
          }).catch(err => {
            console.warn('[SW] Offline static asset fetch failed:', request.url, err);
            // Fallback match by pathname ignoring search
            return caches.match(requestUrl.pathname, { ignoreSearch: true });
          });
        });
      })
    );
    return;
  }

  // 4. Cached Images (/cache/img?url=... or /static/img_cache/*)
  if (requestUrl.pathname.startsWith('/cache/img') || requestUrl.pathname.startsWith('/static/img_cache/')) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          return caches.match('/static/icons/icon-192.png');
        });
      })
    );
    return;
  }

  // 5. HTML Navigation Requests (App Shell: /)
  if (request.mode === 'navigate' || requestUrl.pathname === '/') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', clone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('/', { ignoreSearch: true }).then(cachedIndex => {
          if (cachedIndex) {
            return cachedIndex;
          }
          return caches.match(request, { ignoreSearch: true });
        });
      })
    );
    return;
  }

  // 6. Default Network-First with Cache fallback for all other API / dynamic GET requests
  event.respondWith(
    fetch(request).catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
