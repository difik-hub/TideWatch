// Простой service worker: оффлайн-кеш оболочки приложения.
// API CoinGecko (cross-origin) не кешируется — всегда идёт в сеть.
const CACHE = 'tidewatch-v4'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Навигация — network-first, оффлайн-фолбэк на закешированную оболочку
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // Статика того же origin — cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((resp) => {
          if (resp.ok) c.put(req, resp.clone())
          return resp
        })),
      ),
    )
  }
})
