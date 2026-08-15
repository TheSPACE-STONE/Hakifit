// Service worker Haki Fit — permet à l'app de fonctionner sans connexion
// après une première ouverture réussie avec internet.
//
// IMPORTANT : CACHE_NAME change à chaque nouvelle version envoyée par Claude,
// pour forcer le remplacement du cache et éviter de rester bloqué sur une
// ancienne version de l'app.
//
// ⚠️ RÈGLE VITALE (bug corrigé le 15/08) : on ne met en cache QUE la page et les
// bibliothèques listées ci-dessous. La version précédente terminait par un
// « cache en priorité » qui attrapait TOUT le reste — y compris les requêtes
// Supabase (`GET /rest/v1/messages`, `friend_links`, `profiles`...). Ces réponses
// étaient alors figées définitivement : la messagerie affichait un instantané
// périmé, différent sur chaque appareil, et les demandes d'ami n'apparaissaient
// jamais. Ne jamais remettre de branche « attrape-tout » ici.

const CACHE_NAME = "haki-fit-v3";
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
  const req = event.request;

  // Les écritures (POST, PATCH, DELETE) ne sont jamais interceptées.
  if (req.method !== "GET") return;

  const url = req.url;

  // 1. Bibliothèques externes explicitement listées : cache en priorité,
  //    elles ne changent jamais. C'est ce qui permet le hors-ligne.
  if (LIBS_TO_CACHE.indexOf(url) !== -1) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 2. La page de l'app : réseau d'abord pour toujours avoir la dernière version,
  //    cache uniquement en secours si aucune connexion.
  const isPage = req.mode === "navigate" || url.endsWith("index.html") || url.endsWith("/");
  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. TOUT LE RESTE (Supabase en tête) : on ne fait rien. Le navigateur gère.
  //    Ne jamais ajouter de `event.respondWith` ici.
});
