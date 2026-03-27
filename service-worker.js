const CACHE_NAME = "rms-cache-v1";

const urlsToCache = [
  "/",
  "/user/index.html",
  "/user/login.html",
  "/user/booking.html",
  "/admin/index.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});