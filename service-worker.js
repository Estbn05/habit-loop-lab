const CACHE_NAME = "habit-loop-lab-pwa-20260601-sync-merge";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20260601-sync-merge",
  "./app.js?v=20260601-sync-merge",
  "./manifest.webmanifest",
  "./assets/icons/app-icon.svg",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map(appUrl)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetchWithOfflineFallback(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function fetchWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(appUrl("./index.html"), response.clone());
    return response;
  } catch {
    return (await caches.match(appUrl("./index.html"))) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

function appUrl(path) {
  return new URL(path, self.registration.scope).toString();
}
