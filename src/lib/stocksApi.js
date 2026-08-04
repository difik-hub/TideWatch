// Слой работы с акциями (Financial Modeling Prep через наш прокси /api/fmp).
// Квоты приводятся к формату монеты CoinGecko, чтобы CoinRow/CoinCard/поиск/
// избранное/портфель/алерты работали без переделки. Лента — серверный fan-out
// (батч у FMP платный). Логотип — по предсказуемому CDN-URL FMP.

import { STOCK_SYMBOLS, stockName, stockCat } from '../config/stocks'

const cache = new Map()
const TTL = 60_000
const num = (v) => (v == null || v === '' ? null : Number(v))
const logoUrl = (sym) => `https://images.financialmodelingprep.com/symbol/${String(sym).toUpperCase()}.png`

async function getJSON(url, ttl = TTL) {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.ts < ttl) return cached.data
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    const data = await res.json()
    if (data && data.error) return cached?.data ?? null
    cache.set(url, { ts: Date.now(), data })
    return data
  } catch {
    return cached?.data ?? null
  }
}

// FMP-квота → объект в формате монеты
function quoteToCoin(q, rank, marketOpen) {
  const sym = q.symbol
  return {
    id: sym,
    symbol: sym,
    name: q.name || stockName(sym),
    image: logoUrl(sym),
    kind: 'stock',
    cat: stockCat(sym),
    href: `/stock/${sym}`,
    current_price: num(q.price),
    price_change_percentage_24h: num(q.changePercentage),
    price_change_percentage_24h_in_currency: num(q.changePercentage),
    market_cap: num(q.marketCap),
    market_cap_rank: rank,
    total_volume: num(q.volume),
    is_market_open: !!marketOpen,
    fifty_two_week: { low: num(q.yearLow), high: num(q.yearHigh) },
    open: num(q.open),
    high: num(q.dayHigh),
    low: num(q.dayLow),
    previous_close: num(q.previousClose),
    exchange: q.exchange || null,
    currency: 'USD',
  }
}

// Квота Yahoo → объект в формате монеты. Отличие от FMP: есть недельная динамика
// и история цен, поэтому у акций появились спарклайн и колонка 7д.
function yfToCoin(q, rank, marketOpen) {
  const sym = q.symbol
  return {
    id: sym,
    symbol: sym,
    name: stockName(sym) || q.name || sym,
    image: logoUrl(sym),
    kind: 'stock',
    cat: stockCat(sym),
    href: `/stock/${sym}`,
    current_price: num(q.price),
    price_change_percentage_24h: num(q.change24),
    price_change_percentage_24h_in_currency: num(q.change24),
    price_change_percentage_7d_in_currency: num(q.change7d),
    market_cap: null, // Yahoo его тут не отдаёт; порядок ленты задаёт config/stocks
    market_cap_rank: rank,
    total_volume: num(q.volume),
    is_market_open: !!marketOpen,
    fifty_two_week: { low: num(q.low52), high: num(q.high52) },
    high: num(q.dayHigh),
    low: num(q.dayLow),
    previous_close: num(q.prevClose),
    exchange: q.exchange || null,
    currency: 'USD',
    sparkline_in_7d: Array.isArray(q.sparkline) && q.sparkline.length > 1 ? { price: q.sparkline } : undefined,
  }
}

// Вся лента акций одним запросом (сервер обходит список сам).
// Порядок — как в config/stocks: капитализации у источника нет, а ручной порядок
// всё равно осмысленнее, чем сортировка по цене.
export async function fetchStocks() {
  const url = `/api/yf?symbols=${encodeURIComponent(STOCK_SYMBOLS.join(','))}`
  const data = await getJSON(url)
  const quotes = data?.quotes
  if (!Array.isArray(quotes) || !quotes.length) return []
  const order = new Map(STOCK_SYMBOLS.map((s, i) => [s, i]))
  const sorted = [...quotes]
    .filter((q) => q.price != null)
    .sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999))
  return sorted.map((q, i) => yfToCoin(q, i + 1, data.marketOpen))
}

// Календарь отчётов по всей ленте: { SYM: {nextDate, epsEstimated, beats, of} }.
// Дата отчёта — то немногое о компании, что известно заранее: это повод вернуться
// на сайт, а не очередная цифра. Кеш час на клиенте, сутки на edge.
export async function fetchEarningsCalendar() {
  const url = `/api/fmp?p=calendar&symbols=${encodeURIComponent(STOCK_SYMBOLS.join(','))}`
  const data = await getJSON(url, 3600_000)
  return data?.calendar && typeof data.calendar === 'object' ? data.calendar : {}
}

// Сколько дней до отчёта: null — даты нет, 0 — сегодня
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00Z`)
  if (isNaN(d)) return null
  const today = new Date()
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((d.getTime() - utcToday) / 86400_000)
}

// Квота одной акции (страница /stock/:sym)
export async function fetchStockQuote(symbol) {
  const data = await getJSON(`/api/fmp?p=quote&symbol=${encodeURIComponent(symbol)}`)
  const q = Array.isArray(data) ? data[0] : null
  if (!q || q.price == null) return null
  return quoteToCoin(q, null, null)
}

// Профиль (сектор, описание, лого) — для страницы акции
export async function fetchStockProfile(symbol) {
  const data = await getJSON(`/api/fmp?p=profile&symbol=${encodeURIComponent(symbol)}`, 3600_000)
  const p = Array.isArray(data) ? data[0] : null
  if (!p) return null
  return { sector: p.sector || null, industry: p.industry || null, description: p.description || '', ceo: p.ceo || null, website: p.website || null }
}

// Дневной график (historical-price-eod/light) → [{t, price}] по возрастанию даты
export async function fetchStockSeries(symbol, days = 90) {
  const data = await getJSON(`/api/fmp?p=history&symbol=${encodeURIComponent(symbol)}`, 3600_000)
  const arr = Array.isArray(data) ? data : data?.historical
  if (!Array.isArray(arr)) return null
  return arr
    .map((v) => ({ t: v.date, price: Number(v.price ?? v.close) }))
    .filter((v) => v.t && !isNaN(v.price))
    .sort((a, b) => (a.t < b.t ? -1 : 1))
    .slice(-days)
}

// Ближайшая дата отчёта (earnings)
// Отчётность: ближайшая дата + прошлые отчёты факт против прогноза.
// «Обогнал прогноз 3 раза из 4» говорит о компании больше, чем цена за день,
// и это единственное событие по акции, которое известно заранее.
export async function fetchStockEarnings(symbol) {
  const data = await getJSON(`/api/fmp?p=earnings&symbol=${encodeURIComponent(symbol)}`, 21600_000)
  if (!Array.isArray(data)) return null
  const today = new Date().toISOString().slice(0, 10)
  const next = data.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || null
  const past = data
    .filter((e) => e.epsActual != null && e.epsEstimated != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
    .map((e) => ({
      date: e.date,
      epsActual: e.epsActual,
      epsEstimated: e.epsEstimated,
      beat: e.epsActual > e.epsEstimated,
    }))
  if (!next && !past.length) return null
  return {
    nextDate: next?.date || null,
    epsEstimated: next?.epsEstimated ?? null,
    past,
    beats: past.filter((e) => e.beat).length,
    of: past.length,
  }
}

// Поиск акций (FMP search-name, только биржи США)
export async function searchStocks(query) {
  const q = query.trim()
  if (q.length < 2) return []
  const data = await getJSON(`/api/fmp?p=search&query=${encodeURIComponent(q)}`, 120_000)
  if (!Array.isArray(data)) return []
  return data.slice(0, 10).map((x) => ({
    id: x.symbol,
    name: x.name,
    symbol: x.symbol,
    thumb: logoUrl(x.symbol),
    rank: null,
    href: `/stock/${x.symbol}`,
  }))
}
