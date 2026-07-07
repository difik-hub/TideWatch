// Слой работы с акциями (Twelve Data через наш кеш-прокси /api/td).
// Квоты приводятся к тому же формату, что и монеты CoinGecko, чтобы
// CoinRow/CoinCard/поиск/избранное работали без переделки.

import { STOCK_SYMBOLS, stockName } from '../config/stocks'

// В проде — через кеш-прокси (ключ на сервере). В dev серверлесса нет,
// поэтому по желанию ходим напрямую с VITE_TD_API_KEY (только для локалки).
const DEV_KEY = import.meta.env.VITE_TD_API_KEY
const PROD = import.meta.env.PROD

const cache = new Map()
const TTL = 60_000

const num = (v) => (v == null || v === '' ? null : Number(v))

function tdUrl(path, params) {
  const qs = new URLSearchParams(params)
  if (PROD) return `/api/td?p=${path}&${qs.toString()}`
  if (!DEV_KEY) return null // в dev без ключа акции недоступны
  qs.set('apikey', DEV_KEY)
  return `https://api.twelvedata.com/${path}?${qs.toString()}`
}

async function getJSON(url, ttl = TTL) {
  if (!url) return null
  const cached = cache.get(url)
  if (cached && Date.now() - cached.ts < ttl) return cached.data
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    const data = await res.json()
    if (data && (data.status === 'error' || data.code >= 400)) {
      return cached?.data ?? null // лимит/ошибка — отдаём last-good
    }
    cache.set(url, { ts: Date.now(), data })
    return data
  } catch {
    return cached?.data ?? null
  }
}

// Квота Twelve Data → объект в формате монеты
function quoteToCoin(q, rank) {
  const price = num(q.close)
  const pct = num(q.percent_change)
  return {
    id: q.symbol,
    symbol: q.symbol,
    name: q.name || stockName(q.symbol),
    image: '', // логотипа нет — CoinRow покажет монограмму
    kind: 'stock',
    href: `/stock/${q.symbol}`,
    current_price: price,
    price_change_percentage_24h: pct,
    price_change_percentage_24h_in_currency: pct,
    market_cap: null,
    market_cap_rank: rank,
    total_volume: num(q.volume),
    is_market_open: q.is_market_open === true,
    fifty_two_week: q.fifty_two_week || null,
    open: num(q.open),
    high: num(q.high),
    low: num(q.low),
    previous_close: num(q.previous_close),
    exchange: q.exchange || null,
    currency: q.currency || 'USD',
  }
}

// Все акции из конфига одним батчем (порядок = ранг для сортировки)
export async function fetchStocks() {
  const url = tdUrl('quote', { symbol: STOCK_SYMBOLS.join(',') })
  const data = await getJSON(url)
  if (!data) return []
  // Батч → { SYM: {...} }; один символ → объект напрямую
  const rows = data.symbol ? { [data.symbol]: data } : data
  const out = []
  STOCK_SYMBOLS.forEach((sym, i) => {
    const q = rows[sym]
    if (q && q.close != null) out.push(quoteToCoin(q, i + 1))
  })
  return out
}

// Квота одной акции (для страницы /stock/:sym)
export async function fetchStockQuote(symbol) {
  const url = tdUrl('quote', { symbol })
  const data = await getJSON(url)
  if (!data || data.close == null) return null
  return quoteToCoin(data, null)
}

// Дневной график за N дней (для страницы акции)
export async function fetchStockSeries(symbol, days = 30) {
  const url = tdUrl('time_series', { symbol, interval: '1day', outputsize: String(days) })
  const data = await getJSON(url, 3600_000)
  const values = data?.values
  if (!Array.isArray(values)) return null
  // Twelve Data отдаёт от новых к старым — разворачиваем для графика
  return values
    .map((v) => ({ t: v.datetime, price: Number(v.close) }))
    .reverse()
}
