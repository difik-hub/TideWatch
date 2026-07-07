// Кураторский список акций для вкладки «Акции».
// ⚠️ Бесплатный тариф Twelve Data = 8 кредитов/мин (1 тикер = 1 кредит),
// поэтому в одном батч-запросе максимум 8 символов. Чтобы расширить список —
// нужен платный ключ (Grow-план снимает лимиты), тогда просто добавь тикеры сюда.
// Набор подобран под крипто-аудиторию: крипто-акции (мостик) + AI/мегакапы.
export const STOCKS = [
  { symbol: 'COIN', name: 'Coinbase' },
  { symbol: 'MSTR', name: 'MicroStrategy' },
  { symbol: 'MARA', name: 'Marathon Digital' },
  { symbol: 'RIOT', name: 'Riot Platforms' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
]

export const STOCK_SYMBOLS = STOCKS.map((s) => s.symbol)

export function stockName(symbol) {
  return STOCKS.find((s) => s.symbol === symbol)?.name || symbol
}
