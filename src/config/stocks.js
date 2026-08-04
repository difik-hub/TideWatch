// Список акций для вкладки «Акции». Категории — для фильтр-чипов.
//
// Раньше здесь было 22 тикера, и виноват был источник: у FMP на бесплатном тарифе
// батч платный, покрытие дырявое, а 250 запросов в день кончались за пару часов.
// Лента теперь ходит в api/yf.js (Yahoo, без ключа и без дневного потолка), так что
// ограничение снято и список можно держать таким, каким он должен быть.
//
// cat: crypto (крипто-адженс) | tech (технологии) | finance (банки и платежи)
//      | consumer (потребительский сектор и промышленность)
export const STOCKS = [
  // Крипто-адженс: мостик между двумя рынками, ради которого всё затевалось
  { symbol: 'COIN', name: 'Coinbase', cat: 'crypto' },
  { symbol: 'MSTR', name: 'MicroStrategy', cat: 'crypto' },
  { symbol: 'HOOD', name: 'Robinhood', cat: 'crypto' },
  { symbol: 'MARA', name: 'MARA Holdings', cat: 'crypto' },
  { symbol: 'RIOT', name: 'Riot Platforms', cat: 'crypto' },
  { symbol: 'CLSK', name: 'CleanSpark', cat: 'crypto' },
  { symbol: 'CIFR', name: 'Cipher Mining', cat: 'crypto' },
  { symbol: 'XYZ', name: 'Block', cat: 'crypto' },
  { symbol: 'PYPL', name: 'PayPal', cat: 'crypto' },
  { symbol: 'SOFI', name: 'SoFi', cat: 'crypto' },
  { symbol: 'GLXY', name: 'Galaxy Digital', cat: 'crypto' },

  // Технологии
  { symbol: 'NVDA', name: 'NVIDIA', cat: 'tech' },
  { symbol: 'AAPL', name: 'Apple', cat: 'tech' },
  { symbol: 'MSFT', name: 'Microsoft', cat: 'tech' },
  { symbol: 'GOOGL', name: 'Alphabet', cat: 'tech' },
  { symbol: 'AMZN', name: 'Amazon', cat: 'tech' },
  { symbol: 'META', name: 'Meta', cat: 'tech' },
  { symbol: 'TSLA', name: 'Tesla', cat: 'tech' },
  { symbol: 'AVGO', name: 'Broadcom', cat: 'tech' },
  { symbol: 'AMD', name: 'AMD', cat: 'tech' },
  { symbol: 'TSM', name: 'TSMC', cat: 'tech' },
  { symbol: 'ORCL', name: 'Oracle', cat: 'tech' },
  { symbol: 'PLTR', name: 'Palantir', cat: 'tech' },
  { symbol: 'NFLX', name: 'Netflix', cat: 'tech' },
  { symbol: 'CRM', name: 'Salesforce', cat: 'tech' },
  { symbol: 'ADBE', name: 'Adobe', cat: 'tech' },
  { symbol: 'INTC', name: 'Intel', cat: 'tech' },
  { symbol: 'MU', name: 'Micron', cat: 'tech' },
  { symbol: 'QCOM', name: 'Qualcomm', cat: 'tech' },
  { symbol: 'ARM', name: 'Arm Holdings', cat: 'tech' },
  { symbol: 'SMCI', name: 'Super Micro', cat: 'tech' },
  { symbol: 'DELL', name: 'Dell', cat: 'tech' },
  { symbol: 'CSCO', name: 'Cisco', cat: 'tech' },
  { symbol: 'IBM', name: 'IBM', cat: 'tech' },
  { symbol: 'NOW', name: 'ServiceNow', cat: 'tech' },
  { symbol: 'SNOW', name: 'Snowflake', cat: 'tech' },
  { symbol: 'CRWD', name: 'CrowdStrike', cat: 'tech' },
  { symbol: 'UBER', name: 'Uber', cat: 'tech' },
  { symbol: 'ABNB', name: 'Airbnb', cat: 'tech' },
  { symbol: 'SHOP', name: 'Shopify', cat: 'tech' },
  { symbol: 'SPOT', name: 'Spotify', cat: 'tech' },
  { symbol: 'RBLX', name: 'Roblox', cat: 'tech' },
  { symbol: 'DASH', name: 'DoorDash', cat: 'tech' },

  // Банки, платежи, страхование
  { symbol: 'BRK-B', name: 'Berkshire Hathaway', cat: 'finance' },
  { symbol: 'JPM', name: 'JPMorgan', cat: 'finance' },
  { symbol: 'V', name: 'Visa', cat: 'finance' },
  { symbol: 'MA', name: 'Mastercard', cat: 'finance' },
  { symbol: 'BAC', name: 'Bank of America', cat: 'finance' },
  { symbol: 'WFC', name: 'Wells Fargo', cat: 'finance' },
  { symbol: 'GS', name: 'Goldman Sachs', cat: 'finance' },
  { symbol: 'MS', name: 'Morgan Stanley', cat: 'finance' },
  { symbol: 'C', name: 'Citigroup', cat: 'finance' },
  { symbol: 'AXP', name: 'American Express', cat: 'finance' },
  { symbol: 'BLK', name: 'BlackRock', cat: 'finance' },

  // Потребительский сектор и промышленность
  { symbol: 'WMT', name: 'Walmart', cat: 'consumer' },
  { symbol: 'COST', name: 'Costco', cat: 'consumer' },
  { symbol: 'HD', name: 'Home Depot', cat: 'consumer' },
  { symbol: 'MCD', name: "McDonald's", cat: 'consumer' },
  { symbol: 'NKE', name: 'Nike', cat: 'consumer' },
  { symbol: 'KO', name: 'Coca-Cola', cat: 'consumer' },
  { symbol: 'PEP', name: 'PepsiCo', cat: 'consumer' },
  { symbol: 'PG', name: 'Procter & Gamble', cat: 'consumer' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', cat: 'consumer' },
  { symbol: 'LLY', name: 'Eli Lilly', cat: 'consumer' },
  { symbol: 'DIS', name: 'Disney', cat: 'consumer' },
  { symbol: 'XOM', name: 'Exxon Mobil', cat: 'consumer' },
  { symbol: 'CVX', name: 'Chevron', cat: 'consumer' },
  { symbol: 'BA', name: 'Boeing', cat: 'consumer' },
  { symbol: 'CAT', name: 'Caterpillar', cat: 'consumer' },
  { symbol: 'GE', name: 'GE Aerospace', cat: 'consumer' },
  { symbol: 'F', name: 'Ford', cat: 'consumer' },
  { symbol: 'GM', name: 'General Motors', cat: 'consumer' },
]

export const STOCK_SYMBOLS = STOCKS.map((s) => s.symbol)
export const STOCK_CATS = ['crypto', 'tech', 'finance', 'consumer']

export function stockName(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.name || symbol
}
export function stockCat(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.cat || null
}
