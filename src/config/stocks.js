// Кураторский список акций для вкладки «Акции» (~24, категории для фильтр-чипов).
// ⚠️ Бесплатный FMP: батч платный, 250 запросов/день. Лента собирается серверным
// fan-out'ом (api/fmp.js) с агрессивным кешем. Больше тикеров / реалтайм —
// только платный ключ FMP; тогда просто добавь сюда символы.
// cat: crypto (крипто-акции — мостик) | tech (AI/мегакапы) | meme | etf
export const STOCKS = [
  { symbol: 'COIN', name: 'Coinbase', cat: 'crypto' },
  { symbol: 'MSTR', name: 'MicroStrategy', cat: 'crypto' },
  { symbol: 'MARA', name: 'Marathon Digital', cat: 'crypto' },
  { symbol: 'RIOT', name: 'Riot Platforms', cat: 'crypto' },
  { symbol: 'HOOD', name: 'Robinhood', cat: 'crypto' },
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
  { symbol: 'INTC', name: 'Intel', cat: 'tech' },
  { symbol: 'UBER', name: 'Uber', cat: 'tech' },
  { symbol: 'DIS', name: 'Disney', cat: 'tech' },
  { symbol: 'GME', name: 'GameStop', cat: 'meme' },
  { symbol: 'AMC', name: 'AMC Entertainment', cat: 'meme' },
  { symbol: 'SPY', name: 'S&P 500 ETF', cat: 'etf' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', cat: 'etf' },
  { symbol: 'GLD', name: 'Gold ETF', cat: 'etf' },
  { symbol: 'SLV', name: 'Silver ETF', cat: 'etf' },
]

export const STOCK_SYMBOLS = STOCKS.map((s) => s.symbol)
export const STOCK_CATS = ['crypto', 'tech', 'meme', 'etf']

export function stockName(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.name || symbol
}
export function stockCat(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.cat || null
}
