const CACHE_NAME = "bilad-portal-pwa-v4";
const CORE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/default-avatar.png",
];

const REALTIME_PATHS = [
  "/attendance",
  "/qr",
  "/qr-scan",
  "/scan",
  "/leaves",
  "/users",
  "/profile",
  "/rooms",
  "/menu",
  "/events",
  "/calendar",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data
    ? event.data.json()
    : {
        title: "Bilad Portal",
        body: "Yeni bildiriminiz var.",
        url: "/",
        badgeCount: 1,
      };

  event.waitUntil(handlePush(payload));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl.href);
            return client.focus();
          }
        }

        return clients.openWindow(targetUrl.href);
      })
  );
});

async function handleNavigation(request, url) {
  try {
    return await fetch(request);
  } catch {
    if (REALTIME_PATHS.some((path) => url.pathname.startsWith(path))) {
      return caches.match("/offline.html");
    }

    return caches.match("/offline.html");
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)
  );
}

async function handlePush(payload) {
  await setBadge(payload.badgeCount);

  return self.registration.showNotification(payload.title || "Bilad Portal", {
    body: payload.body || "Yeni bildiriminiz var.",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    data: {
      url: payload.url || "/",
    },
  });
}

async function setBadge(count) {
  if (!self.navigator || !self.navigator.setAppBadge) return;

  try {
    if (count > 0) {
      await self.navigator.setAppBadge(count);
    } else if (self.navigator.clearAppBadge) {
      await self.navigator.clearAppBadge();
    }
  } catch {}
}
