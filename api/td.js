// Кеш-прокси для Twelve Data (акции). Ключ TD_API_KEY живёт только на сервере.
// Бесплатный тариф: 8 кредитов/мин, 800/день, каждый тикер в батче = 1 кредит.
// Поэтому список акций держим коротким (<=8) и агрессивно кешируем на edge.
// Путь идёт параметром ?p=quote|time_series (вложенные пути Vercel не поддерживает).

const ALLOWED = new Set(['quote', 'time_series'])

export default async function handler(req, res) {
  const key = process.env.TD_API_KEY
  if (!key) {
    res.status(500).json({ error: 'TD_API_KEY not set' })
    return
  }

  const u = new URL(req.url, 'http://localhost')
  const p = u.searchParams.get('p') || 'quote'
  if (!ALLOWED.has(p)) {
    res.status(400).json({ error: 'path not allowed' })
    return
  }

  u.searchParams.delete('p')
  u.searchParams.set('apikey', key)
  const url = `https://api.twelvedata.com/${p}?${u.searchParams.toString()}`

  try {
    const upstream = await fetch(url, { headers: { accept: 'application/json' } })
    const data = await upstream.json()

    // Twelve Data отдаёт 200 даже на ошибку — ловим её в теле (code/status)
    const isErr = data && (data.status === 'error' || data.code >= 400)
    if (isErr) {
      // Лимит/ошибка — короткий кеш, чтобы отдать stale и не долбить лишний раз
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=600')
      res.status(200).json(data) // клиент сам покажет stale/last-good
      return
    }

    // Свежесть зависит от того, открыт ли рынок: закрыт — можно кешировать надолго
    let open = false
    if (p === 'quote') {
      const rows = Object.values(data).filter((v) => v && typeof v === 'object')
      open = rows.some((r) => r.is_market_open === true)
    }
    const sMax = p === 'time_series' ? 3600 : open ? 600 : 3600
    res.setHeader('Cache-Control', `s-maxage=${sMax}, stale-while-revalidate=1800`)
    res.status(200).json(data)
  } catch {
    res.setHeader('Cache-Control', 's-maxage=10')
    res.status(502).json({ error: 'upstream unreachable' })
  }
}
