// Excellence Académie — Service Worker
// Stratégie corrigée : ne JAMAIS servir un index.html ni un chunk obsolète.
// (La v2 faisait du cache-first sur tout → "Failed to fetch dynamically imported module" après chaque déploiement)
const CACHE_NAME = "exacademie-v3";
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data = { title: "Excellence Académie", body: "", url: "/", icon: "/images/logo exacademy.jpeg" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      vibrate: [200, 100, 200],
      tag: "exacademie-" + Date.now(),
      renotify: true,
      data: { url: data.url },
      actions: [
        { action: "open", title: "Ouvrir", icon: data.icon },
      ],
    })
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

function isHashedAsset(pathname) {
  // Vite produit des noms fingerprintés type /assets/index-BWyebVi1.js
  return /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|mjs|png|jpe?g|webp|svg|woff2?)$/.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Jamais de cache sur les données dynamiques / médias mutables
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/media/")) {
    return;
  }

  // 1) Navigations & index.html : network-first (toujours la dernière version,
  //    le cache ne sert qu'en secours hors-ligne)
  if (request.mode === "navigate" || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // 2) Assets fingerprintés : cache-first (le hash change à chaque build)
  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // 3) Autres ressources statiques : stale-while-revalidate borné
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
