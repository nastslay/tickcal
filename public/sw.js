// TickCal – Service Worker
// Podbij CACHE_VERSION przy kazdym wiekszym wdrozeniu, zeby wymusic
// usuniecie starego cache u uzytkownikow.
const CACHE_VERSION = "v1";
const CACHE_NAME = `tickcal-${CACHE_VERSION}`;

// "Powloka" appki - pliki statyczne z /public, ktore maja stale nazwy
// (w przeciwienstwie do plikow z /assets budowanych przez Vite, ktore
// maja hashe w nazwie i sa cache'owane dynamicznie w runtime).
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-512x512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("tickcal-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Cache'ujemy tylko GET; reszte (POST itp.) puszczamy normalnie do sieci.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Nie ingerujemy w zapytania spoza naszego originu (np. API innych domen).
  if (url.origin !== self.location.origin) return;

  // Nawigacje (otwarcie / odswiezenie appki) - network-first,
  // z fallbackiem do cache, a gdy i tego brak - do index.html.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(
          () =>
            caches.match(request).then((cached) => cached) ||
            caches.match("/index.html")
        )
    );
    return;
  }

  // Pozostale zasoby (JS/CSS/obrazy z /assets, fonty itp.) -
  // stale-while-revalidate: oddajemy z cache od razu (jesli jest),
  // a w tle aktualizujemy cache najnowsza wersja z sieci.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
