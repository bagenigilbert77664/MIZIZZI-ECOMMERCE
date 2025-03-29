// Service Worker for caching and offline support

const CACHE_NAME = "mizizzi-cache-v1"
const RUNTIME_CACHE = "runtime-cache"

// Resources to cache on install
const PRECACHE_URLS = ["/", "/offline", "/placeholder.svg", "/fonts/inter-var.woff2", "/favicon.ico"]

// Install event - precache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName))
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete)
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return caches.open(RUNTIME_CACHE).then((cache) => {
          return fetch(event.request)
            .then((response) => {
              // Cache valid responses
              if (response.status === 200) {
                // Clone the response as it can only be consumed once
                const responseToCache = response.clone()
                cache.put(event.request, responseToCache)
              }
              return response
            })
            .catch(() => {
              // If the network is unavailable, try to return the offline page
              if (event.request.mode === "navigate") {
                return caches.match("/offline")
              }
              // For images, return a placeholder
              if (event.request.destination === "image") {
                return caches.match("/placeholder.svg")
              }
              return null
            })
        })
      }),
    )
  }
})

