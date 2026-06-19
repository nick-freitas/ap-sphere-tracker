const CACHE_NAME = 'ap-sphere-tracker-v2'
const RUN_ARTIFACT_PATHS = new Set([
  '/ap-sphere-tracker/default-spoiler.txt',
  '/ap-sphere-tracker/default-tracker.txt',
  '/ap-sphere-tracker/default-seed.archipelago',
])

function isRunArtifact(request) {
  const url = new URL(request.url)
  return url.origin === self.location.origin && RUN_ARTIFACT_PATHS.has(url.pathname)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/ap-sphere-tracker/',
        '/ap-sphere-tracker/index.html',
      ])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (isRunArtifact(event.request)) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    // Network first, fall back to cache
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})
