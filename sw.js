const CACHE_NAME = "bubble-timer-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",

  "./1.wav","./2.wav","./3.wav","./4.wav","./5.wav",
  "./6.wav","./7.wav","./8.wav","./9.wav","./10.wav",
  "./11.wav","./12.wav","./13.wav","./14.wav","./15.wav",
  "./16.wav","./17.wav","./18.wav","./19.wav","./20.wav",
  "./21.wav","./22.wav","./23.wav","./24.wav","./25.wav",
  "./26.wav","./27.wav","./28.wav","./29.wav","./30.wav",
  "./31.wav","./32.wav","./33.wav","./34.wav","./35.wav",
  "./36.wav","./37.wav","./38.wav","./39.wav","./40.wav",
  "./41.wav","./42.wav","./43.wav","./44.wav","./45.wav",
  "./46.wav","./47.wav","./48.wav","./49.wav","./50.wav"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
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
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match("./index.html");
        });
    })
  );
});