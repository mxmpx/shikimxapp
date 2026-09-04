const CACHE_NAME = 'shikimx-v2-baa79bb3';
const FONT_CACHE_NAME = 'shikimx-fonts-v1';
const IMAGE_CACHE_NAME = 'shikimx-images-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/translations.txt',
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
          .filter(key => key !== CACHE_NAME && key !== FONT_CACHE_NAME && key !== IMAGE_CACHE_NAME)
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

  // 0. Ignore non-http/https schemes (e.g. chrome-extension://, moz-extension://, blob:, data:)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
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
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(FONT_CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
        });

        // Fast fallback timeout (1.5s) so page rendering is never blocked by slow external fonts
        const timeoutPromise = new Promise(resolve => {
          setTimeout(() => {
            resolve(new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } }));
          }, 1500);
        });

        return Promise.race([fetchPromise, timeoutPromise]);
      })
    );
    return;
  }

  // 3. Static Assets (/static/*, /favicon.ico, /manifest.json)
  // Cache-First with ignoreSearch: true ONLY for static asset files (bundle.css, bundle.js, etc.)
  if (
    requestUrl.pathname.startsWith('/static/bundle.') ||
    requestUrl.pathname.startsWith('/static/mobile.') ||
    requestUrl.pathname.startsWith('/static/fonts/') ||
    requestUrl.pathname.startsWith('/static/icons/') ||
    requestUrl.pathname === '/favicon.ico' ||
    requestUrl.pathname === '/manifest.json' ||
    requestUrl.pathname === '/translations.txt'
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
            return caches.match(requestUrl.pathname, { ignoreSearch: true });
          });
        });
      })
    );
    return;
  }

  // 4. Cached Images (/cache/img?url=... or /static/img_cache/*)
  // IMPORTANT: MUST NOT use ignoreSearch: true because each image has unique ?url= query param!
  if (requestUrl.pathname.startsWith('/cache/img') || requestUrl.pathname.startsWith('/static/img_cache/')) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(IMAGE_CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // If network failed and image is not in cache, return 404 response
          return new Response('', { status: 404, statusText: 'Image Not Cached' });
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

  // 6. Default Network-First with Cache fallback for all other API / dynamic GET requests (exact URL match)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
