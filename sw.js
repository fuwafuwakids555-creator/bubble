/* sw.js - ふわふわタイマー用 Service Worker
   2026-06-29
   timer.html と同じ場所に置いてください。
*/

const CACHE_NAME = "fuwafuwa-timer-cache-v20260629-1";

const FILES_TO_CACHE = [
  "./",
  "./timer.html",
  "./manifest.json",
  "./sw.js",

  "./1.wav", "./2.wav", "./3.wav", "./4.wav", "./5.wav",
  "./6.wav", "./7.wav", "./8.wav", "./9.wav", "./10.wav",
  "./11.wav", "./12.wav", "./13.wav", "./14.wav", "./15.wav",
  "./16.wav", "./17.wav", "./18.wav", "./19.wav", "./20.wav",
  "./21.wav", "./22.wav", "./23.wav", "./24.wav", "./25.wav",
  "./26.wav", "./27.wav", "./28.wav", "./29.wav", "./30.wav",
  "./31.wav", "./32.wav", "./33.wav", "./34.wav", "./35.wav",
  "./36.wav", "./37.wav", "./38.wav", "./39.wav", "./40.wav",
  "./41.wav", "./42.wav", "./43.wav", "./44.wav", "./45.wav",
  "./46.wav", "./47.wav", "./48.wav", "./49.wav", "./50.wav",

  "./ふわふわ.wav",
  "./バブル.wav",
  "./fuwafuwa.wav",
  "./bubble.wav"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
        } catch (e) {
          console.log("cache skip:", file);
        }
      }
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response("", { status: 503 });
      })
    );
    return;
  }

  if (request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(() => {
          return caches.match("./timer.html").then(cached => {
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(() => {
          return new Response("", { status: 404 });
        });
    })
  );
});