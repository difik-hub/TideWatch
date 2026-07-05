// Кеш-прокси для CoinGecko (Vercel serverless).
// Все юзеры делят ОДИН кеш на edge (s-maxage=60): CoinGecko дёргается ~раз в
// минуту на эндпоинт со стороны Vercel, лимиты по IP юзера больше не важны.
// Путь передаётся параметром ?p=coins/markets (вложенные пути в имени функции
// Vercel в plain-функциях не поддерживает). Только известные пути — не открытый прокси.

const ALLOWED = /^(coins\/markets|search|global|exchange_rates|coins\/[a-z0-9_-]+|coins\/[a-z0-9_-]+\/market_chart)$/

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://localhost')
  const p = decodeURIComponent(u.searchParams.get('p') || '')

  if (!ALLOWED.test(p)) {
    res.status(400).json({ error: 'path not allowed' })
    return
  }

  u.searchParams.delete('p')
  const qs = u.searchParams.toString()
  const url = `https://api.coingecko.com/api/v3/${p}${qs ? `?${qs}` : ''}`

  try {
    const upstream = await fetch(url, { headers: { accept: 'application/json' } })
    if (!upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=10')
      res.status(upstream.status).json({ error: `upstream ${upstream.status}` })
      return
    }
    const data = await upstream.json()
    // 60с свежести + 10 минут stale-while-revalidate: ответ юзеру всегда мгновенный
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
    res.status(200).json(data)
  } catch {
    res.setHeader('Cache-Control', 's-maxage=5')
    res.status(502).json({ error: 'upstream unreachable' })
  }
}
