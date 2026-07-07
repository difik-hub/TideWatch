// Простой service worker: оффлайн-кеш оболочки приложения.
// ВАЖНО: наши прокси /api/cg и /api/td — SAME-ORIGIN, поэтому их надо явно
// исключать из cache-first, иначе SW навсегда закеширует котировки (и ошибки!).
const CACHE = 'tidewatch-v5'

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

  // API-прокси (/api/cg, /api/td) — всегда сеть, НИКОГДА не кешируем в SW.
  // Свежесть данных обеспечивает edge-кеш Vercel (s-maxage), а не браузер.
  if (url.pathname.startsWith('/api/')) return

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
