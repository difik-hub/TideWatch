// Крипто-новости через наш прокси /api/news (CryptoPanic). Ключ — на сервере.
// Пока прокси/токена нет — вернём [] (секция покажет заглушку). Никаких падений.
const cache = { ts: 0, data: [] }

export async function fetchCryptoNews() {
  if (Date.now() - cache.ts < 300_000 && cache.data.length) return cache.data
  try {
    const res = await fetch('/api/news')
    if (!res.ok) return cache.data
    const json = await res.json()
    const results = json?.results || json?.data || []
    const items = results.slice(0, 20).map((p) => ({
      title: p.title,
      url: p.url || p.original_url || p.source?.url,
      source: p.source?.title || p.source_name || p.domain,
      published: p.published_at || p.created_at,
      image: p.image || '',
      currencies: (p.currencies || p.instruments || []).map((c) => c.code || c.symbol).filter(Boolean).slice(0, 4),
    })).filter((x) => x.title && x.url)
    if (items.length) { cache.ts = Date.now(); cache.data = items }
    return items
  } catch {
    return cache.data
  }
}
