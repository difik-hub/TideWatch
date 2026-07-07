// Кураторский список акций для вкладки «Акции» (~22, категории для фильтр-чипов).
// ⚠️ Бесплатный FMP: батч платный + покрыт лишь ЧАСТЬ символов (MSTR, GME, QQQ,
// ETF и мн.др. — премиум), лимит 250 запросов/день. Все тикеры ниже проверены
// на free-покрытие. Лента собирается серверным fan-out'ом (api/fmp.js) с кешем.
// Больше тикеров / реалтайм / MSTR·ETF — только платный ключ FMP.
// cat: crypto (крипто-адаженс — мостик) | tech (AI/мегакапы) | finance (голубые фишки)
export const STOCKS = [
  { symbol: 'COIN', name: 'Coinbase', cat: 'crypto' },
  { symbol: 'HOOD', name: 'Robinhood', cat: 'crypto' },
  { symbol: 'RIOT', name: 'Riot Platforms', cat: 'crypto' },
  { symbol: 'SQ', name: 'Block', cat: 'crypto' },
  { symbol: 'PYPL', name: 'PayPal', cat: 'crypto' },
  { symbol: 'SOFI', name: 'SoFi', cat: 'crypto' },
  { symbol: 'NVDA', name: 'NVIDIA', cat: 'tech' },
  { symbol: 'AAPL', name: 'Apple', cat: 'tech' },
  { symbol: 'MSFT', name: 'Microsoft', cat: 'tech' },
  { symbol: 'TSLA', name: 'Tesla', cat: 'tech' },
  { symbol: 'GOOGL', name: 'Alphabet', cat: 'tech' },
  { symbol: 'AMZN', name: 'Amazon', cat: 'tech' },
  { symbol: 'META', name: 'Meta', cat: 'tech' },
  { symbol: 'AMD', name: 'AMD', cat: 'tech' },
  { symbol: 'PLTR', name: 'Palantir', cat: 'tech' },
  { symbol: 'NFLX', name: 'Netflix', cat: 'tech' },
  { symbol: 'UBER', name: 'Uber', cat: 'tech' },
  { symbol: 'JPM', name: 'JPMorgan', cat: 'finance' },
  { symbol: 'V', name: 'Visa', cat: 'finance' },
  { symbol: 'BAC', name: 'Bank of America', cat: 'finance' },
  { symbol: 'WMT', name: 'Walmart', cat: 'finance' },
  { symbol: 'DIS', name: 'Disney', cat: 'finance' },
]

export const STOCK_SYMBOLS = STOCKS.map((s) => s.symbol)
export const STOCK_CATS = ['crypto', 'tech', 'finance']

export function stockName(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.name || symbol
}
export function stockCat(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.cat || null
}
