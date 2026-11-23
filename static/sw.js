const CACHE_NAME = 'shikimx-v10-full-site-turbo';
const FONT_CACHE_NAME = 'shikimx-fonts-v1';
const IMAGE_CACHE_NAME = 'shikimx-images-v1';
const API_CACHE_NAME = 'shikimx-api-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/css/tabler-icons.min.css',
  '/static/css/fonts.css',
  '/static/fonts/tabler-icons.woff2'
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
    (async () => {
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (e) {}
      }
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== FONT_CACHE_NAME && key !== IMAGE_CACHE_NAME && key !== API_CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })()
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

  // 1. Skip external cross-origin requests (e.g. Shikimori CDN images, external posters) so the browser
  // loads them directly via native HTTP/2 multiplexing without Service Worker thread bottleneck
  if (
    requestUrl.origin !== self.location.origin &&
    requestUrl.hostname !== 'fonts.googleapis.com' &&
    requestUrl.hostname !== 'fonts.gstatic.com'
  ) {
    return;
  }

  // 2. Skip OAuth and dynamic mutation routes
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
    requestUrl.pathname.startsWith('/static/dist/') ||
    requestUrl.pathname.startsWith('/static/bundle.') ||
    requestUrl.pathname.startsWith('/static/mobile.') ||
    requestUrl.pathname.startsWith('/static/fonts/') ||
    requestUrl.pathname.startsWith('/static/icons/') ||
    requestUrl.pathname.startsWith('/static/css/') ||
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

  // 4. Cached Images (Local image proxy & direct Shikimori / external CDN image assets)
  const isImageRequest =
    request.destination === 'image' ||
    requestUrl.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|avif)($|\?)/i) ||
    requestUrl.hostname.includes('shikimori') ||
    requestUrl.pathname.startsWith('/cache/img') ||
    requestUrl.pathname.startsWith('/static/img_cache/');

  if (isImageRequest) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(networkResponse => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return cachedResponse || new Response('', { status: 404, statusText: 'Image Not Cached' });
          });
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

  // 6. Stale-While-Revalidate for Anime, Manga, Characters, Catalog, Explore, Calendar, Top100, News (Instant 0-2ms response)
  const isCachableApiEndpoint =
    request.method === 'GET' &&
    requestUrl.origin === self.location.origin &&
    (
      (requestUrl.pathname.startsWith('/api/anime/') && !requestUrl.pathname.includes('/user_rate')) ||
      (requestUrl.pathname.startsWith('/api/manga/') && !requestUrl.pathname.includes('/user_rate')) ||
      requestUrl.pathname.startsWith('/api/character/') ||
      requestUrl.pathname.startsWith('/api/club/') ||
      requestUrl.pathname.startsWith('/api/catalog') ||
      requestUrl.pathname.startsWith('/api/tab/explore') ||
      requestUrl.pathname.startsWith('/api/calendar') ||
      requestUrl.pathname.startsWith('/api/top100') ||
      requestUrl.pathname.startsWith('/api/news') ||
      requestUrl.pathname.startsWith('/api/about') ||
      requestUrl.pathname.startsWith('/api/recommendations')
    );

  if (isCachableApiEndpoint) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const networkFetch = fetch(request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

  // 7. Default Network-First with Cache fallback for all other API / dynamic GET requests (exact URL match)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
