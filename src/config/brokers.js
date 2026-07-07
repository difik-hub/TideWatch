// Брокеры для секции «Где купить» на странице акции. {SYM} → тикер (AAPL…).
// ref — партнёрский хвост (позже): вся монетизация акций — тут.
export const BROKERS = [
  { name: 'eToro', url: 'https://www.etoro.com/markets/{sym}', ref: '' },
  { name: 'Robinhood', url: 'https://robinhood.com/us/en/stocks/{SYM}/', ref: '' },
  { name: 'Public', url: 'https://public.com/stocks/{SYM}', ref: '' },
  { name: 'Webull', url: 'https://www.webull.com/quote/{SYM}', ref: '' },
]

export function brokerUrl(b, symbol) {
  const s = String(symbol || '')
  return b.url.replace('{SYM}', s.toUpperCase()).replace('{sym}', s.toLowerCase()) + (b.ref || '')
}
