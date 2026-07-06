// Биржи для секции «Где купить». {SYM} заменяется тикером монеты (BTC, ETH…).
// ref — партнёрский хвост (напр. '?ref=XXXX'): вся будущая монетизация — тут.
export const EXCHANGES = [
  { name: 'Binance', url: 'https://www.binance.com/en/trade/{SYM}_USDT', ref: '' },
  { name: 'Bybit', url: 'https://www.bybit.com/en/trade/spot/{SYM}/USDT', ref: '' },
  { name: 'OKX', url: 'https://www.okx.com/trade-spot/{SYM}-USDT', ref: '' },
  { name: 'MEXC', url: 'https://www.mexc.com/exchange/{SYM}_USDT', ref: '' },
]

export function buyUrl(ex, symbol) {
  return ex.url.replace('{SYM}', String(symbol || '').toUpperCase()) + (ex.ref || '')
}
