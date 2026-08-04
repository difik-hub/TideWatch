// Котировки акций через публичный chart-эндпоинт Yahoo Finance.
//
// Зачем в обход FMP: на бесплатном тарифе FMP батч платный, покрытие дырявое
// (ETF и половина популярных тикеров — премиум), а 250 запросов в день кончаются
// за несколько обновлений ленты. Из-за этого список акций держали на 22 штуках.
// Здесь ключа нет вовсе и дневного потолка нет, поэтому тикеров может быть сотня.
//
// Что отдаёт сверх FMP: недельная история — по ней считаются спарклайн и рост за
// 7 дней, которых у акций раньше просто не было (в ленте стояли прочерки).
//
// FMP остаётся для отчётности и профиля компании: там его данные полнее.

import { allow } from './_ratelimit.js'

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
// Yahoo отдаёт пустой ответ на запрос без узнаваемого браузерного UA
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'

function marketOpen() {
  try {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
    const g = (t) => p.find((x) => x.type === t)?.value
    const wd = g('weekday')
    if (wd === 'Sat' || wd === 'Sun') return false
    const mins = Number(g('hour')) * 60 + Number(g('minute'))
    return mins >= 570 && mins < 960
  } catch {
    return false
  }
}

async function quote(symbol) {
  const url = `${BASE}/${encodeURIComponent(symbol)}?range=1mo&interval=1d`
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } })
  if (!r.ok) return null
  const j = await r.json().catch(() => null)
  const res = j?.chart?.result?.[0]
  const m = res?.meta
  if (!m?.regularMarketPrice) return null

  // Закрытия за месяц: последняя точка бывает null, пока сессия не закрылась
  const closes = (res.indicators?.quote?.[0]?.close || []).filter((v) => v != null)
  const price = m.regularMarketPrice
  const prev = m.chartPreviousClose ?? closes[closes.length - 2] ?? null
  const pct = (from) => (from ? ((price - from) / from) * 100 : null)

  return {
    symbol: m.symbol,
    name: m.longName || m.shortName || m.symbol,
    price,
    change24: pct(prev),
    // 7 торговых дней назад, а не 7 календарных: биржа по выходным закрыта
    change7d: pct(closes[closes.length - 6] ?? null),
    dayHigh: m.regularMarketDayHigh ?? null,
    dayLow: m.regularMarketDayLow ?? null,
    prevClose: prev,
    volume: m.regularMarketVolume ?? null,
    high52: m.fiftyTwoWeekHigh ?? null,
    low52: m.fiftyTwoWeekLow ?? null,
    exchange: m.fullExchangeName || m.exchangeName || null,
    currency: m.currency || 'USD',
    sparkline: closes.slice(-30),
  }
}

export default async function handler(req, res) {
  if (!(await allow(req, 'yf'))) { res.status(429).json({ error: 'rate limited' }); return }

  const u = new URL(req.url, 'http://localhost')
  const symbols = (u.searchParams.get('symbols') || '')
    .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 120)
  if (!symbols.length) { res.status(400).json({ error: 'symbols required' }); return }

  const open = marketOpen()
  try {
    // Чанками, чтобы не открывать сотню соединений разом
    const out = []
    for (let i = 0; i < symbols.length; i += 10) {
      const chunk = symbols.slice(i, i + 10)
      const rows = await Promise.all(chunk.map((s) => quote(s).catch(() => null)))
      for (const r of rows) if (r) out.push(r)
    }
    // Пусто — кешируем коротко, иначе сбой залипнет на часы
    const sMax = out.length ? (open ? 300 : 3600) : 60
    res.setHeader('Cache-Control', `s-maxage=${sMax}, stale-while-revalidate=7200`)
    res.status(200).json({ marketOpen: open, quotes: out })
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=30')
    res.status(200).json({ marketOpen: open, quotes: [], error: String(e).slice(0, 120) })
  }
}
