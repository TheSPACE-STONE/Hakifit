// Service worker Haki Fit — permet à l'app de fonctionner sans connexion
// après une première ouverture réussie avec internet.
//
// IMPORTANT : CACHE_NAME change à chaque nouvelle version envoyée par Claude,
// pour forcer le remplacement du cache et éviter de rester bloqué sur une
// ancienne version de l'app.

const CACHE_NAME = "haki-fit-v2";
const LIBS_TO_CACHE = [
  "https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(LIBS_TO_CACHE))
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

  const isPage = event.request.mode === "navigate" || event.request.url.endsWith("index.html") || event.request.url.endsWith("/");

  if (isPage) {
    // Page HTML : toujours essayer le réseau en premier pour avoir la dernière version.
    // Le cache ne sert que si aucune connexion n'est disponible.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Bibliothèques externes (React, Babel...) : cache en priorité, elles changent rarement.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
