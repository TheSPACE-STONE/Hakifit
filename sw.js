// Service worker Haki Fit — permet à l'app de fonctionner sans connexion
// après une première ouverture réussie avec internet.

const CACHE_NAME = "haki-fit-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Cache d'abord si disponible (rapide + fonctionne hors-ligne), sinon réseau
      return cached || fetchPromise;
    })
  );
});
