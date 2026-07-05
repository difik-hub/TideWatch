// Слой работы с CoinGecko API (бесплатный, без ключа).
// Простой in-memory кеш + защита от частых повторных запросов (rate-limit friendly).

// В проде ходим через наш кеш-прокси (/api/cg на Vercel): юзеры делят один
// кеш, лимиты CoinGecko по IP юзера исчезают. В dev — напрямую в CoinGecko.
const BASE = import.meta.env.PROD ? '/api/cg' : 'https://api.coingecko.com/api/v3'

const cache = new Map() // key -> { ts, data }
const CACHE_TTL = 45_000 // 45 сек: бережём бесплатный rate-limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// '/api/cg/coins/markets?a=b' → '/api/cg?p=coins%2Fmarkets&a=b'
// (Vercel plain-функции не поддерживают вложенные пути в имени — путь идёт параметром)
function toProxyUrl(url) {
  const m = url.match(/^\/api\/cg\/([^?]+)(?:\?(.*))?$/)
  if (!m) return url
  return `/api/cg?p=${encodeURIComponent(m[1])}${m[2] ? `&${m[2]}` : ''}`
}

// Запрос с кешем и ретраями. CoinGecko на бесплатном тарифе при частых
// запросах иногда роняет соединение (Failed to fetch) или отдаёт 429/5xx —
// такие сбои временные, поэтому повторяем с нарастающей паузой.
async function getJSON(url, ttl = CACHE_TTL, retries = 2) {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data
  }

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(700 * attempt) // 700мс, 1400мс

    let res
    try {
      res = await fetch(toProxyUrl(url), { headers: { accept: 'application/json' } })
    } catch (e) {
      lastErr = e // сетевой сбой (Failed to fetch) — повторяем
      continue
    }

    // Временные ошибки сервиса — повторяем
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error('Сервис данных временно перегружен.')
      continue
    }
    // Постоянные ошибки (404 и пр.) — повторять смысла нет
    if (!res.ok) {
      if (cached) return cached.data
      throw new Error(`Не удалось загрузить данные (${res.status}).`)
    }

    try {
      const data = await res.json()
      cache.set(url, { ts: Date.now(), data })
      return data
    } catch (e) {
      lastErr = e
    }
  }

  // Все попытки исчерпаны — отдаём кеш, если есть, иначе ошибку
  if (cached) return cached.data
  throw new Error('Не удалось загрузить данные. Проверьте соединение и повторите.')
}

// Топ монет с динамикой, объёмом, капитализацией и спарклайном за 7 дней
export function fetchMarkets(perPage = 100, page = 1, currency = 'usd') {
  const url =
    `${BASE}/coins/markets?vs_currency=${currency}&order=market_cap_desc` +
    `&per_page=${perPage}&page=${page}&sparkline=true` +
    `&price_change_percentage=1h,24h,7d,30d`
  return getJSON(url)
}

// Глобальная статистика рынка (общая капитализация, объём, доминирование BTC)
export async function fetchGlobal() {
  const data = await getJSON(`${BASE}/global`, 60_000)
  return data?.data ?? null
}

// Поиск по всей базе CoinGecko (не только по загруженным монетам)
export async function fetchSearch(query) {
  const q = query.trim()
  if (q.length < 2) return []
  const data = await getJSON(`${BASE}/search?query=${encodeURIComponent(q)}`, 120_000)
  return (data?.coins || []).slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    thumb: c.thumb,
    rank: c.market_cap_rank,
  }))
}

// Индекс страха и жадности (alternative.me, отдельный источник)
export async function fetchFearGreed() {
  const cached = cache.get('fng')
  if (cached && Date.now() - cached.ts < 300_000) return cached.data
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    if (!res.ok) return cached?.data ?? null
    const json = await res.json()
    const d = json?.data?.[0]
    const out = d ? { value: Number(d.value), label: d.value_classification } : null
    cache.set('fng', { ts: Date.now(), data: out })
    return out
  } catch {
    return cached?.data ?? null
  }
}

// Курсы валют (единиц валюты за 1 BTC) — для пересчёта цены между USD/EUR/RUB
export async function fetchRates() {
  const data = await getJSON(`${BASE}/exchange_rates`, 120_000)
  const r = data?.rates
  if (!r) return null
  return {
    usd: r.usd?.value ?? null,
    eur: r.eur?.value ?? null,
    rub: r.rub?.value ?? null,
  }
}

// Полные данные по одной монете (описание, ранги, рыночные данные)
export function fetchCoin(id) {
  const url =
    `${BASE}/coins/${id}?localization=false&tickers=false` +
    `&market_data=true&community_data=false&developer_data=false&sparkline=false`
  return getJSON(url, 60_000)
}

// График цены за период. days: 1 | 7 | 30 | 365
export function fetchMarketChart(id, days, currency = 'usd') {
  const interval = days <= 1 ? '' : '&interval=daily'
  const url = `${BASE}/coins/${id}/market_chart?vs_currency=${currency}&days=${days}${interval}`
  return getJSON(url, 60_000)
}
