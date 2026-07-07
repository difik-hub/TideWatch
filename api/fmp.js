// Кеш-прокси Financial Modeling Prep (stable API). Ключ FMP_API_KEY на сервере.
// ⚠️ Бесплатный тариф: батч ПЛАТНЫЙ, только одиночные квоты, 250 запросов/день.
// Поэтому лента акций собирается серверным fan-out'ом (?p=feed&symbols=...):
// прокси сам обходит тикеры и отдаёт готовый массив, агрессивно кешируясь на edge.

const BASE = 'https://financialmodelingprep.com/stable'
const ALLOWED = new Set(['feed', 'quote', 'profile', 'history', 'earnings', 'search'])
const US_EXCH = new Set(['NASDAQ', 'NYSE', 'AMEX'])

// Открыт ли рынок США (Mon-Fri 9:30–16:00 ET) — для длины кеша
function marketOpen() {
  try {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
    const g = (t) => p.find((x) => x.type === t)?.value
    const wd = g('weekday')
    if (wd === 'Sat' || wd === 'Sun') return false
    const mins = Number(g('hour')) * 60 + Number(g('minute'))
    return mins >= 570 && mins < 960 // 9:30–16:00
  } catch {
    return false
  }
}

async function fmp(path, params, key) {
  const qs = new URLSearchParams({ ...params, apikey: key })
  const r = await fetch(`${BASE}/${path}?${qs}`, { headers: { accept: 'application/json' } })
  const txt = await r.text()
  try { return JSON.parse(txt) } catch { return { error: txt.slice(0, 120) } }
}

export default async function handler(req, res) {
  const key = process.env.FMP_API_KEY
  if (!key) { res.status(500).json({ error: 'FMP_API_KEY not set' }); return }

  const u = new URL(req.url, 'http://localhost')
  const p = u.searchParams.get('p') || ''
  if (!ALLOWED.has(p)) { res.status(400).json({ error: 'path not allowed' }); return }

  const open = marketOpen()
  const sMaxQuote = open ? 7200 : 43200 // 2ч в сессию, 12ч когда закрыт (лимит 250/день)
  const long = 86400 // профиль/лого — сутки

  try {
    // ЛЕНТА: fan-out одиночных квот по списку (батч платный)
    if (p === 'feed') {
      const symbols = (u.searchParams.get('symbols') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40)
      const out = []
      // чанки по 6, чтобы не упереться в лимит FMP по запросам/сек
      for (let i = 0; i < symbols.length; i += 6) {
        const chunk = symbols.slice(i, i + 6)
        const rows = await Promise.all(chunk.map((s) => fmp('quote', { symbol: s }, key).catch(() => null)))
        for (const r of rows) if (Array.isArray(r) && r[0]?.price != null) out.push(r[0])
      }
      res.setHeader('Cache-Control', `s-maxage=${sMaxQuote}, stale-while-revalidate=3600`)
      res.status(200).json({ marketOpen: open, quotes: out })
      return
    }

    if (p === 'quote') {
      const data = await fmp('quote', { symbol: u.searchParams.get('symbol') }, key)
      res.setHeader('Cache-Control', `s-maxage=${sMaxQuote}, stale-while-revalidate=3600`)
      res.status(200).json(data)
      return
    }
    if (p === 'profile') {
      const data = await fmp('profile', { symbol: u.searchParams.get('symbol') }, key)
      res.setHeader('Cache-Control', `s-maxage=${long}, stale-while-revalidate=86400`)
      res.status(200).json(data)
      return
    }
    if (p === 'history') {
      const data = await fmp('historical-price-eod/light', { symbol: u.searchParams.get('symbol') }, key)
      res.setHeader('Cache-Control', `s-maxage=${open ? 3600 : 21600}, stale-while-revalidate=3600`)
      res.status(200).json(data)
      return
    }
    if (p === 'earnings') {
      const data = await fmp('earnings', { symbol: u.searchParams.get('symbol'), limit: '8' }, key)
      res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=43200')
      res.status(200).json(data)
      return
    }
    if (p === 'search') {
      const data = await fmp('search-name', { query: u.searchParams.get('query') || '', limit: '20' }, key)
      const list = Array.isArray(data) ? data.filter((x) => US_EXCH.has(x.exchange)).slice(0, 10) : []
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
      res.status(200).json(list)
      return
    }
  } catch {
    res.setHeader('Cache-Control', 's-maxage=15')
    res.status(502).json({ error: 'upstream unreachable' })
  }
}
