const CACHE_NAME = 'since-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Abaikan request dari extension browser atau koneksi websocket HMR Vite
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.includes('ws') || url.pathname.includes('vite') || url.pathname.includes('hot-update')) return;

  // Cache-First untuk gambar, ikon, dan font
  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Fallback offline jika tidak ada koneksi
          });
        });
      })
    );
  } else {
    // Network-First untuk dokumen, script, dan stylesheet
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
