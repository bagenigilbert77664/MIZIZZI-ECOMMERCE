// Service Worker for caching and offline support
const CACHE_NAME = "mizizzi-cache-v1"
const urlsToCache = ["/", "/offline", "/placeholder.svg", "/favicon.ico", "/manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
})

self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (
    !event.request.url.startsWith(self.location.origin) ||
    event.request.method !== "GET" ||
    event.request.url.includes("/api/")
  ) {
    return
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }

        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.mode === "navigate") {
          return caches.match("/offline")
        }

        // For images, return a placeholder
        if (event.request.destination === "image") {
          return caches.match("/placeholder.svg")
        }

        return new Response("Network error happened", {
          status: 408,
          headers: { "Content-Type": "text/plain" },
        })
      }),
  )
})

// Clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

